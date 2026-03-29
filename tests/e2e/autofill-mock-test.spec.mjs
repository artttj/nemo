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

const LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Login Page</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 400px; 
      margin: 50px auto; 
      padding: 20px;
    }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input { 
      width: 100%; 
      padding: 8px; 
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>Test Login Page</h1>
  <form id="login-form">
    <div class="form-group">
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" placeholder="Enter your email" autocomplete="username">
    </div>
    <div class="form-group">
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password">
    </div>
    <button type="submit">Sign In</button>
  </form>
</body>
</html>
`;

async function runTest() {
  console.log('🔐 Testing Nemo autofill with local page\n');
  
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
    
    console.log('2. Creating test login page...');
    const page = await context.newPage();
    await page.setContent(LOGIN_PAGE_HTML);
    await delay(2000);
    console.log('   ✓ Test page created\n');
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'mock-01-initial.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: mock-01-initial.png\n');
    
    console.log('3. Testing email field focus...');
    const emailInput = page.locator('#email');
    await emailInput.click();
    await delay(2000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'mock-02-email-focused.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: mock-02-email-focused.png\n');
    
    console.log('4. Testing password field focus...');
    const passwordInput = page.locator('#password');
    await passwordInput.click();
    await delay(2000);
    
    await page.screenshot({
      path: join(SCREENSHOT_DIR, 'mock-03-password-focused.png'),
      fullPage: true
    });
    console.log('   ✓ Screenshot saved: mock-03-password-focused.png\n');
    
    const check = await page.evaluate(() => {
      const nemoElements = document.querySelectorAll('[data-nemo], [class*="nemo"], [id*="nemo"]');
      return { nemoElementsFound: nemoElements.length };
    });
    
    console.log('   Extension elements found:', check.nemoElementsFound);
    
    console.log('\n✅ Test complete!');
    console.log('   Check screenshots in tests/screenshots/');
    
    await delay(15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (context) await context.close();
    if (browser) {
      console.log('\n🔒 Closing browser...');
      await browser.close();
    }
  }
}

runTest();
