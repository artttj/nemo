import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_PATH = join(__dirname, '../../.output/chrome-mv3');
const SCREENSHOT_DIR = join(__dirname, '../screenshots');

/**
 * Simple test helper for browser extension testing
 */
export class ExtensionTestHelper {
  constructor() {
    this.browser = null;
    this.context = null;
  }

  async launch() {
    console.log('Launching Chrome with Nemo extension...');
    
    this.browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    // Wait for extension to initialize
    await this.delay(3000);
    console.log('✓ Extension loaded');
    
    return this;
  }

  async newPage() {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return await this.context.newPage();
  }

  async screenshot(page, filename) {
    const path = join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path, fullPage: true });
    console.log(`  ✓ Screenshot: ${filename}`);
    return path;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) {
      console.log('Closing browser...');
      await this.browser.close();
    }
  }
}

/**
 * Get field information from page
 */
export async function getFieldInfo(page) {
  return await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      autocomplete: input.getAttribute('autocomplete'),
      visible: input.offsetParent !== null,
      hasNemoData: !!input.dataset.nemo
    }));
    
    return {
      url: window.location.href,
      title: document.title,
      inputs: inputs.filter(i => i.visible || i.type === 'password' || i.type === 'email')
    };
  });
}

/**
 * Check for extension UI elements
 */
export async function checkExtensionUI(page) {
  return await page.evaluate(() => {
    const nemoElements = document.querySelectorAll('[data-nemo], [class*="nemo"], [id*="nemo"]');
    const overlays = document.querySelectorAll('div[style*="z-index: 2147483647"]');
    const iframes = document.querySelectorAll('iframe');
    const shadowRoots = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
    
    return {
      nemoElementsFound: nemoElements.length,
      highZIndexElements: overlays.length,
      iframes: iframes.length,
      shadowRoots: shadowRoots.length,
      focusedElement: document.activeElement?.tagName,
      focusedId: document.activeElement?.id
    };
  });
}

export { EXTENSION_PATH, SCREENSHOT_DIR };
