/**
 * Test Fixtures for Nemo Extension Tests
 * 
 * These fixtures provide mock data for testing without requiring
 * a real unlocked vault or WebAuthn authentication.
 */

// Sample vault entries for testing autofill
export const testEntries = [
  {
    id: 'test-entry-1',
    title: 'Google Test Account',
    username: 'testuser@gmail.com',
    password: 'TestPassword123!',
    url: 'https://accounts.google.com',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'test-entry-2',
    title: 'GitHub Test',
    username: 'testuser',
    password: 'GitHubPass456!',
    url: 'https://github.com/login',
    favorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'test-entry-3',
    title: 'Example Site',
    username: 'demo@example.com',
    password: 'DemoPass789!',
    url: 'https://example.com/login',
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Mock vault state (unlocked)
export const mockUnlockedVaultState = {
  isUnlocked: true,
  vault: {
    entries: testEntries,
    settings: {
      autoLockMinutes: 15,
      theme: 'dark',
      defaultPasswordLength: 20
    }
  },
  metadata: {
    version: '1.0.0',
    vaultId: 'test-vault-id',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
};

// Mock locked vault state
export const mockLockedVaultState = {
  isUnlocked: false,
  vault: null,
  metadata: null
};

// Site preferences for testing
export const testSitePreferences = {
  'accounts.google.com': {
    autoFillMode: 'always',
    preferredEntryId: 'test-entry-1'
  },
  'github.com': {
    autoFillMode: 'ask',
    preferredEntryId: null
  }
};

// Test URLs to check
export const testUrls = {
  google: 'https://accounts.google.com',
  github: 'https://github.com/login',
  example: 'https://example.com/login',
  facebook: 'https://www.facebook.com/login',
  twitter: 'https://twitter.com/login'
};

// Expected field selectors for different sites
export const siteSelectors = {
  google: {
    email: 'input[type="email"]',
    password: 'input[type="password"]',
    submit: 'button[type="submit"]'
  },
  github: {
    username: 'input[name="login"]',
    password: 'input[name="password"]',
    submit: 'input[type="submit"]'
  }
};
