// Debug script to check content script status
// Run this in browser console on accounts.google.com

(function debugNemo() {
  console.log('=== Nemo Debug Info ===');
  
  // Check if content script loaded
  const passwordFields = document.querySelectorAll('input[type="password"]');
  console.log('Password fields found:', passwordFields.length);
  
  passwordFields.forEach((field, i) => {
    console.log(`Field ${i}:`, {
      id: field.id,
      name: field.name,
      type: field.type,
      visible: field.offsetParent !== null,
      hasNemoButton: field.dataset.nemoButton === 'true',
      rect: field.getBoundingClientRect()
    });
  });
  
  // Check for Nemo buttons
  const nemoButtons = document.querySelectorAll('[data-nemo-action]');
  console.log('Nemo buttons found:', nemoButtons.length);
  
  nemoButtons.forEach((btn, i) => {
    console.log(`Button ${i}:`, {
      action: btn.dataset.nemoAction,
      visible: btn.style.opacity !== '0',
      position: {
        left: btn.style.left,
        top: btn.style.top
      },
      rect: btn.getBoundingClientRect()
    });
  });
  
  // Check for Nemo overlay
  const overlay = document.getElementById('nemo-autofill-overlay');
  console.log('Nemo overlay:', overlay ? 'Found' : 'Not found');
  
  // Check chrome.runtime connection
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('chrome.runtime available');
    
    // Try to get vault state
    chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' }, (response) => {
      console.log('Vault state:', response);
    });
  } else {
    console.log('chrome.runtime NOT available');
  }
  
  console.log('=== End Debug ===');
})();
