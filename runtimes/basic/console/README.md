# BBC BASIC Console Runtime

This directory is the packaged host location for the official BBC BASIC
Console Mode executable. The GridCore Terminal launches this language executable directly. It does not start a host shell or require the user to type `basic` first. Legacy shell sessions may still expose `basic`/`bbcbasic` for compatibility.

The local macOS ARM64 build was produced from:

- upstream: `https://github.com/rtrussell/BBCSDL`
- commit: `6c302988ee2a08c5f9a65fa3eb8e76bcacc6079f`
- target: `console/macm1`
- upstream licence: zlib licence in `BBCSDL/licence.txt`

Release packaging must build the matching official Console target for each
host platform and place the executable here. The binary is a generated runtime
artifact, not a fork of the BBC BASIC language or interpreter.

The host exposes the installed language reference and capability inventory at
`GET /api/ucode/language`. BASIC syntax is validated by the native engine.
Vault and workflow language bridges are not registered; the inventory reports
these integrations as unavailable rather than supplying guessed keywords.

The Terminal transport accepts text input, integer resize dimensions from 1 to
512, and stop. Closing the connection stops the owned process. Leaving BASIC
closes the connection, and reconnecting creates a fresh in-memory program;
unsaved programs are not restored automatically. Startup failures release PTY
resources and never fall back to a shell.

Native acceptance covers `PRINT 83+7`, a numbered program with `LIST` and `RUN`,
and a fresh session. Compatibility shell tests are separate from the public
Terminal's language route.
