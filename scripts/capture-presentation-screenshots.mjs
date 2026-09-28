import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('1. Obtaining valid collector tokens from API...');
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
  console.log('Obtained tokens successfully! Access token length:', tokens.accessToken.length);

  console.log('2. Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: {
      width: 430,
      height: 932,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  });

  const page = await browser.newPage();

  // Navigate to Collector App
  await page.goto('http://localhost:5176', { waitUntil: 'domcontentloaded' });
  await page.evaluate((toks) => {
    localStorage.setItem('rescrap.collector.session', JSON.stringify(toks));
  }, tokens);

  // Reload to pick up session
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Click through splash screen if needed
  const splashButtons = await page.$$('button');
  for (const b of splashButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('शुरू करें') || txt.includes('Get Started') || txt.includes('Start'))) {
      await b.click();
      await sleep(1000);
      break;
    }
  }

  async function capture(filename, description) {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`✓ Saved [${filename}]: ${description}`);
  }

  console.log('\n--- 1. CAPTURE SCRAP (Photo + Material + Weight) ---');
  // Click on "Add Scrap Item"
  const addButtons = await page.$$('button');
  for (const b of addButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Add Scrap Item') || txt.includes('नया कबाड़ जोड़ें') || txt.includes('कबाड़ जोड़ें'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Step 1: Click "Use Photo & Continue"
  const continueButtons = await page.$$('button');
  for (const b of continueButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Use Photo & Continue') || txt.includes('जारी रखें') || txt.includes('Continue'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Step 2: Select Circuit Board
  const materialButtons = await page.$$('button');
  for (const b of materialButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Circuit Board') || txt.includes('मदरबोर्ड') || txt.includes('Printed Circuit'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Step 3: Now on Photo + Material + Weight screen!
  // Increase weight by clicking +5 kg
  const weightButtons = await page.$$('button');
  for (const b of weightButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && txt.includes('+5')) {
      await b.click();
      await sleep(500);
      break;
    }
  }

  await capture('01_capture_scrap.png', '1. CAPTURE SCRAP: Photo + Material + Weight Stepper');

  console.log('\n--- 2. PRICE & VALUE (Reference Price + Estimated Value) ---');
  // Click "Calculate Fair Valuation"
  const calcButtons = await page.$$('button');
  for (const b of calcButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Calculate Fair Valuation') || txt.includes('मूल्यांकन देखें'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  await capture('02_price_and_value.png', '2. PRICE & VALUE: Reference Price + Estimated Value Breakdown');

  console.log('\n--- 3. RECYCLER MATCHING (Verified Recycler + Material + Location) ---');
  // Click "Confirm & Find Recyclers"
  const findButtons = await page.$$('button');
  for (const b of findButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Find Recyclers') || txt.includes('रीसायकलर्स खोजें') || txt.includes('Confirm'))) {
      await b.click();
      await sleep(1000);
      break;
    }
  }

  await capture('03_recycler_matching.png', '3. RECYCLER MATCHING: Verified Recycler + Material + Location');

  console.log('\n--- 4. VERIFIED HANDOVER (Lot ID + Final Weight + GPS + Timestamp) ---');
  // Accept first offer
  const acceptButtons = await page.$$('button');
  for (const b of acceptButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Accept Offer') || txt.includes('स्वीकार करें'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Click "Confirm & Lock Handover" in modal
  const lockButtons = await page.$$('button');
  for (const b of lockButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Lock Handover') || txt.includes('पुष्टि करें'))) {
      await b.click();
      await sleep(1000);
      break;
    }
  }

  // Proceed to Weight Verification
  const proceedButtons = await page.$$('button');
  for (const b of proceedButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Weight Verification') || txt.includes('सत्यापन'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Capture Verified Handover Scale Screen
  await capture('04_verified_handover_scale.png', '4a. VERIFIED HANDOVER: Declared vs Recycler Digital Scale reading');

  // Check scale acknowledgement checkbox
  const checkBoxes = await page.$$('input[type="checkbox"]');
  if (checkBoxes.length > 0) {
    await checkBoxes[0].click();
    await sleep(400);
  }

  // Confirm Handover & Release
  const confirmButtons = await page.$$('button');
  for (const b of confirmButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Confirm Handover') || txt.includes('पुष्टि करें'))) {
      await b.click();
      await sleep(1000);
      break;
    }
  }

  // View Digital Lot Passport
  const passportButtons = await page.$$('button');
  for (const b of passportButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Digital Lot Passport') || txt.includes('पासपोर्ट देखें'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Capture Digital Lot Passport
  await capture('04_verified_handover_passport.png', '4b. VERIFIED HANDOVER: Digital Lot Passport (Lot ID + Weight + Hash + Certificate)');

  console.log('\n--- 5. PAYMENT & LOT HISTORY (Final Amount + Payment Status + Transaction History) ---');
  // Click Done & Return to Home
  const returnButtons = await page.$$('button');
  for (const b of returnButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Return to Home') || txt.includes('Done'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  // Navigate to Earnings tab
  const navButtons = await page.$$('nav button');
  for (const b of navButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Earnings') || txt.includes('कमाई') || txt.includes('पेमेंट्स'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }

  await capture('05_payment_and_lot_history.png', '5. PAYMENT & LOT HISTORY: Confirmed Payouts + Settlement Ledger + UPI status');

  // Also capture Price Board for Pricing slides
  for (const b of navButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Price Board') || txt.includes('भाव') || txt.includes('Prices'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }
  await capture('02_price_board_market.png', 'Bonus: Market Rates & Category Reference Prices');

  // Also capture Home Dashboard
  for (const b of navButtons) {
    const txt = await page.evaluate((el) => el.textContent, b);
    if (txt && (txt.includes('Home') || txt.includes('होम'))) {
      await b.click();
      await sleep(800);
      break;
    }
  }
  await capture('00_collector_home.png', 'Bonus: Collector App Home Screen');

  await browser.close();
  console.log('\nAll 5 presentation screenshot flows completed successfully!');
}

run().catch((err) => {
  console.error('Execution failed:', err);
  process.exit(1);
});
