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
 * Puppeteer Extension Test - Following official docs
 * Tests content script injection and autofill functionality
 */

async function runTest() {
  console.log('🎭 Puppeteer Extension Test\n');
  
  let browser;
  
  try {
    // Launch with extension using Puppeteer's recommended method
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
    
    // Wait for service worker
    console.log('2. Waiting for service worker...');
    await delay(3000);
    
    const workerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && 
                target.url().includes('chrome-extension://'),
      { timeout: 10000 }
    );
    
    console.log('   ✓ Service worker found:', workerTarget.url());
    
    const worker = await workerTarget.worker();
    
    // Check extension state via service worker
    console.log('\n3. Checking extension state...');
    const extState = await worker.evaluate(async () => {
      try {
        // Try to access chrome.storage
        const result = await chrome.storage.local.get(null);
        return {
          hasStorage: true,
          keys: Object.keys(result),
          hasVault: Object.keys(result).some(k => k.includes('vault') || k.includes('nemo'))
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('   Extension state:', extState);
    
    // Open popup via service worker
    console.log('\n4. Opening extension popup...');
    try {
      await worker.evaluate('chrome.action.openPopup();');
      await delay(2000);
      
      const popupTarget = await browser.waitForTarget(
        target => target.type() === 'page' && 
                  target.url().endsWith('popup.html'),
        { timeout: 5000 }
      );
      
      const popupPage = await popupTarget.asPage();
      
      await popupPage.screenshot({
        path: join(SCREENSHOT_DIR, 'pptr-01-popup.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: pptr-01-popup.png');
      
      // Check popup content
      const popupInfo = await popupPage.evaluate(() => ({
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 300),
        isLocked: document.body.innerText.toLowerCase().includes('unlock'),
        needsCreate: document.body.innerText.toLowerCase().includes('create')
      }));
      
      console.log('   Popup info:', popupInfo);
      
      if (popupInfo.isLocked) {
        console.log('\n   ⚠️ Vault is locked');
        console.log('   Manual unlock needed for autofill testing');
      }
      
    } catch (err) {
      console.log('   Could not open popup:', err.message);
    }
    
    // Navigate to Google and test content script
    console.log('\n5. Testing content script on Google...');
    const page = await browser.newPage();
    await page.goto('https://accounts.google.com/');
    await delay(8000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'pptr-02-google.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: pptr-02-google.png');
    
    // Check if content script injected
    const contentScriptCheck = await page.evaluate(() => {
      // Look for any signs content script ran
      const signs = {
        // Check for data attributes
        nemoData: document.querySelectorAll('[data-nemo]').length,
        // Check for injected elements
        nemoButtons: document.querySelectorAll('[data-nemo-action]').length,
        // Check for overlay
        nemoOverlay: !!document.getElementById('nemo-autofill-overlay'),
        // Check fields
        fields: Array.from(document.querySelectorAll('input')).map(i => ({
          type: i.type,
          id: i.id,
          hasButton: i.dataset.nemoButton === 'true'
        }))
      };
      return signs;
    });
    
    console.log('   Content script check:', contentScriptCheck);
    
    if (contentScriptCheck.nemoButtons === 0 && contentScriptCheck.nemoData === 0) {
      console.log('\n   ❌ CONTENT SCRIPT NOT DETECTED');
      console.log('   Possible causes:');
      console.log('   - Content script not loading');
      console.log('   - CSP blocking injection');
      console.log('   - JavaScript error in content script');
      console.log('   - Extension not properly loaded');
    } else {
      console.log('   ✅ Content script detected!');
    }
    
    // Try clicking on email field
    console.log('\n6. Clicking email field...');
    const emailField = await page.$('input[type="email"]');
    if (emailField) {
      await emailField.click();
      await delay(3000);
      
      await page.screenshot({
        path: join(SCREENSHOT_DIR, 'pptr-03-clicked.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: pptr-03-clicked.png');
      
      // Check again for buttons
      const afterClick = await page.evaluate(() => ({
        buttons: document.querySelectorAll('[data-nemo-action]').length,
        overlays: !!document.getElementById('nemo-autofill-overlay')
      }));
      
      console.log('   After click:', afterClick);
    }
    
    // Check console for errors
    console.log('\n7. Checking for errors...');
    const logs = await page.evaluate(() => {
      // Get console logs if available
      return 'Check browser console manually for errors';
    });
    
    console.log('   Note:', logs);
    
    console.log('\n✅ Test complete!');
    console.log('\n📸 Screenshots:');
    console.log('   - pptr-01-popup.png');
    console.log('   - pptr-02-google.png');
    console.log('   - pptr-03-clicked.png');
    
    await delay(15000);
    
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
