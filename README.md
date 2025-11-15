# Collaborative Canvas

## Install
1. npm install
2. npm start
3. Open http://localhost:3000 in multiple browser windows

## Features
- Real-time drawing (brush + eraser)
- Color and size controls
- Server-authoritative operation log
- Global undo/redo (server decides which operation to undo)
- Cursor indicators and online user list

## File structure
- server/: Node + Socket.IO server
- client/: static frontend (vanilla JS + canvas)

## How undo/redo works
- Server keeps operations[] and undoneStack.
- Undo marks the last non-removed op as removed and broadcasts op-removed.
- Redo pops undoneStack and re-broadcasts the op.

# Known Limitations / Bugs
- The brush tool is currently unstable and sometimes causes unexpected behavior while drawing. Due to this bug, it may stop working or overwrite canvas states incorrectly. Needs debugging.

- Hexagon Shape Not Rendering Smoothly
The hexagon tool exists but does not draw with accurate geometry and may appear distorted depending on cursor movement.

- Cursor Sync Delay
In slow networks, other users’ cursor indicators may appear with a small delay.

- Stroke Overlapping Conflict
When multiple users draw at the same time in the same region, some strokes may override others due to the current event-handling order.

# Time Spent on the Project
- Total time invested: 3–4 days

    - Majority of time spent on:

        - Understanding and implementing real-time    WebSocket communication

        - Handling smooth canvas drawing and stroke syncing

        - Fixing cross-user synchronization issues

        - Designing basic tools (brush, shapes, eraser)

## Notes & improvements
- In production you should persist ops to DB, send diffs instead of full replays, and implement per-user undo policies if required.