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

### Run Tests

```bash
# Run Google autofill test
node tests/e2e/google-autofill.spec.mjs

# Or from tests directory
cd tests && npm run test:e2e:google
```

## Test Coverage

### Google Autofill Test (`google-autofill.spec.mjs`)

Tests the extension's autofill functionality on Google's login page:

1. **Extension Loading** - Verifies extension loads in Chrome
2. **Field Detection** - Detects email and password input fields
3. **Focus Events** - Tests autofill UI appearance on field focus
4. **Screenshots** - Captures screenshots at each step

### What It Tests

- ✅ Extension loads without errors
- ✅ Content script detects password fields
- ✅ Autocomplete attributes are present
- ✅ Extension UI appears on field focus (if vault is unlocked)
- ✅ Screenshots for visual verification

### Expected Behavior

Since the vault starts **locked** for security:
- Extension loads ✓
- Fields are detected ✓
- No autofill UI appears (expected - vault locked)

To test with unlocked vault, the test would need to:
1. Create a vault manually first
2. Store encrypted test data
3. Unlock via WebAuthn (requires user interaction)

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

## Debugging

Add `await helper.delay(30000)` to keep browser open for manual inspection.

View screenshots in `tests/screenshots/` to debug visual issues.
