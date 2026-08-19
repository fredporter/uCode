"""Behavior tests for uCode's internal Runtime Control Protocol bridge."""

from core_py.bbc.rcp_bridge import RCPBridge, RCPCommandType, create_rcp_bridge


def test_factory_creates_bridge():
    assert isinstance(create_rcp_bridge(), RCPBridge)


def test_queue_parses_command_and_arguments():
    bridge = create_rcp_bridge()
    command = bridge.queue_command("SAVE slot=dungeon1", source="test")

    assert command.command == "SAVE"
    assert command.command_type is RCPCommandType.SAVE
    assert command.args == {"slot": "dungeon1"}
    assert command.source == "test"
    assert command.request_id.startswith("rcp_")


def test_poll_runs_callback_and_queues_response():
    bridge = create_rcp_bridge()
    bridge.add_command_callback(lambda command: f"handled:{command.command}")
    bridge.queue_command("PAUSE")

    assert bridge.poll() == "PAUSE"
    response = bridge.get_response()
    assert response is not None
    assert response.success is True
    assert response.result == "handled:PAUSE"


def test_disabled_bridge_keeps_commands_pending():
    bridge = create_rcp_bridge()
    bridge.queue_command("RESUME")
    bridge.disable()

    assert bridge.poll() == ""
    bridge.enable()
    assert bridge.poll() == "RESUME"


def test_unknown_command_is_explicit():
    command = create_rcp_bridge().queue_command("NOT_A_COMMAND")
    assert command.command_type is RCPCommandType.UNKNOWN
