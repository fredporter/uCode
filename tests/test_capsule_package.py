"""Unit tests for uCode Capsule packaging, integrity verification, and permissions engine."""

import time
import zipfile
from pathlib import Path

import pytest
from ucode_runtime.capsule_package import (
    CapsuleError,
    CapsuleIntegrityError,
    CapsuleLicensing,
    CapsulePackage,
    CapsulePermissionError,
    CapsulePermissions,
    CapsuleRunner,
    CapsuleTimeoutError,
    UnauthorizedCapsuleExecutionError,
)


@pytest.fixture
def sample_capsule_dir(tmp_path: Path) -> Path:
    """Create a minimal valid capsule fixture."""
    capsule_dir = tmp_path / "test-capsule"
    capsule_dir.mkdir(parents=True)
    src_dir = capsule_dir / "src"
    src_dir.mkdir()
    (src_dir / "main.bbc").write_text('PRINT "Hello from Capsule"\n', encoding="utf-8")

    capsule_yaml = """format: ucode-capsule/1
id: test-capsule
treatment: enhanced
runtime:
  type: polyglot-pod
  engine: bbc-console
  entry: src/main.bbc
permissions:
  filesystem: read_only
  network: false
  max_memory_mb: 32
  timeout_sec: 1.5
licensing:
  runtime_license: proprietary-retro-evaluation
  redistributable: false
  disclaimer: Evaluation only.
"""
    (capsule_dir / "capsule.yaml").write_text(capsule_yaml, encoding="utf-8")
    return capsule_dir


def test_pack_and_unpack_capsule_quarantine(sample_capsule_dir: Path, tmp_path: Path):
    """Test packing capsule and verifying anti-autorun quarantine on unpack."""
    pkg_file = tmp_path / "test.ucapsule"
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file)

    assert pkg_file.exists()
    assert pkg_file.stat().st_size > 0

    # Inspect zip contents
    with zipfile.ZipFile(pkg_file, "r") as zf:
        names = zf.namelist()
        assert "manifest.json" in names
        assert "capsule.yaml" in names
        assert "src/main.bbc" in names

    # Unpack into target
    dest_dir = tmp_path / "unpacked"
    state = CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=True)

    assert state["capsule_id"] == "test-capsule"
    assert state["authorized"] is False
    assert (dest_dir / "src/main.bbc").exists()
    assert (dest_dir / ".capsule_state.json").exists()


def test_anti_autorun_blocks_unauthorized_execution(sample_capsule_dir: Path, tmp_path: Path):
    """Test that execution fails with UnauthorizedCapsuleExecutionError prior to authorization."""
    pkg_file = tmp_path / "test.ucapsule"
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file)

    dest_dir = tmp_path / "unpacked"
    CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=True)

    runner = CapsuleRunner(dest_dir)
    with pytest.raises(UnauthorizedCapsuleExecutionError) as exc_info:
        runner.execute(lambda: "should not run")
    assert "quarantined or unauthorized" in str(exc_info.value)


def test_explicit_authorization_gate(sample_capsule_dir: Path, tmp_path: Path):
    """Test that explicit authorization allows execution."""
    pkg_file = tmp_path / "test.ucapsule"
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file)

    dest_dir = tmp_path / "unpacked"
    CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=True)

    assert not CapsulePackage.is_authorized(dest_dir)

    # Authorize explicitly
    auth_state = CapsulePackage.authorize_capsule(dest_dir, authorized_by="tester")
    assert auth_state["authorized"] is True
    assert auth_state["authorized_by"] == "tester"
    assert CapsulePackage.is_authorized(dest_dir)

    # Run should now succeed
    runner = CapsuleRunner(dest_dir)
    result = runner.execute(lambda: 42)
    assert result["status"] == "success"
    assert result["result"] == 42


def test_integrity_verification_failure(sample_capsule_dir: Path, tmp_path: Path):
    """Test that tampered files trigger CapsuleIntegrityError."""
    pkg_file = tmp_path / "test.ucapsule"
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file)

    # Tamper with archive contents
    tampered_pkg = tmp_path / "tampered.ucapsule"
    with zipfile.ZipFile(pkg_file, "r") as src_z:
        with zipfile.ZipFile(tampered_pkg, "w") as dst_z:
            for item in src_z.infolist():
                if item.filename == "src/main.bbc":
                    dst_z.writestr(item, b"CORRUPTED CONTENT")
                else:
                    dst_z.writestr(item, src_z.read(item.filename))

    dest_dir = tmp_path / "unpacked_tampered"
    with pytest.raises(CapsuleIntegrityError) as exc_info:
        CapsulePackage.unpack_capsule(tampered_pkg, dest_dir)
    assert "Integrity mismatch" in str(exc_info.value)


def test_permission_boundaries(sample_capsule_dir: Path, tmp_path: Path):
    """Test permission guards for network and filesystem write."""
    pkg_file = tmp_path / "test.ucapsule"
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file)

    dest_dir = tmp_path / "unpacked"
    CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=False)

    runner = CapsuleRunner(dest_dir)

    # Network violation
    with pytest.raises(CapsulePermissionError) as exc_net:
        runner.request_network()
    assert "Network access is denied" in str(exc_net.value)

    # Filesystem write violation
    with pytest.raises(CapsulePermissionError) as exc_fs:
        runner.request_file_write(dest_dir / "illegal_write.txt")
    assert "read_only" in str(exc_fs.value)


def test_execution_timeout_enforcement(sample_capsule_dir: Path, tmp_path: Path):
    """Test that runner enforces timeout_sec."""
    pkg_file = tmp_path / "test.ucapsule"
    # Set short timeout of 0.2s
    perms = CapsulePermissions(timeout_sec=0.2)
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file, permissions=perms)

    dest_dir = tmp_path / "unpacked"
    CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=False)

    runner = CapsuleRunner(dest_dir)

    def slow_task():
        time.sleep(1.0)
        return "done"

    with pytest.raises(CapsuleTimeoutError):
        runner.execute(slow_task)


def test_static_fallbacks(sample_capsule_dir: Path, tmp_path: Path):
    """Test static fallback resolution when an asset/skin is missing."""
    pkg_file = tmp_path / "test.ucapsule"
    fallbacks = {"display": "ascii-terminal-vdu", "skin": "teletext-classic"}
    CapsulePackage.pack_capsule(sample_capsule_dir, pkg_file, static_fallbacks=fallbacks)

    dest_dir = tmp_path / "unpacked"
    CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=False)

    runner = CapsuleRunner(dest_dir)
    assert runner.resolve_fallback("display", "high-res-3d") == "ascii-terminal-vdu"
    assert runner.resolve_fallback("skin", "futuristic") == "teletext-classic"
    assert runner.resolve_fallback("other", "default_val") == "default_val"


def test_pack_existing_nethack_capsule(tmp_path: Path):
    """Test packaging the actual real-world programs/nethack capsule."""
    repo_root = Path(__file__).resolve().parent.parent
    nethack_dir = repo_root / "programs" / "nethack"
    assert nethack_dir.exists()

    pkg_file = tmp_path / "nethack.ucapsule"
    CapsulePackage.pack_capsule(nethack_dir, pkg_file)
    assert pkg_file.exists()

    dest_dir = tmp_path / "unpacked_nethack"
    state = CapsulePackage.unpack_capsule(pkg_file, dest_dir, quarantine=True)
    assert state["capsule_id"] == "nethack"
    assert state["authorized"] is False
    assert (dest_dir / "src" / "nethack.bbc").exists()
    assert (dest_dir / "lens" / "nethack_lens.py").exists()
