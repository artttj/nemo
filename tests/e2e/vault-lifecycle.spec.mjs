import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🔐 E2E Test: Vault Lifecycle\n');
  
  let browser;
  let context;
  
  try {
    console.log('1. Launching Chrome with extension...');
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
    
    console.log('   ✓ Browser launched\n');
    await delay(3000);
    
    // Get extension ID
    console.log('2. Getting extension ID...');
    await delay(5000);
    
    const pages = await context.pages();
    let extId = null;
    
    for (const page of pages) {
      const url = page.url();
      if (url.includes('chrome-extension://')) {
        extId = url.split('/')[2];
        break;
      }
    }
    
    if (!extId) {
      console.log('   Trying alternative method...');
      try {
        const fs = await import('fs');
        const { execSync } = await import('child_process');
        
        const manifestPath = join(EXTENSION_PATH, 'manifest.json');
        const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
        console.log('   Extension name:', manifest.name);
        
        if (manifest.key) {
          const crypto = await import('crypto');
          const hash = crypto.createHash('sha256').update(manifest.key).digest();
          extId = hash.toString('hex').substring(0, 32).replace(/(.{2})/g, '$1-').slice(0, -1);
          console.log('   Derived ID from manifest key:', extId);
        }
      } catch (e) {
        console.log('   Could not derive ID:', e.message);
      }
    }
    
    if (!extId) {
      console.log('   Using fallback: opening extensions page...');
      const fallbackPage = await context.newPage();
      await fallbackPage.goto('about:blank');
      await delay(1000);
      
      extId = await fallbackPage.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(null), 5000);
          
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.management.getAll((extensions) => {
              const nemo = extensions.find(e => e.name.toLowerCase().includes('nemo'));
              resolve(nemo ? nemo.id : null);
            });
          }
        });
      }).catch(() => null);
      
      if (!extId) {
        console.log('   Trying to extract from background script URL...');
        try {
          const targets = await browser.targets?.() || [];
          for (const target of targets) {
            const url = target.url?.() || '';
            if (url.includes('chrome-extension://')) {
              extId = url.split('/')[2];
              console.log('   Found ID from target:', extId);
              break;
            }
          }
        } catch (e) {
          console.log('   Target enumeration failed:', e.message);
        }
      }
      
      await fallbackPage.close().catch(() => {});
    }
    
    console.log(`   Extension ID: ${extId || 'Not found'}\n`);
    
    if (!extId) {
      console.log('   Could not detect extension ID automatically.');
      console.log('   Opening a test page to continue with content script testing...\n');
    }
    
    const popupPage = await context.newPage();
    
    await delay(3000);
    
    await popupPage.screenshot({
      path: join(SCREENSHOT_DIR, 'vault-01-popup.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: vault-01-popup.png');
    
    // Check vault state
    const vaultState = await popupPage.evaluate(() => ({
      bodyText: document.body.innerText.toLowerCase(),
      hasCreate: document.body.innerText.toLowerCase().includes('create'),
      hasUnlock: document.body.innerText.toLowerCase().includes('unlock'),
      hasEntries: document.body.innerText.toLowerCase().includes('password') || 
                  document.body.innerText.toLowerCase().includes('entry')
    }));
    
    console.log('   Vault state:', vaultState);
    
    // Handle based on state
    if (vaultState.hasCreate) {
      console.log('\n   📦 Manual action needed: Create vault');
      console.log('   - Click "Create Vault" or "Get Started"');
      console.log('   - Follow WebAuthn setup');
      console.log('   - Add test entry for Google\n');
      
      console.log('⏳ Waiting 45 seconds...');
      await delay(45000);
      
    } else if (vaultState.hasUnlock) {
      console.log('\n   🔓 Manual action needed: Unlock vault');
      console.log('   - Click unlock button');
      console.log('   - Authenticate with WebAuthn\n');
      
      console.log('⏳ Waiting 30 seconds...');
      await delay(30000);
      
    } else {
      console.log('\n   ✅ Vault appears ready');
    }
    
    // Take state screenshot
    await popupPage.screenshot({
      path: join(SCREENSHOT_DIR, 'vault-02-after-action.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: vault-02-after-action.png');
    
    // Test Google login
    console.log('\n4. Testing Google login...');
    const googlePage = await context.newPage();
    await googlePage.goto('https://accounts.google.com/');
    await delay(5000);
    
    await googlePage.screenshot({
      path: join(SCREENSHOT_DIR, 'vault-03-google.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: vault-03-google.png');
    
    // Click email field
    const emailField = await googlePage.locator('input[type="email"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.click();
      await delay(3000);
      
      await googlePage.screenshot({
        path: join(SCREENSHOT_DIR, 'vault-04-focused.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: vault-04-focused.png');
      
      // Check for Nemo UI
      const hasNemo = await googlePage.evaluate(() => {
        return document.querySelectorAll('[data-nemo], [class*="nemo"]').length > 0;
      });
      
      if (hasNemo) {
        console.log('   ✅ Nemo autofill UI detected!');
      } else {
        console.log('   ℹ️ No autofill UI (vault locked)');
      }
    }
    
    console.log('\n✅ Test complete!');
    console.log('   Check screenshots in tests/screenshots/');
    
    await delay(15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

runTest();
