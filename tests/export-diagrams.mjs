/**
 * Export Excalidraw diagrams to PNG using Puppeteer
 * Run: cd tests && node export-diagrams.mjs
 */

import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();

    // Calculate bounds from all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of data.elements) {
      if (el.isDeleted) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }

    const padding = 50;
    const width = Math.ceil(maxX - minX + padding * 2);
    const height = Math.ceil(maxY - minY + padding * 2);
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    await page.setViewport({ width: width + 100, height: height + 100, deviceScaleFactor: 2 });

    // Render elements directly with canvas
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
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const data = ${JSON.stringify(data)};
    const offsetX = ${offsetX};
    const offsetY = ${offsetY};

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Calculate total bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of data.elements) {
      if (el.isDeleted) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }

    const padding = 50;
    canvas.width = (Math.ceil(maxX - minX + padding * 2)) * 2;
    canvas.height = (Math.ceil(maxY - minY + padding * 2)) * 2;

    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);

    // Draw elements
    for (const el of data.elements) {
      if (el.isDeleted) continue;

      const x = el.x + offsetX;
      const y = el.y + offsetY;

      ctx.strokeStyle = el.strokeColor || '#1e1e1e';
      ctx.fillStyle = el.backgroundColor !== 'transparent' ? el.backgroundColor : '#ffffff';
      ctx.lineWidth = el.strokeWidth || 2;

      if (el.type === 'rectangle') {
        ctx.beginPath();
        ctx.roundRect(x, y, el.width, el.height, 10);
        ctx.fill();
        ctx.stroke();
      } else if (el.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(x + el.width/2, y + el.height/2, el.width/2, el.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (el.type === 'text') {
        const fontSize = el.fontSize || 16;
        ctx.font = \`\${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif\`;
        ctx.fillStyle = el.strokeColor || '#1e1e1e';
        ctx.textAlign = el.textAlign || 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(el.text, x, y);
      } else if (el.type === 'arrow') {
        ctx.beginPath();
        const points = el.points || [[0, 0], [el.width || 0, el.height || 0]];
        for (let i = 0; i < points.length; i++) {
          const px = x + points[i][0];
          const py = y + points[i][1];
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Draw arrowhead
        if (points.length >= 2) {
          const last = points[points.length - 1];
          const second = points[points.length - 2];
          const angle = Math.atan2(last[1] - second[1], last[0] - second[0]);
          const arrowSize = 10;
          ctx.beginPath();
          ctx.moveTo(x + last[0], y + last[1]);
          ctx.lineTo(x + last[0] - arrowSize * Math.cos(angle - Math.PI / 6), y + last[1] - arrowSize * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(x + last[0], y + last[1]);
          ctx.lineTo(x + last[0] - arrowSize * Math.cos(angle + Math.PI / 6), y + last[1] - arrowSize * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
    }

    setTimeout(() => window.__READY__ = true, 500);
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__READY__, { timeout: 10000 });
    await delay(500);

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

  console.log('\nDone! PNG files exported to docs/diagrams/');
}

main().catch(console.error);
