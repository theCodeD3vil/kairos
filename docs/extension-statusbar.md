# Extension Status Bar

Kairos v1 adds a live VS Code status bar item so the extension can show immediate tracking visibility without turning the extension into a separate analytics surface.

## What It Shows

The status bar item shows one compact primary state:

- `Kairos: 1h 24m today` when live tracking is active
- `Kairos: Idle` when Kairos is connected but not currently counting active time
- `Kairos: Tracking off` when desktop-owned settings disable tracking
- `Kairos: Connecting` while the extension is handshaking with the desktop app
- `Kairos: Reconnecting` while retry is in progress
- `Kairos: Buffering` when events are being retained locally because the desktop app is unavailable
- `Kairos: Disconnected` when the desktop app is unavailable and Kairos is not actively buffering

## How The Time Is Computed

The displayed total is a live extension-side estimate for **today's active Kairos coding time**.

- It is not a stopwatch from extension activation.
- It only grows from activity that passes the real runtime gates:
  - tracking enabled
  - focus-only mode
  - event category toggles
  - desktop-owned exclusions
  - privacy shaping before send
- It uses the desktop-owned idle timeout to bridge nearby retained activity into a continuous local estimate.
- If the extension is buffering events locally, retained buffered activity still contributes to the live total.

The desktop app remains the canonical persisted source of truth. The status bar is for immediate visibility, not final reporting.

## Tooltip

The hover tooltip includes:

- today's live tracked time
- current runtime state
- connection state
- tracking enabled or disabled
- buffered queue count when relevant
- machine name
- extension version
- last successful handshake
- last successful send
- last event time
- file path mode
- heartbeat interval
- focus-only tracking mode

## Click Action

Clicking the status bar opens a Kairos action picker with:

- Open Kairos Desktop
- Refresh Kairos Settings
- Reconnect to Kairos Desktop
- Show Kairos Status
- Show Kairos Output

`Open Kairos Desktop` is best-effort. If automatic launch is not available on the current machine, the command tells the user to open the desktop app manually.

## Known Limits

- The live total is local to the running extension session and is not a replacement for persisted desktop totals.
- The extension does not yet receive push updates from the desktop app; it refreshes settings on handshake, reconnect, and manual refresh.
- The extension does not yet open a specific desktop dashboard route. The desktop launch command only attempts to open or focus the app.
