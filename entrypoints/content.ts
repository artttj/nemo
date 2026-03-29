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
    let overlayElement: HTMLElement | null = null
    let nemoButton: HTMLElement | null = null
    let generatorOverlay: HTMLElement | null = null
    let isVisible = false
    let isGeneratorVisible = false
    let currentField: HTMLInputElement | null = null

    const colors = {
      darkBg: '#1A1A1A',
      darkerBg: '#0D0D0D',
      hoverBg: '#2A2A2A',
      cardBg: '#333333',
      textPrimary: '#FFFFFF',
      textSecondary: '#737373',
      textMuted: '#525252',
      gold: '#C98700',
      border: 'rgba(255,255,255,0.1)',
      borderSubtle: 'rgba(255,255,255,0.05)'
    }

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
            z-index: 2147483647;
            background: ${colors.darkBg};
            border: 1px solid ${colors.border};
            border-radius: 12px;
            padding: 16px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: ${colors.textSecondary};
          ">
            No saved passwords found
          </div>
        `
      } else {
        overlayElement = document.createElement('div')
        overlayElement.innerHTML = `
          <div style="
            z-index: 2147483647;
            background: ${colors.darkBg};
            border: 1px solid ${colors.border};
            border-radius: 12px;
            min-width: 320px;
            max-height: 400px;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="
              padding: 16px 20px;
              background: ${colors.darkerBg};
              border-bottom: 1px solid ${colors.border};
              font-size: 14px;
              font-weight: 600;
              color: ${colors.textPrimary};
              display: flex;
              align-items: center;
              justify-content: space-between;
            ">
              <span>Nemo Password Manager</span>
              <span style="font-size: 12px; color: ${colors.textSecondary}; font-weight: 400;">${entries.length} entries</span>
            </div>
            ${entries.map(entry => `
              <div class="nemo-entry-item" style="
                padding: 16px 20px;
                cursor: pointer;
                border-bottom: 1px solid ${colors.borderSubtle};
                transition: background 0.15s;
                display: flex;
                align-items: center;
                gap: 12px;
              ">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: ${entry.favorite ? colors.gold : colors.hoverBg};
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: ${entry.favorite ? colors.textPrimary : colors.textSecondary};
                  font-size: 16px;
                  font-weight: 600;
                  flex-shrink: 0;
                ">
                  ${escapeHtml(entry.title.charAt(0).toUpperCase())}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 15px; font-weight: 500; color: ${colors.textPrimary}; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(entry.title)}
                  </div>
                  <div style="font-size: 13px; color: ${colors.textSecondary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(entry.username || 'No username')}
                  </div>
                  ${entry.url ? `<div style="font-size: 11px; color: ${colors.textMuted}; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(new URL(entry.url).hostname)}</div>` : ''}
                </div>
                <div style="
                  width: 28px;
                  height: 28px;
                  background: ${colors.hoverBg};
                  border-radius: 6px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: ${colors.textSecondary};
                  flex-shrink: 0;
                ">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            `).join('')}
          </div>
        `

        const items = overlayElement.querySelectorAll('.nemo-entry-item')
        items.forEach((item, index) => {
          item.addEventListener('mouseenter', () => {
            (item as HTMLElement).style.background = colors.hoverBg
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

      const innerContainer = overlayElement.querySelector('div') as HTMLElement
      if (!innerContainer) return

      const rect = currentField.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const overlayHeight = 400

      let top = rect.bottom + 8
      let right = viewportWidth - rect.right

      if (top + overlayHeight > viewportHeight) {
        top = rect.top - overlayHeight - 8
      }

      if (right < 16) {
        right = 16
      }

      innerContainer.style.cssText = innerContainer.style.cssText.replace(/position:[^;]+;/, '').replace(/top:[^;]+;/, '').replace(/right:[^;]+;/, '') + `
        position: fixed;
        top: ${top}px;
        right: ${right}px;
      `
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

      // Main Nemo button
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.nemoAction = 'fill'
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      `
      button.style.cssText = `
        position: absolute;
        width: 28px;
        height: 28px;
        background: #1A1A1A;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        padding: 0;
        z-index: 2147483646;
        transition: opacity 0.2s, transform 0.2s;
        margin: 0;
        opacity: 1;
        pointer-events: auto;
      `

      // Generator button
      const genButton = document.createElement('button')
      genButton.type = 'button'
      genButton.dataset.nemoAction = 'generate'
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
        z-index: 2147483646;
        transition: all 0.2s;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      `

      // Position buttons relative to the field
      const updatePositions = () => {
        const rect = field.getBoundingClientRect()
        const scrollX = window.scrollX
        const scrollY = window.scrollY

        // Right edge, vertically centered
        button.style.left = `${rect.right - 36 + scrollX}px`
        button.style.top = `${rect.top + (rect.height - 28) / 2 + scrollY}px`

        // Left of main button
        genButton.style.left = `${rect.right - 72 + scrollX}px`
        genButton.style.top = `${rect.top + (rect.height - 28) / 2 + scrollY}px`
      }

      // Initial position
      updatePositions()

      // Update on scroll and resize
      window.addEventListener('scroll', updatePositions, { passive: true })
      window.addEventListener('resize', updatePositions)

      // Update when field moves (for SPAs with animations)
      const positionObserver = new MutationObserver(updatePositions)
      positionObserver.observe(document.body, { attributes: true, childList: true, subtree: true })

      // Add to document body (not field parent) to avoid layout issues
      document.body.appendChild(button)
      document.body.appendChild(genButton)

      // Hover effects
      button.addEventListener('mouseenter', () => {
        button.style.background = '#333333'
        button.style.transform = 'scale(1.05)'
      })

      button.addEventListener('mouseleave', () => {
        button.style.background = '#1A1A1A'
        button.style.transform = 'scale(1)'
      })

      genButton.addEventListener('mouseenter', () => {
        genButton.style.background = '#444'
        genButton.style.transform = 'scale(1.05)'
      })

      genButton.addEventListener('mouseleave', () => {
        genButton.style.background = '#333'
        genButton.style.transform = 'scale(1)'
      })

      // Click handlers - don't prevent default on the field itself
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

      // Show/hide generator button on field focus
      field.addEventListener('focus', () => {
        currentField = field
        updatePositions()
        genButton.style.opacity = '1'
        genButton.style.pointerEvents = 'auto'
      })

      field.addEventListener('blur', () => {
        setTimeout(() => {
          if (!genButton.matches(':hover') && !button.matches(':hover')) {
            genButton.style.opacity = '0'
            genButton.style.pointerEvents = 'none'
          }
        }, 200)
      })

      // Show buttons when hovering near the field
      const showButtons = () => {
        updatePositions()
        button.style.opacity = '1'
        button.style.pointerEvents = 'auto'
        genButton.style.opacity = field === document.activeElement ? '1' : '0'
        genButton.style.pointerEvents = field === document.activeElement ? 'auto' : 'none'
      }

      const hideButtons = () => {
        setTimeout(() => {
          if (!genButton.matches(':hover') && !button.matches(':hover') && field !== document.activeElement) {
            button.style.opacity = '0'
            button.style.pointerEvents = 'none'
            genButton.style.opacity = '0'
            genButton.style.pointerEvents = 'none'
          }
        }, 200)
      }

      // Track field visibility and position
      const fieldObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              showButtons()
            } else {
              button.style.opacity = '0'
              genButton.style.opacity = '0'
            }
          })
        },
        { threshold: 0.5 }
      )

      fieldObserver.observe(field)

      // Cleanup on field removal
      const cleanupObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((node) => {
            if (node === field || (node instanceof Element && node.contains(field))) {
              button.remove()
              genButton.remove()
              cleanupObserver.disconnect()
              positionObserver.disconnect()
              fieldObserver.disconnect()
              window.removeEventListener('scroll', updatePositions)
              window.removeEventListener('resize', updatePositions)
            }
          })
        })
      })

      if (field.parentElement) {
        cleanupObserver.observe(field.parentElement, { childList: true })
      }

      // Initially show
      showButtons()
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
