const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const axios = require("axios");
require("dotenv").config();

const app = express();
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
const GOPLAUSIBLE_RESOLVER = "https://resolver.goplausible.xyz/resolve";

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

    // Query for loans by this borrower
    // This would use the smart contract's get_loan_info method
    const loans = [];

    // For now, return empty array as we need to implement the smart contract query
    // In production, this would call the smart contract's get_loan_info method
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
    // This would typically query the blockchain for all loans
    // For now, return mock data
    const loans = [
      {
        id: "1",
        principal: 1000000,
        termDays: 30,
        status: "requested",
        borrower: "BORROWER_ADDRESS_1",
        installment: 0,
        remaining: 1000000,
        repaidTotal: 0,
        createdAt: new Date().toISOString(),
      },
    ];

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Microlending Backend API running on port ${PORT}`);
  console.log(`📊 Network: ${ALGOD_CONFIG.network}`);
  console.log(`🔗 Contract: ${CONTRACT_CONFIG.appId}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
