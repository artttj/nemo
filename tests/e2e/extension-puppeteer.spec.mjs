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
 * Puppeteer Extension Test
 * 
 * Uses Puppeteer which has better extension support:
 * - Can access service workers
 * - Can execute code in extension context
 * - Can open extension pages directly
 */

async function runTest() {
  console.log('🎭 Testing with Puppeteer\n');
  
  let browser;
  
  try {
    // Launch with extension
    console.log('1. Launching Chrome with extension...');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('   ✓ Browser launched\n');
    await delay(3000);
    
    // Method 1: Wait for and access service worker
    console.log('2. Looking for extension service worker...');
    
    // Get all targets
    const targets = await browser.targets();
    console.log('   Total targets:', targets.length);
    
    // Find service worker
    const serviceWorkerTarget = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes('chrome-extension://')
    );
    
    let extId = null;
    
    if (serviceWorkerTarget) {
      console.log('   ✓ Found service worker:', serviceWorkerTarget.url());
      extId = serviceWorkerTarget.url().split('/')[2];
      console.log('   Extension ID:', extId);
      
      // Connect to worker
      const worker = await serviceWorkerTarget.worker();
      if (worker) {
        console.log('   ✓ Connected to service worker');
        
        // Execute code in service worker context
        const runtimeInfo = await worker.evaluate(() => {
          return {
            extensionId: chrome.runtime?.id,
            hasStorage: !!chrome.storage,
            hasTabs: !!chrome.tabs
          };
        });
        
        console.log('   Extension runtime info:', runtimeInfo);
      }
    } else {
      console.log('   ⚠️ Service worker not found, checking other targets...');
      
      // List all targets
      targets.forEach(target => {
        if (target.url().includes('chrome-extension://')) {
          console.log(`   Target: ${target.type()} - ${target.url()}`);
          if (!extId) {
            extId = target.url().split('/')[2];
          }
        }
      });
      
      if (extId) {
        console.log('   Extension ID from other target:', extId);
      }
    }
    
    // Method 2: Open extension popup directly
    if (extId) {
      console.log('\n3. Opening extension popup...');
      const popupPage = await browser.newPage();
      
      try {
        await popupPage.goto(`chrome-extension://${extId}/popup.html`);
        await delay(3000);
        
        await popupPage.screenshot({
          path: join(SCREENSHOT_DIR, 'puppeteer-01-popup.png'),
          fullPage: true
        });
        console.log('   ✓ Screenshot: puppeteer-01-popup.png');
        
        // Check popup state
        const popupState = await popupPage.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          bodyText: document.body.innerText.substring(0, 300),
          hasUnlock: document.body.innerText.toLowerCase().includes('unlock'),
          hasCreate: document.body.innerText.toLowerCase().includes('create')
        }));
        
        console.log('   Popup state:', popupState);
        
        if (popupState.hasUnlock) {
          console.log('   🔓 Vault needs to be unlocked');
        } else if (popupState.hasCreate) {
          console.log('   📦 Vault needs to be created');
        } else {
          console.log('   ✅ Vault appears to be ready');
        }
        
      } catch (err) {
        console.log('   ⚠️ Could not open popup:', err.message);
      }
    }
    
    // Method 3: Test on Google
    console.log('\n4. Testing content script on Google...');
    
    // Wait for extension to fully initialize
    await delay(5000);
    
    let page;
    try {
      page = await browser.newPage();
    } catch (err) {
      console.log('   Could not create new page:', err.message);
      console.log('   Trying to get existing pages...');
      const pages = await browser.pages();
      page = pages[pages.length - 1];
    }
    await page.goto('https://accounts.google.com/');
    await delay(5000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'puppeteer-02-google.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: puppeteer-02-google.png');
    
    // Focus email field
    await page.click('input[type="email"]');
    await delay(3000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'puppeteer-03-focused.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: puppeteer-03-focused.png');
    
    // Check for extension UI
    const uiCheck = await page.evaluate(() => {
      const nemoElements = document.querySelectorAll('[data-nemo], [class*="nemo"], [id*="nemo"]');
      return {
        nemoElementsFound: nemoElements.length,
        focusedElement: document.activeElement?.tagName
      };
    });
    
    console.log('   UI check:', uiCheck);
    
    // Method 4: Execute in service worker to check vault state
    if (serviceWorkerTarget) {
      console.log('\n5. Checking vault state via service worker...');
      const worker = await serviceWorkerTarget.worker();
      
      if (worker) {
        try {
          // Try to check if there's vault data
          const vaultState = await worker.evaluate(async () => {
            // Try to get from storage
            try {
              const result = await chrome.storage.local.get(['nemo-vault-state', 'vaultState']);
              return {
                hasVaultState: !!result['nemo-vault-state'] || !!result['vaultState'],
                keys: Object.keys(result)
              };
            } catch (e) {
              return { error: e.message };
            }
          });
          
          console.log('   Vault state from storage:', vaultState);
          
        } catch (err) {
          console.log('   Could not access vault state:', err.message);
        }
      }
    }
    
    console.log('\n✅ Puppeteer Test Complete!');
    console.log('\n💡 Key advantages of Puppeteer:');
    console.log('   ✓ Can access service workers');
    console.log('   ✓ Can execute code in extension context');
    console.log('   ✓ Can open extension pages directly');
    console.log('   ✓ Better extension support than Playwright');
    
    await delay(10000);
    
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
