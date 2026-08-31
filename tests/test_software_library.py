import json

import ucode_runtime.software_library as software_library
from ucode_runtime.software_library import (
    catalogue_titles,
    launch_plan,
    load_catalogue,
    probe_capsule,
    title_detail,
    verify_capsule,
)


def test_catalogue_is_versioned_and_honest() -> None:
    catalogue = load_catalogue()
    assert catalogue["format"] == "ucode-library/1"
    titles = catalogue_titles()
    assert {title["id"] for title in titles} >= {"eamon", "repton", "elite", "nethack"}
    assert next(title for title in titles if title["id"] == "elite")["launchable"] is False


def test_configured_adaptation_requires_compatibility_evidence() -> None:
    plan = launch_plan("eamon")
    assert plan == {
        "id": "eamon",
        "launchable": False,
        "reason": "Compatibility evidence is not recorded",
    }


def test_research_capsule_refuses_to_pretend_it_is_playable() -> None:
    plan = launch_plan("elite")
    assert plan == {
        "id": "elite",
        "launchable": False,
        "reason": "User-supplied media required",
    }


def test_verified_fixture_has_matching_compatibility_evidence() -> None:
    probe = probe_capsule("basic-lab")
    assert probe == {
        "id": "basic-lab",
        "state": "available",
        "runtime": "bbc-console",
        "entry": True,
        "evidence": True,
        "launchable": True,
    }
    verification = verify_capsule("basic-lab")
    assert verification["verified"] is True
    assert verification["evidenceRecord"]["smoke"]["assertions"][-1] == "CAPSULE_SMOKE_OK"


def test_tampered_capsule_refuses_a_launch_plan(tmp_path, monkeypatch) -> None:
    library = tmp_path / "library"
    programs = tmp_path / "programs"
    library.mkdir()
    programs.mkdir()
    (programs / "tampered.bbc").write_text("PRINT 42\n", encoding="utf-8")
    (library / "evidence.json").write_text(
        json.dumps({"entrySha256": "not-the-entry-hash"}),
        encoding="utf-8",
    )
    (library / "catalogue.json").write_text(
        json.dumps(
            {
                "format": "ucode-library/1",
                "titles": [
                    {
                        "id": "tampered",
                        "status": "verified",
                        "runtime": "bbc-console",
                        "entry": "programs/tampered.bbc",
                        "evidence": "library/evidence.json",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(software_library, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(software_library, "CATALOGUE_PATH", library / "catalogue.json")

    verification = verify_capsule("tampered")
    assert verification["verified"] is False
    assert launch_plan("tampered") == {
        "id": "tampered",
        "launchable": False,
        "reason": "Entry checksum does not match compatibility evidence",
    }


def test_title_detail_exposes_bounded_source_learning_and_evidence() -> None:
    detail = title_detail("basic-lab")
    assert detail["format"] == "ucode-library-title/1"
    assert detail["source"]["available"] is True
    assert "CAPSULE_SMOKE_OK" in detail["source"]["text"]
    assert detail["evidence"]["entrySha256"]
    assert detail["media"]["state"] == "ready"

    eamon = title_detail("eamon")
    assert eamon["learning"][0]["path"].endswith("eamon_research.md")


def test_user_supplied_media_detail_never_exposes_a_host_path() -> None:
    elite = title_detail("elite")
    assert elite["source"] is None
    assert elite["media"]["state"] == "edition-required"
    assert elite["media"]["acceptedExtensions"] == [".ssd", ".dsd"]
