"""uCode Capsule packaging, integrity verification, anti-autorun gate, and permissions engine.

Per uDOS Product Refactor Plan Section 11:
- Packaging into standalone .ucapsule archive with SHA-256 integrity manifest.
- Anti-autorun quarantine: imported capsules never autorun without explicit user authorization.
- Explicit resource, time, filesystem, and network permissions with static fallbacks.
- Licensing and attribution separation: retro title/runtime availability does not confer redistribution rights.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import time
import zipfile
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


class CapsuleError(Exception):
    """Base error for capsule operations."""


class CapsuleIntegrityError(CapsuleError):
    """Raised when capsule checksum manifest verification fails."""


class UnauthorizedCapsuleExecutionError(CapsuleError):
    """Raised when an unauthorized or quarantined capsule attempts execution."""


class CapsulePermissionError(CapsuleError):
    """Raised when a capsule violates its declared permission boundary."""


class CapsuleTimeoutError(CapsuleError):
    """Raised when a capsule exceeds its declared execution timeout."""


class CapsuleSecurityError(CapsuleError):
    """Raised when security boundaries such as path traversal are violated."""


@dataclass
class CapsulePermissions:
    """Declared permissions boundary for capsule execution."""
    filesystem: str = "read_only"  # "read_only", "scoped_write", "none"
    network: bool = False           # Network access strictly prohibited by default
    max_memory_mb: int = 64        # Memory limit in megabytes
    timeout_sec: float = 30.0      # Execution timeout in seconds

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> CapsulePermissions:
        if not data:
            return cls()
        return cls(
            filesystem=data.get("filesystem", "read_only"),
            network=bool(data.get("network", False)),
            max_memory_mb=int(data.get("max_memory_mb", 64)),
            timeout_sec=float(data.get("timeout_sec", 30.0)),
        )


@dataclass
class CapsuleLicensing:
    """Licensing and rights metadata."""
    runtime_license: str = "proprietary-retro-evaluation"
    redistributable: bool = False
    disclaimer: str = "Availability of source or binary does not confer redistribution rights."
    attribution: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> CapsuleLicensing:
        if not data:
            return cls()
        return cls(
            runtime_license=data.get("runtime_license", "proprietary-retro-evaluation"),
            redistributable=bool(data.get("redistributable", False)),
            disclaimer=data.get("disclaimer", "Availability of source or binary does not confer redistribution rights."),
            attribution=data.get("attribution", ""),
        )


def compute_file_sha256(file_path: Path) -> str:
    """Compute hex SHA-256 of a single file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def compute_bytes_sha256(data: bytes) -> str:
    """Compute hex SHA-256 of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def load_yaml_simple(path: Path) -> Dict[str, Any]:
    """Load YAML file using PyYAML if available or lightweight fallback parser."""
    try:
        import yaml
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except ImportError:
        result: Dict[str, Any] = {}
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and ":" in line:
                    k, v = line.split(":", 1)
                    result[k.strip()] = v.strip()
        return result


class CapsulePackage:
    """Manages packing, verification, authorization, and sandbox governance for uCode capsules."""

    EXCLUDED_PATTERNS = {
        ".DS_Store",
        "__pycache__",
        ".git",
        ".pytest_cache",
        ".capsule_state.json",
    }

    @classmethod
    def pack_capsule(
        cls,
        source_dir: Path,
        output_file: Path,
        permissions: Optional[CapsulePermissions] = None,
        licensing: Optional[CapsuleLicensing] = None,
        static_fallbacks: Optional[Dict[str, str]] = None,
    ) -> Path:
        """Package a capsule directory into a standalone .ucapsule archive with SHA-256 integrity manifest."""
        source_dir = Path(source_dir).resolve()
        output_file = Path(output_file).resolve()
        output_file.parent.mkdir(parents=True, exist_ok=True)

        capsule_yaml = source_dir / "capsule.yaml"
        if not capsule_yaml.exists():
            raise CapsuleError(f"Directory {source_dir} is missing capsule.yaml manifest")

        parsed_yaml = load_yaml_simple(capsule_yaml)
        capsule_id = parsed_yaml.get("id", source_dir.name)
        capsule_format = parsed_yaml.get("format", "ucode-capsule/1")

        if permissions is None:
            yaml_perms = parsed_yaml.get("permissions")
            permissions = CapsulePermissions.from_dict(yaml_perms)

        if licensing is None:
            yaml_licensing = parsed_yaml.get("licensing")
            licensing = CapsuleLicensing.from_dict(yaml_licensing)

        fallbacks = static_fallbacks or {
            "display": "ascii-terminal-vdu",
            "skin": "teletext-classic",
            "sound": "pc-speaker-fallback",
        }

        # Scan files and calculate checksums
        file_manifest: Dict[str, str] = {}
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in cls.EXCLUDED_PATTERNS]
            for f in files:
                if f in cls.EXCLUDED_PATTERNS or f.endswith(".pyc"):
                    continue
                full_path = Path(root) / f
                rel_path = full_path.relative_to(source_dir).as_posix()
                file_manifest[rel_path] = compute_file_sha256(full_path)

        manifest_data = {
            "format": capsule_format,
            "id": capsule_id,
            "version": parsed_yaml.get("version", "1.0.0"),
            "treatment": parsed_yaml.get("treatment", "enhanced"),
            "entry": parsed_yaml.get("runtime", {}).get("entry", "src/main.bbc"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "permissions": permissions.to_dict(),
            "licensing": licensing.to_dict(),
            "static_fallbacks": fallbacks,
            "integrity": {
                "manifest_version": 1,
                "algorithm": "sha256",
                "file_count": len(file_manifest),
                "files": file_manifest,
            },
        }

        with zipfile.ZipFile(output_file, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for rel_path in sorted(file_manifest.keys()):
                abs_p = source_dir / rel_path
                zf.write(abs_p, arcname=rel_path)
            manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
            zf.writestr("manifest.json", manifest_bytes)

        return output_file

    @classmethod
    def unpack_capsule(
        cls,
        archive_path: Path,
        target_dir: Path,
        quarantine: bool = True,
    ) -> Dict[str, Any]:
        """Extract .ucapsule archive, verify SHA-256 checksums, and place into quarantined/unauthorized state."""
        archive_path = Path(archive_path).resolve()
        target_dir = Path(target_dir).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)

        if not archive_path.exists():
            raise CapsuleError(f"Capsule archive not found: {archive_path}")

        archive_sha256 = compute_file_sha256(archive_path)

        with zipfile.ZipFile(archive_path, "r") as zf:
            try:
                manifest_bytes = zf.read("manifest.json")
                manifest = json.loads(manifest_bytes.decode("utf-8"))
            except KeyError:
                raise CapsuleIntegrityError("Capsule package is missing required manifest.json")
            except Exception as e:
                raise CapsuleIntegrityError(f"Failed to parse capsule manifest: {e}")

            expected_files = manifest.get("integrity", {}).get("files", {})
            if not expected_files:
                raise CapsuleIntegrityError("Capsule manifest contains empty file integrity map")

            for member in zf.infolist():
                if member.filename == "manifest.json":
                    zf.extract(member, target_dir)
                    continue
                dest_path = (target_dir / member.filename).resolve()
                if not dest_path.is_relative_to(target_dir):
                    raise CapsuleSecurityError(f"Illegal path traversal detected: {member.filename}")
                zf.extract(member, target_dir)

        # Verify integrity of extracted files
        for rel_path, expected_hash in expected_files.items():
            extracted_file = target_dir / rel_path
            if not extracted_file.exists():
                raise CapsuleIntegrityError(f"Missing expected file in capsule: {rel_path}")
            actual_hash = compute_file_sha256(extracted_file)
            if actual_hash != expected_hash:
                raise CapsuleIntegrityError(
                    f"Integrity mismatch for {rel_path}: expected {expected_hash}, got {actual_hash}"
                )

        state = {
            "capsule_id": manifest.get("id"),
            "format": manifest.get("format"),
            "version": manifest.get("version"),
            "archive_sha256": archive_sha256,
            "unpacked_at": datetime.now(timezone.utc).isoformat(),
            "authorized": not quarantine,  # Default: quarantined (unauthorized)
            "authorized_at": None,
            "authorized_by": None,
            "permissions": manifest.get("permissions", CapsulePermissions().to_dict()),
            "licensing": manifest.get("licensing", CapsuleLicensing().to_dict()),
            "static_fallbacks": manifest.get("static_fallbacks", {}),
        }

        cls.write_capsule_state(target_dir, state)
        return state

    @staticmethod
    def get_state_file(capsule_dir: Path) -> Path:
        return Path(capsule_dir) / ".capsule_state.json"

    @classmethod
    def read_capsule_state(cls, capsule_dir: Path) -> Dict[str, Any]:
        """Read .capsule_state.json from an unpacked capsule directory."""
        state_file = cls.get_state_file(capsule_dir)
        if not state_file.exists():
            return {
                "capsule_id": capsule_dir.name,
                "authorized": False,
                "permissions": CapsulePermissions().to_dict(),
            }
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"capsule_id": capsule_dir.name, "authorized": False}

    @classmethod
    def write_capsule_state(cls, capsule_dir: Path, state: Dict[str, Any]) -> None:
        """Save .capsule_state.json."""
        state_file = cls.get_state_file(capsule_dir)
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    @classmethod
    def is_authorized(cls, capsule_dir: Path) -> bool:
        """Check if capsule has been granted execution authorization."""
        state = cls.read_capsule_state(capsule_dir)
        return bool(state.get("authorized", False))

    @classmethod
    def authorize_capsule(
        cls,
        capsule_dir: Path,
        authorized_by: str = "user",
        override_permissions: Optional[CapsulePermissions] = None,
    ) -> Dict[str, Any]:
        """Explicit authorization gate. Imported capsules cannot run until this is invoked."""
        capsule_dir = Path(capsule_dir).resolve()
        state = cls.read_capsule_state(capsule_dir)

        state["authorized"] = True
        state["authorized_at"] = datetime.now(timezone.utc).isoformat()
        state["authorized_by"] = authorized_by
        if override_permissions:
            state["permissions"] = override_permissions.to_dict()

        cls.write_capsule_state(capsule_dir, state)
        return state

    @classmethod
    def revoke_authorization(cls, capsule_dir: Path) -> Dict[str, Any]:
        """Revoke execution authorization for a capsule."""
        capsule_dir = Path(capsule_dir).resolve()
        state = cls.read_capsule_state(capsule_dir)
        state["authorized"] = False
        state["revoked_at"] = datetime.now(timezone.utc).isoformat()
        cls.write_capsule_state(capsule_dir, state)
        return state


class CapsuleRunner:
    """Execution harness enforcing the anti-autorun gate and permissions boundary."""

    def __init__(self, capsule_dir: Path):
        self.capsule_dir = Path(capsule_dir).resolve()
        self.state = CapsulePackage.read_capsule_state(self.capsule_dir)
        self.permissions = CapsulePermissions.from_dict(self.state.get("permissions"))
        self.fallbacks = self.state.get("static_fallbacks", {})

    def check_authorization(self) -> None:
        """Check anti-autorun gate; raise error if unauthorized."""
        if not self.state.get("authorized", False):
            capsule_id = self.state.get("capsule_id", self.capsule_dir.name)
            raise UnauthorizedCapsuleExecutionError(
                f"Capsule '{capsule_id}' is quarantined or unauthorized. "
                f"Explicit user authorization is required before execution."
            )

    def request_network(self) -> None:
        """Guard against network access."""
        if not self.permissions.network:
            raise CapsulePermissionError(
                f"Network access is denied by capsule permission boundary (network={self.permissions.network})"
            )

    def request_file_write(self, target_path: Path) -> None:
        """Guard against unauthorized filesystem writes."""
        target_path = Path(target_path).resolve()
        if self.permissions.filesystem == "none":
            raise CapsulePermissionError("Filesystem writes are completely disabled for this capsule")
        if self.permissions.filesystem == "read_only":
            raise CapsulePermissionError("Filesystem is configured read_only; write access denied")
        if self.permissions.filesystem == "scoped_write":
            storage_dir = (self.capsule_dir / "storage").resolve()
            if not target_path.is_relative_to(storage_dir):
                raise CapsulePermissionError(
                    f"Write access outside scoped storage directory is denied: {target_path}"
                )

    def resolve_fallback(self, component: str, requested: str) -> str:
        """Resolve a static fallback if the requested component/skin is unavailable."""
        if component in self.fallbacks:
            return self.fallbacks[component]
        return requested

    def execute(self, entrypoint_callable: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute capsule entrypoint while enforcing anti-autorun gate and timeout."""
        self.check_authorization()

        import concurrent.futures

        start_time = time.time()
        timeout = self.permissions.timeout_sec

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(entrypoint_callable, *args, **kwargs)
            try:
                result = future.result(timeout=timeout)
                return {
                    "status": "success",
                    "result": result,
                    "duration_sec": time.time() - start_time,
                    "capsule_id": self.state.get("capsule_id"),
                }
            except concurrent.futures.TimeoutError:
                raise CapsuleTimeoutError(
                    f"Capsule execution exceeded maximum allowed duration of {timeout} seconds"
                )
            except Exception as e:
                if isinstance(e, CapsuleError):
                    raise
                raise CapsuleError(f"Execution failed: {e}") from e
