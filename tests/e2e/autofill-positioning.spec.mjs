import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MockVaultManager, createMockMessageHandler } from '../utils/vault-mock.mjs';
import { checkOverlayVisibility, isOverlayProperlyPositioned } from '../utils/test-helper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Autofill Positioning Test</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      margin: 100px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; font-size: 24px; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-weight: 500; color: #555; }
    input {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }
    button {
      width: 100%;
      padding: 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>Positioning Test</h1>
  <form id="login-form">
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="name@example.com" autocomplete="username">
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter password" autocomplete="current-password">
    </div>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>
`;

async function runTest() {
  console.log('🎯 E2E Test: Autofill Overlay Positioning\n');

  let browser;
  let context;
  let mockVault;

  try {
    console.log('1. Setting up mock vault...');
    mockVault = new MockVaultManager();
    console.log('   ✓ Mock vault created (unlocked state)');
    console.log(`   ✓ ${mockVault.getEntries().length} entries loaded\n`);

    console.log('2. Launching Chrome with extension...');
    browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    // Inject mock before page loads
    await context.addInitScript((vaultState) => {
      window.__MOCK_VAULT_STATE__ = vaultState;

      // Override chrome.runtime.sendMessage
      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {
            sendMessage: async (message) => {
              const state = window.__MOCK_VAULT_STATE__;

              if (message.type === 'GET_VAULT_STATE') {
                return { success: true, data: state };
              }
              if (message.type === 'GET_ENTRIES_FOR_AUTOFILL') {
                return { success: true, data: state.vault?.entries || [] };
              }
              if (message.type === 'GET_ENTRY_BY_URL') {
                return { success: true, data: state.vault?.entries?.[0] || null };
              }
              if (message.type === 'ADD_ENTRY') {
                return { success: true, data: message.payload };
              }
              return { success: false, error: 'Not mocked' };
            },
            onMessage: { addListener: () => {}, removeListener: () => {} }
          }
        },
        writable: true,
        configurable: true
      });
    }, mockVault.getState());

    await delay(3000);
    console.log('   ✓ Extension loaded\n');

    console.log('3. Creating test page...');
    const page = await context.newPage();
    await page.setContent(LOGIN_PAGE_HTML);
    await delay(2000);
    console.log('   ✓ Test page created\n');

    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'position-01-initial.png'),
      fullPage: true
    });

    console.log('4. Focusing password field to trigger Nemo button...');
    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await delay(1000);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'position-02-password-focused.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved\n');

    console.log('5. Checking for Nemo buttons...');
    const buttonCheck = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-nemo-action]');
      return {
        count: buttons.length,
        buttons: Array.from(buttons).map(b => ({
          action: b.dataset.nemoAction,
          rect: b.getBoundingClientRect(),
          opacity: b.style.opacity,
          visible: b.getBoundingClientRect().width > 0
        }))
      };
    });

    console.log(`   Found ${buttonCheck.count} Nemo buttons`);
    buttonCheck.buttons.forEach(btn => {
      console.log(`   - action: ${btn.action}, visible: ${btn.visible}, opacity: ${btn.opacity}`);
    });

    if (buttonCheck.count > 0) {
      console.log('\n6. Clicking fill button to open overlay...');
      const fillButton = page.locator('[data-nemo-action="fill"]').first();
      await fillButton.click();
      await delay(1500);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'position-03-overlay-opened.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot saved\n');

      console.log('7. Checking overlay positioning...');
      const visibility = await checkOverlayVisibility(page);
      console.log(`   Overlays found: ${visibility.overlayCount}`);

      if (visibility.overlayCount > 0) {
        visibility.overlays.forEach((overlay, i) => {
          console.log(`\n   Overlay [${i}]:`);
          console.log(`     Text: "${overlay.text}"`);
          console.log(`     ✓ Position: ${overlay.styles.position}`);
          console.log(`     ✓ Top: ${overlay.styles.top}`);
          console.log(`     ✓ Right: ${overlay.styles.right}`);
          console.log(`     ✓ Z-Index: ${overlay.styles.zIndex}`);
          console.log(`     ✓ Width: ${overlay.rect.width}px, Height: ${overlay.rect.height}px`);
          console.log(`     ✓ Visible: ${overlay.visible}`);

          // Key assertions for positioning
          const positionOk = overlay.hasPositionFixed;
          const topOk = overlay.hasTopValue;
          const rightOk = overlay.hasRightValue;
          const visible = overlay.visible;

          console.log(`\n     Positioning check:`);
          console.log(`       ${positionOk ? '✅' : '❌'} position: fixed`);
          console.log(`       ${topOk ? '✅' : '❌'} has top value`);
          console.log(`       ${rightOk ? '✅' : '❌'} has right value`);
          console.log(`       ${visible ? '✅' : '❌'} is visible`);

          if (positionOk && topOk && rightOk && visible) {
            console.log('\n       ✅ OVERLAY IS PROPERLY POSITIONED AND VISIBLE');
          } else {
            console.log('\n       ❌ OVERLAY HAS POSITIONING ISSUES');
          }
        });
      } else {
        console.log('   ⚠️ No overlays found - checking if mock is working...');

        // Debug: check if chrome.runtime.sendMessage is mocked
        const debug = await page.evaluate(() => {
          return {
            hasChrome: typeof chrome !== 'undefined',
            hasRuntime: typeof chrome?.runtime !== 'undefined',
            hasSendMessage: typeof chrome?.runtime?.sendMessage === 'function'
          };
        });
        console.log('   Chrome API:', debug);
      }

      console.log('\n8. Final visibility check...');
      const finalCheck = await isOverlayProperlyPositioned(page);
      console.log(`   Result: ${finalCheck.visible ? 'VISIBLE' : 'NOT VISIBLE'}`);
      if (finalCheck.reason) {
        console.log(`   Reason: ${finalCheck.reason}`);
      }
    }

    console.log('\n✅ Test complete!');
    console.log('   Check screenshots in tests/screenshots/');

    await delay(5000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

runTest();
