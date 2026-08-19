# BBC BASIC Module for uCode1
#
# This module provides BBC BASIC integration for the uDos ecosystem.
# It includes a Python-based BBC BASIC interpreter and integration with
# Matrix Brandy (C-based BBC BASIC interpreter).

__version__ = "0.1.0"
__author__ = "uDos Development Team"
__license__ = "MIT"

# uCode1 runtime control and spool extensions
from .rcp_bridge import RCPBridge, RCPCommand, RCPCommandType, RCPResponse, create_rcp_bridge
from .spool_bridge import SpoolBridge, SpoolEnvelope, SpoolHeader, create_spool_bridge

# Brandy Integration
try:
    from .brandy import BrandyBridge, BrandyInterpreter
    BRANDY_AVAILABLE = True
except ImportError:
    BRANDY_AVAILABLE = False
    BrandyBridge = None
    BrandyInterpreter = None

# Exports
__all__ = [
    # RCP
    "RCPBridge",
    "RCPCommand",
    "RCPCommandType",
    "RCPResponse",
    "create_rcp_bridge",
    # Spool
    "SpoolBridge",
    "SpoolEnvelope",
    "SpoolHeader",
    "create_spool_bridge",
    # Brandy
    "BRANDY_AVAILABLE",
    "BrandyBridge",
    "BrandyInterpreter",
]
