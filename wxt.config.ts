import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Nemo Password Manager',
    description: 'A local-first password manager with passkey authentication',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'clipboardRead', 'offscreen'],
    host_permissions: ['<all_urls>'],
  },
})
