/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 *
 * Screenshot generator for README
 * Run: cd tests && node screenshot-readme.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../.output/chrome-mv3');
const OUTPUT_DIR = join(__dirname, 'screenshots');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching Chrome with extension...');
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--window-size=400,600'
    ]
  });

  try {
    await delay(2000);

    // Find extension popup
    const workerTarget = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().includes('chrome-extension'),
      { timeout: 10000 }
    );

    const worker = await workerTarget.worker();

    // Open popup
    console.log('Opening popup...');
    await worker.evaluate('chrome.action.openPopup();');
    await delay(1000);

    const popupTarget = await browser.waitForTarget(
      t => t.type() === 'page' && t.url().endsWith('popup.html'),
      { timeout: 5000 }
    );

    const popupPage = await popupTarget.asPage();
    await popupPage.setViewport({ width: 380, height: 580 });

    // Screenshot: Locked state
    const lockedPath = join(OUTPUT_DIR, 'readme-locked.png');
    await popupPage.screenshot({ path: lockedPath });
    console.log(`Saved: ${lockedPath}`);

    // Check if we need to create vault
    const bodyText = await popupPage.evaluate(() => document.body.innerText);

    if (bodyText.toLowerCase().includes('create') || bodyText.toLowerCase().includes('setup')) {
      console.log('\nExtension shows setup screen. For unlocked screenshots:');
      console.log('1. Manually create a vault in the extension');
      console.log('2. Run this script again');
    } else if (bodyText.toLowerCase().includes('unlock')) {
      console.log('\nExtension is locked. For unlocked screenshots:');
      console.log('1. Manually unlock the vault');
      console.log('2. Run: node screenshot-unlocked.mjs');
    }

    console.log('\nDone! Screenshots saved to tests/screenshots/');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();