# Football VR Multiplayer

A small Node.js + Socket.IO WebXR football prototype for Meta Quest Browser and desktop browsers.

## Deploy
Create a Node web service from this repository. Build command: `npm install`; start command: `npm start`. The host must support WebSockets and HTTPS. Test `/health`. Both players open the same deployed URL and use the same room code.

## Prototype limitations
Early prototype only: basic ball simulation, simple avatars, up to eight players per room, no accounts or anti-cheat.