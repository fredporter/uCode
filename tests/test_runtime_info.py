"""Runtime capability manifest contract tests."""

from ucode_runtime.runtime_info import RUNTIME_CONTRACT, runtime_info


def test_runtime_info_declares_current_contract_and_library_detail() -> None:
    info = runtime_info()
    assert info["format"] == RUNTIME_CONTRACT == "ucode-runtime/1"
    assert info["revision"]
    assert "ucode-session/1" in info["protocols"]
    assert "software-library.title-detail" in info["capabilities"]
    assert info["provider"] == "ucode"

