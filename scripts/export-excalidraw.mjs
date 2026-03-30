/**
 * Export Excalidraw diagrams to PNG using Puppeteer
 * Run: node scripts/export-excalidraw.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIAGRAMS_DIR = join(__dirname, '../docs/diagrams');
const OUTPUT_DIR = join(__dirname, '../docs/diagrams');

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Excalidraw Export</title>
  <style>
    body { margin: 0; padding: 20px; background: #fff; }
    #container { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script src="https://unpkg.com/@excalidraw/excalidraw@0.18.0/dist/excalidraw.production.min.js"></script>
  <script type="module">
    import { exportToBlob } from 'https://unpkg.com/@excalidraw/excalidraw@0.18.0/dist/utils/export.js';

    window.exportDiagram = async (data) => {
      const blob = await exportToBlob({
        elements: data.elements,
        appState: { ...data.appState, exportBackground: true, exportPadding: 20 },
        files: data.files || {}
      }, 'png');
      return blob;
    };
  </script>
</body>
</html>
`;

async function exportExcalidrawToPng(excalidrawJson, outputPath) {
  const data = JSON.parse(excalidrawJson);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Create HTML with excalidraw data embedded
    const html = HTML_TEMPLATE.replace(
      '</body>',
      `<script>
        window.EXCALIDRAW_DATA = ${JSON.stringify(data)};
      </script>
      </body>`
    );

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => window.ExcalidrawLib !== undefined, { timeout: 10000 }).catch(() => {});

    // Use excalidraw's export function via page evaluation
    const pngBuffer = await page.evaluate(async () => {
      // Wait for excalidraw to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { exportToCanvas } = await import('https://unpkg.com/@excalidraw/excalidraw@0.18.0/dist/utils/export.js');

      const canvas = await exportToCanvas({
        elements: window.EXCALIDRAW_DATA.elements,
        appState: { ...window.EXCALIDRAW_DATA.appState, exportBackground: true },
        files: window.EXCALIDRAW_DATA.files || {},
        getDimensions: (width, height) => ({ width: width * 2, height: height * 2, scale: 2 })
      });

      return new Promise(resolve => {
        canvas.toBlob(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      });
    });

    const buffer = Buffer.from(pngBuffer, 'base64');
    writeFileSync(outputPath, buffer);
    console.log(`Exported: ${outputPath}`);

  } finally {
    await browser.close();
  }
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const diagrams = [
    'encryption-architecture.excalidraw',
    'system-architecture.excalidraw'
  ];

  for (const diagram of diagrams) {
    const inputPath = join(DIAGRAMS_DIR, diagram);
    const outputPath = join(OUTPUT_DIR, diagram.replace('.excalidraw', '.png'));

    console.log(`Processing ${diagram}...`);
    const content = readFileSync(inputPath, 'utf-8');
    await exportExcalidrawToPng(content, outputPath);
  }

  console.log('\nDone! PNG files exported to docs/diagrams/');
}

main().catch(console.error);
