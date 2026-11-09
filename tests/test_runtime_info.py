"""Runtime capability manifest contract tests."""

from ucode_runtime.runtime_info import RUNTIME_CONTRACT, runtime_info


def test_runtime_info_declares_current_contract_and_library_detail() -> None:
    info = runtime_info()
    assert info["format"] == RUNTIME_CONTRACT == "ucode-runtime/1"
    assert info["revision"]
    assert "ucode-session/1" in info["protocols"]
    assert "software-library.title-detail" in info["capabilities"]
    assert info["provider"] == "ucode"
    assert "terminal.basic-immediate" in info["capabilities"]
    assert "terminal.shell" not in info["capabilities"]



def test_language_inventory_reports_missing_bridges_without_invented_commands():
    from ucode_runtime.runtime_info import language_reference
    reference = language_reference()
    inventory = reference['capability_inventory']
    assert inventory['owner'] == 'ucode'
    assert inventory['language_validation'] == 'native-engine'
    assert inventory['registered_bridges'] == []
    assert inventory['unavailable_integrations'] == ['vault', 'workflow']
    assert inventory['terminal_events'] == ['input', 'resize', 'stop']
