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
  console.log('🔍 Debugging Nemo Autofill\n');
  
  let browser;
  let context;
  let extId = null;
  
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
    await delay(5000);
    
    // Find extension ID
    console.log('2. Finding extension...');
    const pages = await context.pages();
    
    for (const page of pages) {
      const url = page.url();
      console.log('   Page:', url.substring(0, 80));
      if (url.includes('chrome-extension://')) {
        extId = url.split('/')[2];
        console.log('   ✓ Extension ID:', extId);
      }
    }
    
    // Check vault state
    console.log('\n3. Checking vault state...');
    const popupPage = await context.newPage();
    
    if (extId) {
      await popupPage.goto(`chrome-extension://${extId}/popup.html`);
      await delay(3000);
      
      const popupInfo = await popupPage.evaluate(() => ({
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500),
        hasUnlock: document.body.innerText.toLowerCase().includes('unlock'),
        hasCreate: document.body.innerText.toLowerCase().includes('create vault')
      }));
      
      console.log('   Popup state:', popupInfo);
      
      await popupPage.screenshot({
        path: join(SCREENSHOT_DIR, 'debug-01-popup.png'),
        fullPage: true
      });
      
      if (popupInfo.hasUnlock) {
        console.log('\n   ⚠️ VAULT LOCKED - Please unlock manually');
        console.log('   ⏳ Waiting 30 seconds...');
        await delay(30000);
      }
    }
    
    // Test on Google
    console.log('\n4. Testing on Google...');
    const googlePage = await context.newPage();
    await googlePage.goto('https://accounts.google.com/');
    await delay(8000);
    
    await googlePage.screenshot({
      path: join(SCREENSHOT_DIR, 'debug-02-google.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: debug-02-google.png');
    
    // Check fields
    const fieldInfo = await googlePage.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const visible = [];
      
      inputs.forEach(input => {
        if (input.offsetParent !== null || input.type === 'password') {
          visible.push({
            type: input.type,
            id: input.id,
            hasNemo: input.dataset.nemoButton === 'true'
          });
        }
      });
      
      const nemoButtons = document.querySelectorAll('[data-nemo-action]');
      
      return {
        inputs: visible,
        nemoButtons: nemoButtons.length
      };
    });
    
    console.log('   Fields found:', fieldInfo.inputs.length);
    fieldInfo.inputs.forEach((input, i) => {
      console.log(`   - Input ${i}: type=${input.type}, id=${input.id}, nemo=${input.hasNemo}`);
    });
    console.log('   Nemo buttons:', fieldInfo.nemoButtons);
    
    // Click email
    const emailInput = googlePage.locator('input[type="email"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.click();
      await delay(3000);
      
      await googlePage.screenshot({
        path: join(SCREENSHOT_DIR, 'debug-03-clicked.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: debug-03-clicked.png');
      
      const afterClick = await googlePage.evaluate(() => {
        const buttons = document.querySelectorAll('[data-nemo-action]');
        return {
          buttons: buttons.length,
          visible: Array.from(buttons).filter(b => b.style.opacity !== '0').length
        };
      });
      
      console.log('   After click - buttons:', afterClick.buttons, 'visible:', afterClick.visible);
    }
    
    console.log('\n✅ Debug complete!');
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
