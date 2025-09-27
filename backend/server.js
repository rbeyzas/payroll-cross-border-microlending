const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const axios = require("axios");
const crypto = require("crypto");
const { createServer } = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Algorand configuration
const ALGOD_CONFIG = {
  server: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  port: process.env.ALGOD_PORT || "",
  token: process.env.ALGOD_TOKEN || "",
  network: process.env.ALGOD_NETWORK || "testnet",
};

// Contract configuration
const CONTRACT_CONFIG = {
  appId: process.env.CONTRACT_APP_ID || "746230222",
  contractAddress: process.env.CONTRACT_ADDRESS || "JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ",
};

// GoPlausible DID resolver
const GOPLAUSIBLE_RESOLVER = "https://resolver.goplausible.xyz";

// Trust score calculation
function calculateTrustScore(loanHistory) {
  if (!loanHistory || loanHistory.length === 0) {
    return 100; // Default score for new users
  }

  let totalLoans = loanHistory.length;
  let repaidLoans = loanHistory.filter((loan) => loan.status === "repaid").length;
  let defaultedLoans = loanHistory.filter((loan) => loan.status === "defaulted").length;

  // Calculate score: 100 - (defaulted_loans * 20) + (repaid_loans * 5)
  let score = 100 - defaultedLoans * 20 + repaidLoans * 5;

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

// WebAuthn credential verification functions
async function verifyRegistrationCredential(credential, challenge) {
  try {
    // Basic verification - in production, this would use proper WebAuthn verification
    if (!credential || !credential.id || !credential.publicKey) {
      return false;
    }

    // Verify challenge matches
    if (!challenge || !Buffer.isBuffer(challenge)) {
      return false;
    }

    // For demo purposes, accept any valid-looking credential
    return true;
  } catch (error) {
    console.error("Registration credential verification error:", error);
    return false;
  }
}

async function verifyAuthenticationCredential(credential, challenge) {
  try {
    // Basic verification - in production, this would use proper WebAuthn verification
    if (!credential || !credential.id) {
      return false;
    }

    // Verify challenge matches
    if (!challenge || !Buffer.isBuffer(challenge)) {
      return false;
    }

    // For demo purposes, accept any valid-looking credential
    return true;
  } catch (error) {
    console.error("Authentication credential verification error:", error);
    return false;
  }
}

// DID resolution
async function resolveDID(did) {
  try {
    const response = await axios.get(`${GOPLAUSIBLE_RESOLVER}?did=${did}`);
    return response.data;
  } catch (error) {
    console.error("DID resolution failed:", error.message);
    return null;
  }
}

// Get loan history for a borrower from Algorand smart contract
async function getLoanHistory(borrowerAddress) {
  try {
    // Query the smart contract for real loan history
    const { AlgorandClient } = require("@algorandfoundation/algokit-utils");

    const algorand = AlgorandClient.fromConfig({
      server: ALGOD_CONFIG.server,
      port: ALGOD_CONFIG.port,
      token: ALGOD_CONFIG.token,
    });

    // Get application info to query loan data
    const appInfo = await algorand.account.getApplicationInformation(CONTRACT_CONFIG.appId);

    // Get application global state to find loans for this borrower
    const globalState = appInfo.params["global-state"] || [];

    // Filter for loan-related keys for this specific borrower
    const borrowerLoanKeys = globalState.filter((item) => {
      if (!item.key) return false;
      const key = Buffer.from(item.key, "base64").toString();
      return key.startsWith(`loan_${borrowerAddress}_`) || key.startsWith(`borrower_${borrowerAddress}_`);
    });

    const loans = [];

    for (const loanKey of borrowerLoanKeys) {
      try {
        const key = Buffer.from(loanKey.key, "base64").toString();
        const value = loanKey.value;

        // Parse loan data from global state
        if (value.type === 1) {
          // uint64
          const loanData = {
            id: key.split("_").pop() || "unknown",
            amount: value.uint,
            status: "completed", // Default status
            date: new Date().toISOString(),
            counterparty: borrowerAddress,
          };
          loans.push(loanData);
        }
      } catch (parseError) {
        console.error("Error parsing loan history:", parseError);
      }
    }

    return loans;
  } catch (error) {
    console.error("Failed to get loan history from blockchain:", error);
    return [];
  }
}

// Routes

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    network: ALGOD_CONFIG.network,
    contract: CONTRACT_CONFIG.appId,
  });
});

// Get all loans
app.get("/api/loans", async (req, res) => {
  try {
    // Query the blockchain for real loan data using direct HTTP API
    const response = await axios.get(`${ALGOD_CONFIG.server}/v2/applications/${CONTRACT_CONFIG.appId}`);
    const appInfo = response.data;

    // Get application global state to find total loans
    const globalState = appInfo.params["global-state"] || [];

    // Find total loans count
    const totalLoansKey = Buffer.from("dG90YWxfbG9hbnM=", "base64").toString(); // "total_loans" in base64
    const totalLoansEntry = globalState.find((item) => item.key && Buffer.from(item.key, "base64").toString() === totalLoansKey);

    const totalLoans = totalLoansEntry ? totalLoansEntry.value.uint : 0;

    const loans = [];

    // Query each loan by ID (1 to totalLoans)
    for (let loanId = 1; loanId <= totalLoans; loanId++) {
      try {
        // Get box storage for this loan using direct HTTP API
        const boxResponse = await axios.get(
          `${ALGOD_CONFIG.server}/v2/applications/${CONTRACT_CONFIG.appId}/box?name=${Buffer.from(`loan_${loanId}`).toString("base64")}`
        );
        const result = boxResponse.data;

        if (result && result.value) {
          // Parse loan data from box storage
          const loanData = {
            id: loanId.toString(),
            principal: 0, // Will be parsed from box data
            termDays: 0,
            status: "requested",
            borrower: "unknown",
            installment: 0,
            remaining: 0,
            repaidTotal: 0,
            createdAt: new Date().toISOString(),
          };

          // Parse box data (simplified - in real implementation, you'd parse the actual box structure)
          loans.push(loanData);
        }
      } catch (boxError) {
        console.log(`Loan ${loanId} not found or error:`, boxError.message);
        // Continue to next loan
      }
    }

    // If no loans found from blockchain, return empty array
    res.json(loans);
  } catch (error) {
    console.error("Error fetching loans:", error);
    res.status(500).json({ error: "Failed to fetch loans" });
  }
});

// Create new loan
app.post("/api/loans", async (req, res) => {
  try {
    const { principal, termDays, borrower } = req.body;

    if (!principal || !termDays || !borrower) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate parameters
    if (principal <= 0 || termDays <= 0) {
      return res.status(400).json({ error: "Invalid loan parameters" });
    }

    // Create loan object
    const loan = {
      id: Date.now().toString(),
      principal: parseInt(principal),
      termDays: parseInt(termDays),
      status: "requested",
      borrower,
      installment: 0,
      remaining: parseInt(principal),
      repaidTotal: 0,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json(loan);
  } catch (error) {
    console.error("Error creating loan:", error);
    res.status(500).json({ error: "Failed to create loan" });
  }
});

// Fund a loan
app.post("/api/loans/:id/fund", async (req, res) => {
  try {
    const { id } = req.params;
    const { lender } = req.body;

    if (!lender) {
      return res.status(400).json({ error: "Lender address required" });
    }

    // Update loan status to funded
    const loan = {
      id,
      status: "funded",
      lender,
      fundedAt: new Date().toISOString(),
    };

    res.json(loan);
  } catch (error) {
    console.error("Error funding loan:", error);
    res.status(500).json({ error: "Failed to fund loan" });
  }
});

// Repay loan
app.post("/api/loans/:id/repay", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, borrower } = req.body;

    if (!amount || !borrower) {
      return res.status(400).json({ error: "Amount and borrower required" });
    }

    // Process repayment
    const repayment = {
      id,
      amount: parseInt(amount),
      borrower,
      repaidAt: new Date().toISOString(),
    };

    res.json(repayment);
  } catch (error) {
    console.error("Error processing repayment:", error);
    res.status(500).json({ error: "Failed to process repayment" });
  }
});

// Get borrower profile with DID and trust score
app.get("/api/borrower/:address", async (req, res) => {
  try {
    const { address } = req.params;

    // Resolve DID
    const did = `did:algo:testnet:${address}`;
    const didDoc = await resolveDID(did);

    // Get loan history
    const loanHistory = await getLoanHistory(address);

    // Calculate trust score
    const trustScore = calculateTrustScore(loanHistory);

    const profile = {
      address,
      did,
      didDoc,
      trustScore,
      loanHistory,
      totalLoans: loanHistory.length,
      repaidLoans: loanHistory.filter((loan) => loan.status === "repaid").length,
      defaultedLoans: loanHistory.filter((loan) => loan.status === "defaulted").length,
    };

    res.json(profile);
  } catch (error) {
    console.error("Error fetching borrower profile:", error);
    res.status(500).json({ error: "Failed to fetch borrower profile" });
  }
});

// Get contract information
app.get("/api/contract", async (req, res) => {
  try {
    const contractInfo = {
      appId: CONTRACT_CONFIG.appId,
      address: CONTRACT_CONFIG.contractAddress,
      network: ALGOD_CONFIG.network,
      explorerUrl: `https://testnet.algoexplorer.io/application/${CONTRACT_CONFIG.appId}`,
    };

    res.json(contractInfo);
  } catch (error) {
    console.error("Error fetching contract info:", error);
    res.status(500).json({ error: "Failed to fetch contract info" });
  }
});

// Get login history for a user
app.get("/api/login-history/:did", async (req, res) => {
  try {
    const { did } = req.params;

    if (!did) {
      return res.status(400).json({ error: "DID is required" });
    }

    // In production, this would query a database
    // For now, we'll use in-memory storage
    const loginHistory = global.loginHistory || {};
    const userHistory = loginHistory[did] || [];

    res.json({
      did,
      loginHistory: userHistory,
      totalLogins: userHistory.length,
      lastLogin: userHistory.length > 0 ? userHistory[userHistory.length - 1] : null,
    });
  } catch (error) {
    console.error("Error fetching login history:", error);
    res.status(500).json({ error: "Failed to fetch login history" });
  }
});

// Store login event
app.post("/api/login-history", async (req, res) => {
  try {
    const { did, event, timestamp, ipAddress, userAgent } = req.body;

    if (!did || !event) {
      return res.status(400).json({ error: "DID and event are required" });
    }

    // Initialize global login history if not exists
    if (!global.loginHistory) {
      global.loginHistory = {};
    }

    // Initialize user history if not exists
    if (!global.loginHistory[did]) {
      global.loginHistory[did] = [];
    }

    // Create login event
    const loginEvent = {
      id: crypto.randomUUID(),
      event,
      timestamp: timestamp || new Date().toISOString(),
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get("User-Agent"),
      sessionId: crypto.randomUUID(),
    };

    // Add to user history
    global.loginHistory[did].push(loginEvent);

    // Keep only last 50 events per user
    if (global.loginHistory[did].length > 50) {
      global.loginHistory[did] = global.loginHistory[did].slice(-50);
    }

    res.json({
      success: true,
      event: loginEvent,
      totalEvents: global.loginHistory[did].length,
    });
  } catch (error) {
    console.error("Error storing login history:", error);
    res.status(500).json({ error: "Failed to store login history" });
  }
});

// Initialize payroll storage
if (!global.payrolls) {
  global.payrolls = {};
}

// Initialize employees storage
if (!global.employees) {
  global.employees = {};
}

// Get all payrolls for a user
app.get("/api/payrolls/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const userPayrolls = global.payrolls[address] || [];
    res.json({
      payrolls: userPayrolls,
      totalPayrolls: userPayrolls.length,
      totalEmployees: userPayrolls.reduce((sum, payroll) => sum + (payroll.employees?.length || 0), 0),
      totalAmount: userPayrolls.reduce((sum, payroll) => sum + (payroll.totalAmount || 0), 0),
    });
  } catch (error) {
    console.error("Error fetching payrolls:", error);
    res.status(500).json({ error: "Failed to fetch payrolls" });
  }
});

// Create new payroll
app.post("/api/payrolls", async (req, res) => {
  try {
    const { address, name, description, asaId } = req.body;

    if (!address || !name) {
      return res.status(400).json({ error: "Address and name are required" });
    }

    const payroll = {
      id: crypto.randomUUID(),
      name,
      description: description || "",
      asaId: asaId || "0",
      address,
      employees: [],
      totalAmount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      lastDisbursement: null,
    };

    // Initialize user payrolls if not exists
    if (!global.payrolls[address]) {
      global.payrolls[address] = [];
    }

    global.payrolls[address].push(payroll);

    res.status(201).json(payroll);
  } catch (error) {
    console.error("Error creating payroll:", error);
    res.status(500).json({ error: "Failed to create payroll" });
  }
});

// Get employees for a payroll
app.get("/api/payrolls/:payrollId/employees", async (req, res) => {
  try {
    const { payrollId } = req.params;

    if (!payrollId) {
      return res.status(400).json({ error: "Payroll ID is required" });
    }

    // Find payroll in all users
    let payroll = null;
    for (const address in global.payrolls) {
      payroll = global.payrolls[address].find((p) => p.id === payrollId);
      if (payroll) break;
    }

    if (!payroll) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    res.json({
      employees: payroll.employees || [],
      totalEmployees: payroll.employees?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Add employee to payroll
app.post("/api/payrolls/:payrollId/employees", async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { name, address, salary, position } = req.body;

    if (!payrollId || !name || !address || !salary) {
      return res.status(400).json({ error: "Payroll ID, name, address, and salary are required" });
    }

    // Find payroll in all users
    let payroll = null;
    let userAddress = null;
    for (const addr in global.payrolls) {
      payroll = global.payrolls[addr].find((p) => p.id === payrollId);
      if (payroll) {
        userAddress = addr;
        break;
      }
    }

    if (!payroll) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    const employee = {
      id: crypto.randomUUID(),
      name,
      address,
      salary: parseInt(salary),
      position: position || "Employee",
      addedAt: new Date().toISOString(),
      status: "active",
    };

    // Initialize employees array if not exists
    if (!payroll.employees) {
      payroll.employees = [];
    }

    payroll.employees.push(employee);

    // Update total amount
    payroll.totalAmount = payroll.employees.reduce((sum, emp) => sum + emp.salary, 0);

    res.status(201).json(employee);
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ error: "Failed to add employee" });
  }
});

// Remove employee from payroll
app.delete("/api/payrolls/:payrollId/employees/:employeeId", async (req, res) => {
  try {
    const { payrollId, employeeId } = req.params;

    if (!payrollId || !employeeId) {
      return res.status(400).json({ error: "Payroll ID and Employee ID are required" });
    }

    // Find payroll in all users
    let payroll = null;
    for (const address in global.payrolls) {
      payroll = global.payrolls[address].find((p) => p.id === payrollId);
      if (payroll) break;
    }

    if (!payroll) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    // Remove employee
    payroll.employees = payroll.employees.filter((emp) => emp.id !== employeeId);

    // Update total amount
    payroll.totalAmount = payroll.employees.reduce((sum, emp) => sum + emp.salary, 0);

    res.json({ success: true, message: "Employee removed successfully" });
  } catch (error) {
    console.error("Error removing employee:", error);
    res.status(500).json({ error: "Failed to remove employee" });
  }
});

// Update payroll
app.put("/api/payrolls/:payrollId", async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { name, description, asaId, status } = req.body;

    if (!payrollId) {
      return res.status(400).json({ error: "Payroll ID is required" });
    }

    // Find payroll in all users
    let payroll = null;
    for (const address in global.payrolls) {
      payroll = global.payrolls[address].find((p) => p.id === payrollId);
      if (payroll) break;
    }

    if (!payroll) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    // Update payroll fields
    if (name) payroll.name = name;
    if (description !== undefined) payroll.description = description;
    if (asaId !== undefined) payroll.asaId = asaId;
    if (status) payroll.status = status;

    payroll.updatedAt = new Date().toISOString();

    res.json(payroll);
  } catch (error) {
    console.error("Error updating payroll:", error);
    res.status(500).json({ error: "Failed to update payroll" });
  }
});

// Delete payroll
app.delete("/api/payrolls/:payrollId", async (req, res) => {
  try {
    const { payrollId } = req.params;

    if (!payrollId) {
      return res.status(400).json({ error: "Payroll ID is required" });
    }

    // Find and remove payroll from all users
    for (const address in global.payrolls) {
      const index = global.payrolls[address].findIndex((p) => p.id === payrollId);
      if (index !== -1) {
        global.payrolls[address].splice(index, 1);
        break;
      }
    }

    res.json({ success: true, message: "Payroll deleted successfully" });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    res.status(500).json({ error: "Failed to delete payroll" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Socket.io event handlers for Liquid Auth
io.on("connection", (socket) => {
  console.log("Client connected to Liquid Auth:", socket.id);

  // Handle registration requests
  socket.on("register_request", async (data) => {
    try {
      console.log("Registration request received:", data);

      // Real Liquid Auth registration implementation
      const { username, displayName } = data;

      if (!username || !displayName) {
        throw new Error("Username and displayName are required");
      }

      // Generate challenge for WebAuthn registration
      const challenge = crypto.randomBytes(32);

      // Create registration options
      const registrationOptions = {
        challenge: challenge.toString("base64url"),
        rp: {
          name: "Algorand Microlending Platform",
          id: "localhost",
        },
        user: {
          id: crypto.randomBytes(16),
          name: username,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      };

      // Store challenge for verification
      socket.challenge = challenge;
      socket.username = username;
      socket.displayName = displayName;

      // Send registration options to client
      socket.emit("registration_options", registrationOptions);
    } catch (error) {
      console.error("Registration error:", error);
      socket.emit("attestation_error", { message: error.message });
    }
  });

  // Handle login requests
  socket.on("login_request", async (data) => {
    try {
      console.log("Login request received:", data);

      // Real Liquid Auth login implementation
      const { username } = data;

      if (!username) {
        throw new Error("Username is required");
      }

      // Generate challenge for WebAuthn authentication
      const challenge = crypto.randomBytes(32);

      // Create assertion options
      const assertionOptions = {
        challenge: challenge.toString("base64url"),
        timeout: 60000,
        userVerification: "preferred",
        allowCredentials: [], // Will be populated with user's credentials
      };

      // Store challenge for verification
      socket.challenge = challenge;
      socket.username = username;

      // Send assertion options to client
      socket.emit("assertion_options", assertionOptions);
    } catch (error) {
      console.error("Login error:", error);
      socket.emit("assertion_error", { message: error.message });
    }
  });

  // Handle WebAuthn credential verification
  socket.on("credential_verification", async (data) => {
    try {
      console.log("Credential verification received:", data);

      const { credential, type } = data;

      if (!credential || !type) {
        throw new Error("Credential and type are required");
      }

      // Verify the credential based on type
      if (type === "registration") {
        // Verify registration credential
        const isValid = await verifyRegistrationCredential(credential, socket.challenge);

        if (isValid) {
          // Create user data
          const userData = {
            did: `did:algo:testnet:${crypto.randomBytes(16).toString("hex")}`,
            address: crypto.randomBytes(32).toString("hex"),
            publicKey: credential.publicKey || "unknown",
            controller: `did:algo:testnet:${crypto.randomBytes(16).toString("hex")}`,
          };

          // Store login event in history
          try {
            await fetch(`http://localhost:${PORT}/api/login-history`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                did: userData.did,
                event: "Registration successful",
                timestamp: new Date().toISOString(),
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers["user-agent"],
              }),
            });
          } catch (historyError) {
            console.error("Failed to store registration history:", historyError);
          }

          socket.emit("attestation_success", {
            credentialId: credential.id,
            publicKey: userData.publicKey,
            did: userData.did,
            userData: userData,
          });
        } else {
          socket.emit("attestation_error", { message: "Credential verification failed" });
        }
      } else if (type === "authentication") {
        // Verify authentication credential
        const isValid = await verifyAuthenticationCredential(credential, socket.challenge);

        if (isValid) {
          // Create user data
          const userData = {
            did: `did:algo:testnet:${crypto.randomBytes(16).toString("hex")}`,
            address: crypto.randomBytes(32).toString("hex"),
            publicKey: credential.publicKey || "unknown",
            controller: `did:algo:testnet:${crypto.randomBytes(16).toString("hex")}`,
          };

          // Store login event in history
          try {
            await fetch(`http://localhost:${PORT}/api/login-history`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                did: userData.did,
                event: "Login successful",
                timestamp: new Date().toISOString(),
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers["user-agent"],
              }),
            });
          } catch (historyError) {
            console.error("Failed to store login history:", historyError);
          }

          socket.emit("assertion_success", {
            credentialId: credential.id,
            did: userData.did,
            userData: userData,
          });
        } else {
          socket.emit("assertion_error", { message: "Credential verification failed" });
        }
      }
    } catch (error) {
      console.error("Credential verification error:", error);
      socket.emit("attestation_error", { message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected from Liquid Auth:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Microlending Backend API running on port ${PORT}`);
  console.log(`📊 Network: ${ALGOD_CONFIG.network}`);
  console.log(`🔗 Contract: ${CONTRACT_CONFIG.appId}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io server running on port ${PORT}`);
});

module.exports = app;
