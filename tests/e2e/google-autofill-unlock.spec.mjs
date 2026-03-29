import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

/**
 * E2E Test: Nemo autofill on Google login WITH VAULT UNLOCK
 * 
 * This test:
 * 1. Opens the extension popup
 * 2. Shows the unlock screen (waits for manual unlock)
 * 3. Tests autofill on Google after vault is unlocked
 */

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🔐 Testing Nemo autofill with vault unlock\n');
  
  let browser;
  let context;
  
  try {
    // Launch Chrome with extension
    console.log('1. Launching Chrome with Nemo extension...');
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
    
    await delay(3000);
    console.log('   ✓ Extension loaded\n');
    
    // Get extension ID
    console.log('2. Getting extension ID...');
    await delay(2000);
    
    // Try to get extension ID from opened pages
    let extId = null;
    const pages = await context.pages();
    for (const page of pages) {
      const url = page.url();
      if (url.includes('chrome-extension://')) {
        extId = url.split('/')[2];
        break;
      }
    }
    
    console.log('   Extension ID:', extId || 'Will try to access via chrome://extensions\n');
    
    // Open extension popup
    console.log('3. Opening extension popup...');
    const popupPage = await context.newPage();
    
    if (extId) {
      await popupPage.goto(`chrome-extension://${extId}/popup.html`);
    } else {
      // Navigate to chrome extensions page
      await popupPage.goto('chrome://extensions/');
      await delay(2000);
      
      // Try to find Nemo extension
      const nemoId = await popupPage.evaluate(() => {
        const items = document.querySelectorAll('extensions-item');
        for (const item of items) {
          const name = item.shadowRoot?.querySelector('#name')?.textContent;
          if (name?.toLowerCase().includes('nemo')) {
            return item.id;
          }
        }
        return null;
      });
      
      if (nemoId) {
        extId = nemoId;
        await popupPage.goto(`chrome-extension://${extId}/popup.html`);
      } else {
        console.log('   ⚠️ Could not find extension ID automatically');
        console.log('   Please manually open the extension popup\n');
      }
    }
    
    await delay(3000);
    
    // Take screenshot of popup state
    await popupPage.screenshot({
      path: join(SCREENSHOT_DIR, 'unlock-01-popup-initial.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: unlock-01-popup-initial.png\n');
    
    // Check popup state
    const popupState = await popupPage.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        hasUnlockButton: document.body.innerText.toLowerCase().includes('unlock'),
        hasCreateVault: document.body.innerText.toLowerCase().includes('create vault'),
        hasSignIn: document.body.innerText.toLowerCase().includes('sign in'),
        buttonCount: document.querySelectorAll('button').length
      };
    });
    
    console.log('   Popup state:', JSON.stringify(popupState, null, 2));
    
    // Determine vault state
    if (popupState.hasCreateVault || popupState.bodyText.toLowerCase().includes('create')) {
      console.log('\n   ⚠️ No vault exists yet - need to create one first');
      console.log('   This test requires an existing vault with credentials');
      console.log('   Please create a vault manually and add a Google entry\n');
      
      console.log('⏳ Waiting 30 seconds for manual vault creation...');
      console.log('   Steps:');
      console.log('   1. Click "Create vault" or "Get Started"');
      console.log('   2. Set up WebAuthn (follow prompts)');
      console.log('   3. Add a test entry for accounts.google.com');
      console.log('   4. Keep the popup open\n');
      
      await delay(30000);
      
      // Take screenshot after vault creation
      await popupPage.screenshot({
        path: join(SCREENSHOT_DIR, 'unlock-02-vault-created.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: unlock-02-vault-created.png\n');
      
    } else if (popupState.hasUnlockButton) {
      console.log('\n   🔓 Vault exists - waiting for unlock...');
      console.log('   Please unlock the vault using WebAuthn');
      console.log('   (Touch ID, Face ID, or Security Key)\n');
      
      console.log('⏳ Waiting 30 seconds for manual unlock...');
      await delay(30000);
      
      // Take screenshot after unlock attempt
      await popupPage.screenshot({
        path: join(SCREENSHOT_DIR, 'unlock-02-after-unlock.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: unlock-02-after-unlock.png\n');
      
      // Check if vault is now unlocked
      const afterUnlockState = await popupPage.evaluate(() => {
        return {
          bodyText: document.body.innerText.substring(0, 300),
          hasEntries: document.body.innerText.toLowerCase().includes('entry') || 
                     document.body.innerText.toLowerCase().includes('password'),
          url: window.location.href
        };
      });
      
      console.log('   After unlock state:', afterUnlockState);
      
      if (!afterUnlockState.hasEntries) {
        console.log('\n   ⚠️ Vault may still be locked or empty');
        console.log('   Continuing with test anyway...\n');
      }
    } else {
      console.log('\n   ✅ Vault appears to be unlocked already!');
      console.log('   Proceeding to autofill test...\n');
    }
    
    // Close popup and open Google login
    console.log('4. Opening Google login page...');
    const googlePage = await context.newPage();
    await googlePage.goto('https://accounts.google.com/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await delay(5000);
    console.log('   ✓ Google login page loaded\n');
    
    // Take initial screenshot
    await googlePage.screenshot({
      path: join(SCREENSHOT_DIR, 'unlock-03-google-initial.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: unlock-03-google-initial.png\n');
    
    // Analyze page
    const pageInfo = await googlePage.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        autocomplete: input.getAttribute('autocomplete'),
        visible: input.offsetParent !== null
      }));
      
      return {
        url: window.location.href,
        title: document.title,
        inputs: inputs.filter(i => i.visible || i.type === 'password')
      };
    });
    
    console.log('   Page fields:', pageInfo.inputs);
    
    // Focus email field
    console.log('\n5. Focusing email field...');
    const emailInput = googlePage.locator('input[type="email"]').first();
    if (await emailInput.count() > 0 && await emailInput.isVisible()) {
      await emailInput.click();
      await delay(3000);
      
      await googlePage.screenshot({
        path: join(SCREENSHOT_DIR, 'unlock-04-email-focused.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot saved: unlock-04-email-focused.png');
      
      // Check for autofill UI
      const uiCheck = await googlePage.evaluate(() => {
        const nemoElements = document.querySelectorAll('[data-nemo], [class*="nemo"], [id*="nemo"]');
        const overlays = document.querySelectorAll('div[style*="z-index: 2147483647"]');
        const allDivs = document.querySelectorAll('div');
        
        // Look for any overlay-like elements
        const possibleOverlays = Array.from(allDivs).filter(div => {
          const style = window.getComputedStyle(div);
          return style.position === 'fixed' || style.position === 'absolute';
        });
        
        return {
          nemoElementsFound: nemoElements.length,
          highZIndexElements: overlays.length,
          fixedOrAbsoluteDivs: possibleOverlays.length,
          focusedElement: document.activeElement?.tagName,
          focusedId: document.activeElement?.id
        };
      });
      
      console.log('\n   Autofill check:', JSON.stringify(uiCheck, null, 2));
      
      if (uiCheck.nemoElementsFound > 0) {
        console.log('   ✅ SUCCESS! Nemo autofill UI detected!');
      } else if (uiCheck.fixedOrAbsoluteDivs > 0) {
        console.log('   ℹ️ Found overlay elements - may be autofill UI');
      } else {
        console.log('   ℹ️ No autofill UI visible (check screenshots)');
      }
    }
    
    // Final screenshot
    console.log('\n6. Taking final screenshot...');
    await googlePage.screenshot({
      path: join(SCREENSHOT_DIR, 'unlock-05-final.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: unlock-05-final.png\n');
    
    console.log('✅ Test complete!');
    console.log('\n📸 Screenshots saved in tests/screenshots/:');
    console.log('  - unlock-01-popup-initial.png');
    console.log('  - unlock-02-vault-created.png or unlock-02-after-unlock.png');
    console.log('  - unlock-03-google-initial.png');
    console.log('  - unlock-04-email-focused.png');
    console.log('  - unlock-05-final.png');
    
    // Keep browser open
    console.log('\n⏳ Browser open for 20 seconds for manual inspection...');
    await delay(20000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (context) await context.close();
    if (browser) {
      console.log('\n🔒 Closing browser...');
      await browser.close();
    }
  }
}

runTest();
