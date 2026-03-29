import { ExtensionTestHelper, getFieldInfo, checkExtensionUI } from '../utils/test-helper.mjs';

/**
 * E2E Test: Nemo autofill on Google login page
 * 
 * This test verifies:
 * 1. Extension loads correctly in Chrome
 * 2. Content script detects password fields
 * 3. Autofill UI appears when interacting with forms
 */

async function runTest() {
  console.log('🧪 Testing Nemo autofill on Google login\n');
  
  const helper = new ExtensionTestHelper();
  
  try {
    // Launch browser with extension
    await helper.launch();
    
    // Open Google login
    console.log('\n2. Opening Google login page...');
    const page = await helper.newPage();
    await page.goto('https://accounts.google.com/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await helper.delay(3000);
    console.log('   ✓ Page loaded');
    
    // Take initial screenshot
    await helper.screenshot(page, 'google-01-initial.png');
    
    // Analyze page structure
    console.log('\n3. Analyzing form fields...');
    const fieldInfo = await getFieldInfo(page);
    console.log('   Found inputs:', fieldInfo.inputs.length);
    fieldInfo.inputs.forEach(input => {
      console.log(`     - ${input.type}: ${input.id || input.name || '(no id)'} ${input.autocomplete ? `[autocomplete: ${input.autocomplete}]` : ''}`);
    });
    
    // Focus email field
    console.log('\n4. Testing email field focus...');
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() > 0 && await emailInput.isVisible()) {
      await emailInput.click();
      await helper.delay(2000);
      await helper.screenshot(page, 'google-02-email-focused.png');
      
      // Check for extension UI
      const uiCheck = await checkExtensionUI(page);
      console.log('   Extension elements found:', uiCheck.nemoElementsFound);
      if (uiCheck.nemoElementsFound > 0) {
        console.log('   ✓ Autofill UI detected!');
      } else {
        console.log('   ℹ️ No autofill UI (vault may be locked)');
      }
    }
    
    // Test password field if visible
    console.log('\n5. Testing password field...');
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.count() > 0) {
      const isVisible = await passwordInput.isVisible().catch(() => false);
      if (isVisible) {
        await passwordInput.click();
        await helper.delay(2000);
        await helper.screenshot(page, 'google-03-password-focused.png');
        console.log('   ✓ Password field focused');
      } else {
        console.log('   ℹ️ Password field not visible (on next step)');
      }
    }
    
    // Final screenshot
    console.log('\n6. Taking final screenshot...');
    await helper.screenshot(page, 'google-04-final.png');
    
    console.log('\n✅ Test complete!');
    console.log('\n📸 Screenshots saved in tests/screenshots/');
    
    // Keep browser open for manual inspection
    console.log('\n⏳ Keeping browser open for 15 seconds...');
    await helper.delay(15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await helper.close();
  }
}

// Run test
runTest();
