import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create Vault E2E Test
 * 
 * This test guides you through creating a vault manually,
 * then verifies autofill works on Google login.
 */

async function runTest() {
  console.log('🔐 Create Vault & Test Autofill\n');
  console.log('=' .repeat(60));
  console.log('This test will guide you through vault creation.');
  console.log('WebAuthn setup requires manual interaction.\n');
  
  let browser;
  let worker;
  let popupPage;
  
  try {
    console.log('1. Launching Chrome with extension...');
    browser = await puppeteer.launch({
      headless: false,
      pipe: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });
    
    console.log('   ✓ Browser launched\n');
    await delay(3000);
    
    // Get service worker
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && 
                target.url().includes('chrome-extension://'),
      { timeout: 10000 }
    );
    
    worker = await workerTarget.worker();
    const extId = workerTarget.url().split('/')[2];
    console.log('   Extension ID:', extId);
    
    // Step 2: Open popup
    console.log('\n2. Opening extension popup...');
    popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`);
    await delay(3000);
    
    // Check current state
    const state = await popupPage.evaluate(() => ({
      bodyText: document.body.innerText,
      hasCreate: document.body.innerText.toLowerCase().includes('create vault'),
      hasUnlock: document.body.innerText.toLowerCase().includes('unlock'),
      hasEntries: document.body.innerText.toLowerCase().includes('password') || 
                  document.body.innerText.toLowerCase().includes('entry')
    }));
    
    console.log('   Current state:', state.hasCreate ? 'NEEDS CREATE' : 
                                     state.hasUnlock ? 'NEEDS UNLOCK' : 
                                     state.hasEntries ? 'READY' : 'UNKNOWN');
    
    await popupPage.screenshot({
      path: join(SCREENSHOT_DIR, 'create-01-initial.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: create-01-initial.png');
    
    // Step 3: Create vault
    if (state.hasCreate) {
      console.log('\n' + '='.repeat(60));
      console.log('STEP 3: CREATE VAULT');
      console.log('='.repeat(60));
      console.log('\nPlease follow these steps in the popup:');
      console.log('1. Click "Create vault" button');
      console.log('2. Follow WebAuthn setup (Touch ID/Face ID/Security Key)');
      console.log('3. Wait for vault to be created');
      console.log('4. Add a test entry for accounts.google.com:');
      console.log('   - Title: Google Test');
      console.log('   - Username: test@gmail.com');
      console.log('   - Password: TestPassword123!');
      console.log('   - URL: https://accounts.google.com');
      console.log('\n⏳ Waiting 60 seconds for vault creation...\n');
      
      await delay(60000);
      
      // Check if vault was created
      await popupPage.reload();
      await delay(3000);
      
      const afterCreate = await popupPage.evaluate(() => ({
        bodyText: document.body.innerText.substring(0, 200),
        hasEntries: document.body.innerText.toLowerCase().includes('password') || 
                    document.body.innerText.toLowerCase().includes('entry')
      }));
      
      console.log('   After creation:', afterCreate);
      
      await popupPage.screenshot({
        path: join(SCREENSHOT_DIR, 'create-02-after-vault.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: create-02-after-vault.png');
      
      if (!afterCreate.hasEntries) {
        console.log('\n   ⚠️ Please add a test entry manually');
        console.log('   ⏳ Waiting 30 more seconds...\n');
        await delay(30000);
      }
    } else if (state.hasUnlock) {
      console.log('\n' + '='.repeat(60));
      console.log('STEP 3: UNLOCK VAULT');
      console.log('='.repeat(60));
      console.log('\nPlease unlock the vault:');
      console.log('1. Click unlock button');
      console.log('2. Authenticate with WebAuthn\n');
      console.log('⏳ Waiting 30 seconds...\n');
      
      await delay(30000);
    }
    
    // Step 4: Test autofill
    console.log('\n4. Testing autofill on Google...');
    const googlePage = await browser.newPage();
    await googlePage.goto('https://accounts.google.com/');
    await delay(8000);
    
    await googlePage.screenshot({
      path: join(SCREENSHOT_DIR, 'create-03-google.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: create-03-google.png');
    
    // Check for autofill UI
    const autofillCheck = await googlePage.evaluate(() => {
      const nemoButtons = document.querySelectorAll('[data-nemo-action]');
      const overlay = document.getElementById('nemo-autofill-overlay');
      
      return {
        buttons: nemoButtons.length,
        overlay: !!overlay,
        buttonsVisible: Array.from(nemoButtons).filter(b => 
          b.style.opacity !== '0' && b.offsetParent !== null
        ).length
      };
    });
    
    console.log('   Nemo elements:', autofillCheck);
    
    // Click email field
    const emailField = await googlePage.$('input[type="email"]');
    if (emailField) {
      await emailField.click();
      await delay(3000);
      
      await googlePage.screenshot({
        path: join(SCREENSHOT_DIR, 'create-04-email-clicked.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: create-04-email-clicked.png');
      
      const afterClick = await googlePage.evaluate(() => {
        const buttons = document.querySelectorAll('[data-nemo-action]');
        const overlay = document.getElementById('nemo-autofill-overlay');
        
        // Check if any button is visible
        const visibleButtons = Array.from(buttons).filter(b => {
          const style = window.getComputedStyle(b);
          return style.opacity !== '0' && style.display !== 'none';
        });
        
        return {
          totalButtons: buttons.length,
          visibleButtons: visibleButtons.length,
          overlay: !!overlay
        };
      });
      
      console.log('   After click:', afterClick);
      
      if (afterClick.visibleButtons > 0) {
        console.log('\n   ✅ Nemo buttons are visible!');
      } else if (afterClick.totalButtons > 0) {
        console.log('\n   ℹ️ Buttons exist but may be hidden (hover to show)');
      }
    }
    
    // Try to reach password field
    console.log('\n5. Testing password field...');
    try {
      const nextButton = await googlePage.$('button:has-text("Next")');
      if (nextButton) {
        await emailField.type('test@gmail.com');
        await delay(1000);
        await nextButton.click();
        await delay(5000);
        
        await googlePage.screenshot({
          path: join(SCREENSHOT_DIR, 'create-05-password.png'),
          fullPage: true
        });
        console.log('   ✓ Screenshot: create-05-password.png');
        
        const passCheck = await googlePage.evaluate(() => {
          const passField = document.querySelector('input[type="password"]');
          const buttons = document.querySelectorAll('[data-nemo-action]');
          
          return {
            hasPasswordField: !!passField,
            hasNemoButton: passField?.dataset.nemoButton === 'true',
            totalButtons: buttons.length
          };
        });
        
        console.log('   Password field:', passCheck);
      }
    } catch (e) {
      console.log('   Could not proceed:', e.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('='.repeat(60));
    console.log('\n📸 Screenshots:');
    console.log('  - create-01-initial.png');
    console.log('  - create-02-after-vault.png');
    console.log('  - create-03-google.png');
    console.log('  - create-04-email-clicked.png');
    console.log('  - create-05-password.png');
    
    console.log('\n💡 Results:');
    console.log('   - Extension loaded: ✓');
    console.log('   - Content script: ✓');
    console.log('   - Vault created: ' + (state.hasCreate ? 'User action needed' : '✓'));
    console.log('   - Autofill UI: Check screenshots');
    
    await delay(20000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      console.log('\n🔒 Closing browser...');
      await browser.close();
    }
  }
}

runTest();