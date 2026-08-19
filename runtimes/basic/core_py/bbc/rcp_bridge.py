"""
RCP Bridge — Runtime Control Protocol for uCode1

RCP commands control the snack externally (from CLI, another snack, or a UI).
This bridge allows BBC BASIC programs to poll for and respond to RCP commands.

BBC BASIC extensions:

    FN_RCP_Poll()           — Check for pending RCP command, returns string
    PROC_RCP_Respond(result$) — Send response back to RCP caller

RCP commands from external sources:
    PAUSE, RESUME, SAVE, RESTORE, EXPORT_SPOOL, INSPECT, EVAL, QUIT
"""

import json
import time
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class RCPCommandType(Enum):
    """Standard RCP command types"""
    PAUSE = "PAUSE"
    RESUME = "RESUME"
    SAVE = "SAVE"
    RESTORE = "RESTORE"
    EXPORT_SPOOL = "EXPORT_SPOOL"
    INSPECT = "INSPECT"
    EVAL = "EVAL"
    QUIT = "QUIT"
    SKIN = "SKIN"
    STEP = "STEP"
    LIST_SNACKS = "LIST_SNACKS"
    UNKNOWN = "UNKNOWN"


@dataclass
class RCPCommand:
    """A parsed RCP command"""
    command: str
    command_type: RCPCommandType
    args: Dict[str, str] = field(default_factory=dict)
    raw: str = ""
    source: str = "external"
    request_id: str = ""


@dataclass
class RCPResponse:
    """A response to an RCP command"""
    success: bool
    result: str = ""
    error: str = ""
    request_id: str = ""


class RCPBridge:
    """
    RCP command bridge for BBC BASIC programs.

    Provides a polling interface for BASIC programs to check for
    and respond to external RCP commands.
    """

    # Standard RCP commands that can be parsed
    STANDARD_COMMANDS = {
        "PAUSE": RCPCommandType.PAUSE,
        "RESUME": RCPCommandType.RESUME,
        "SAVE": RCPCommandType.SAVE,
        "RESTORE": RCPCommandType.RESTORE,
        "EXPORT_SPOOL": RCPCommandType.EXPORT_SPOOL,
        "INSPECT": RCPCommandType.INSPECT,
        "EVAL": RCPCommandType.EVAL,
        "QUIT": RCPCommandType.QUIT,
        "SKIN": RCPCommandType.SKIN,
        "STEP": RCPCommandType.STEP,
        "LIST_SNACKS": RCPCommandType.LIST_SNACKS,
    }

    def __init__(self, interpreter=None):
        """
        Initialize RCP bridge.

        Args:
            interpreter: Optional BBCBasicInterpreter to attach to
        """
        self.interpreter = interpreter
        self._pending_commands: List[RCPCommand] = []
        self._responses: List[RCPResponse] = []
        self._external_command_source: Optional[Callable[[], Optional[str]]] = None
        self._on_command_callbacks: List[Callable[[RCPCommand], Optional[str]]] = []
        self._enabled: bool = True

        # Auto-attach if interpreter provided
        if interpreter is not None:
            self.attach_to_interpreter(interpreter)

    # ── Configuration ──────────────────────────────────────────────

    def enable(self) -> None:
        """Enable RCP polling"""
        self._enabled = True

    def disable(self) -> None:
        """Disable RCP polling"""
        self._enabled = False

    def set_external_source(self, source_fn: Callable[[], Optional[str]]) -> None:
        """
        Set an external function that provides RCP commands.

        This can be connected to a gRPC server, Unix socket, or stdin.

        Args:
            source_fn: Function that returns a command string or None
        """
        self._external_command_source = source_fn

    def add_command_callback(self, callback: Callable[[RCPCommand], Optional[str]]) -> None:
        """
        Register a callback for when commands are received.

        The callback receives the RCPCommand and can return a response string.

        Args:
            callback: Function that processes a command and returns optional response
        """
        self._on_command_callbacks.append(callback)

    # ── Command Queue ─────────────────────────────────────────────

    def queue_command(self, command_str: str, source: str = "external") -> RCPCommand:
        """
        Queue an RCP command for the BASIC program to poll.

        Args:
            command_str: Raw command string (e.g., "PAUSE" or "SAVE slot=dungeon1")
            source: Source identifier

        Returns:
            The parsed RCPCommand
        """
        cmd = self._parse_command(command_str, source)
        self._pending_commands.append(cmd)
        return cmd

    def _parse_command(self, raw: str, source: str = "external") -> RCPCommand:
        """Parse a raw command string into an RCPCommand"""
        raw = raw.strip()
        parts = raw.split(None, 1)  # Split on first whitespace
        cmd_name = parts[0].upper() if parts else ""
        args_str = parts[1] if len(parts) > 1 else ""

        # Parse args (key=value pairs)
        args: Dict[str, str] = {}
        if args_str:
            for arg_part in args_str.split():
                if "=" in arg_part:
                    key, value = arg_part.split("=", 1)
                    args[key] = value
                else:
                    # Positional argument
                    args["value"] = arg_part

        cmd_type = self.STANDARD_COMMANDS.get(cmd_name, RCPCommandType.UNKNOWN)

        return RCPCommand(
            command=cmd_name,
            command_type=cmd_type,
            args=args,
            raw=raw,
            source=source,
            request_id=f"rcp_{int(time.time() * 1000)}"
        )

    # ── Polling (for BBC BASIC) ───────────────────────────────────

    def poll(self) -> str:
        """
        Check for a pending RCP command.

        This is the implementation of FN_RCP_Poll.
        Returns the command string if available, or empty string if none.

        Returns:
            Command string (e.g., "PAUSE", "SAVE slot=dungeon1") or ""
        """
        if not self._enabled:
            return ""

        # Check external source first
        if self._external_command_source:
            try:
                ext_cmd = self._external_command_source()
                if ext_cmd:
                    self.queue_command(ext_cmd, source="external")
            except Exception:
                pass

        # Return next pending command
        if self._pending_commands:
            cmd = self._pending_commands.pop(0)

            # Notify callbacks
            response = None
            for cb in self._on_command_callbacks:
                try:
                    result = cb(cmd)
                    if result is not None:
                        response = result
                except Exception:
                    pass

            # If there's a response, queue it
            if response is not None:
                self._responses.append(RCPResponse(
                    success=True,
                    result=response,
                    request_id=cmd.request_id
                ))

            return cmd.raw

        return ""

    def respond(self, result: str) -> None:
        """
        Send a response back to the RCP caller.

        This is the implementation of PROC_RCP_Respond.

        Args:
            result: Response string
        """
        self._responses.append(RCPResponse(
            success=True,
            result=result,
            request_id=f"resp_{int(time.time() * 1000)}"
        ))

    # ── Command Processing ────────────────────────────────────────

    def process_command(self, cmd: RCPCommand) -> Optional[str]:
        """
        Process a command and return a response.

        This handles standard commands that don't need BASIC program involvement.

        Args:
            cmd: The RCP command to process

        Returns:
            Response string or None if the command needs BASIC handling
        """
        if cmd.command_type == RCPCommandType.PAUSE:
            if self.interpreter:
                self.interpreter.stop()
            return "OK: paused"

        elif cmd.command_type == RCPCommandType.RESUME:
            if self.interpreter:
                self.interpreter.state.running = True
            return "OK: resumed"

        elif cmd.command_type == RCPCommandType.QUIT:
            if self.interpreter:
                self.interpreter.stop()
            return "OK: quit"

        elif cmd.command_type == RCPCommandType.INSPECT:
            var_name = cmd.args.get("value", "")
            if self.interpreter and var_name:
                value = self.interpreter.state.variables.get(var_name, "undefined")
                return f"{var_name} = {value}"
            return "ERROR: variable not found"

        elif cmd.command_type == RCPCommandType.EVAL:
            expr = cmd.args.get("value", "")
            if self.interpreter and expr:
                try:
                    result = self.interpreter.evaluate(expr)
                    return f"= {result}"
                except Exception as e:
                    return f"ERROR: {e}"
            return "ERROR: no expression"

        elif cmd.command_type == RCPCommandType.LIST_SNACKS:
            return "OK: snack listing not implemented in BASIC mode"

        # Commands that need BASIC program handling
        return None

    # ── Response Queue ────────────────────────────────────────────

    def get_response(self) -> Optional[RCPResponse]:
        """Get the next pending response"""
        if self._responses:
            return self._responses.pop(0)
        return None

    def get_responses_json(self) -> str:
        """Get all responses as JSON"""
        return json.dumps([
            {"success": r.success, "result": r.result, "error": r.error}
            for r in self._responses
        ], indent=2)

    def clear_responses(self) -> None:
        """Clear all pending responses"""
        self._responses.clear()

    def clear_commands(self) -> None:
        """Clear all pending commands"""
        self._pending_commands.clear()

    # ── Integration ───────────────────────────────────────────────

    def attach_to_interpreter(self, interpreter) -> None:
        """
        Attach this RCP bridge to a BBC BASIC interpreter.

        This wires up the FN_RCP_Poll and PROC_RCP_Respond handlers.

        Args:
            interpreter: BBCBasicInterpreter instance
        """
        self.interpreter = interpreter
        interpreter._rcp_bridge = self

        # Add RCP keywords to interpreter's keyword list
        rcp_keywords = [
            "FN_RCP_Poll",
            "PROC_RCP_Respond",
        ]
        for kw in rcp_keywords:
            if kw not in interpreter._keywords:
                interpreter._keywords.append(kw)


# Convenience functions

def create_rcp_bridge(interpreter=None) -> RCPBridge:
    """Create and return a new RCP bridge"""
    return RCPBridge(interpreter)
