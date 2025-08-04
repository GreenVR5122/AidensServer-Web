const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set up a WebSocket server for Minecraft plugin to connect
const wss = new WebSocket.Server({ noServer: true });

// Track Minecraft client connection
let mcSocket = null;

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/mc-ws') {
    wss.handleUpgrade(request, socket, head, ws => {
      mcSocket = ws;
      console.log('Minecraft plugin connected');
      
      ws.on('message', message => {
        // Broadcast Minecraft message to website clients
        io.emit('chat message', `[MC] ${message.toString()}`);
      });

      ws.on('close', () => {
        console.log('Minecraft plugin disconnected');
        mcSocket = null;
      });
    });
  } else {
    socket.destroy();
  }
});

// Website clients connect here
io.on('connection', socket => {
  console.log('Website client connected');

  socket.on('chat message', msg => {
    // Broadcast message to other website clients
    io.emit('chat message', `[Web] ${msg}`);

    // Also send to Minecraft if connected
    if (mcSocket && mcSocket.readyState === WebSocket.OPEN) {
      mcSocket.send(`[Web] ${msg}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Website client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
