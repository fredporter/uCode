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
