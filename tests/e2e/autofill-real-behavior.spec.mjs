import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MockVaultManager } from '../utils/vault-mock.mjs';
import { testEntries } from '../fixtures/test-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test login page HTML with proper autocomplete attributes
 * This simulates a real login page that the extension should detect
 */
const TEST_LOGIN_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Login - Secure Site</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      margin: 100px auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      font-size: 28px;
      margin-bottom: 8px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 14px;
      font-size: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
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
      margin-top: 10px;
      transition: background 0.2s, transform 0.1s;
    }
    button:hover {
      background: #5a67d8;
    }
    button:active {
      transform: scale(0.98);
    }
    .field-hint {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
    #form-status {
      margin-top: 20px;
      padding: 12px;
      border-radius: 6px;
      display: none;
      font-size: 14px;
    }
    #form-status.success {
      background: #d4edda;
      color: #155724;
      display: block;
    }
    #form-status.error {
      background: #f8d7da;
      color: #721c24;
      display: block;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Welcome Back</h1>
    <p class="subtitle">Sign in to your account</p>
    <form id="login-form" action="/login" method="POST">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="you@example.com"
          autocomplete="username email"
          required
        >
        <div class="field-hint">We'll never share your email</div>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          autocomplete="current-password"
          required
        >
        <div class="field-hint">Must be at least 8 characters</div>
      </div>
      <button type="submit">Sign In</button>
    </form>
    <div id="form-status"></div>
  </div>
  <script>
    // Track field values for verification
    window.fieldValues = { email: '', password: '' };
    document.getElementById('email').addEventListener('input', (e) => {
      window.fieldValues.email = e.target.value;
    });
    document.getElementById('password').addEventListener('input', (e) => {
      window.fieldValues.password = e.target.value;
    });
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('form-status');
      status.className = 'success';
      status.textContent = 'Form submitted (captured for testing)';
    });
  </script>
</body>
</html>
`;

/**
 * Test page with no matching entries (different domain)
 */
const NO_MATCH_PAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>Other Site Login</title>
  <style>
    body {
      font-family: -apple-system, sans-serif;
      max-width: 400px;
      margin: 50px auto;
      padding: 20px;
    }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input {
      width: 100%;
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      width: 100%;
      padding: 12px;
      background: #333;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Other Site Login</h1>
  <form>
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="username" name="username" autocomplete="username">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" name="password" autocomplete="current-password">
    </div>
    <button type="submit">Login</button>
  </form>
</body>
</html>
`;

/**
 * Check if Nemo button is present on the page
 */
async function checkNemoButtons(page) {
  return await page.evaluate(() => {
    const buttons = document.querySelectorAll('[data-nemo-action]');
    return {
      count: buttons.length,
      buttons: Array.from(buttons).map(b => ({
        action: b.dataset.nemoAction,
        visible: b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().height > 0,
        rect: b.getBoundingClientRect(),
        opacity: b.style.opacity,
        pointerEvents: window.getComputedStyle(b).pointerEvents
      }))
    };
  });
}

/**
 * Check for autofill overlay
 */
async function checkAutofillOverlay(page) {
  return await page.evaluate(() => {
    const allDivs = document.querySelectorAll('div');
    const overlays = [];

    for (const div of allDivs) {
      const computed = window.getComputedStyle(div);
      if (computed.zIndex === '2147483647') {
        const rect = div.getBoundingClientRect();
        overlays.push({
          text: div.textContent?.substring(0, 100),
          visible: rect.width > 0 && rect.height > 0,
          rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
        });
      }
    }

    return overlays;
  });
}

/**
 * Get field values for verification
 */
async function getFieldValues(page) {
  return await page.evaluate(() => {
    return {
      email: document.getElementById('email')?.value || '',
      password: document.getElementById('password')?.value || ''
    };
  });
}

/**
 * Inject mock vault state into page
 * This overrides chrome.runtime.sendMessage to return mock data
 */
async function injectMockVault(page, vaultManager) {
  const mockState = vaultManager.getState();

  await page.addInitScript((state) => {
    window.__MOCK_VAULT_STATE__ = JSON.parse(state);

    // Override chrome.runtime.sendMessage
    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = async (message) => {
      const vaultState = window.__MOCK_VAULT_STATE__;

      switch (message.type) {
        case 'GET_VAULT_STATE':
          return { success: true, data: vaultState };

        case 'GET_ENTRIES_FOR_AUTOFILL':
          if (!vaultState.isUnlocked) {
            return { success: false, error: 'Vault is locked' };
          }
          return { success: true, data: vaultState.vault?.entries || [] };

        case 'GET_ENTRY_BY_URL':
          if (!vaultState.isUnlocked) {
            return { success: false, error: 'Vault is locked' };
          }
          // Match by URL hostname
          try {
            const url = message.payload || '';
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            const entries = vaultState.vault?.entries || [];
            const match = entries.find(e => {
              if (!e.url) return false;
              const entryHostname = new URL(e.url).hostname.replace(/^www\./, '');
              return hostname === entryHostname || hostname.endsWith('.' + entryHostname);
            });
            return { success: true, data: match || null };
          } catch {
            return { success: true, data: null };
          }

        case 'ADD_ENTRY':
          return { success: true, data: message.payload };

        case 'GET_SITE_PREFERENCES':
          return { success: true, data: null };

        default:
          // Pass through to original for unhandled messages
          return originalSendMessage?.call(chrome.runtime, message);
      }
    };
  }, JSON.stringify(mockState));
}

/**
 * Main test runner
 */
async function runTest() {
  console.log('🔐 E2E Test: Real Autofill Behavior\n');
  console.log('=' .repeat(50));

  let browser;
  let context;
  let vaultManager;
  let testResults = [];

  const addResult = (test, passed, details = '') => {
    testResults.push({ test, passed, details });
    const icon = passed ? '✅' : '❌';
    console.log(`\n${icon} ${test}`);
    if (details) console.log(`   ${details}`);
  };

  try {
    // Test 1: Vault locked behavior
    console.log('\n📋 TEST 1: Vault Locked State');
    console.log('-'.repeat(50));

    vaultManager = new MockVaultManager();
    vaultManager.lock();

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

    // Inject mock before creating pages
    await context.addInitScript((state) => {
      window.__MOCK_VAULT_STATE__ = JSON.parse(state);
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = async (message) => {
        const vaultState = window.__MOCK_VAULT_STATE__;
        switch (message.type) {
          case 'GET_VAULT_STATE':
            return { success: true, data: vaultState };
          case 'GET_ENTRIES_FOR_AUTOFILL':
            return vaultState.isUnlocked
              ? { success: true, data: vaultState.vault?.entries || [] }
              : { success: false, error: 'Vault is locked' };
          case 'GET_ENTRY_BY_URL':
            return vaultState.isUnlocked
              ? { success: true, data: vaultState.vault?.entries?.[0] || null }
              : { success: false, error: 'Vault is locked' };
          default:
            return originalSendMessage?.call(chrome.runtime, message);
        }
      };
    }, JSON.stringify(vaultManager.getState()));

    await delay(2000);

    const lockedPage = await context.newPage();
    await lockedPage.setContent(TEST_LOGIN_PAGE);
    await delay(1500);

    // Focus password field
    await lockedPage.locator('#password').click();
    await delay(1000);

    const lockedButtons = await checkNemoButtons(lockedPage);
    addResult(
      'Nemo buttons appear on locked vault',
      lockedButtons.count > 0,
      `Found ${lockedButtons.count} buttons`
    );

    // Click fill button and check if it opens popup prompt
    if (lockedButtons.count > 0) {
      const fillButton = lockedButtons.buttons.find(b => b.action === 'fill');
      if (fillButton) {
        await lockedPage.locator('[data-nemo-action="fill"]').click();
        await delay(500);
        // When vault is locked, clicking fill should not show overlay
        const overlay = await checkAutofillOverlay(lockedPage);
        addResult(
          'No autofill overlay when vault locked',
          overlay.length === 0,
          overlay.length > 0 ? 'Overlay shown but should not be' : 'Correctly hidden'
        );
      }
    }

    await lockedPage.screenshot({
      path: join(SCREENSHOT_DIR, 'real-01-locked-vault.png'),
      fullPage: true
    });

    // Test 2: Unlocked vault with entries
    console.log('\n📋 TEST 2: Unlocked Vault with Entries');
    console.log('-'.repeat(50));

    await lockedPage.close();

    // Create unlocked vault manager
    vaultManager = new MockVaultManager();
    vaultManager.unlock();

    // Update context with unlocked state
    await context.addInitScript((state) => {
      window.__MOCK_VAULT_STATE__ = JSON.parse(state);
    }, JSON.stringify(vaultManager.getState()));

    const unlockedPage = await context.newPage();
    await unlockedPage.setContent(TEST_LOGIN_PAGE);
    await delay(1500);

    // Focus password field
    await unlockedPage.locator('#password').click();
    await delay(1000);

    const unlockedButtons = await checkNemoButtons(unlockedPage);
    addResult(
      'Nemo buttons appear on unlocked vault',
      unlockedButtons.count > 0,
      `Found ${unlockedButtons.count} buttons: ${unlockedButtons.buttons.map(b => b.action).join(', ')}`
    );

    // Test clicking fill button
    if (unlockedButtons.count > 0) {
      const fillButton = unlockedPage.locator('[data-nemo-action="fill"]').first();
      await fillButton.click();
      await delay(1500);

      const overlay = await checkAutofillOverlay(unlockedPage);
      addResult(
        'Autofill overlay appears when fill clicked',
        overlay.length > 0,
        `Found ${overlay.length} overlay(s)`
      );

      // Check overlay content
      if (overlay.length > 0) {
        const overlayText = await unlockedPage.evaluate(() => {
          const divs = document.querySelectorAll('div');
          for (const div of divs) {
            if (div.textContent?.includes('Nemo Password Manager')) {
              return div.textContent;
            }
          }
          return null;
        });

        addResult(
          'Overlay shows Nemo branding',
          overlayText?.includes('Nemo'),
          overlayText ? 'Nemo branding found' : 'No branding found'
        );

        addResult(
          'Overlay shows entry count',
          overlayText?.includes('entries'),
          overlayText ? 'Entry count shown' : 'No count shown'
        );
      }
    }

    await unlockedPage.screenshot({
      path: join(SCREENSHOT_DIR, 'real-02-unlocked-overlay.png'),
      fullPage: true
    });

    // Test 3: Entry selection and form filling
    console.log('\n📋 TEST 3: Entry Selection and Form Filling');
    console.log('-'.repeat(50));

    // Reload page for clean state
    await unlockedPage.reload();
    await unlockedPage.setContent(TEST_LOGIN_PAGE);
    await delay(1500);

    // Focus password and click fill
    await unlockedPage.locator('#password').click();
    await delay(500);
    await unlockedPage.locator('[data-nemo-action="fill"]').click();
    await delay(1000);

    // Click on first entry in overlay
    const entryClicked = await unlockedPage.evaluate(() => {
      const entryDivs = document.querySelectorAll('.nemo-entry-item');
      if (entryDivs.length > 0) {
        entryDivs[0].click();
        return true;
      }
      // Try finding by text content
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        if (div.textContent?.includes('Google Test Account') || div.textContent?.includes('testuser@gmail.com')) {
          div.click();
          return true;
        }
      }
      return false;
    });

    await delay(1000);

    // Check if fields were filled
    const filledValues = await getFieldValues(unlockedPage);
    const emailFilled = filledValues.email === 'testuser@gmail.com';
    const passwordFilled = filledValues.password === 'TestPassword123!';

    addResult(
      'Email field filled correctly',
      emailFilled,
      `Expected: testuser@gmail.com, Got: ${filledValues.email || '(empty)'}`
    );

    addResult(
      'Password field filled correctly',
      passwordFilled,
      `Expected: TestPassword123!, Got: ${filledValues.password ? '***' : '(empty)'}`
    );

    await unlockedPage.screenshot({
      path: join(SCREENSHOT_DIR, 'real-03-filled-form.png'),
      fullPage: true
    });

    // Test 4: Generator button
    console.log('\n📋 TEST 4: Password Generator Button');
    console.log('-'.repeat(50));

    // Reload and test generator
    await unlockedPage.reload();
    await unlockedPage.setContent(TEST_LOGIN_PAGE);
    await delay(1500);

    await unlockedPage.locator('#password').click();
    await delay(500);

    const hasGenButton = await unlockedPage.evaluate(() => {
      const btn = document.querySelector('[data-nemo-action="generate"]');
      return !!btn;
    });

    addResult(
      'Generator button exists',
      hasGenButton,
      hasGenButton ? 'Generator button found' : 'Not found'
    );

    if (hasGenButton) {
      await unlockedPage.locator('[data-nemo-action="generate"]').click();
      await delay(1000);

      const generatorOverlay = await unlockedPage.evaluate(() => {
        const divs = document.querySelectorAll('div');
        for (const div of divs) {
          if (div.textContent?.includes('Generate Password')) {
            return true;
          }
        }
        return false;
      });

      addResult(
        'Generator overlay opens',
        generatorOverlay,
        generatorOverlay ? 'Generator UI shown' : 'Not shown'
      );

      await unlockedPage.screenshot({
        path: join(SCREENSHOT_DIR, 'real-04-generator.png'),
        fullPage: true
      });
    }

    // Test 5: Auto-fill on focus (if site preference is set)
    console.log('\n📋 TEST 5: Auto-fill on Field Focus');
    console.log('-'.repeat(50));

    // Create vault with auto-fill preference
    const autoFillVault = new MockVaultManager();
    autoFillVault.unlock();
    // Modify first entry to have matching URL
    const entries = autoFillVault.getEntries();
    if (entries.length > 0) {
      entries[0].url = 'https://example.com';
    }

    // Create new context for auto-fill test
    const autoFillContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    await autoFillContext.addInitScript((state) => {
      window.__MOCK_VAULT_STATE__ = JSON.parse(state);
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = async (message) => {
        const vaultState = window.__MOCK_VAULT_STATE__;
        switch (message.type) {
          case 'GET_VAULT_STATE':
            return { success: true, data: vaultState };
          case 'GET_ENTRIES_FOR_AUTOFILL':
            return { success: true, data: vaultState.vault?.entries || [] };
          case 'GET_ENTRY_BY_URL':
            return { success: true, data: vaultState.vault?.entries?.[0] || null };
          case 'GET_SITE_PREFERENCES':
            return { success: true, data: { autoFillMode: 'always', preferredEntryId: 'test-entry-1' } };
          default:
            return originalSendMessage?.call(chrome.runtime, message);
        }
      };
    }, JSON.stringify(autoFillVault.getState()));

    const autoFillPage = await autoFillContext.newPage();
    await autoFillPage.setContent(TEST_LOGIN_PAGE);
    await delay(1500);

    // Focus password field - should trigger auto-fill
    await autoFillPage.locator('#password').focus();
    await delay(2000);

    // Check if fields were auto-filled
    const autoFillValues = await getFieldValues(autoFillPage);
    addResult(
      'Auto-fill on focus works',
      autoFillValues.email !== '' || autoFillValues.password !== '',
      `Email: ${autoFillValues.email || '(empty)'}, Password: ${autoFillValues.password ? 'filled' : 'empty'}`
    );

    await autoFillPage.screenshot({
      path: join(SCREENSHOT_DIR, 'real-05-autofill-focus.png'),
      fullPage: true
    });

    await autoFillContext.close();

    // Test 6: No matching entries
    console.log('\n📋 TEST 6: No Matching Entries');
    console.log('-'.repeat(50));

    const noMatchContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    const emptyVault = new MockVaultManager();
    emptyVault.unlock();
    emptyVault.state.vault.entries = []; // Empty entries

    await noMatchContext.addInitScript((state) => {
      window.__MOCK_VAULT_STATE__ = JSON.parse(state);
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = async (message) => {
        const vaultState = window.__MOCK_VAULT_STATE__;
        switch (message.type) {
          case 'GET_VAULT_STATE':
            return { success: true, data: vaultState };
          case 'GET_ENTRIES_FOR_AUTOFILL':
            return { success: true, data: [] };
          case 'GET_ENTRY_BY_URL':
            return { success: true, data: null };
          default:
            return originalSendMessage?.call(chrome.runtime, message);
        }
      };
    }, JSON.stringify(emptyVault.getState()));

    const noMatchPage = await noMatchContext.newPage();
    await noMatchPage.setContent(NO_MATCH_PAGE);
    await delay(1500);

    await noMatchPage.locator('#password').click();
    await delay(1000);

    const noMatchButtons = await checkNemoButtons(noMatchPage);
    addResult(
      'Nemo buttons still appear (even with no entries)',
      noMatchButtons.count > 0,
      `Found ${noMatchButtons.count} buttons`
    );

    // Click fill - should show "no entries" message
    if (noMatchButtons.count > 0) {
      await noMatchPage.locator('[data-nemo-action="fill"]').click();
      await delay(1000);

      const noEntriesMsg = await noMatchPage.evaluate(() => {
        const divs = document.querySelectorAll('div');
        for (const div of divs) {
          if (div.textContent?.includes('No saved passwords')) {
            return true;
          }
        }
        return false;
      });

      addResult(
        'Shows "no passwords" message when empty',
        noEntriesMsg,
        noEntriesMsg ? 'Message shown correctly' : 'Message not found'
      );
    }

    await noMatchPage.screenshot({
      path: join(SCREENSHOT_DIR, 'real-06-no-entries.png'),
      fullPage: true
    });

    await noMatchContext.close();

    // Test Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;

    testResults.forEach((result, i) => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${i + 1}. ${icon} ${result.test}`);
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Total: ${testResults.length} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log('-'.repeat(50));

    if (failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️ ${failed} test(s) failed`);
      process.exit(1);
    }

    console.log('\n📸 Screenshots saved in tests/screenshots/');

    // Final cleanup
    await delay(3000);

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
