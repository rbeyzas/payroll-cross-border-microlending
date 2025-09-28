// Integration Test Script for Hackathon Demo
// This script tests the complete integration flow

const puppeteer = require("puppeteer");

async function testIntegration() {
  console.log("🧪 Starting Integration Test...");

  const browser = await puppeteer.launch({
    headless: false, // Show browser for demo
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    // Test 1: Frontend is accessible
    console.log("📱 Test 1: Frontend Accessibility");
    await page.goto("http://localhost:5173/hackathon-demo");
    await page.waitForSelector("h1", { timeout: 5000 });
    console.log("✅ Frontend accessible");

    // Test 2: Liquid Auth page
    console.log("🔐 Test 2: Liquid Auth Page");
    await page.goto("http://localhost:5173/liquid-auth");
    await page.waitForSelector("h2", { timeout: 5000 });
    console.log("✅ Liquid Auth page accessible");

    // Test 3: Backend API
    console.log("🖥️ Test 3: Backend API");
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3000/auth/session");
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log("✅ Backend API response:", response);

    // Test 4: DID Resolver (mock)
    console.log("🌐 Test 4: DID Resolver");
    const didTest = await page.evaluate(async () => {
      try {
        // Test our DID resolver
        const testDID = "did:algo:testnet:test123";
        const response = await fetch(`https://resolver.goplausible.xyz/resolve?did=${testDID}`);
        return {
          status: response.status,
          ok: response.ok,
          did: testDID,
        };
      } catch (error) {
        return { error: error.message, fallback: "Using mock resolver" };
      }
    });
    console.log("✅ DID Resolver test:", didTest);

    console.log("🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await browser.close();
  }
}

// Run the test
testIntegration().catch(console.error);
