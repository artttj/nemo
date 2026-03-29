import { defineContentScript } from 'wxt/sandbox'

/**
 * Content script for Nemo Password Manager.
 * Provides inline auto-fill and password generation functionality.
 */

// Generator settings (persisted per session)
const generatorDefaults = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,

  main() {
    console.log('[Nemo] Content script loaded')

    let overlayElement: HTMLElement | null = null
    let nemoButton: HTMLElement | null = null
    let generatorOverlay: HTMLElement | null = null
    let isVisible = false
    let isGeneratorVisible = false
    let currentField: HTMLInputElement | null = null

    async function queryVaultForUrl(url: string) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_ENTRY_BY_URL',
          payload: url
        })
        return response.success ? response.data : null
      } catch {
        return null
      }
    }

    async function getSitePreferences(hostname: string) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_SITE_PREFERENCES',
          payload: hostname
        })
        return response.success ? response.data : null
      } catch {
        return null
      }
    }

    function getHostnameFromUrl(url: string): string {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return ''
      }
    }

    async function getVaultState() {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_VAULT_STATE' })
        return response.success ? response.data : null
      } catch {
        return null
      }
    }

    async function getAllEntries() {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_ENTRIES_FOR_AUTOFILL' })
        return response.success ? response.data : []
      } catch {
        return []
      }
    }

    async function addEntryToVault(entry: { title: string; username?: string; password: string; url: string }) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'ADD_ENTRY',
          payload: entry
        })
        return response.success ? response.data : null
      } catch {
        return null
      }
    }

    function generatePassword(options: {
      length: number
      uppercase: boolean
      lowercase: boolean
      numbers: boolean
      symbols: boolean
    }): string {
      const { length, uppercase, lowercase, numbers, symbols } = options

      let chars = ''
      if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
      if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      if (numbers) chars += '0123456789'
      if (symbols) chars += '!@#$%^&*'

      if (chars.length === 0) return ''

      const limit = 256 - (256 % chars.length)
      let result = ''

      while (result.length < length) {
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        for (let i = 0; i < bytes.length && result.length < length; i++) {
          if (bytes[i] < limit) {
            result += chars.charAt(bytes[i] % chars.length)
          }
        }
      }

      return result
    }

    function createOverlay(entries: any[], onSelect: (entry: any) => void) {
      if (overlayElement) {
        overlayElement.remove()
      }

      if (entries.length === 0) {
        overlayElement = document.createElement('div')
        overlayElement.innerHTML = `
          <div style="
            position: fixed;
            z-index: 2147483647;
            background: white;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 12px;
            padding: 16px;
            min-width: 200px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: #737373;
          ">
            No saved passwords found
          </div>
        `
      } else {
        overlayElement = document.createElement('div')
        overlayElement.innerHTML = `
          <div style="
            position: fixed;
            z-index: 2147483647;
            background: white;
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 12px;
            min-width: 280px;
            max-height: 300px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              padding: 12px 16px;
              background: #FAFAFA;
              border-bottom: 1px solid rgba(0,0,0,0.08);
              font-size: 13px;
              font-weight: 600;
              color: #1A1A1A;
            ">
              Nemo Password Manager
            </div>
            ${entries.map(entry => `
              <div class="nemo-entry-item" style="
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid rgba(0,0,0,0.04);
                transition: background 0.15s;
              ">
                <div style="font-size: 14px; font-weight: 500; color: #1A1A1A; margin-bottom: 2px;">
                  ${escapeHtml(entry.title)}
                </div>
                <div style="font-size: 12px; color: #737373;">
                  ${escapeHtml(entry.username || 'No username')}
                </div>
              </div>
            `).join('')}
          </div>
        `

        const items = overlayElement.querySelectorAll('.nemo-entry-item')
        items.forEach((item, index) => {
          item.addEventListener('mouseenter', () => {
            (item as HTMLElement).style.background = '#F5F5F5'
          })
          item.addEventListener('mouseleave', () => {
            (item as HTMLElement).style.background = 'transparent'
          })
          item.addEventListener('click', () => {
            onSelect(entries[index])
            hideOverlay()
          })
        })
      }

      document.body.appendChild(overlayElement)
      positionOverlay()
      isVisible = true
    }

    function escapeHtml(text: string): string {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    function positionOverlay() {
      if (!overlayElement || !currentField) return

      const rect = currentField.getBoundingClientRect()
      const overlay = overlayElement.querySelector('div') as HTMLElement

      const top = rect.bottom + 8 + window.scrollY
      const left = rect.left + window.scrollX

      overlayElement.style.top = `${top}px`
      overlayElement.style.left = `${left}px`
    }

    function hideOverlay() {
      if (overlayElement) {
        overlayElement.remove()
        overlayElement = null
      }
      isVisible = false
    }

    function hideGeneratorOverlay() {
      if (generatorOverlay) {
        generatorOverlay.remove()
        generatorOverlay = null
      }
      isGeneratorVisible = false
    }

    function createGeneratorOverlay(field: HTMLInputElement) {
      hideGeneratorOverlay()

      const settings = { ...generatorDefaults }
      let currentPassword = ''

      generatorOverlay = document.createElement('div')
      generatorOverlay.innerHTML = `
        <div id="nemo-generator-panel" style="
          position: fixed;
          z-index: 2147483647;
          background: #1A1A1A;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: #E0E0E0;
        ">
          <div style="margin-bottom: 12px; font-weight: 600;">Generate Password</div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #888;">Length: <span id="nemo-gen-length-val">${settings.length}</span></span>
            </div>
            <input type="range" id="nemo-gen-length" min="8" max="64" value="${settings.length}"
              style="width: 100%; accent-color: #00FF88;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-upper" ${settings.uppercase ? 'checked' : ''}>
              <span>ABC</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-lower" ${settings.lowercase ? 'checked' : ''}>
              <span>abc</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-numbers" ${settings.numbers ? 'checked' : ''}>
              <span>123</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-symbols" ${settings.symbols ? 'checked' : ''}>
              <span>!@#</span>
            </label>
          </div>

          <div id="nemo-gen-preview" style="
            background: rgba(0,0,0,0.3);
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 12px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            min-height: 20px;
            text-align: center;
            color: #00FF88;
          ">
            Click generate
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="nemo-gen-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: #333;
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 6px;
              color: #E0E0E0;
              cursor: pointer;
              font-size: 12px;
            ">
              Generate
            </button>
            <button id="nemo-gen-fill" style="
              flex: 1;
              padding: 8px 12px;
              background: #00FF88;
              border: none;
              border-radius: 6px;
              color: #000;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
            " disabled>
              Fill
            </button>
          </div>
        </div>
      `

      document.body.appendChild(generatorOverlay)

      const panel = generatorOverlay.querySelector('#nemo-generator-panel') as HTMLElement
      const rect = field.getBoundingClientRect()
      panel.style.top = `${rect.bottom + 8 + window.scrollY}px`
      panel.style.left = `${rect.left + window.scrollX}px`

      // Event handlers
      const lengthSlider = panel.querySelector('#nemo-gen-length') as HTMLInputElement
      const lengthVal = panel.querySelector('#nemo-gen-length-val') as HTMLSpanElement
      const preview = panel.querySelector('#nemo-gen-preview') as HTMLDivElement
      const genBtn = panel.querySelector('#nemo-gen-btn') as HTMLButtonElement
      const fillBtn = panel.querySelector('#nemo-gen-fill') as HTMLButtonElement

      const updateSettings = () => {
        settings.length = parseInt(lengthSlider.value)
        settings.uppercase = (panel.querySelector('#nemo-gen-upper') as HTMLInputElement).checked
        settings.lowercase = (panel.querySelector('#nemo-gen-lower') as HTMLInputElement).checked
        settings.numbers = (panel.querySelector('#nemo-gen-numbers') as HTMLInputElement).checked
        settings.symbols = (panel.querySelector('#nemo-gen-symbols') as HTMLInputElement).checked
        lengthVal.textContent = String(settings.length)
      }

      const generate = () => {
        updateSettings()
        if (!settings.uppercase && !settings.lowercase && !settings.numbers && !settings.symbols) {
          preview.textContent = 'Select at least one type'
          preview.style.color = '#FF6B6B'
          fillBtn.disabled = true
          return
        }
        currentPassword = generatePassword(settings)
        preview.textContent = currentPassword
        preview.style.color = '#00FF88'
        fillBtn.disabled = false
      }

      const fill = async () => {
        if (!currentPassword) return
        field.value = currentPassword
        field.dispatchEvent(new Event('input', { bubbles: true }))
        field.dispatchEvent(new Event('change', { bubbles: true }))

        // Auto-save to vault
        const hostname = window.location.hostname
        const username = findUsernameOnPage()
        await addEntryToVault({
          title: hostname,
          username: username || undefined,
          password: currentPassword,
          url: window.location.href
        })

        hideGeneratorOverlay()
      }

      // Event listeners
      lengthSlider.addEventListener('input', () => {
        lengthVal.textContent = lengthSlider.value
      })

      panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', updateSettings)
      })

      genBtn.addEventListener('click', generate)
      fillBtn.addEventListener('click', fill)

      // Generate initial password
      generate()
      isGeneratorVisible = true
    }

    function findUsernameOnPage(): string | null {
      const usernameSelectors = [
        'input[type="email"]',
        'input[name*="user" i]',
        'input[name*="email" i]',
        'input[id*="user" i]',
        'input[id*="email" i]'
      ]

      for (const selector of usernameSelectors) {
        const input = document.querySelector(selector) as HTMLInputElement
        if (input?.value) return input.value
      }

      return null
    }

    function fillPasswordFields(username: string, password: string) {
      const passwordInputs = document.querySelectorAll('input[type="password"]')
      const textInputs = document.querySelectorAll('input[type="text"], input[type="email"]')

      // Find username field (usually before password field)
      textInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          const autocomplete = input.getAttribute('autocomplete') || ''
          const name = input.name.toLowerCase()
          const id = input.id.toLowerCase()
          const placeholder = (input.placeholder || '').toLowerCase()

          if (
            autocomplete.includes('username') ||
            autocomplete.includes('email') ||
            name.includes('user') ||
            name.includes('email') ||
            name.includes('login') ||
            id.includes('user') ||
            id.includes('email') ||
            id.includes('login') ||
            placeholder.includes('username') ||
            placeholder.includes('email')
          ) {
            input.value = username
            input.dispatchEvent(new Event('input', { bubbles: true }))
            input.dispatchEvent(new Event('change', { bubbles: true }))
          }
        }
      })

      // Fill all password fields
      passwordInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.value = password
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })
    }

    function createNemoButton(field: HTMLInputElement) {
      if (!field.parentElement || field.dataset.nemoButton) return

      field.dataset.nemoButton = 'true'

      const wrapper = document.createElement('div')
      wrapper.style.cssText = `
        position: relative;
        display: inline-block;
        width: 100%;
      `

      // Main Nemo button (existing)
      const button = document.createElement('button')
      button.type = 'button'
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      `
      button.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 28px;
        background: #C98700;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        padding: 0;
        z-index: 1000;
        transition: all 0.2s;
      `

      // Generator button (new)
      const genButton = document.createElement('button')
      genButton.type = 'button'
      genButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
      `
      genButton.style.cssText = `
        position: absolute;
        right: 40px;
        top: 50%;
        transform: translateY(-50%);
        width: 28px;
        height: 28px;
        background: #333;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #00FF88;
        padding: 0;
        z-index: 1000;
        transition: all 0.2s;
        opacity: 0;
        pointer-events: none;
      `

      // Hover effects
      button.addEventListener('mouseenter', () => {
        button.style.background = '#D99600'
        button.style.transform = 'translateY(-50%) scale(1.05)'
      })

      button.addEventListener('mouseleave', () => {
        button.style.background = '#C98700'
        button.style.transform = 'translateY(-50%) scale(1)'
      })

      genButton.addEventListener('mouseenter', () => {
        genButton.style.background = '#444'
        genButton.style.transform = 'translateY(-50%) scale(1.05)'
      })

      genButton.addEventListener('mouseleave', () => {
        genButton.style.background = '#333'
        genButton.style.transform = 'translateY(-50%) scale(1)'
      })

      // Click handlers
      button.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        currentField = field
        hideGeneratorOverlay()

        const state = await getVaultState()
        if (!state?.isUnlocked) {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
          return
        }

        if (isVisible) {
          hideOverlay()
          return
        }

        const entries = await getAllEntries()
        createOverlay(entries, (entry) => {
          fillPasswordFields(entry.username, entry.password)
        })
      })

      genButton.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        hideOverlay()

        const state = await getVaultState()
        if (!state?.isUnlocked) {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
          return
        }

        if (isGeneratorVisible) {
          hideGeneratorOverlay()
          return
        }

        currentField = field
        createGeneratorOverlay(field)
      })

      const parent = field.parentElement
      parent.insertBefore(wrapper, field)
      wrapper.appendChild(field.cloneNode(true))
      wrapper.appendChild(button)
      wrapper.appendChild(genButton)
      parent.replaceChild(wrapper, field)

      // Re-reference the field in wrapper
      const newField = wrapper.querySelector('input') as HTMLInputElement
      newField.addEventListener('focus', () => {
        currentField = newField
        // Show generator button on focus
        genButton.style.opacity = '1'
        genButton.style.pointerEvents = 'auto'
      })

      newField.addEventListener('blur', () => {
        // Hide generator button on blur (with delay to allow clicking)
        setTimeout(() => {
          if (!genButton.matches(':hover')) {
            genButton.style.opacity = '0'
            genButton.style.pointerEvents = 'none'
          }
        }, 200)
      })

      // Show generator on hover over field
      wrapper.addEventListener('mouseenter', () => {
        genButton.style.opacity = '1'
        genButton.style.pointerEvents = 'auto'
      })

      wrapper.addEventListener('mouseleave', () => {
        const active = document.activeElement
        if (active !== newField && !genButton.matches(':hover') && !button.matches(':hover')) {
          genButton.style.opacity = '0'
          genButton.style.pointerEvents = 'none'
        }
      })
    }

    function detectAndAttachButtons() {
      // Find password fields
      const passwordFields = document.querySelectorAll('input[type="password"]:not([data-nemo-button])')
      
      passwordFields.forEach((field) => {
        if (field instanceof HTMLInputElement) {
          createNemoButton(field)
        }
      })

      // Find username fields near password fields
      const allFields = document.querySelectorAll('input[type="text"], input[type="email"]')
      allFields.forEach((field) => {
        if (field instanceof HTMLInputElement && !field.dataset.nemoButton) {
          const autocomplete = field.getAttribute('autocomplete') || ''
          const name = field.name.toLowerCase()
          const id = field.id.toLowerCase()

          if (
            autocomplete.includes('username') ||
            autocomplete.includes('email') ||
            name.includes('user') ||
            name.includes('email') ||
            name.includes('login') ||
            id.includes('user') ||
            id.includes('email') ||
            id.includes('login')
          ) {
            createNemoButton(field)
          }
        }
      })
    }

    // Initial detection
    setTimeout(detectAndAttachButtons, 1000)

    // Watch for dynamically added fields
    const observer = new MutationObserver(() => {
      detectAndAttachButtons()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Close overlays on click outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('#nemo-autofill-overlay') && !target.closest('#nemo-generator-panel')) {
        hideOverlay()
        hideGeneratorOverlay()
      }
    })

    // Handle focus events for inline suggestions
    document.addEventListener('focusin', async (e) => {
      const target = e.target as HTMLInputElement
      if (target.type === 'password' || target.type === 'text' || target.type === 'email') {
        currentField = target

        // Check if vault is unlocked and we have a match for this URL
        const state = await getVaultState()
        if (state?.isUnlocked && !isVisible) {
          const entry = await queryVaultForUrl(window.location.href)
          if (entry) {
            // Check site preferences
            const hostname = getHostnameFromUrl(window.location.href)
            const prefs = hostname ? await getSitePreferences(hostname) : null

            if (prefs?.autoFillMode === 'never') {
              // User has disabled auto-fill for this site
              return
            }

            if (prefs?.autoFillMode === 'always' && prefs.preferredEntryId === entry.id) {
              // Auto-fill immediately if preferred entry matches
              fillPasswordFields(entry.username, entry.password)
              return
            }

            // Show subtle indicator that credentials are available
            showInlineIndicator(target)
          }
        }
      }
    })
  }
})

function showInlineIndicator(field: HTMLInputElement) {
  // Implementation for inline indicator
}
