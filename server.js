const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const rooms = new Map();
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Football VR Multiplayer" }));
const freshBall = () => ({ x: 0, y: 0.23, z: 1.7, vx: 0, vy: 0, vz: 0, moving: false });
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
io.on("connection", socket => {
  socket.on("joinRoom", payload => {
    const code = String(payload?.room || "KICKOFF").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12) || "KICKOFF";
    if (!rooms.has(code)) rooms.set(code, { players: new Map(), ball: freshBall(), score: { home: 0, away: 0 } });
    const room = rooms.get(code);
    if (room.players.size >= 8) return socket.emit("roomFull");
    if (socket.data.room) { const old = rooms.get(socket.data.room); old?.players.delete(socket.id); socket.leave(socket.data.room); }
    const colors = ["#58a6ff", "#ff7b72", "#8bdf91", "#d6a5ff", "#ffc66d", "#75e0d0"];
    const p = { id: socket.id, name: String(payload?.name || "Player").slice(0,18), color: colors[room.players.size % colors.length], x: 0, y: 0, z: 6 + room.players.size, yaw: 0, lastKick: 0 };
    room.players.set(socket.id, p); socket.data.room = code; socket.join(code);
    socket.emit("joined", { id: socket.id, players: [...room.players.values()], ball: room.ball, score: room.score });
    socket.to(code).emit("playerJoined", p);
  });
  socket.on("pose", pose => { const code=socket.data.room, room=rooms.get(code), p=room?.players.get(socket.id); if(!p)return; p.x=clamp(Number(pose?.x)||0,-30,30);p.y=clamp(Number(pose?.y)||0,0,5);p.z=clamp(Number(pose?.z)||0,-55,25);p.yaw=clamp(Number(pose?.yaw)||0,-6.3,6.3);socket.to(code).emit("playerState",p); });
  socket.on("kick", payload => { const code=socket.data.room, room=rooms.get(code), p=room?.players.get(socket.id);if(!p||Date.now()-p.lastKick<450)return;p.lastKick=Date.now();const d=payload?.direction||{};let x=clamp(Number(d.x)||0,-1,1),y=clamp(Number(d.y)||.25,-.4,1),z=clamp(Number(d.z)||-1,-1,-.1),l=Math.hypot(x,y,z)||1;Object.assign(room.ball,{vx:x/l*17,vy:Math.max(2.2,y/l*17),vz:z/l*17,moving:true}); });
  socket.on("disconnect",()=>{const code=socket.data.room,room=rooms.get(code);if(!room)return;room.players.delete(socket.id);socket.to(code).emit("playerLeft",socket.id);if(!room.players.size)rooms.delete(code);});
});
setInterval(()=>{for(const [code,r] of rooms){const b=r.ball;if(b.moving){b.vy-=9.81/30;b.x+=b.vx/30;b.y+=b.vy/30;b.z+=b.vz/30;if(b.y<.23){b.y=.23;b.vy=Math.abs(b.vy)*.42;b.vx*=.82;b.vz*=.82;if(Math.hypot(b.vx,b.vy,b.vz)<1.3)b.moving=false;}if(b.z < -40.45 && b.z > -42 && Math.abs(b.x)<3.45 && b.y<2.25 && b.y>.12){r.score.home++;Object.assign(b,freshBall());}if(b.z < -44 || b.z > 14 || Math.abs(b.x)>22)Object.assign(b,freshBall());}io.to(code).emit("ballState",{x:b.x,y:b.y,z:b.z,score:r.score});}},1000/30);
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log("Football VR listening on "+PORT));