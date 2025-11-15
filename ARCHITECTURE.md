collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js            # Drawing logic 
│
├── server.js          # Express + socket.io server
│
├── package.json
├── README.md
└── ARCHITECTURE.md


# High-Level Architecture

┌───────────────────┐  (Socket.io)        ┌──────────────────────┐
│     Client A      │  <─────────────>    │                      │
│  HTML + Canvas     │                    │      Node.js         │
│  JS Rendering      │  <────────────>    │  WebSocket Server    │
└───────────────────┘                     │   (socket.io)        │
                                          │                      │
┌───────────────────┐                     │ - Broadcast strokes  │
│     Client B      │  <─────────────>    │ - Manage rooms       │
│  Toolbar + Canvas │                     │ - Sync state         │
│  Socket Listener  │  <─────────────>    │                      │
└───────────────────┘                     └──────────────────────┘
