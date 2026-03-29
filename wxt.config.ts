import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Nemo Password Manager',
    description: 'A local-first password manager with passkey authentication. Optional sync for cross-device access.',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'clipboardRead', 'offscreen', 'alarms'],
    
    
    host_permissions: ['<all_urls>'],
    commands: {
      '_execute_action': {
        suggested_key: {
          default: 'Ctrl+Shift+P',
          mac: 'Command+Shift+P'
        },
        description: 'Open Nemo Password Manager'
      },
      'lock_vault': {
        suggested_key: {
          default: 'Ctrl+Shift+L',
          mac: 'Command+Shift+L'
        },
        description: 'Lock the vault'
      }
    }
  },
})
