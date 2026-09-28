import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function clickButtonWithText(page, searchText) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && txt.toLowerCase().includes(searchText.toLowerCase())) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function run() {
  console.log('1. Getting auth tokens from API...');
  await fetch('http://localhost:3000/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919000000001', role: 'COLLECTOR' }),
  });

  const otpRes = await fetch('http://localhost:3000/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '+919000000001', role: 'COLLECTOR', code: '1234' }),
  });
  const otpData = await otpRes.json();
  const tokens = {
    accessToken: otpData.data.accessToken,
    refreshToken: otpData.data.refreshToken,
  };

  console.log('2. Launching Chrome with high-DPI mobile viewport...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: {
      width: 430,
      height: 932,
      deviceScaleFactor: 2, // 2x retina scale for crystal sharp PPT slides
      isMobile: true,
      hasTouch: true,
    },
  });

  const page = await browser.newPage();

  // Navigate and inject session
  await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded' });
  await page.evaluate((toks) => {
    localStorage.setItem('rescrap.collector.session', JSON.stringify(toks));
  }, tokens);
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Click Splash if present
  await clickButtonWithText(page, 'शुरू करें');
  await sleep(800);

  async function capture(filename, description) {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`✓ Saved [${filename}]: ${description}`);
  }

  // -------------------------------------------------------------
  // 1. CAPTURE SCRAP (Photo + Material + Weight)
  // -------------------------------------------------------------
  console.log('\n--- 1. CAPTURE SCRAP (Photo + Material + Weight) ---');
  await clickButtonWithText(page, 'Add Scrap Item');
  await sleep(800);

  // Step 1: Click Take Photo
  await clickButtonWithText(page, 'Take Photo');
  await sleep(800);

  // Step 2: Click Confirm Material
  await clickButtonWithText(page, 'Confirm Material');
  await sleep(800);

  // Step 3: Now on Photo + Material + Weight screen!
  // Stepper: Click + to increase weight to 15 kg
  const stepperButtons = await page.$$('button');
  for (const b of stepperButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && txt.trim() === '+') {
      await b.click();
      await sleep(150);
      await b.click();
      await sleep(150);
      await b.click();
      break;
    }
  }
  await sleep(500);

  await capture('01_capture_scrap.png', '1. CAPTURE SCRAP: Photo + Material + Weight (15 kg stepper, Condition & Source)');

  // -------------------------------------------------------------
  // 2. PRICE & VALUE (Reference Price + Estimated Value)
  // -------------------------------------------------------------
  console.log('\n--- 2. PRICE & VALUE (Reference Price + Estimated Value) ---');
  // Click "Calculate Value / मूल्य जांचें"
  await clickButtonWithText(page, 'Calculate Value');
  await sleep(800);

  await capture('02_price_and_value.png', '2. PRICE & VALUE: Fair Value Review & Estimate (Around ₹3,600, Reference Rate ₹240/kg)');

  // -------------------------------------------------------------
  // 3. RECYCLER MATCHING (Verified Recycler + Material + Location)
  // -------------------------------------------------------------
  console.log('\n--- 3. RECYCLER MATCHING (Verified Recycler + Material + Location) ---');
  // Click "Send Scrap / जमा करें"
  await clickButtonWithText(page, 'Send Scrap');
  await sleep(1200);

  await capture('03_recycler_matching.png', '3. RECYCLER MATCHING: Verified Recycler + Material + Location (Apex E-Waste, Hadapsar 1.8km, CPCB Verified)');

  // -------------------------------------------------------------
  // 4. VERIFIED HANDOVER (Lot ID + Final Weight + GPS + Timestamp)
  // -------------------------------------------------------------
  console.log('\n--- 4. VERIFIED HANDOVER (Lot ID + Final Weight + GPS + Timestamp) ---');
  // Click "Accept This Offer / स्वीकार करें"
  await clickButtonWithText(page, 'Accept This Offer');
  await sleep(800);

  // Click "Track Pickup & Verify Handover"
  await clickButtonWithText(page, 'Track Pickup');
  await sleep(1000);

  // On HandoverView Timeline -> Click "Proceed to Weight Verification"
  await clickButtonWithText(page, 'Weight Verification');
  await sleep(800);

  await capture('04_verified_handover_scale.png', '4a. VERIFIED HANDOVER: On-site Calibrated Scale Verification (Declared 15kg vs Scale 12.5kg)');

  // Check the discrepancy checkbox
  const checkBoxes = await page.$$('input[type="checkbox"]');
  if (checkBoxes.length > 0) {
    await checkBoxes[0].click();
    await sleep(400);
  }

  // Click "Confirm Handover & Release / पुष्टि करें"
  await clickButtonWithText(page, 'Confirm Handover & Release');
  await sleep(1000);

  // Capture Payment Confirmation screen
  await capture('04_payment_confirmation.png', '4b. PAYMENT CONFIRMATION: Instant UPI Payment & Simulated Settlement');

  // Click "View Digital Lot Passport"
  await clickButtonWithText(page, 'Digital Lot Passport');
  await sleep(800);

  await capture('04_verified_handover_passport.png', '4c. DIGITAL LOT PASSPORT: Lot ID + Reconciled Weight + Recycler Facility + Traceability Hash');

  // -------------------------------------------------------------
  // 5. PAYMENT & LOT HISTORY (Final Amount + Payment Status + Transaction History)
  // -------------------------------------------------------------
  console.log('\n--- 5. PAYMENT & LOT HISTORY (Final Amount + Payment Status + Transaction History) ---');
  // Click "Done • Return to Home"
  await clickButtonWithText(page, 'Return to Home');
  await sleep(800);

  // Click "Earnings" tab in BottomNav
  const bottomNavButtons = await page.$$('nav button');
  for (const b of bottomNavButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Earnings') || txt.includes('कमाई'))) {
      await b.click();
      break;
    }
  }
  await sleep(800);

  await capture('05_payment_and_lot_history.png', '5. PAYMENT & LOT HISTORY: Total Confirmed Payouts + Settlement Ledger + UPI Status');

  // Bonus 1: Live Market Price Board
  console.log('\n--- Bonus: Live Price Board ---');
  for (const b of bottomNavButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Price Board') || txt.includes('भाव'))) {
      await b.click();
      break;
    }
  }
  await sleep(800);
  await capture('02_live_price_board.png', 'Bonus: Live Price Board (Market Rates per kg with Material Photography)');

  // Bonus 2: Collector Home Screen
  console.log('\n--- Bonus: Collector Home Screen ---');
  for (const b of bottomNavButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Home') || txt.includes('होम'))) {
      await b.click();
      break;
    }
  }
  await sleep(800);
  await capture('00_collector_home.png', 'Bonus: Collector App Home Screen (Editorial Hero, Quick Actions, Material Rates & Impact)');

  await browser.close();
  console.log('\n=== All presentation screenshots captured successfully in:', SCREENSHOT_DIR);
}

run().catch((err) => {
  console.error('Execution failed:', err);
  process.exit(1);
});
