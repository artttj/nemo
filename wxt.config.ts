import { defineConfig } from 'wxt'

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Nemo Password Manager',
    description: 'A local-first password manager with passkey authentication',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'clipboardRead'],
    host_permissions: ['<all_urls>'],
  },
})