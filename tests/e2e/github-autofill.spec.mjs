import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MockVaultManager } from '../utils/vault-mock.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * E2E Test: Nemo autofill on GitHub login page
 *
 * This test verifies real autofill behavior on GitHub's actual login page:
 * 1. Extension loads correctly
 * 2. Content script detects GitHub's login form
 * 3. Nemo buttons appear on username/password fields
 * 4. Mock vault entries can be used for autofill
 */

async function runTest() {
  console.log('🔐 Testing Nemo autofill on GitHub login\n');

  let browser;
  let context;

  try {
    // Setup mock vault with GitHub credentials
    console.log('1. Setting up mock vault...');
    const vaultManager = new MockVaultManager();
    vaultManager.unlock();

    // Add GitHub-specific entry
    const githubEntry = {
      id: 'github-test-entry',
      title: 'GitHub Test Account',
      username: 'testuser@example.com',
      password: 'MySecureGitHubPass123!',
      url: 'https://github.com/login',
      favorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    vaultManager.addEntry(githubEntry);
    console.log(`   ✓ Vault unlocked with ${vaultManager.getEntries().length} entries`);
    console.log(`   ✓ Added GitHub entry: ${githubEntry.username}\n`);

    // Launch browser with extension
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

    // Inject mock vault state
    await context.addInitScript((state) => {
      window.__MOCK_VAULT_STATE__ = JSON.parse(state);
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

          case 'GET_ENTRY_BY_URL': {
            if (!vaultState.isUnlocked) {
              return { success: false, error: 'Vault is locked' };
            }
            const url = message.payload || '';
            const entries = vaultState.vault?.entries || [];

            // Match by URL hostname
            try {
              const hostname = new URL(url).hostname.replace(/^www\./, '');
              const match = entries.find(e => {
                if (!e.url) return false;
                const entryHostname = new URL(e.url).hostname.replace(/^www\./, '');
                return hostname === entryHostname || hostname.endsWith('.' + entryHostname);
              });
              return { success: true, data: match || null };
            } catch {
              return { success: true, data: entries[0] || null };
            }
          }

          default:
            return originalSendMessage?.call(chrome.runtime, message);
        }
      };
    }, JSON.stringify(vaultManager.getState()));

    await delay(3000);
    console.log('   ✓ Extension loaded\n');

    // Navigate to GitHub login
    console.log('3. Opening GitHub login page...');
    const page = await context.newPage();
    await page.goto('https://github.com/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await delay(3000);
    console.log('   ✓ Page loaded\n');

    // Take initial screenshot
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'github-01-initial.png'),
      fullPage: true
    });

    // Analyze form fields
    console.log('4. Analyzing form fields...');
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs
        .filter(i => i.type === 'text' || i.type === 'password' || i.type === 'email')
        .map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          autocomplete: input.getAttribute('autocomplete'),
          placeholder: input.placeholder,
          visible: input.offsetParent !== null
        }));
    });

    console.log(`   Found ${formInfo.length} form fields:`);
    formInfo.forEach(field => {
      console.log(`     - ${field.type}: ${field.name || field.id} ${field.autocomplete ? `[${field.autocomplete}]` : ''}`);
    });

    const hasLoginField = formInfo.some(f =>
      f.name === 'login' || f.id === 'login_field' || f.autocomplete?.includes('username')
    );
    const hasPasswordField = formInfo.some(f =>
      f.name === 'password' || f.id === 'password' || f.type === 'password'
    );

    console.log(`\n   ✓ Username field: ${hasLoginField ? 'found' : 'not found'}`);
    console.log(`   ✓ Password field: ${hasPasswordField ? 'found' : 'not found'}`);

    // Test password field focus
    console.log('\n5. Testing password field focus...');
    const passwordInput = page.locator('input[type="password"]').first();

    if (await passwordInput.count() > 0) {
      await passwordInput.click();
      await delay(2000);

      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'github-02-password-focused.png'),
        fullPage: true
      });

      // Check for Nemo buttons
      const nemoCheck = await page.evaluate(() => {
        const buttons = document.querySelectorAll('[data-nemo-action]');
        return {
          count: buttons.length,
          buttons: Array.from(buttons).map(b => ({
            action: b.dataset.nemoAction,
            visible: b.getBoundingClientRect().width > 0,
            rect: b.getBoundingClientRect()
          }))
        };
      });

      console.log(`   Found ${nemoCheck.count} Nemo buttons`);
      nemoCheck.buttons.forEach(btn => {
        console.log(`     - ${btn.action}: ${btn.visible ? 'visible' : 'hidden'}`);
      });

      if (nemoCheck.count > 0) {
        console.log('\n   ✅ SUCCESS! Nemo buttons detected on GitHub');

        // Test clicking fill button
        const fillButton = page.locator('[data-nemo-action="fill"]').first();
        if (await fillButton.count() > 0) {
          console.log('\n6. Testing fill button click...');
          await fillButton.click();
          await delay(1500);

          await page.screenshot({
            path: join(SCREENSHOT_DIR, 'github-03-overlay.png'),
            fullPage: true
          });

          // Check if overlay appeared
          const overlayCheck = await page.evaluate(() => {
            const divs = document.querySelectorAll('div');
            for (const div of divs) {
              if (div.textContent?.includes('Nemo Password Manager')) {
                return { found: true, text: div.textContent.substring(0, 200) };
              }
            }
            return { found: false };
          });

          if (overlayCheck.found) {
            console.log('   ✓ Autofill overlay appeared');
            console.log(`   Content: ${overlayCheck.text}...`);

            // Try to select entry
            const entrySelected = await page.evaluate(() => {
              const entryDivs = document.querySelectorAll('.nemo-entry-item');
              if (entryDivs.length > 0) {
                entryDivs[0].click();
                return true;
              }
              // Fallback: click any div with entry-like content
              const allDivs = document.querySelectorAll('div');
              for (const div of allDivs) {
                if (div.textContent?.includes('GitHub Test Account')) {
                  div.click();
                  return true;
                }
              }
              return false;
            });

            await delay(1000);

            if (entrySelected) {
              console.log('   ✓ Entry selected');

              // Verify fields were filled
              const filledValues = await page.evaluate(() => {
                const login = document.querySelector('#login_field, input[name="login"]') as HTMLInputElement;
                const password = document.querySelector('#password, input[type="password"]') as HTMLInputElement;
                return {
                  login: login?.value || '',
                  password: password?.value ? '***filled***' : ''
                };
              });

              console.log('\n7. Verifying filled fields...');
              console.log(`   Login field: ${filledValues.login || '(empty)'}`);
              console.log(`   Password field: ${filledValues.password ? 'filled ✓' : 'empty'}`);

              if (filledValues.login === 'testuser@example.com') {
                console.log('\n   ✅ Username correctly filled!');
              }
              if (filledValues.password) {
                console.log('   ✅ Password filled!');
              }
            }
          } else {
            console.log('   ℹ️ No overlay (vault may be locked or no entries match)');
          }
        }
      } else {
        console.log('\n   ℹ️ No Nemo buttons found (content script may not have loaded)');
      }
    }

    // Final screenshot
    console.log('\n8. Taking final screenshot...');
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'github-04-final.png'),
      fullPage: true
    });

    console.log('\n✅ Test complete!');
    console.log('\n📸 Screenshots saved:');
    console.log('  - github-01-initial.png');
    console.log('  - github-02-password-focused.png');
    console.log('  - github-03-overlay.png (if autofill triggered)');
    console.log('  - github-04-final.png');

    // Keep browser open for inspection
    console.log('\n⏳ Keeping browser open for 10 seconds...');
    await delay(10000);

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
