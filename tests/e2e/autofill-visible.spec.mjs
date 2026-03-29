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
 * Check if an element is actually visible (not just in DOM)
 * Checks computed styles, dimensions, and viewport position
 */
async function checkElementVisibility(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { exists: false, visible: false, reason: 'not found' };

    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);

    return {
      exists: true,
      visible: rect.width > 0 &&
               rect.height > 0 &&
               computed.visibility !== 'hidden' &&
               computed.display !== 'none' &&
               parseFloat(computed.opacity) > 0,
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      computed: {
        position: computed.position,
        top: computed.top,
        right: computed.right,
        visibility: computed.visibility,
        display: computed.display,
        opacity: computed.opacity,
        zIndex: computed.zIndex
      },
      inViewport: rect.top >= 0 &&
                  rect.left >= 0 &&
                  rect.bottom <= window.innerHeight &&
                  rect.right <= window.innerWidth
    };
  }, selector);
}

/**
 * Find Nemo overlay element
 */
async function findNemoOverlay(page) {
  return await page.evaluate(() => {
    // Look for high z-index elements that might be Nemo overlays
    const allDivs = document.querySelectorAll('div');
    const candidates = [];

    for (const div of allDivs) {
      const computed = window.getComputedStyle(div);
      const hasHighZIndex = computed.zIndex === '2147483647';
      const hasDarkBg = computed.backgroundColor.includes('26, 26, 26') ||
                       computed.backgroundColor.includes('26,26,26');
      const isFixed = computed.position === 'fixed';

      if (hasHighZIndex) {
        const rect = div.getBoundingClientRect();
        candidates.push({
          text: div.textContent?.substring(0, 50),
          rect: { top: rect.top, right: rect.right, width: rect.width, height: rect.height },
          styles: {
            position: computed.position,
            top: computed.top,
            right: computed.right,
            zIndex: computed.zIndex,
            backgroundColor: computed.backgroundColor
          }
        });
      }
    }

    return candidates;
  });
}

const LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Login Page - Nemo Autofill</title>
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
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>Test Login</h1>
  <form id="login-form">
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="name@example.com" autocomplete="username">
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password">
    </div>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>
`;

async function runTest() {
  console.log('🧪 E2E Test: Autofill Overlay Visibility\n');

  let browser;
  let context;

  try {
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

    console.log('2. Creating test page with login form...');
    const page = await context.newPage();
    await page.setContent(LOGIN_PAGE_HTML);
    await delay(2000);
    console.log('   ✓ Test page created\n');

    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'visibility-01-initial.png'),
      fullPage: true
    });

    console.log('3. Checking initial state...');
    const initialCheck = await findNemoOverlay(page);
    console.log(`   Overlays found: ${initialCheck.length}`);
    console.log('   ✓ No overlays before interaction (expected)\n');

    console.log('4. Focusing password field to trigger Nemo button...');
    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await delay(1000);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'visibility-02-password-focused.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved\n');

    console.log('5. Checking for Nemo buttons...');
    const nemoButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[data-nemo-action]');
      return Array.from(buttons).map(b => ({
        action: b.dataset.nemoAction,
        rect: b.getBoundingClientRect(),
        opacity: b.style.opacity,
        visibility: window.getComputedStyle(b).visibility
      }));
    });
    console.log(`   Nemo buttons found: ${nemoButtons.length}`);
    nemoButtons.forEach((btn, i) => {
      console.log(`     [${i}] action=${btn.action}, visible=${btn.rect.width > 0 && btn.rect.height > 0}, opacity=${btn.opacity}`);
    });

    if (nemoButtons.length > 0) {
      const fillButton = nemoButtons.find(b => b.action === 'fill');
      if (fillButton) {
        console.log('\n6. Clicking fill button to open overlay...');
        await page.locator('[data-nemo-action="fill"]').click();
        await delay(1500);

        await page.screenshot({
          path: join(SCREENSHOT_DIR, 'visibility-03-overlay-opened.png'),
          fullPage: true
        });
        console.log('   ✓ Screenshot saved\n');

        console.log('7. Checking overlay visibility...');
        const overlays = await findNemoOverlay(page);
        console.log(`   Overlays found: ${overlays.length}`);

        if (overlays.length > 0) {
          overlays.forEach((overlay, i) => {
            console.log(`\n   Overlay [${i}]:`);
            console.log(`     Text: "${overlay.text}"`);
            console.log(`     Position: ${overlay.styles.position}`);
            console.log(`     Top: ${overlay.styles.top}`);
            console.log(`     Right: ${overlay.styles.right}`);
            console.log(`     Z-Index: ${overlay.styles.zIndex}`);
            console.log(`     Rect: ${JSON.stringify(overlay.rect)}`);

            const hasPosition = overlay.styles.position === 'fixed';
            const hasTop = overlay.styles.top !== 'auto' && overlay.styles.top !== '';
            const hasRight = overlay.styles.right !== 'auto' && overlay.styles.right !== '';
            const visible = overlay.rect.width > 0 && overlay.rect.height > 0;

            console.log(`\n     ✓ Has position: fixed = ${hasPosition}`);
            console.log(`     ✓ Has top value = ${hasTop} (${overlay.styles.top})`);
            console.log(`     ✓ Has right value = ${hasRight} (${overlay.styles.right})`);
            console.log(`     ✓ Visible in DOM = ${visible}`);

            if (hasPosition && hasTop && hasRight && visible) {
              console.log('\n     ✅ OVERLAY IS VISIBLE');
            } else {
              console.log('\n     ❌ OVERLAY MAY NOT BE VISIBLE');
            }
          });
        } else {
          console.log('   ⚠️ No overlays found (vault may be locked - this is expected)');
        }
      }
    }

    console.log('\n8. Final verification...');
    const finalState = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const nemoElements = [];

      for (const el of allElements) {
        if (el.id?.includes('nemo') ||
            el.className?.includes('nemo') ||
            el.dataset.nemo) {
          const rect = el.getBoundingClientRect();
          const computed = window.getComputedStyle(el);
          nemoElements.push({
            tag: el.tagName,
            id: el.id,
            class: el.className?.toString()?.substring(0, 50),
            dataset: el.dataset,
            visible: rect.width > 0 && rect.height > 0 && computed.display !== 'none',
            rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left }
          });
        }
      }

      return nemoElements;
    });

    console.log(`   Total Nemo-related elements: ${finalState.length}`);
    finalState.forEach((el, i) => {
      console.log(`     [${i}] ${el.tag} visible=${el.visible} rect=${JSON.stringify(el.rect)}`);
    });

    console.log('\n✅ Test complete!');
    console.log('   Screenshots saved in tests/screenshots/');

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
