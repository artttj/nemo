/**
 * Nemo Test Helper - Automated vault management for E2E tests
 *
 * Usage:
 *   import { unlockWithPin, ensureVaultExists } from './utils/nemo-test-helper.mjs';
 *
 *   await unlockWithPin(popupPage);
 */

const TEST_PIN = '123456';
const TEST_CREDENTIALS = {
  title: 'Test Entry',
  username: 'test@example.com',
  password: 'TestPassword123!',
  url: 'https://example.com'
};

export const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * Check if the popup is in a locked state
 */
export async function isLocked(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('unlock') ||
           text.includes('biometric') ||
           text.includes('pin') ||
           text.includes('touch id') ||
           text.includes('face id');
  });
}

/**
 * Check if vault has entries (unlocked state)
 */
export async function isUnlocked(page) {
  return page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('password') ||
           text.includes('entry') ||
           !!document.querySelector('[data-entry-id]');
  });
}

/**
 * Unlock vault using PIN
 * @param {import('puppeteer').Page} page - Popup page
 * @param {string} pin - PIN code (default: 123456)
 */
export async function unlockWithPin(page, pin = TEST_PIN) {
  console.log('Unlocking vault with PIN...');

  const pinInput = await page.$('input[type="password"][maxlength="6"], input[type="password"][data-pin], input[placeholder*="PIN" i]');

  if (!pinInput) {
    console.log('No PIN input found - vault may already be unlocked');
    return false;
  }

  await pinInput.fill(pin);
  await delay(1500);

  // Verify unlock
  const unlocked = await isUnlocked(page);
  if (unlocked) {
    console.log('Vault unlocked successfully');
    return true;
  }

  console.log('PIN unlock did not work - vault may need different credentials');
  return false;
}

/**
 * Lock the vault
 * @param {import('puppeteer').Page} page - Popup page
 */
export async function lockVault(page) {
  const lockBtn = await page.$('[aria-label="Lock"], button:has-text("Lock"), [title="Lock"]');
  if (lockBtn) {
    await lockBtn.click();
    await delay(500);
    return true;
  }
  return false;
}

/**
 * Create a new vault with PIN setup
 * @param {import('puppeteer').Page} page - Popup page
 */
export async function createVaultWithPin(page, pin = TEST_PIN) {
  console.log('Creating new vault with PIN...');

  // Click create vault button
  const createBtn = await page.$('button:has-text("Create"), button:has-text("Get Started"), button:has-text("New Vault")');
  if (createBtn) {
    await createBtn.click();
    await delay(1000);
  }

  // Handle setup flow - look for PIN setup
  const pinInput = await page.$('input[type="password"][maxlength="6"], input[data-pin]');
  if (pinInput) {
    await pinInput.fill(pin);
    await delay(300);

    // Confirm PIN if needed
    const confirmInputs = await page.$$('input[type="password"]');
    if (confirmInputs.length >= 2) {
      await confirmInputs[1].fill(pin);
      await delay(300);
    }

    const confirmBtn = await page.$('button:has-text("Confirm"), button:has-text("Set Up"), button:has-text("Continue")');
    if (confirmBtn) await confirmBtn.click();
    await delay(1500);
  }

  console.log('Vault created');
  return true;
}

/**
 * Add a test entry to the vault
 * @param {import('puppeteer').Page} page - Popup page
 * @param {Object} entry - Entry data
 */
export async function addEntry(page, entry = TEST_CREDENTIALS) {
  console.log('Adding test entry...');

  // Click add button
  const addBtn = await page.$('button:has-text("Add password"), button:has-text("Add"), button:has-text("New")');
  if (addBtn) {
    await addBtn.click();
    await delay(500);
  }

  // Fill form
  await page.fill('input[name="title"]', entry.title);
  await page.fill('input[name="username"]', entry.username);
  await page.fill('input[name="password"]', entry.password);
  await page.fill('input[name="url"]', entry.url);
  await delay(300);

  // Save
  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Create")');
  if (saveBtn) await saveBtn.click();
  await delay(1000);

  console.log('Entry added');
}

/**
 * Ensure vault exists and is unlocked, creating if necessary
 * @param {import('puppeteer').Page} page - Popup page
 * @param {import('puppeteer').Browser} browser - Browser instance
 */
export async function ensureUnlocked(page, browser) {
  // Check current state
  const locked = await isLocked(page);
  const unlocked = await isUnlocked(page);

  if (unlocked) {
    console.log('Vault already unlocked');
    return;
  }

  if (locked) {
    const success = await unlockWithPin(page);
    if (success) return;

    // If PIN unlock failed, may need to create vault
    console.log('PIN unlock failed, checking if vault needs creation...');
  }

  // Create new vault
  await createVaultWithPin(page);
  await addEntry(page);
}

/**
 * Get extension ID from browser
 * @param {import('puppeteer').Browser} browser
 */
export async function getExtensionId(browser) {
  const pages = await browser.pages();
  for (const page of pages) {
    const url = page.url();
    if (url.includes('chrome-extension://')) {
      return url.split('/')[2];
    }
  }
  return null;
}

/**
 * Open extension popup
 * @param {import('puppeteer').Browser} browser
 * @param {string} extId
 */
export async function openPopup(browser, extId) {
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.setViewport({ width: 380, height: 600 });
  return popup;
}
