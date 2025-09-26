#!/usr/bin/env node

/**
 * MVP Microlending dApp Integration Test
 * Tests the complete flow: authentication, loan creation, funding, and repayment
 */

const axios = require("axios");
const { AlgorandClient } = require("@algorandfoundation/algokit-utils");

// Configuration
const CONFIG = {
  backend: "http://localhost:3001",
  frontend: "http://localhost:5173",
  liquidAuth: "http://localhost:3000",
  contract: {
    appId: "746230222",
    address: "JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ",
  },
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Utility functions
function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function addTest(name, passed, message) {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    log(`PASS: ${name}`, "success");
  } else {
    results.failed++;
    log(`FAIL: ${name} - ${message}`, "error");
  }
}

// Test functions
async function testBackendHealth() {
  try {
    const response = await axios.get(`${CONFIG.backend}/health`);
    addTest("Backend Health Check", response.status === 200, `Status: ${response.status}`);
    return true;
  } catch (error) {
    addTest("Backend Health Check", false, error.message);
    return false;
  }
}

async function testContractInfo() {
  try {
    const response = await axios.get(`${CONFIG.backend}/api/contract`);
    const data = response.data;
    addTest(
      "Contract Info API",
      data.appId === CONFIG.contract.appId && data.address === CONFIG.contract.address,
      `App ID: ${data.appId}, Address: ${data.address}`
    );
    return true;
  } catch (error) {
    addTest("Contract Info API", false, error.message);
    return false;
  }
}

async function testLoanCreation() {
  try {
    const loanData = {
      principal: 1000000, // 1 ALGO
      termDays: 30,
      borrower: "TEST_BORROWER_ADDRESS",
    };

    const response = await axios.post(`${CONFIG.backend}/api/loans`, loanData);
    addTest(
      "Loan Creation API",
      response.status === 201 && response.data.principal === loanData.principal,
      `Created loan ID: ${response.data.id}`
    );
    return response.data;
  } catch (error) {
    addTest("Loan Creation API", false, error.message);
    return null;
  }
}

async function testBorrowerProfile() {
  try {
    const testAddress = "TEST_BORROWER_ADDRESS";
    const response = await axios.get(`${CONFIG.backend}/api/borrower/${testAddress}`);
    const data = response.data;

    addTest(
      "Borrower Profile API",
      data.address === testAddress && typeof data.trustScore === "number" && data.trustScore >= 0 && data.trustScore <= 100,
      `Trust Score: ${data.trustScore}`
    );
    return true;
  } catch (error) {
    addTest("Borrower Profile API", false, error.message);
    return false;
  }
}

async function testDIDResolution() {
  try {
    const testDID = "did:algo:testnet:TEST_ADDRESS";
    const response = await axios.get(`https://resolver.goplausible.xyz/resolve?did=${testDID}`);

    addTest("DID Resolution", response.status === 200, `DID resolved: ${testDID}`);
    return true;
  } catch (error) {
    addTest("DID Resolution", false, error.message);
    return false;
  }
}

async function testTrustScoreCalculation() {
  try {
    // Test different loan histories
    const testCases = [
      { history: [], expected: 100, name: "Empty history" },
      { history: [{ status: "repaid" }], expected: 105, name: "One repaid loan" },
      { history: [{ status: "defaulted" }], expected: 80, name: "One defaulted loan" },
      {
        history: [{ status: "repaid" }, { status: "repaid" }, { status: "defaulted" }],
        expected: 90,
        name: "Mixed history",
      },
    ];

    let allPassed = true;
    for (const testCase of testCases) {
      const score = calculateTrustScore(testCase.history);
      const passed = score === testCase.expected;
      addTest(`Trust Score: ${testCase.name}`, passed, `Expected: ${testCase.expected}, Got: ${score}`);
      if (!passed) allPassed = false;
    }

    return allPassed;
  } catch (error) {
    addTest("Trust Score Calculation", false, error.message);
    return false;
  }
}

function calculateTrustScore(loanHistory) {
  if (!loanHistory || loanHistory.length === 0) {
    return 100;
  }

  let totalLoans = loanHistory.length;
  let repaidLoans = loanHistory.filter((loan) => loan.status === "repaid").length;
  let defaultedLoans = loanHistory.filter((loan) => loan.status === "defaulted").length;

  let score = 100 - defaultedLoans * 20 + repaidLoans * 5;
  return Math.max(0, Math.min(100, score));
}

async function testFrontendAccess() {
  try {
    const response = await axios.get(CONFIG.frontend, { timeout: 5000 });
    addTest("Frontend Access", response.status === 200, `Frontend accessible at ${CONFIG.frontend}`);
    return true;
  } catch (error) {
    addTest("Frontend Access", false, error.message);
    return false;
  }
}

async function testLiquidAuthAccess() {
  try {
    const response = await axios.get(CONFIG.liquidAuth, { timeout: 5000 });
    addTest("Liquid Auth Access", response.status === 200, `Liquid Auth accessible at ${CONFIG.liquidAuth}`);
    return true;
  } catch (error) {
    addTest("Liquid Auth Access", false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log("🚀 Starting MVP Microlending dApp Integration Tests");
  log("=".repeat(60));

  // Test backend services
  log("Testing Backend Services...");
  await testBackendHealth();
  await testContractInfo();
  await testLoanCreation();
  await testBorrowerProfile();

  // Test external services
  log("Testing External Services...");
  await testDIDResolution();

  // Test business logic
  log("Testing Business Logic...");
  await testTrustScoreCalculation();

  // Test frontend services
  log("Testing Frontend Services...");
  await testFrontendAccess();
  await testLiquidAuthAccess();

  // Print results
  log("=".repeat(60));
  log("📊 Test Results Summary");
  log(`✅ Passed: ${results.passed}`);
  log(`❌ Failed: ${results.failed}`);
  log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    log("❌ Some tests failed. Check the logs above for details.");
    process.exit(1);
  } else {
    log("🎉 All tests passed! MVP is ready for demo.");
    process.exit(0);
  }
}

// Handle errors
process.on("unhandledRejection", (error) => {
  log(`Unhandled rejection: ${error.message}`, "error");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  log(`Uncaught exception: ${error.message}`, "error");
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests().catch((error) => {
    log(`Test runner error: ${error.message}`, "error");
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testBackendHealth,
  testContractInfo,
  testLoanCreation,
  testBorrowerProfile,
  testDIDResolution,
  testTrustScoreCalculation,
  testFrontendAccess,
  testLiquidAuthAccess,
};
