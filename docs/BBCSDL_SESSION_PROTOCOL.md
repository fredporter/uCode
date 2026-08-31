# BBCSDL Session Protocol

**Status:** Sprint 1 implementation contract  
**Version:** `ucode-session/1`  
**Date:** 2026-08-26

## Purpose

This protocol connects a uCore host surface to a uCode 1 runtime session. It
keeps shell PTY, BBCSDL, and later Runtime Capsule engines behind one lifecycle
without pretending that their internal command languages are identical.

The first transport is JSON messages over WebSocket. Message semantics are
transport independent so tests and future local-process clients can use the
same contract.

## Session kinds

- `shell` — local shell PTY for development commands.
- `bbcsdl` — BBC BASIC language runtime, with an explicit `console` or `sdl`
  engine. The session name is retained for protocol compatibility.
- `capsule` — a Software Library Runtime Capsule.

## Client messages

Every message has `protocol: "ucode-session/1"` and a `type`.

### Start

```json
{
  "protocol": "ucode-session/1",
  "type": "start",
  "session": "bbcsdl",
  "engine": "console",
  "cols": 40,
  "rows": 25,
  "program": null
}
```

`engine: "console"` is the canonical Terminal engine: it shares the BBC BASIC
interpreter, runs in a PTY, accepts immediate commands, and emits VT100/VDU
text. `engine: "sdl"` is used for graphics, sound, sprites, BOBs, and games;
its canonical output will be `frame` or semantic VDU state rather than stdout.

`program` is a catalogue/capsule program reference or an approved path already
resolved by the host. Raw arbitrary host paths are not accepted from remote
clients.

### Input

```json
{
  "protocol": "ucode-session/1",
  "type": "input",
  "channel": "keyboard",
  "data": "PRINT 42\r"
}
```

Channels are `keyboard`, `pointer`, `touch`, `controller`, and `control`.
Pointer/touch/controller payloads use structured `event` objects rather than
encoding browser events as strings.

### Resize

```json
{
  "protocol": "ucode-session/1",
  "type": "resize",
  "cols": 40,
  "rows": 25,
  "width": 1280,
  "height": 720
}
```

### Lifecycle

```json
{ "protocol": "ucode-session/1", "type": "pause" }
{ "protocol": "ucode-session/1", "type": "resume" }
{ "protocol": "ucode-session/1", "type": "reset" }
{ "protocol": "ucode-session/1", "type": "stop" }
{ "protocol": "ucode-session/1", "type": "status" }
```

## Server messages

### State

```json
{
  "protocol": "ucode-session/1",
  "type": "state",
  "state": "ready",
  "session": "bbcsdl",
  "engine": "console",
  "capabilities": {
    "keyboard": true,
    "pointer": true,
    "resize": true,
    "snapshot": false
  }
}
```

States are `probing`, `unavailable`, `starting`, `ready`, `running`, `paused`,
`stopping`, `stopped`, and `error`.

### Output

```json
{
  "protocol": "ucode-session/1",
  "type": "output",
  "channel": "text",
  "data": "42\r\n"
}
```

Output channels are `text`, `grid`, `frame`, `audio`, `lens`, `log`, and
`diagnostic`. Binary frames/audio may use a negotiated binary transport later;
the message still carries their metadata.

### Error

```json
{
  "protocol": "ucode-session/1",
  "type": "error",
  "code": "engine_unavailable",
  "message": "BBCSDL is not installed",
  "recoverable": true
}
```

## Compatibility rules

- Unknown message types return `unsupported_event` without terminating a
  healthy session.
- Invalid dimensions and malformed structured input return `invalid_message`.
- A session reports `unavailable` before accepting program input when its
  engine or required media cannot be resolved.
- Stop is idempotent and must reap child processes.
- Output ordering is preserved per channel.
- Engine-specific options are declared as capabilities; clients do not infer
  them from product names.
- The runtime never claims BBCSDL support merely because a protocol mock is
  available. Probe results distinguish `engine`, `fixture`, and `unavailable`.

## Sprint 1 acceptance fixture

The automated fixture launches an executable process that implements the
stdio portion of this contract. The real-engine acceptance test is separately
marked and runs only when `UCODE_BBCSDL_PATH` points to a verified BBCSDL
installation. Passing fixture tests proves orchestration, not BBCSDL language
compatibility.

The macOS BBCBasic distribution inspected on 2026-08-26 ships tokenised `.bbc`
programs. uCode also contains plain-text `.bbc` source. The runtime therefore
must classify source format and use a tested loader/bootstrap or tokenizer;
passing an arbitrary `.bbc` pathname directly to the executable is not a
portable compatibility contract. Likewise, BBCSDL is an SDL application: text
stdout is optional diagnostic output, not the canonical 40x25 display. A frame
or VDU-state adapter is required before visual runtime compatibility is marked
complete.

## Capsule implementation checkpoint (2026-08-30)

`session: "capsule"` now resolves a curated `titleId` through the Software
Library. Clients cannot supply an arbitrary host program path. BBC Console
capsules wait for the interpreter prompt, perform `LOAD` and `RUN`, and expose
keyboard, pointer, touch and controller channels; non-keyboard events use an
explicit key-equivalent mapping until a title provides a native connector.

The console adapter owns terminal cursor-status negotiation inside the PTY, so
clients receive program output rather than terminal-protocol chatter. The
`basic-lab` fixture verifies start, mixed touch/keyboard input, text output,
status and stop over the real WebSocket. Snapshot/restore and native pointer
state remain later lifecycle capabilities.
