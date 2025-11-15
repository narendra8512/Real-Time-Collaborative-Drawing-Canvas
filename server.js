// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public folder 
app.use(express.static(path.join(__dirname, "public")));

// Global state
let history = [];    
let redoStack = [];  
const users = {};    // socketId : { id, color }

const palette = [
  "#e6194b","#3cb44b","#ffe119","#4363d8","#f58231","#911eb4",
  "#46f0f0","#f032e6","#bcf60c","#fabebe","#008080","#e6beff"
];

io.on("connection", (socket) => {
  const color = palette[Math.floor(Math.random() * palette.length)];
  users[socket.id] = { id: socket.id, color };

  // send initial state
  socket.emit("init", { history, users, yourId: socket.id });

  // broadcast users list to everyone
  io.emit("users", users);

  socket.on("beginPath", (data) => {
    const stroke = { ...data, userId: socket.id, points: data.points || [] };
    history.push(stroke);
    redoStack = [];
    io.emit("beginPath", stroke);
  });

  socket.on("drawPoint", (payload) => {
    const s = history.find(st => st.id === payload.strokeId);
    if (s) {
      s.points = s.points || [];
      s.points.push(payload.point);
    }
    socket.broadcast.emit("drawPoint", payload);
  });

  socket.on("endPath", ({ strokeId }) => {
    io.emit("endPath", { strokeId });
  });

  socket.on("undo", () => {
    if (history.length > 0) {
      const st = history.pop();
      redoStack.push(st);
      io.emit("history", history);
    }
  });

  socket.on("redo", () => {
    if (redoStack.length > 0) {
      const st = redoStack.pop();
      history.push(st);
      io.emit("history", history);
    }
  });

  socket.on("cursor", (payload) => {
    if (users[socket.id]) {
      users[socket.id].cursor = payload;
      socket.broadcast.emit("cursor", { id: socket.id, x: payload.x, y: payload.y, color: users[socket.id].color });
    }
  });

  socket.on("clearAll", () => {
    history = [];
    redoStack = [];
    io.emit("history", history);
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", users);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
