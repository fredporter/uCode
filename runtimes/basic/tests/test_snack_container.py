"""Tests for the uCode1 Snack Container Format.
(snack.yaml, loader, registry, snackpack)."""

import tempfile
from pathlib import Path

import pytest
import yaml

from core_py.snack_container.manifest import (
    SnackManifest,
    load_manifest,
    save_manifest,
    validate_manifest,
)
from core_py.snack_container.registry import SnackRegistry, SnackId
from core_py.snack_container.loader import SnackLoader, LoadError


@pytest.fixture
def sample_manifest_dict():
    """A complete snack.yaml as a dict."""
    return {
        "name": "Test Adventure",
        "version": "1.0.0",
        "lane": "ucode1",
        "container_type": "snack",
        "origin": {
            "platform": "apple2",
            "media": ["disks/test.dsk"],
            "checksum": "sha256:abc123",
            "preservation_level": "bit_accurate",
        },
        "runtime": {
            "emulator": "bbc_basic",
            "memory": "32K",
            "disk_drive_speed": "1x",
        },
        "lens": {
            "enabled": True,
            "capture_intervals": ["frame", "room_change"],
            "variable_patterns": ["^HP%$", "^GOLD%$"],
            "memory_regions": [
                {"name": "tilemap", "address": "0x6000", "size": 225,
                 "description": "15x15 grid"}
            ],
            "export_format": "spool",
        },
        "skin": {
            "default": "teletext_classic",
            "available": ["teletext_classic", "paper_retro"],
            "targets": ["thinui", "ceefax_thinui"],
        },
        "rcp": {
            "commands": [
                {"name": "pause", "description": "Pause game"},
                {"name": "save", "description": "Save state"},
            ]
        },
        "depends_on": [
            {"name": "bbc_basic_runtime", "version": "1.0.0"}
        ],
        "entrypoint": "scripts/boot.bbc",
        "description": "A test adventure game",
        "tags": ["adventure", "test"],
    }


@pytest.fixture
def sample_manifest(sample_manifest_dict):
    """A complete SnackManifest object."""
    return SnackManifest.from_dict(sample_manifest_dict)


@pytest.fixture
def temp_dir():
    """A temporary directory for file operations."""
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


# ── Manifest Tests ──


class TestSnackManifest:

    def test_from_dict_full(self, sample_manifest_dict):
        m = SnackManifest.from_dict(sample_manifest_dict)
        assert m.name == "Test Adventure"
        assert m.version == "1.0.0"
        assert m.lane == "ucode1"
        assert m.container_type == "snack"
        assert m.entrypoint == "scripts/boot.bbc"
        assert m.description == "A test adventure game"
        assert m.tags == ["adventure", "test"]

    def test_from_dict_origin(self, sample_manifest):
        assert sample_manifest.origin.platform == "apple2"
        assert sample_manifest.origin.media == ["disks/test.dsk"]
        assert sample_manifest.origin.checksum == "sha256:abc123"

    def test_from_dict_runtime(self, sample_manifest):
        assert sample_manifest.runtime.emulator == "bbc_basic"
        assert sample_manifest.runtime.memory == "32K"

    def test_from_dict_lens(self, sample_manifest):
        assert sample_manifest.lens.enabled is True
        assert sample_manifest.lens.capture_intervals == (
            ["frame", "room_change"])
        assert sample_manifest.lens.variable_patterns == (
            ["^HP%$", "^GOLD%$"])
        assert sample_manifest.lens.export_format == "spool"
        assert len(sample_manifest.lens.memory_regions) == 1

    def test_from_dict_skin(self, sample_manifest):
        assert sample_manifest.skin.default == "teletext_classic"
        assert sample_manifest.skin.available == (
            ["teletext_classic", "paper_retro"])

    def test_from_dict_rcp(self, sample_manifest):
        assert len(sample_manifest.rcp.commands) == 2
        assert sample_manifest.rcp.commands[0].name == "pause"

    def test_from_dict_dependencies(self, sample_manifest):
        assert len(sample_manifest.depends_on) == 1
        assert sample_manifest.depends_on[0].name == "bbc_basic_runtime"

    def test_to_dict_roundtrip(self, sample_manifest_dict):
        m = SnackManifest.from_dict(sample_manifest_dict)
        result = m.to_dict()
        assert result["name"] == sample_manifest_dict["name"]
        assert result["version"] == sample_manifest_dict["version"]
        assert result["lens"]["enabled"] == (
            sample_manifest_dict["lens"]["enabled"])

    def test_from_dict_minimal(self):
        m = SnackManifest.from_dict({
            "name": "Minimal", "version": "1.0.0",
            "entrypoint": "main.bbc",
        })
        assert m.name == "Minimal"
        assert m.lane == "ucode1"
        assert m.container_type == "snack"


# ── IO Tests ──


class TestManifestIO:

    def test_save_and_load_yaml(self, sample_manifest, temp_dir):
        path = temp_dir / "snack.yaml"
        save_manifest(sample_manifest, path)
        assert path.exists()
        loaded = load_manifest(path)
        assert loaded.name == sample_manifest.name

    def test_load_nonexistent(self, temp_dir):
        with pytest.raises(FileNotFoundError):
            load_manifest(temp_dir / "nonexistent.yaml")


# ── Validation Tests ──


class TestValidateManifest:

    def test_valid_manifest(self, sample_manifest):
        errors = validate_manifest(sample_manifest)
        assert errors == []

    def test_missing_name(self):
        m = SnackManifest(version="1.0.0", entrypoint="main.bbc")
        errors = validate_manifest(m)
        assert "name is required" in errors

    def test_missing_entrypoint(self):
        m = SnackManifest(name="Test", version="1.0.0")
        errors = validate_manifest(m)
        assert "entrypoint is required" in errors


# ── Registry Tests ──


class TestSnackRegistry:

    def test_register_and_find(self, temp_dir, sample_manifest_dict):
        snack_dir = temp_dir / "snacks" / "test_adventure"
        snack_dir.mkdir(parents=True)
        manifest_path = snack_dir / "snack.yaml"
        with open(manifest_path, "w") as f:
            yaml.safe_dump(sample_manifest_dict, f)
        registry = SnackRegistry()
        sid = registry.register(manifest_path)
        assert sid.name == "Test Adventure"
        entry = registry.find("Test Adventure")
        assert entry is not None

    def test_find_nonexistent(self):
        registry = SnackRegistry()
        assert registry.find("Nonexistent") is None

    def test_unregister(self, temp_dir, sample_manifest_dict):
        snack_dir = temp_dir / "snacks" / "test"
        snack_dir.mkdir(parents=True)
        manifest_path = snack_dir / "snack.yaml"
        with open(manifest_path, "w") as f:
            yaml.safe_dump(sample_manifest_dict, f)
        registry = SnackRegistry()
        sid = registry.register(manifest_path)
        assert registry.find("Test Adventure") is not None
        result = registry.unregister(sid)
        assert result is True
        assert registry.find("Test Adventure") is None

    def test_list(self, temp_dir):
        registry = SnackRegistry()
        for name in ["Game1", "Game2"]:
            d = {
                "name": name, "version": "1.0.0", "lane": "ucode1",
                "entrypoint": "main.bbc",
                "runtime": {"emulator": "bbc_basic"},
            }
            snack_dir = temp_dir / "snacks" / name
            snack_dir.mkdir(parents=True)
            manifest_path = snack_dir / "snack.yaml"
            with open(manifest_path, "w") as f:
                yaml.safe_dump(d, f)
            registry.register(manifest_path)
        entries = registry.list()
        assert len(entries) == 2


# ── Loader Tests ──


class TestSnackLoader:

    def test_load_manifest(self, temp_dir, sample_manifest_dict):
        snack_dir = temp_dir / "snacks" / "test"
        snack_dir.mkdir(parents=True)
        manifest_path = snack_dir / "snack.yaml"
        with open(manifest_path, "w") as f:
            yaml.safe_dump(sample_manifest_dict, f)
        loader = SnackLoader(sandbox_root=temp_dir / "sandbox")
        loaded = loader.load(manifest_path)
        assert loaded.manifest.name == "Test Adventure"
        assert loaded.sandbox_root.exists()

    def test_load_nonexistent(self, temp_dir):
        loader = SnackLoader()
        with pytest.raises(LoadError):
            loader.load(temp_dir / "nonexistent.yaml")


# ── SnackId Tests ──


class TestSnackId:

    def test_from_string(self):
        sid = SnackId.from_string("eamon@1.0.0")
        assert sid.name == "eamon"
        assert sid.version == "1.0.0"

    def test_from_string_invalid(self):
        with pytest.raises(ValueError):
            SnackId.from_string("invalid")

    def test_str(self):
        sid = SnackId(name="eamon", version="1.0.0")
        assert str(sid) == "eamon@1.0.0"

    def test_hash(self):
        sid1 = SnackId(name="eamon", version="1.0.0")
        sid2 = SnackId(name="eamon", version="1.0.0")
        assert hash(sid1) == hash(sid2)
        assert sid1 == sid2