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

/**
 * Check if Nemo overlay is actually visible (has proper positioning)
 * Returns detailed visibility info for debugging
 */
export async function checkOverlayVisibility(page) {
  return await page.evaluate(() => {
    // Find all high z-index divs (potential Nemo overlays)
    const allDivs = document.querySelectorAll('div');
    const overlays = [];

    for (const div of allDivs) {
      const computed = window.getComputedStyle(div);
      const hasHighZIndex = computed.zIndex === '2147483647';

      if (hasHighZIndex) {
        const rect = div.getBoundingClientRect();
        const text = div.textContent?.trim().substring(0, 100);

        overlays.push({
          text,
          visible: rect.width > 0 && rect.height > 0 && computed.display !== 'none',
          rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height },
          styles: {
            position: computed.position,
            top: computed.top,
            right: computed.right,
            left: computed.left,
            bottom: computed.bottom,
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            zIndex: computed.zIndex
          },
          hasPositionFixed: computed.position === 'fixed',
          hasTopValue: computed.top !== 'auto' && computed.top !== '',
          hasRightValue: computed.right !== 'auto' && computed.right !== '',
          inViewport: rect.top >= 0 && rect.left >= 0 &&
                      rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
        });
      }
    }

    return {
      overlayCount: overlays.length,
      overlays: overlays,
      // Also check for Nemo buttons
      buttons: Array.from(document.querySelectorAll('[data-nemo-action]')).map(btn => {
        const rect = btn.getBoundingClientRect();
        const computed = window.getComputedStyle(btn);
        return {
          action: btn.dataset.nemoAction,
          visible: rect.width > 0 && rect.height > 0 && computed.display !== 'none',
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          opacity: btn.style.opacity,
          pointerEvents: computed.pointerEvents
        };
      })
    };
  });
}

/**
 * Check if element has proper positioning for visibility
 * Returns true only if element exists, has position: fixed, and has top/right values
 */
export async function isOverlayProperlyPositioned(page) {
  const visibility = await checkOverlayVisibility(page);

  if (visibility.overlayCount === 0) {
    return { visible: false, reason: 'no_overlay_found' };
  }

  // Find the main overlay (Nemo Password Manager or similar text)
  const mainOverlay = visibility.overlays.find(o =>
    o.text?.includes('Nemo') || o.text?.includes('password')
  );

  if (!mainOverlay) {
    return { visible: false, reason: 'no_nemo_overlay', overlays: visibility.overlays };
  }

  const checks = {
    hasPositionFixed: mainOverlay.hasPositionFixed,
    hasTopValue: mainOverlay.hasTopValue,
    hasRightValue: mainOverlay.hasRightValue,
    hasDimensions: mainOverlay.rect.width > 0 && mainOverlay.rect.height > 0,
    inViewport: mainOverlay.inViewport
  };

  const allPassed = Object.values(checks).every(v => v === true);

  return {
    visible: allPassed,
    reason: allPassed ? 'visible' : 'positioning_issue',
    checks,
    overlay: mainOverlay
  };
}

export { EXTENSION_PATH, SCREENSHOT_DIR };

/**
 * Wait for Nemo buttons to appear on the page
 * @param {Page} page - Playwright page
 * @param {number} timeout - Timeout in ms (default: 5000)
 * @returns {Promise<boolean>}
 */
export async function waitForNemoButtons(page, timeout = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const buttons = await page.evaluate(() =>
      document.querySelectorAll('[data-nemo-action]').length
    );
    if (buttons > 0) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * Get all Nemo button info
 * @param {Page} page - Playwright page
 * @returns {Promise<Array<{action: string, visible: boolean, rect: DOMRect}>>}
 */
export async function getNemoButtons(page) {
  return await page.evaluate(() => {
    const buttons = document.querySelectorAll('[data-nemo-action]');
    return Array.from(buttons).map(b => {
      const rect = b.getBoundingClientRect();
      const computed = window.getComputedStyle(b);
      return {
        action: b.dataset.nemoAction,
        visible: rect.width > 0 && rect.height > 0 && computed.display !== 'none',
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        opacity: computed.opacity,
        pointerEvents: computed.pointerEvents
      };
    });
  });
}

/**
 * Click a Nemo button by action type
 * @param {Page} page - Playwright page
 * @param {string} action - Button action ('fill' or 'generate')
 * @returns {Promise<boolean>}
 */
export async function clickNemoButton(page, action) {
  const button = page.locator(`[data-nemo-action="${action}"]`).first();
  const count = await button.count();
  if (count > 0) {
    await button.click();
    return true;
  }
  return false;
}

/**
 * Get form field values
 * @param {Page} page - Playwright page
 * @param {Array<string>} selectors - Field selectors
 * @returns {Promise<Record<string, string>>}
 */
export async function getFormFieldValues(page, selectors) {
  return await page.evaluate((sels) => {
    const values = {};
    for (const [name, selector] of Object.entries(sels)) {
      const el = document.querySelector(selector);
      values[name] = el?.value || '';
    }
    return values;
  }, selectors);
}

/**
 * Check if autofill overlay is visible
 * @param {Page} page - Playwright page
 * @returns {Promise<{visible: boolean, text?: string}>}
 */
export async function checkAutofillOverlayVisible(page) {
  return await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    for (const div of divs) {
      const computed = window.getComputedStyle(div);
      if (computed.zIndex === '2147483647') {
        const rect = div.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            visible: true,
            text: div.textContent?.substring(0, 100),
            rect: { width: rect.width, height: rect.height }
          };
        }
      }
    }
    return { visible: false };
  });
}

/**
 * Select entry from autofill overlay by index or text
 * @param {Page} page - Playwright page
 * @param {number|string} selector - Index or text to match
 * @returns {Promise<boolean>}
 */
export async function selectAutofillEntry(page, selector = 0) {
  return await page.evaluate((sel) => {
    // Try to find by class first
    const entries = document.querySelectorAll('.nemo-entry-item');
    if (entries.length > 0) {
      if (typeof sel === 'number' && entries[sel]) {
        entries[sel].click();
        return true;
      }
    }

    // Fallback: find by text content
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      if (typeof sel === 'string' && div.textContent?.includes(sel)) {
        div.click();
        return true;
      }
    }

    return false;
  }, selector);
}

/**
 * Inject mock vault state into browser context
 * @param {BrowserContext} context - Playwright browser context
 * @param {Object} vaultState - Vault state object
 */
export async function injectMockVault(context, vaultState) {
  await context.addInitScript((state) => {
    window.__MOCK_VAULT_STATE__ = JSON.parse(state);

    const originalSendMessage = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = async (message) => {
      const vault = window.__MOCK_VAULT_STATE__;

      switch (message.type) {
        case 'GET_VAULT_STATE':
          return { success: true, data: vault };

        case 'GET_ENTRIES_FOR_AUTOFILL':
          if (!vault.isUnlocked) {
            return { success: false, error: 'Vault is locked' };
          }
          return { success: true, data: vault.vault?.entries || [] };

        case 'GET_ENTRY_BY_URL':
          if (!vault.isUnlocked) {
            return { success: false, error: 'Vault is locked' };
          }
          try {
            const url = message.payload || '';
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            const entries = vault.vault?.entries || [];
            const match = entries.find(e => {
              if (!e.url) return false;
              const entryHostname = new URL(e.url).hostname.replace(/^www\./, '');
              return hostname === entryHostname || hostname.endsWith('.' + entryHostname);
            });
            return { success: true, data: match || null };
          } catch {
            return { success: true, data: vault.vault?.entries?.[0] || null };
          }

        case 'GET_SITE_PREFERENCES':
          return { success: true, data: vault.sitePreferences?.[message.payload] || null };

        case 'ADD_ENTRY':
          return { success: true, data: message.payload };

        default:
          return originalSendMessage?.call(chrome.runtime, message);
      }
    };
  }, JSON.stringify(vaultState));
}
