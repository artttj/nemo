/**
 * Export Excalidraw diagrams to PNG with white background
 * Run: node scripts/export-diagrams.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIAGRAMS_DIR = join(__dirname, '../docs/diagrams');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function exportExcalidrawToPng(excalidrawJson, outputPath) {
  const data = JSON.parse(excalidrawJson);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of data.elements) {
      if (el.isDeleted) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    const padding = 40;
    const width = Math.ceil((maxX - minX + padding * 2) * 2);
    const height = Math.ceil((maxY - minY + padding * 2) * 2);

    await page.setViewport({ width: width + 40, height: height + 40, deviceScaleFactor: 2 });

    // Create HTML with white background
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Diagram Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #root {
      width: ${width + 40}px;
      height: ${height + 40}px;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@excalidraw/excalidraw@0.18.0/dist/excalidraw.production.min.js"></script>
  <script>
    const data = ${JSON.stringify(data)};

    function App() {
      return React.createElement(ExcalidrawLib.Excalidraw, {
        initialData: {
          elements: data.elements,
          appState: {
            ...data.appState,
            zenModeEnabled: false,
            gridModeEnabled: false,
            viewBackgroundColor: '#ffffff'
          },
          files: data.files || {}
        },
        UIOptions: {
          canvas: { actionButtonState: 'hidden' },
          panels: { diagram: false, styles: false },
          toolbar: 'hidden'
        }
      });
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));

    setTimeout(() => window.__READY__ = true, 2000);
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => window.__READY__, { timeout: 30000 });
    await delay(1000);

    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`Exported: ${outputPath}`);

  } finally {
    await browser.close();
  }
}

async function main() {
  const diagrams = [
    'encryption-architecture.excalidraw',
    'system-architecture.excalidraw'
  ];

  for (const diagram of diagrams) {
    const inputPath = join(DIAGRAMS_DIR, diagram);
    const outputPath = join(DIAGRAMS_DIR, diagram.replace('.excalidraw', '.png'));

    console.log(`Processing ${diagram}...`);
    const content = readFileSync(inputPath, 'utf-8');
    await exportExcalidrawToPng(content, outputPath);
  }

  console.log('\nDone!');
}

main().catch(console.error);
