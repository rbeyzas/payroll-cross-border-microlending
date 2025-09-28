#!/usr/bin/env node

/**
 * Real WebSocket Signaling Server
 * Bu server gerçek peer-to-peer bağlantıları kurar
 */

const WebSocket = require("ws");
const http = require("http");

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Client storage - gerçek uygulamada database kullanılır
const clients = new Map();
const rooms = new Map();

console.log("🚀 Starting Real Signaling Server...");

wss.on("connection", (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`📱 New client connected: ${clientId}`);

  // Store client
  clients.set(clientId, ws);

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "connection",
      clientId,
      message: "Connected to signaling server",
      timestamp: Date.now(),
    })
  );

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Message from ${clientId}:`, message.type);

      switch (message.type) {
        case "register":
          // Client registers with wallet address
          const address = message.data?.address || message.address;
          if (address) {
            clients.set(address, ws);
            clients.delete(clientId);
            console.log(`👤 Client registered as: ${address}`);
          } else {
            console.log(`❌ Registration failed: no address provided`);
          }
          break;

        case "offer":
        case "answer":
        case "ice-candidate":
        case "file-request":
        case "file-response":
          // Route message to target client
          const targetClient = clients.get(message.to);
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify(message));
            console.log(`📤 Routed ${message.type} from ${message.from} to ${message.to}`);
          } else {
            console.log(`❌ Target client ${message.to} not found or disconnected`);
            // Send error back to sender
            ws.send(
              JSON.stringify({
                type: "error",
                message: `Target client ${message.to} not available`,
                originalMessage: message,
              })
            );
          }
          break;

        case "ping":
          ws.send(
            JSON.stringify({
              type: "pong",
              timestamp: Date.now(),
            })
          );
          break;

        default:
          console.log(`❓ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
          error: error.message,
        })
      );
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`👋 Client disconnected: ${clientId} (code: ${code})`);

    // Remove client from all storage
    for (const [address, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(address);
        console.log(`🗑️ Removed client: ${address}`);
        break;
      }
    }
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
  });
});

// Health check endpoint
server.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        connectedClients: clients.size,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`🎯 Signaling Server running on ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Connected clients: ${clients.size}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down signaling server...");

  // Close all client connections
  for (const [address, client] of clients.entries()) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, "Server shutting down");
    }
  }

  server.close(() => {
    console.log("✅ Server closed gracefully");
    process.exit(0);
  });
});

// Keep alive ping every 30 seconds
setInterval(() => {
  const deadClients = [];
  for (const [address, client] of clients.entries()) {
    if (client.readyState !== WebSocket.OPEN) {
      deadClients.push(address);
    } else {
      // Send ping to keep connection alive
      client.ping();
    }
  }

  // Clean up dead clients
  deadClients.forEach((address) => {
    clients.delete(address);
    console.log(`🧹 Cleaned up dead client: ${address}`);
  });

  if (clients.size > 0) {
    console.log(`💓 Heartbeat: ${clients.size} active clients`);
  }
}, 30000);

console.log("🔧 Server configuration:");
console.log(`   - Port: ${PORT}`);
console.log(`   - Max connections: Unlimited`);
console.log(`   - Heartbeat interval: 30s`);
console.log(`   - Auto cleanup: Enabled`);
