/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 *
 * Screenshot unlocked vault state
 * Prerequisites:
 *   1. Create a vault manually in the extension
 *   2. Have at least one password entry
 * Run: cd tests && node screenshot-unlocked.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../.output/chrome-mv3');
const OUTPUT_DIR = join(__dirname, 'screenshots');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox'
    ]
  });

  try {
    await delay(3000);

    const workerTarget = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().includes('chrome-extension'),
      { timeout: 10000 }
    );
    const worker = await workerTarget.worker();

    console.log('Opening popup...');
    await worker.evaluate('chrome.action.openPopup();');
    await delay(1500);

    const popupTarget = await browser.waitForTarget(
      t => t.type() === 'page' && t.url().endsWith('popup.html'),
      { timeout: 5000 }
    );
    const popupPage = await popupTarget.asPage();

    // Check current state
    const state = await popupPage.evaluate(() => ({
      text: document.body.innerText,
      hasUnlock: document.body.innerText.toLowerCase().includes('unlock'),
      hasEntries: document.querySelectorAll('[data-entry-id], .entry-card, article').length > 0
    }));

    if (state.hasUnlock) {
      console.log('\nVault is locked. Please unlock it manually and run again.');
      console.log('Tip: Use fingerprint or PIN to unlock.\n');
      await delay(30000);
      await browser.close();
      return;
    }

    // Set viewport for popup
    await popupPage.setViewport({ width: 380, height: 580 });

    // Main popup
    const mainPath = join(OUTPUT_DIR, 'readme-unlocked.png');
    await popupPage.screenshot({ path: mainPath });
    console.log(`Saved: ${mainPath}`);

    // Click first entry if exists
    const firstEntry = await popupPage.$('button[data-entry-id], .entry-card button, article button');
    if (firstEntry) {
      await firstEntry.click();
      await delay(500);

      const detailPath = join(OUTPUT_DIR, 'readme-entry-detail.png');
      await popupPage.screenshot({ path: detailPath });
      console.log(`Saved: ${detailPath}`);
    }

    // Open settings
    const settingsBtn = await popupPage.$('button[aria-label="Settings"], button[title="Settings"], [data-action="settings"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await delay(500);

      const settingsPath = join(OUTPUT_DIR, 'readme-settings.png');
      await popupPage.screenshot({ path: settingsPath });
      console.log(`Saved: ${settingsPath}`);
    }

    // Google autofill demo
    console.log('\nOpening Google login page...');
    const googlePage = await browser.newPage();
    await googlePage.setViewport({ width: 500, height: 600 });
    await googlePage.goto('https://accounts.google.com/');
    await delay(3000);

    const googlePath = join(OUTPUT_DIR, 'readme-autofill.png');
    await googlePage.screenshot({ path: googlePath });
    console.log(`Saved: ${googlePath}`);

    console.log('\nDone! Add these to README.md:');
    console.log('```markdown');
    console.log('## Screenshots');
    console.log('');
    console.log('![Locked](tests/screenshots/readme-locked.png)');
    console.log('![Unlocked](tests/screenshots/readme-unlocked.png)');
    console.log('![Entry Detail](tests/screenshots/readme-entry-detail.png)');
    console.log('![Settings](tests/screenshots/readme-settings.png)');
    console.log('![Autofill](tests/screenshots/readme-autofill.png)');
    console.log('```');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();