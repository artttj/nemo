/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 *
 * Screenshot generator for README - Uses mock vault state
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

const TEST_RECOVERY_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function findButtonByText(page, texts) {
  for (const text of texts) {
    const btn = await page.evaluateHandle((t) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.toLowerCase().includes(t.toLowerCase()));
    }, text);
    if (btn) return btn.asElement();
  }
  return null;
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching Chrome with Nemo extension...');
  const browser = await puppeteer.launch({
    headless: false,
    pipe: true,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--window-size=1280,900'
    ]
  });

  try {
    await delay(2000);

    const workerTarget = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().includes('chrome-extension'),
      { timeout: 10000 }
    );

    const extId = workerTarget.url().split('/')[2];
    console.log(`Extension ID: ${extId}`);

    console.log('Opening extension popup...');
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`);
    await popupPage.setViewport({ width: 380, height: 600 });
    await delay(1000);

    // Check current state
    const initialState = await popupPage.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasCreate: text.includes('create vault') || text.includes('set up your vault'),
        hasUnlock: text.includes('unlock') || text.includes('pin') || text.includes('biometric'),
        hasEntries: text.includes('password') || text.includes('entry') || text.includes('google')
      };
    });

    console.log('Initial state:', initialState);

    // Create vault if needed
    if (initialState.hasCreate) {
      console.log('\n=== Creating vault ===');

      const createBtn = await findButtonByText(popupPage, ['Create Vault', 'Create']);
      if (createBtn) {
        await createBtn.click();
        await delay(2000);
      }

      // Wait for phrase
      await delay(1500);

      // Click copy
      const copyBtn = await findButtonByText(popupPage, ['Copy all words', 'Copy']);
      if (copyBtn) {
        await copyBtn.click();
        await delay(300);
      }

      // Wait for phrase to be fully rendered
      await delay(1000);

      // Click "Copy all words" button
      const copyClicked = await popupPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const copyBtn = buttons.find(b => b.textContent.toLowerCase().includes('copy all'));
        if (copyBtn) {
          copyBtn.click();
          return true;
        }
        return false;
      });
      if (copyClicked) {
        console.log('Clicked copy');
        await delay(300);
      }

      // Disable Touch ID toggle (click the toggle switch)
      const touchIdDisabled = await popupPage.evaluate(() => {
        // Find the toggle container and click it to disable
        const toggleContainers = Array.from(document.querySelectorAll('[role="switch"], .relative.cursor-pointer, div[onclick*="setEnableTouchId"]'));
        for (const container of toggleContainers) {
          container.click();
          return true;
        }
        // Fallback: find by biometric text and click parent
        const biometricTexts = Array.from(document.querySelectorAll('p'));
        for (const p of biometricTexts) {
          if (p.textContent.toLowerCase().includes('unlock with biometrics')) {
            const parent = p.parentElement?.parentElement;
            if (parent) {
              parent.click();
              return true;
            }
          }
        }
        return false;
      });
      if (touchIdDisabled) {
        console.log('Disabled Touch ID');
        await delay(300);
      }

      // Check "I've saved my master key" - click the span or container
      const confirmedClicked = await popupPage.evaluate(() => {
        // Find the span with the text and click it
        const spans = Array.from(document.querySelectorAll('span'));
        for (const span of spans) {
          if (span.textContent.includes("I've saved my master key")) {
            span.click();
            return true;
          }
        }
        // Fallback: click the label container
        const labels = Array.from(document.querySelectorAll('label'));
        for (const label of labels) {
          if (label.textContent.includes("I've saved")) {
            label.click();
            return true;
          }
        }
        return false;
      });
      if (confirmedClicked) {
        console.log('Confirmed master key saved');
        await delay(500);
      }

      // Verify confirmation state by checking if create button is enabled
      const buttonEnabled = await popupPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent.toLowerCase().includes('create vault'));
        return createBtn && !createBtn.disabled;
      });
      console.log('Create button enabled:', buttonEnabled);

      // Create vault - click "Create vault" button
      const createClicked = await popupPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('create') && text.includes('vault')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (createClicked) {
        console.log('Creating vault...');
        await delay(6000);
      } else {
        console.log('Could not find create button');
      }

      console.log('Vault created');

      // Wait for vault state to stabilize
      await delay(2000);

      // Check if vault is unlocked, if not unlock with recovery phrase
      const stateAfterCreate = await popupPage.evaluate(() => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }, (response) => {
            resolve(response);
          });
        });
      });
      console.log('State after create:', stateAfterCreate);

      if (!stateAfterCreate?.data?.isUnlocked) {
        console.log('Vault is locked after creation, unlocking with recovery phrase...');

        // Debug: what's on screen?
        const screenText = await popupPage.evaluate(() => document.body.innerText.toLowerCase());
        console.log('Screen text:', screenText.substring(0, 500));

        // Click "Use recovery phrase" button at bottom
        const recoveryBtn = await popupPage.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            if (btn.textContent.toLowerCase().includes('recovery phrase')) {
              return btn;
            }
          }
          // Try any button with "recovery" or "phrase"
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('recovery') || text.includes('phrase') || text.includes('seed')) {
              return btn;
            }
          }
          return null;
        });

        if (recoveryBtn) {
          await recoveryBtn.asElement().click();
          await delay(1000);
          console.log('Clicked recovery phrase button');
        } else {
          console.log('Recovery button not found, trying alternative...');
          // Try clicking any visible button that might be recovery related
          const anyRecoveryBtn = await popupPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const recoveryBtn = buttons.find(b => b.textContent.toLowerCase().includes('recovery'));
            if (recoveryBtn) recoveryBtn.click();
            return !!recoveryBtn;
          });
          console.log('Alternative recovery click:', recoveryBtn);
          await delay(1000);
        }

        // Fill textarea with recovery phrase
        const textarea = await popupPage.$('textarea[placeholder*="phrase"], textarea');
        if (textarea) {
          console.log('Found textarea, entering phrase...');
          await textarea.fill(TEST_RECOVERY_PHRASE);
          await delay(500);

          // Click restore button
          const restoreBtn = await findButtonByText(popupPage, ['Restore vault', 'Create vault', 'Restore', 'Unlock']);
          if (restoreBtn) {
            await restoreBtn.click();
            await delay(3000);
            console.log('Clicked restore');
          } else {
            console.log('Restore button not found');
          }
        } else {
          console.log('No textarea found');
        }

        // Wait for unlock
        await delay(3000);
      }

      // Add mock entries
      console.log('Adding mock entries...');
      const mockEntries = [
        { title: 'Google', username: 'user@gmail.com', password: 'GmailPass123!', url: 'https://google.com', tags: [] },
        { title: 'GitHub', username: 'dev@github.com', password: 'GitPass456!', url: 'https://github.com', tags: ['work'] },
        { title: 'Amazon', username: 'shopper@amazon.com', password: 'ShopPass789!', url: 'https://amazon.com', tags: ['personal'] }
      ];

      for (const entry of mockEntries) {
        const result = await popupPage.evaluate((entry) => {
          return chrome.runtime.sendMessage({ type: 'ADD_ENTRY', payload: entry });
        }, entry);
        console.log('Add entry result:', result);
        await delay(500);
      }
      console.log('Added mock entries');

      // Trigger state reload in popup
      await popupPage.evaluate(() => {
        window.location.reload();
      });
      await delay(1500);

      // Verify entries loaded
      const entryCount = await popupPage.evaluate(() => {
        const rows = document.querySelectorAll('.nemo-entry-row');
        return rows.length;
      });
      console.log(`Entries in DOM: ${entryCount}`);
    }

    // Check if locked
    const lockedState = await popupPage.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        isLocked: text.includes('unlock') && !text.includes('create')
      };
    });

    console.log('Locked state:', lockedState);

    // Unlock with recovery phrase
    if (lockedState.isLocked) {
      console.log('\n=== Unlocking with recovery phrase ===');

      // Click "Use recovery phrase" button (at bottom of locked view)
      const recoveryBtn = await popupPage.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.toLowerCase().includes('recovery phrase'));
      });

      if (recoveryBtn) {
        await recoveryBtn.asElement().click();
        console.log('Clicked recovery phrase button');
        await delay(800);
      } else {
        console.log('Recovery button not found');
      }

      // Wait for recovery screen
      await delay(500);

      // Find textarea and fill phrase
      const textarea = await popupPage.$('textarea[placeholder*="phrase"], textarea');
      if (textarea) {
        console.log('Found textarea, entering phrase...');
        await textarea.fill(TEST_RECOVERY_PHRASE);
        await delay(500);

        // Click restore/unlock button
        const restoreBtn = await findButtonByText(popupPage, ['Restore vault', 'Create vault', 'Restore', 'Unlock']);
        if (restoreBtn) {
          console.log('Clicking restore button...');
          await restoreBtn.click();
          await delay(3000);
        }
      } else {
        console.log('No textarea found');
      }
    }

    await delay(1000);

    console.log('\n=== Taking screenshots ===');

    // Wait for entries to load
    await delay(1000);

    // Screenshot 1: Main unlocked view
    const unlockedPath = join(OUTPUT_DIR, 'readme-unlocked.png');
    await popupPage.screenshot({ path: unlockedPath });
    console.log(`Saved unlocked: ${unlockedPath}`);

    // Debug: check what entries exist
    const entryCount = await popupPage.evaluate(() => {
      const rows = document.querySelectorAll('.nemo-entry-row');
      return rows.length;
    });
    console.log(`Found ${entryCount} entries in DOM`);

    // Click first entry for detail view
    const firstEntry = await popupPage.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('.nemo-entry-row'));
      return rows[0] || null;
    });

    if (firstEntry) {
      const entryEl = firstEntry.asElement();
      if (entryEl) {
        try {
          await entryEl.click();
          await delay(800);
          console.log('Clicked first entry');

          const detailPath = join(OUTPUT_DIR, 'readme-entry-detail.png');
          await popupPage.screenshot({ path: detailPath });
          console.log(`Saved entry detail: ${detailPath}`);

          // Go back
          const backBtn = await findButtonByText(popupPage, ['Back']);
          if (backBtn) {
            await backBtn.click();
            await delay(500);
          }
        } catch (e) {
          console.log('Could not click entry:', e.message);
        }
      } else {
        console.log('Entry element was null');
      }
    } else {
      console.log('No entries found to click');
      // Log DOM for debugging
      const domSample = await popupPage.evaluate(() => document.body.innerHTML.substring(0, 500));
      console.log('DOM sample:', domSample);
    }

    // Screenshot: Settings view
    const settingsBtn = await popupPage.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.getAttribute('aria-label') === 'Settings' || b.title === 'Settings');
    });

    if (settingsBtn) {
      const settingsEl = settingsBtn.asElement();
      if (settingsEl) {
        await settingsEl.click();
        await delay(800);
        console.log('Opened settings');

        const settingsPath = join(OUTPUT_DIR, 'readme-settings.png');
        await popupPage.screenshot({ path: settingsPath });
        console.log(`Saved settings: ${settingsPath}`);

        // Close settings
        const closeBtn = await findButtonByText(popupPage, ['Close', 'Back']);
        if (closeBtn) {
          await closeBtn.click();
          await delay(500);
        }
      } else {
        console.log('Settings button element was null');
      }
    } else {
      console.log('Settings button not found');
    }

    // Lock the vault and capture locked state
    console.log('Locking vault...');
    const lockBtn = await findButtonByText(popupPage, ['Lock']);
    if (lockBtn) {
      await lockBtn.click();
      await delay(1500);
      console.log('Vault locked');
    }

    // Wait for locked view to fully render
    await delay(500);

    // Screenshot: Locked state
    const lockedPath = join(OUTPUT_DIR, 'readme-locked.png');
    await popupPage.screenshot({ path: lockedPath });
    console.log(`Saved locked: ${lockedPath}`);

    // Screenshot: Autofill on login page
    console.log('\n=== Capturing autofill screenshot ===');
    const loginPage = await browser.newPage();
    await loginPage.setViewport({ width: 500, height: 700 });

    // Create a blob URL that the content script can inject into
    const loginHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sample Login</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .login-card {
      background: white;
      padding: 40px 30px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 360px;
    }
    h1 { margin: 0 0 24px; font-size: 24px; color: #1a1a1a; text-align: center; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 6px; font-size: 14px; color: #555; font-weight: 500; }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    input:focus { outline: none; border-color: #667eea; }
    button {
      width: 100%;
      padding: 14px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #5a6fd6; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>Welcome Back</h1>
    <form action="#" method="POST">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" autocomplete="username" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit">Sign In</button>
    </form>
  </div>
  <script>
    // Manually inject Nemo overlay simulation for screenshot
    setTimeout(() => {
      const emailField = document.getElementById('email');
      if (emailField) {
        // Create Nemo button
        const nemoBtn = document.createElement('button');
        nemoBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        nemoBtn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;background:#1A1A1A;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:9999;';
        emailField.style.position = 'relative';
        emailField.parentElement.appendChild(nemoBtn);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:200px;right:100px;z-index:10000;background:#1A1A1A;border:1px solid rgba(255,255,255,0.1);border-radius:12px;min-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
        overlay.innerHTML = \`
          <div style="padding:16px 20px;background:#0D0D0D;border-bottom:1px solid rgba(255,255,255,0.1);font-size:14px;font-weight:600;color:#FFFFFF;display:flex;justify-content:space-between;align-items:center;">
            <span>Nemo Password Manager</span>
            <span style="font-size:12px;color:#737373;">3 entries</span>
          </div>
          <div class="entry" style="padding:16px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.05);">
            <div style="width:40px;height:40px;background:#C98700;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:16px;">G</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:500;color:#FFFFFF;">Google</div>
              <div style="font-size:13px;color:#737373;">user@gmail.com</div>
            </div>
          </div>
          <div class="entry" style="padding:16px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#2A2A2A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#737373;font-weight:600;font-size:16px;">G</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:500;color:#FFFFFF;">GitHub</div>
              <div style="font-size:13px;color:#737373;">dev@github.com</div>
            </div>
          </div>
          <div class="entry" style="padding:16px 20px;cursor:pointer;display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#2A2A2A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#737373;font-weight:600;font-size:16px;">A</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:500;color:#FFFFFF;">Amazon</div>
              <div style="font-size:13px;color:#737373;">shopper@amazon.com</div>
            </div>
          </div>
        \`;
        document.body.appendChild(overlay);
      }
    }, 500);
  </script>
</body>
</html>`;

    await loginPage.setContent(loginHtml, { waitUntil: 'networkidle0' });
    await delay(1500);

    const autofillPath = join(OUTPUT_DIR, 'readme-autofill.png');
    await loginPage.screenshot({ path: autofillPath });
    console.log(`Saved: ${autofillPath}`);

    console.log('\n=== Done! ===');
    console.log('Screenshots saved to tests/screenshots/');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

main();
