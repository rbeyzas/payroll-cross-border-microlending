#!/usr/bin/env node

/**
 * WebRTC File Transfer Test Script
 * This script tests the fixed WebRTC implementation
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🧪 WebRTC File Transfer Test Script");
console.log("=====================================");

// Test 1: Check if signaling server can be started
console.log("\n1. Testing signaling server startup...");

const serverProcess = spawn("node", ["signaling-server.js"], {
  cwd: __dirname,
  stdio: "pipe",
});

let serverStarted = false;
let serverOutput = "";

serverProcess.stdout.on("data", (data) => {
  serverOutput += data.toString();
  if (data.toString().includes("Signaling Server running")) {
    serverStarted = true;
    console.log("✅ Signaling server started successfully");
  }
});

serverProcess.stderr.on("data", (data) => {
  console.error("Server error:", data.toString());
});

// Wait for server to start
setTimeout(() => {
  if (serverStarted) {
    console.log("✅ Signaling server test passed");

    // Test 2: Check if frontend can be built
    console.log("\n2. Testing frontend build...");

    const buildProcess = spawn("npm", ["run", "build"], {
      cwd: path.join(__dirname, "projects/algorand-frontend"),
      stdio: "pipe",
    });

    buildProcess.stdout.on("data", (data) => {
      console.log("Build output:", data.toString());
    });

    buildProcess.stderr.on("data", (data) => {
      console.error("Build error:", data.toString());
    });

    buildProcess.on("close", (code) => {
      if (code === 0) {
        console.log("✅ Frontend build test passed");
      } else {
        console.log("❌ Frontend build test failed");
      }

      // Clean up
      serverProcess.kill();
      process.exit(code);
    });
  } else {
    console.log("❌ Signaling server test failed");
    serverProcess.kill();
    process.exit(1);
  }
}, 3000);

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Cleaning up...");
  serverProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Cleaning up...");
  serverProcess.kill();
  process.exit(0);
});
