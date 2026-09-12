"""uCode runtime route providers for host integration."""

from .bbcsdl import register_bbcsdl_routes
from .ceefax import CeefaxStore, register_ceefax_routes
from .terminal_runtime import handle_terminal_runtime_ws
from .session_runtime import handle_ucode_session_ws
from .runtime_info import register_runtime_info_routes
from .capsule_package import (
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

__all__ = [
    "CeefaxStore",
    "register_ceefax_routes",
    "register_bbcsdl_routes",
    "handle_terminal_runtime_ws",
    "handle_ucode_session_ws",
    "register_runtime_info_routes",
    "CapsulePackage",
    "CapsuleRunner",
    "CapsulePermissions",
    "CapsuleLicensing",
    "CapsuleError",
    "CapsuleIntegrityError",
    "UnauthorizedCapsuleExecutionError",
    "CapsulePermissionError",
    "CapsuleTimeoutError",
]
