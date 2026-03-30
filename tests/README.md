# Nemo Extension Tests

End-to-end tests for the Nemo password manager browser extension using Playwright.

## Structure

```
tests/
├── e2e/                    # End-to-end tests
│   └── google-autofill.spec.mjs
├── utils/                  # Test utilities
│   └── test-helper.mjs
├── fixtures/               # Test data
├── screenshots/            # Generated screenshots (gitignored)
└── package.json
```

## Running Tests

### Prerequisites

1. Build the extension first:
   ```bash
   pnpm build
   ```

2. Install Playwright (if not already installed):
   ```bash
   pnpm exec playwright install chromium
   ```

3. Install test dependencies:
   ```bash
   cd tests && npm install
   ```

### Run Tests

```bash
# Run all E2E tests (recommended)
cd tests && npm run test:e2e:all

# Run specific tests
npm run test:e2e:real        # Comprehensive autofill behavior test
npm run test:e2e:github      # GitHub login autofill test
npm run test:e2e:google      # Google login page test
npm run test:e2e:position    # Overlay positioning test
npm run test:e2e:visible     # UI visibility test
npm run test:e2e:vault       # Vault lifecycle test
npm run test:e2e:mock        # Mock vault test
```

## Test Coverage

### Real Autofill Behavior Test (`autofill-real-behavior.spec.mjs`) ⭐ **NEW**

Comprehensive test that verifies actual autofill functionality with a mock vault:

1. **Vault Locked State** - Tests that Nemo buttons appear but don't show overlay when vault is locked
2. **Vault Unlocked State** - Tests autofill overlay with actual vault entries
3. **Entry Selection** - Tests selecting an entry from the overlay and filling form fields
4. **Password Generator** - Tests the generate password button and overlay
5. **Auto-fill on Focus** - Tests automatic form filling when field receives focus (with site preference)
6. **No Matching Entries** - Tests behavior when vault has no entries for current site

**Key Features:**
- ✅ Uses MockVaultManager with test entries
- ✅ Injects mock via `chrome.runtime.sendMessage` override
- ✅ Verifies actual credential filling in form fields
- ✅ Tests both locked and unlocked vault states
- ✅ Screenshots at each step

### GitHub Autofill Test (`github-autofill.spec.mjs`) ⭐ **NEW**

Tests autofill on GitHub's real login page:

1. **Extension Loading** - Loads extension on github.com/login
2. **Field Detection** - Detects GitHub's login and password fields
3. **Button Appearance** - Verifies Nemo buttons appear on focus
4. **Autofill Flow** - Tests complete autofill flow with mock entries

### Google Autofill Test (`google-autofill.spec.mjs`)

Tests the extension's autofill functionality on Google's login page:

1. **Extension Loading** - Verifies extension loads in Chrome
2. **Field Detection** - Detects email and password input fields
3. **Focus Events** - Tests autofill UI appearance on field focus
4. **Screenshots** - Captures screenshots at each step

### Autofill Positioning Test (`autofill-positioning.spec.mjs`)

Tests overlay positioning with mock vault:

1. **Mock Vault Injection** - Injects unlocked vault state into page context
2. **Button Positioning** - Verifies Nemo buttons are properly positioned
3. **Overlay Positioning** - Checks autofill overlay appears in correct location
4. **Viewport Handling** - Tests overlay positioning relative to field

### Autofill Visibility Test (`autofill-visible.spec.mjs`)

Tests UI visibility with computed styles:

1. **Element Detection** - Finds Nemo elements by data attributes
2. **Style Verification** - Checks computed styles for visibility
3. **Z-Index Validation** - Verifies overlay has correct z-index
4. **Viewport Check** - Ensures elements are in viewport

### Vault Lifecycle Test (`vault-lifecycle.spec.mjs`)

Tests vault states and transitions:

1. **Extension Popup** - Opens extension popup
2. **State Detection** - Detects locked/unlocked/empty states
3. **Manual Interaction** - Allows time for manual vault unlock
4. **Cross-page Testing** - Tests autofill on Google after vault operations

### Expected Behavior

**Locked Vault:**
- Nemo buttons appear on password fields ✓
- Clicking fill button does NOT show overlay (prompts unlock) ✓

**Unlocked Vault with Entries:**
- Nemo buttons appear on password fields ✓
- Clicking fill shows overlay with matching entries ✓
- Selecting entry fills username and password ✓
- Auto-fill on focus works (if site preference enabled) ✓

**Unlocked Vault without Matching Entries:**
- Nemo buttons still appear ✓
- Overlay shows "No saved passwords" message ✓

## Screenshots

Screenshots are saved to `tests/screenshots/`:

- `google-01-initial.png` - Initial page load
- `google-02-email-focused.png` - After clicking email field
- `google-03-password-focused.png` - After clicking password field
- `google-04-final.png` - Final state

## Adding New Tests

Create a new `.spec.mjs` file in `tests/e2e/`:

```javascript
import { ExtensionTestHelper, getFieldInfo } from '../utils/test-helper.mjs';

async function runTest() {
  const helper = new ExtensionTestHelper();
  
  try {
    await helper.launch();
    const page = await helper.newPage();
    
    // Your test code here
    await page.goto('https://example.com/login');
    await helper.screenshot(page, 'example-test.png');
    
  } finally {
    await helper.close();
  }
}

runTest();
```

## Utility Functions

### ExtensionTestHelper

- `launch()` - Launch Chrome with extension
- `newPage()` - Create new browser page
- `screenshot(page, filename)` - Take screenshot
- `delay(ms)` - Wait for milliseconds
- `close()` - Clean up browser

### getFieldInfo(page)

Returns information about form fields on the page:
```javascript
{
  url: string,
  title: string,
  inputs: [
    { type, name, id, placeholder, autocomplete, visible }
  ]
}
```

### checkExtensionUI(page)

Checks for extension UI elements:
```javascript
{
  nemoElementsFound: number,
  highZIndexElements: number,
  shadowRoots: number
}
```

### New Real Autofill Utilities ⭐

#### waitForNemoButtons(page, timeout)
Waits for Nemo buttons to appear on the page.
```javascript
const found = await waitForNemoButtons(page, 5000);
```

#### getNemoButtons(page)
Gets detailed info about all Nemo buttons.
```javascript
const buttons = await getNemoButtons(page);
// Returns: [{ action: 'fill', visible: true, rect: {...} }]
```

#### clickNemoButton(page, action)
Clicks a Nemo button by action type.
```javascript
await clickNemoButton(page, 'fill');      // Click fill button
await clickNemoButton(page, 'generate');  // Click generate button
```

#### getFormFieldValues(page, selectors)
Gets values from form fields.
```javascript
const values = await getFormFieldValues(page, {
  email: '#email',
  password: '#password'
});
```

#### checkAutofillOverlayVisible(page)
Checks if autofill overlay is currently visible.
```javascript
const { visible, text } = await checkAutofillOverlayVisible(page);
```

#### selectAutofillEntry(page, selector)
Selects an entry from the autofill overlay.
```javascript
await selectAutofillEntry(page, 0);              // Select first entry
await selectAutofillEntry(page, 'Google');       // Select by text
```

#### injectMockVault(context, vaultState)
Injects mock vault state into browser context.
```javascript
import { MockVaultManager } from '../utils/vault-mock.mjs';

const vaultManager = new MockVaultManager();
vaultManager.unlock();
await injectMockVault(context, vaultManager.getState());
```

## Debugging

Add `await helper.delay(30000)` to keep browser open for manual inspection.

View screenshots in `tests/screenshots/` to debug visual issues.

### Running Tests Headless (CI)

For CI environments, run with headless mode:

```javascript
browser = await chromium.launch({
  headless: true,  // Enable headless mode
  args: [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});
```

Note: Extension autofill tests may behave differently in headless mode due to Chrome's security restrictions.

### Troubleshooting

**Extension not loading:**
- Ensure extension is built: `pnpm build`
- Check extension path exists: `ls .output/chrome-mv3/`
- Try increasing delay after launch: `await delay(5000)`

**Mock vault not working:**
- Verify `chrome.runtime.sendMessage` is properly overridden
- Check that mock state is injected before page navigation
- Use `context.addInitScript()` instead of `page.evaluateOnNewDocument()`

**Buttons not appearing:**
- Content script needs time to inject: wait 2-3 seconds after page load
- Some sites use iframes or shadow DOM that content script can't access
- Check browser console for errors

**Autofill not filling fields:**
- Verify vault is unlocked in mock state (`isUnlocked: true`)
- Ensure entries have matching URLs
- Check field selectors are correct for the site

## Generating README Screenshots

Two scripts for creating clean screenshots of the extension UI:

### Locked State

```bash
cd tests && node screenshot-readme.mjs
```

Creates `readme-locked.png` showing the extension popup in locked/setup state.

### Unlocked State

Prerequisites: Create a vault manually first.

```bash
cd tests && node screenshot-unlocked.mjs
```

Creates:
- `readme-unlocked.png` - Main popup with entries
- `readme-entry-detail.png` - Entry detail view
- `readme-settings.png` - Settings modal
- `readme-autofill.png` - Autofill on Google login

### Adding to README

```markdown
## Screenshots

| Locked | Unlocked |
|--------|----------|
| ![Locked](tests/screenshots/readme-locked.png) | ![Unlocked](tests/screenshots/readme-unlocked.png) |

| Entry Detail | Autofill |
|--------------|----------|
| ![Entry](tests/screenshots/readme-entry-detail.png) | ![Autofill](tests/screenshots/readme-autofill.png) |
```

---

## How Mock Vault Injection Works

The tests use a technique called "message interception" to mock the vault state without modifying the extension code:

```
Test Script
    ↓
MockVaultManager (creates vault state)
    ↓
context.addInitScript() (injects into browser context)
    ↓
Override chrome.runtime.sendMessage
    ↓
Content script calls chrome.runtime.sendMessage
    ↓
Mock returns test data instead of hitting real background
```

### Example Flow

1. **Test creates mock vault:**
   ```javascript
   const vault = new MockVaultManager();
   vault.unlock();
   vault.addEntry({ username: 'test', password: 'pass', url: 'https://example.com' });
   ```

2. **Inject into browser:**
   ```javascript
   await context.addInitScript((state) => {
     window.__MOCK_VAULT_STATE__ = JSON.parse(state);
     const original = chrome.runtime.sendMessage;
     chrome.runtime.sendMessage = async (message) => {
       if (message.type === 'GET_VAULT_STATE') {
         return { success: true, data: window.__MOCK_VAULT_STATE__ };
       }
       return original?.call(chrome.runtime, message);
     };
   }, JSON.stringify(vault.getState()));
   ```

3. **Content script queries vault:**
   ```javascript
   const state = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' });
   // Returns mock data instead of real vault
   ```

This allows testing autofill behavior without requiring WebAuthn authentication or a real encrypted vault.
