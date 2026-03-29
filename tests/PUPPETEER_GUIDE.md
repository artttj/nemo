# Puppeteer Extension Testing

Better extension testing with Puppeteer - supports popups and service workers.

## Setup

```bash
npm install puppeteer
```

## Key Features for Extension Testing

1. **Access Service Workers**
```javascript
const workerTarget = await browser.waitForTarget(
  target => target.type() === 'service_worker'
);
const worker = await workerTarget.worker();
```

2. **Open Extension Pages**
```javascript
// Fixed extension ID (see Keeping a consistent extension ID)
const extId = 'your-fixed-extension-id';
await page.goto(`chrome-extension://${extId}/popup.html`);
```

3. **Open Popup via API**
```javascript
// Requires action.openPopup() API support
await extensionTarget.action().openPopup();
```

4. **Execute in Extension Context**
```javascript
const value = await worker.evaluate(() => {
  return chrome.storage.local.get('key');
});
```

## Fixed Extension ID

To have consistent ID for testing, add to manifest.json:

```json
{
  "key": "your-public-key-here"
}
```

This ensures the extension ID is always the same.

## Headless Mode with Extensions

```javascript
const browser = await puppeteer.launch({
  headless: 'new',  // NOT true - must be 'new'
  args: [
    `--disable-extensions-except=/path/to/extension`,
    `--load-extension=/path/to/extension`
  ]
});
```

## Service Worker Testing

```javascript
// Wait for service worker
const workerTarget = await browser.waitForTarget(
  target => target.type() === 'service_worker' && 
            target.url().includes('chrome-extension://')
);

const worker = await workerTarget.worker();

// Execute code in service worker context
const result = await worker.evaluate(() => {
  // Access extension APIs here
  return chrome.runtime.id;
});
```

## Example Test

See `extension-puppeteer.spec.mjs` for a working example.
