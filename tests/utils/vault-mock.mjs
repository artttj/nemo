import { testEntries, mockUnlockedVaultState } from '../fixtures/test-data.mjs';

/**
 * Vault Mock for Testing
 * 
 * This module provides mocked vault operations for testing
 * without requiring real WebAuthn authentication.
 */

export class MockVaultManager {
  constructor() {
    this.state = { ...mockUnlockedVaultState };
    this.listeners = [];
  }

  /**
   * Get current vault state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Check if vault is unlocked
   */
  isUnlocked() {
    return this.state.isUnlocked;
  }

  /**
   * Get all entries
   */
  getEntries() {
    return this.state.vault?.entries || [];
  }

  /**
   * Get entries by URL
   */
  getEntriesByUrl(url) {
    if (!this.state.vault?.entries) return [];
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      
      return this.state.vault.entries.filter(entry => {
        if (!entry.url) return false;
        try {
          const entryUrl = new URL(entry.url);
          const entryHostname = entryUrl.hostname.replace(/^www\./, '');
          return hostname === entryHostname || hostname.endsWith('.' + entryHostname);
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  /**
   * Get entry by ID
   */
  getEntry(id) {
    return this.state.vault?.entries.find(e => e.id === id);
  }

  /**
   * Add new entry
   */
  addEntry(entry) {
    if (!this.state.vault) {
      throw new Error('Vault is locked');
    }
    
    const newEntry = {
      ...entry,
      id: `mock-entry-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.state.vault.entries.push(newEntry);
    this.state.vault.updatedAt = Date.now();
    this._notifyListeners();
    
    return newEntry;
  }

  /**
   * Update entry
   */
  updateEntry(id, updates) {
    if (!this.state.vault) {
      throw new Error('Vault is locked');
    }
    
    const entry = this.state.vault.entries.find(e => e.id === id);
    if (!entry) {
      throw new Error(`Entry ${id} not found`);
    }
    
    Object.assign(entry, updates, { updatedAt: Date.now() });
    this.state.vault.updatedAt = Date.now();
    this._notifyListeners();
    
    return entry;
  }

  /**
   * Delete entry
   */
  deleteEntry(id) {
    if (!this.state.vault) {
      throw new Error('Vault is locked');
    }
    
    const index = this.state.vault.entries.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Entry ${id} not found`);
    }
    
    this.state.vault.entries.splice(index, 1);
    this.state.vault.updatedAt = Date.now();
    this._notifyListeners();
  }

  /**
   * Lock vault
   */
  lock() {
    this.state.isUnlocked = false;
    this.state.vault = null;
    this._notifyListeners();
  }

  /**
   * Unlock vault (mock - no real auth)
   */
  unlock() {
    this.state = { ...mockUnlockedVaultState };
    this._notifyListeners();
    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners() {
    this.listeners.forEach(cb => cb(this.getState()));
  }
}

/**
 * Create a mock chrome.runtime.sendMessage handler
 * This intercepts extension messages and returns mock data
 */
export function createMockMessageHandler(vaultManager) {
  return async (message) => {
    const { type, payload } = message;
    
    switch (type) {
      case 'GET_VAULT_STATE':
        return {
          success: true,
          data: vaultManager.getState()
        };
        
      case 'GET_ENTRIES_FOR_AUTOFILL':
        if (!vaultManager.isUnlocked()) {
          return { success: false, error: 'Vault is locked' };
        }
        return {
          success: true,
          data: vaultManager.getEntries()
        };
        
      case 'GET_ENTRY_BY_URL':
        if (!vaultManager.isUnlocked()) {
          return { success: false, error: 'Vault is locked' };
        }
        const entries = vaultManager.getEntriesByUrl(payload);
        return {
          success: true,
          data: entries[0] || null
        };
        
      case 'ADD_ENTRY':
        try {
          const entry = vaultManager.addEntry(payload);
          return { success: true, data: entry };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      case 'UPDATE_ENTRY':
        try {
          const entry = vaultManager.updateEntry(payload.id, payload.updates);
          return { success: true, data: entry };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      case 'DELETE_ENTRY':
        try {
          vaultManager.deleteEntry(payload);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
        
      case 'LOCK_VAULT':
        vaultManager.lock();
        return { success: true };
        
      case 'UNLOCK_VAULT':
        vaultManager.unlock();
        return { success: true, data: vaultManager.getState() };
        
      default:
        return { success: false, error: `Unknown message type: ${type}` };
    }
  };
}

/**
 * Inject mock vault into page context
 * This allows testing the extension's content script behavior
 */
export async function injectMockVault(page, vaultManager) {
  const mockHandler = createMockMessageHandler(vaultManager);
  
  await page.evaluateOnNewDocument((mockState) => {
    // Override chrome.runtime.sendMessage
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const originalSendMessage = chrome.runtime.sendMessage;
      
      chrome.runtime.sendMessage = async (message) => {
        // Intercept vault-related messages
        if (message.type && message.type.includes('VAULT')) {
          console.log('[Mock] Intercepted:', message.type);
          
          // Return mock responses based on message type
          switch (message.type) {
            case 'GET_VAULT_STATE':
              return { success: true, data: JSON.parse(mockState) };
            case 'GET_ENTRIES_FOR_AUTOFILL':
              return { success: true, data: JSON.parse(mockState).vault?.entries || [] };
            default:
              return { success: false, error: 'Not mocked' };
          }
        }
        
        // Pass through other messages
        return originalSendMessage?.call(chrome.runtime, message);
      };
    }
  }, JSON.stringify(vaultManager.getState()));
}
