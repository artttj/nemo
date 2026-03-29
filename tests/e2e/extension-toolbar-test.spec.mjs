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

/**
 * Test to verify extension loads and is accessible
 * Note: Extensions loaded via --load-extension may not show toolbar icon
 * but the content script should still work on web pages
 */

async function runTest() {
  console.log('🔧 Testing Extension Loading and Accessibility\n');
  console.log('⚠️  Note: Extensions in automation browsers may not show toolbar icons');
  console.log('   This is a known limitation of --load-extension flag\n');
  
  let browser;
  let context;
  
  try {
    // Launch Chrome with specific flags for extension testing
    console.log('1. Launching Chrome with extension...');
    browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // Enable extensions UI
        '--enable-extensions',
        '--allow-extensions-in-incognito'
      ]
    });
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // Try to enable extension access
      bypassCSP: true
    });
    
    console.log('   ✓ Browser launched\n');
    await delay(3000);
    
    // Method 1: Try to access extension via chrome://extensions
    console.log('2. Checking chrome://extensions...');
    const extPage = await context.newPage();
    
    try {
      await extPage.goto('chrome://extensions/');
      await delay(2000);
      
      await extPage.screenshot({
        path: join(SCREENSHOT_DIR, 'toolbar-01-extensions-page.png'),
        fullPage: true
      });
      console.log('   ✓ Screenshot: toolbar-01-extensions-page.png');
      
      // Check if Nemo appears in the list
      const nemoInfo = await extPage.evaluate(() => {
        const items = document.querySelectorAll('extensions-item');
        const info = [];
        items.forEach(item => {
          const name = item.shadowRoot?.querySelector('#name')?.textContent;
          const id = item.id;
          const enabled = item.getAttribute('enabled') === 'true';
          if (name) {
            info.push({ name, id, enabled });
          }
        });
        return info;
      });
      
      console.log('   Extensions found:', nemoInfo);
      
      const nemoExt = nemoInfo.find(e => e.name?.toLowerCase().includes('nemo'));
      if (nemoExt) {
        console.log(`   ✅ Nemo extension found: ${nemoExt.name}`);
        console.log(`      ID: ${nemoExt.id}`);
        console.log(`      Enabled: ${nemoExt.enabled}`);
        
        // Try to open the popup
        if (nemoExt.id) {
          console.log('\n3. Attempting to open extension popup...');
          const popupUrl = `chrome-extension://${nemoExt.id}/popup.html`;
          const popupPage = await context.newPage();
          
          try {
            await popupPage.goto(popupUrl);
            await delay(3000);
            
            await popupPage.screenshot({
              path: join(SCREENSHOT_DIR, 'toolbar-02-popup-direct.png'),
              fullPage: true
            });
            console.log('   ✓ Screenshot: toolbar-02-popup-direct.png');
            
            const popupState = await popupPage.evaluate(() => ({
              url: window.location.href,
              title: document.title,
              bodyText: document.body.innerText.substring(0, 200)
            }));
            
            console.log('   Popup state:', popupState);
            
          } catch (err) {
            console.log('   ⚠️ Could not open popup:', err.message);
          }
        }
      } else {
        console.log('   ⚠️ Nemo extension not found in chrome://extensions');
      }
      
    } catch (err) {
      console.log('   ⚠️ Could not access chrome://extensions:', err.message);
    }
    
    // Method 2: Test content script on a real page
    console.log('\n4. Testing content script on real page...');
    const testPage = await context.newPage();
    await testPage.goto('https://accounts.google.com/');
    await delay(5000);
    
    await testPage.screenshot({
      path: join(SCREENSHOT_DIR, 'toolbar-03-google-page.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot: toolbar-03-google-page.png');
    
    // Check if content script is running
    const contentScriptCheck = await testPage.evaluate(() => {
      // Check for any extension-injected elements
      const allElements = document.querySelectorAll('*');
      const possibleExtensionElements = [];
      
      for (const el of allElements) {
        // Look for extension-specific patterns
        if (el.id?.includes('nemo') || 
            el.className?.includes('nemo') ||
            el.hasAttribute('data-nemo')) {
          possibleExtensionElements.push({
            tag: el.tagName,
            id: el.id,
            class: el.className
          });
        }
      }
      
      return {
        totalElements: allElements.length,
        nemoElements: possibleExtensionElements.length,
        extensionElements: possibleExtensionElements.slice(0, 10)
      };
    });
    
    console.log('   Content script check:', contentScriptCheck);
    
    if (contentScriptCheck.nemoElements > 0) {
      console.log('   ✅ Content script is working!');
    } else {
      console.log('   ℹ️ No Nemo elements detected (vault may be locked)');
    }
    
    // Method 3: Check for service worker/background page
    console.log('\n5. Checking background context...');
    try {
      // List all targets
      const targets = browser.targets ? await browser.targets() : [];
      console.log('   Total targets:', targets.length);
      
      const extensionTargets = targets.filter(t => 
        t.url && t.url.includes('chrome-extension://')
      );
      
      console.log('   Extension targets:', extensionTargets.length);
      extensionTargets.forEach(t => {
        console.log(`     - ${t.type}: ${t.url}`);
      });
    } catch (err) {
      console.log('   Could not enumerate targets:', err.message);
    }
    
    console.log('\n✅ Test complete!');
    console.log('\n📋 Summary:');
    console.log('   - Extension loaded via --load-extension flag');
    console.log('   - Toolbar icon visibility is a known limitation');
    console.log('   - Content script should still work on web pages');
    console.log('   - To see toolbar icon, manually load extension in Chrome');
    console.log('\n📸 Screenshots saved in tests/screenshots/');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Check screenshots to verify extension loaded');
    console.log('   2. For full toolbar icon testing, manually install extension');
    console.log('   3. Content script tests work regardless of toolbar visibility');
    
    await delay(10000);
    
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
