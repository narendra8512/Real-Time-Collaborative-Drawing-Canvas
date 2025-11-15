/* canvas.js
   Simple client for collaborative drawing using Socket.IO.
   - Streams strokes (beginPath + drawPoint)
   - Shows remote cursors
   - Global undo/redo via server history
   - Renders user list with assigned colors
*/

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");


const toolBtns = document.querySelectorAll(".tool");
let fillColor = document.querySelector("#fillColor");
let sizeSlider = document.querySelector("#slideSlider");
let colorBtns = document.querySelectorAll(".colors .option");
let colorPicker = document.querySelector("#colorPicker");
let clearCanvasBtn = document.querySelector(".clearCanvas");
let saveImg = document.querySelector("#saveAsImg");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");

// fallback sizes and values
let prevMouseX = 0, prevMouseY = 0, snapShot = null;
let selectedTool = "pencil", brushWidth = 5, selectedColor = "#000";
let isDrawing = false;

// ensure canvas fills container
function resizeCanvasToDisplay() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
window.addEventListener("resize", () => {
  // store current drawing
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  resizeCanvasToDisplay();
  ctx.putImageData(data, 0, 0);
});
resizeCanvasToDisplay();

// basic drawing tools
function getPointerPos(e) {
  // support touch and mouse
  if (e.touches && e.touches[0]) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
  } else {
    return { x: e.offsetX, y: e.offsetY };
  }
}

const drawLineLocal = (fromX, fromY, toX, toY, color, width) => {
  ctx.save();
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
};

//socket.io integration
let socket = null;
try { socket = io(); } catch (e) { console.warn("Socket.IO client not found — add <script src='/socket.io/socket.io.js'></script> before canvas.js"); }
let myId = null;
const remoteStrokes = {}; // strokeId : { id, userId, color, width, points[] }

const genStrokeId = () => `${socket?.id || 'local'}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

if (socket) {
  socket.on("connect", () => {
    myId = socket.id;
  });

  socket.on("init", (payload) => {
    myId = payload.yourId || myId;
    if (payload.history && payload.history.length) {
      rebuildFromHistory(payload.history);
    }
    renderUsers(payload.users || {});
  });

  socket.on("beginPath", (stroke) => {
    remoteStrokes[stroke.id] = stroke;
    if (stroke.points && stroke.points.length) drawStrokePartial(stroke);
  });

  socket.on("drawPoint", ({ strokeId, point }) => {
    const st = remoteStrokes[strokeId];
    if (!st) return;
    st.points = st.points || [];
    st.points.push(point);
    drawPointFromStroke(st, point);
  });

  socket.on("endPath", ({ strokeId }) => {

  });

  socket.on("history", (h) => {
    rebuildFromHistory(h);
  });

  socket.on("cursor", ({ id, x, y, color }) => {
    renderCursor(id, x, y, color);
  });

  socket.on("users", (users) => {
    renderUsers(users);
  });
}

//start / move / end drawing
let currentStrokeId = null;

function startDraw(e) {
  e.preventDefault();
  const p = getPointerPos(e);
  isDrawing = true;
  prevMouseX = p.x; prevMouseY = p.y;
  ctx.beginPath();
  ctx.lineWidth = brushWidth;
  ctx.strokeStyle = selectedColor;
  snapShot = ctx.getImageData(0,0,canvas.width,canvas.height);

  // local current stroke id and tell server
  currentStrokeId = genStrokeId();
  const strokeMeta = {
    id: currentStrokeId,
    tool: selectedTool,
    color: selectedColor,
    width: brushWidth,
    fill: !!(fillColor && fillColor.checked),
    points: [ { x: prevMouseX, y: prevMouseY } ]
  };
  if (socket) socket.emit("beginPath", strokeMeta);
}

// making each shapes
const drawRectangle = (e)=>{
    const width = prevMouseX - e.offsetX;
    const height = prevMouseY - e.offsetY;
    if(!fillColor.checked){
        return ctx.strokeRect(e.offsetX,e.offsetY,width,height);
    }
    ctx.fillRect(e.offsetX,e.offsetY,width,height);
};

const drawCircle = (e)=>{
    ctx.beginPath();
    let radius = Math.sqrt(Math.pow(prevMouseX - e.offsetX,2)+Math.pow(prevMouseY - e.offsetY,2));
    ctx.arc(prevMouseX,prevMouseY,radius,0,2 * Math.PI);
    fillColor.checked ? ctx.fill() : ctx.stroke();
};
const drawTriangle = (e)=>{
    ctx.beginPath();
    ctx.moveTo(prevMouseX,prevMouseY);
    ctx.lineTo(e.offsetX,e.offsetY);
    ctx.lineTo(prevMouseX*2-e.offsetX,e.offsetY);
    ctx.closePath();
    fillColor.checked ? ctx.fill() : ctx.stroke();
};
const drawSqure = (e)=>{
    const sideLength = Math.abs(prevMouseX - e.offsetX);
    ctx.beginPath();
    ctx.rect(e.offsetX, e.offsetY, sideLength, sideLength);
    fillColor.checked ? ctx.fill() : ctx.stroke();
};
const drawHexagon = (e)=>{
    const sideLength = Math.abs(prevMouseX-e.offsetX);
    ctx.beginPath();
    for(let i=0; i<6; i++){
        const angle = ((2*Math.PI)/6) * i;
        const x = e.offsetX + sideLength * Math.cos(angle);
        const y = e.offsetY + sideLength * Math.sin(angle);
        ctx.lineTo(x,y);
    }
    ctx.closePath();
    fillColor.checked ? ctx.fill() : ctx.stroke();
};
const drawPentagon = (e)=>{
    const sideLength = Math.abs(prevMouseX-e.offsetX);
    ctx.beginPath();
    for(let i=0; i<5; i++){
        const angle = ((2*Math.PI)/5) * i - Math.PI/2;
        const x = e.offsetX + sideLength * Math.cos(angle);
        const y = e.offsetY + sideLength * Math.sin(angle);
        ctx.lineTo(x,y);
    }
    ctx.closePath();
    fillColor.checked ? ctx.fill() : ctx.stroke();
};
const drawLine = (e)=>{
    ctx.beginPath();
    ctx.moveTo(prevMouseX, prevMouseY);
    ctx.lineTo(e.offsetX,e.offsetY);
    ctx.stroke();
};
// const drawBrush = (e)=>{
//     ctx.lineTo(e.offsetX,e.offsetY);
//     ctx.shadowColor = selectedColor;
//     ctx.shadowBlur = 15;
//     // ctx.lineWidth = brushWidth;
//     ctx.stroke();
// };
function drawing(e) {
  if (!isDrawing) return;
  const p = getPointerPos(e);
  // restore earlier snapshot for shape preview
  if (selectedTool === "rectangle" || selectedTool === "circle" || selectedTool === "triangle" || selectedTool === "square") {
    ctx.putImageData(snapShot, 0, 0);
  }

  if (selectedTool === "pencil" || selectedTool === "eraser") {
    const color = selectedTool === "eraser" ? "#fff" : selectedColor;
    drawLineLocal(prevMouseX, prevMouseY, p.x, p.y, color, brushWidth);
    prevMouseX = p.x; prevMouseY = p.y;
  } else if(selectedTool==="rectangle"){
        drawRectangle(e);
    }
    else if(selectedTool==="circle"){
        drawCircle(e);
    }
    else if(selectedTool==="triangle"){
        drawTriangle(e);
    }
    else if(selectedTool==="squre"){
        drawSqure(e);
    }
    else if(selectedTool==="hexagonal"){
        drawHexagon(e);
    }
    else if(selectedTool==="pentagon"){
        drawPentagon();
    }
    else if(selectedTool==="line"){
        drawLine(e);
    }
    else if(selectedTool==="arrow"){
        drawArrow(e);
    }
    else if(selectedTool==="curve"){
        drawCurve(e);
    }
    else if(selectedTool==="brush"){
        drawBrush(e);
    }
  // emit streamed point and cursor
  if (socket && currentStrokeId) {
    const pt = { x: p.x, y: p.y };
    socket.emit("drawPoint", { strokeId: currentStrokeId, point: pt });
    socket.emit("cursor", { x: p.x, y: p.y });
  }
}

function endDraw(e) {
  if (!isDrawing) return;
  isDrawing = false;
  
  if (socket && currentStrokeId) {
    socket.emit("endPath", { strokeId: currentStrokeId });
  }
  currentStrokeId = null;
}

// attach mouse & touch events
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", drawing);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseleave", endDraw);
canvas.addEventListener("touchstart", startDraw, {passive:false});
canvas.addEventListener("touchmove", drawing, {passive:false});
canvas.addEventListener("touchend", endDraw);

// undo / redo / clear
if (undoBtn) undoBtn.addEventListener("click", ()=>{ if (socket) socket.emit("undo"); });
if (redoBtn) redoBtn.addEventListener("click", ()=>{ if (socket) socket.emit("redo"); });

if (clearCanvasBtn) clearCanvasBtn.addEventListener("click", () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (socket) socket.emit("clearAll");
});

//helpers to rebuild history & draw streamed strokes
function drawPointFromStroke(stroke, pt) {
  ctx.save();
  ctx.lineWidth = stroke.width || 3;
  ctx.strokeStyle = stroke.color || "#000";
  ctx.beginPath();
  const pts = stroke.points || [];
  if (pts.length >= 2) {
    const a = pts[pts.length-2];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  } else {
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x+0.1, pt.y+0.1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStrokePartial(stroke) {
  if (!stroke.points || stroke.points.length < 1) return;
  for (let i = 1; i < stroke.points.length; i++) {
    drawPointFromStroke(stroke, stroke.points[i]);
  }
}

function rebuildFromHistory(hist) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  hist.forEach(st => {
    if (!st.points || st.points.length < 2) return;
    for (let i = 1; i < st.points.length; i++) {
      const p1 = st.points[i-1], p2 = st.points[i];
      ctx.save();
      ctx.lineWidth = st.width || 3;
      ctx.strokeStyle = st.color || "#000";
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  });
}

//user list & cursors
function renderUsers(users) {
  let list = document.getElementById("usersList");
  if (!list) {
    list = document.createElement("div");
    list.id = "usersList";
    list.style.position = "fixed";
    list.style.right = "10px";
    list.style.top = "10px";
    list.style.zIndex = 10000;
    document.body.appendChild(list);
  }
  list.innerHTML = "";
  Object.values(users).forEach(u => {
    const el = document.createElement("div");
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "6px";
    const dot = document.createElement("span");
    dot.style.width = dot.style.height = "12px";
    dot.style.borderRadius = "50%";
    dot.style.background = u.color || "#000";
    el.appendChild(dot);
    const name = document.createElement("span");
    name.textContent = u.id === myId ? "You" : u.id.slice(0,6);
    el.appendChild(name);
    list.appendChild(el);
  });
}

// cursors container
let cursorContainer = document.getElementById("cursors");
if (!cursorContainer) {
  cursorContainer = document.createElement("div");
  cursorContainer.id = "cursors";
  cursorContainer.style.position = "fixed";
  cursorContainer.style.left = 0;
  cursorContainer.style.top = 0;
  cursorContainer.style.width = "100%";
  cursorContainer.style.height = "100%";
  cursorContainer.style.pointerEvents = "none";
  cursorContainer.style.zIndex = 9000;
  document.body.appendChild(cursorContainer);
}
const cursorEls = {};
function renderCursor(id, x, y, color) {
  if (!id) return;
  let el = cursorEls[id];
  if (!el) {
    el = document.createElement("div");
    el.style.position = "absolute";
    el.style.width = "10px";
    el.style.height = "10px";
    el.style.borderRadius = "50%";
    el.style.pointerEvents = "none";
    el.style.transform = "translate(-50%,-50%)";
    el.style.zIndex = 10001;
    cursorContainer.appendChild(el);
    cursorEls[id] = el;
  }
  el.style.left = (x) + "px";
  el.style.top = (y) + "px";
  el.style.background = color || "#000";
}


//color button wiring
if (colorBtns && colorBtns.length) {
  colorBtns.forEach(btn => {
    btn.addEventListener("click", ()=> {
      const bg = window.getComputedStyle(btn).backgroundColor;
      selectedColor = bg || selectedColor;
      document.querySelectorAll(".colors .option.selected").forEach(s=>s.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}
if (sizeSlider) {
  sizeSlider.addEventListener("change", ()=> { brushWidth = sizeSlider.value; });
}
if (toolBtns && toolBtns.length) {
  toolBtns.forEach(btn => {
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tool.active").forEach(t=>t.classList.remove("active"));
      btn.classList.add("active");
      selectedTool = btn.id || selectedTool;
    });
  });
}

//save as image
if (saveImg) {
  saveImg.addEventListener("click", () => {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.png";
    a.click();
  });
}


