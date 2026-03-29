

import { defineContentScript } from 'wxt/sandbox'

const generatorDefaults = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true
}

const USERNAME_KEYWORDS = ['user', 'email', 'login']

function isUsernameField(field: HTMLInputElement): boolean {
  if (field.type === 'email') return true
  const autocomplete = field.getAttribute('autocomplete') || ''
  const name = field.name.toLowerCase()
  const id = field.id.toLowerCase()
  const placeholder = (field.placeholder || '').toLowerCase()
  return USERNAME_KEYWORDS.some(k =>
    autocomplete.includes(k) || name.includes(k) || id.includes(k) || placeholder.includes(k)
  )
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,

  main() {
    let overlayElement: HTMLElement | null = null
    let nemoButton: HTMLElement | null = null
    let generatorOverlay: HTMLElement | null = null
    let currentField: HTMLInputElement | null = null
    let positionRafId = 0
    let vaultStateCache: { data: any; timestamp: number } | null = null
    let entryCache: { url: string; data: any; timestamp: number } | null = null
    const CACHE_TTL = 5000

    const colors = {
      darkBg: '#1A1A1A',
      darkerBg: '#0D0D0D',
      hoverBg: '#2A2A2A',
      cardBg: '#333333',
      textPrimary: '#FFFFFF',
      textSecondary: '#737373',
      textMuted: '#525252',
      gold: '#C98700',
      green: '#00FF88',
      border: 'rgba(255,255,255,0.1)',
      borderSubtle: 'rgba(255,255,255,0.05)'
    }

    async function sendBgMessage(type: string, payload?: unknown, fallback: any = null) {
      try {
        const response = await chrome.runtime.sendMessage(
          payload !== undefined ? { type, payload } : { type }
        )
        return response.success ? response.data : fallback
      } catch {
        return fallback
      }
    }

    async function getCachedVaultState() {
      const now = Date.now()
      if (vaultStateCache && (now - vaultStateCache.timestamp) < CACHE_TTL) {
        return vaultStateCache.data
      }
      const state = await sendBgMessage('GET_VAULT_STATE')
      vaultStateCache = { data: state, timestamp: now }
      return state
    }

    async function getCachedEntryByUrl(url: string) {
      const now = Date.now()
      if (entryCache && entryCache.url === url && (now - entryCache.timestamp) < CACHE_TTL) {
        return entryCache.data
      }
      const entry = await sendBgMessage('GET_ENTRY_BY_URL', url)
      entryCache = { url, data: entry, timestamp: now }
      return entry
    }

    function getHostnameFromUrl(url: string): string {
      try {
        return new URL(url).hostname.replace(/^www\./, '')
      } catch {
        return ''
      }
    }

    function simulateInput(field: HTMLInputElement) {
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
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
            position: fixed;
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

      innerContainer.style.position = 'fixed'
      innerContainer.style.top = `${top}px`
      innerContainer.style.right = `${right}px`
    }

    function hideOverlay() {
      if (overlayElement) {
        overlayElement.remove()
        overlayElement = null
      }
    }

    function hideGeneratorOverlay() {
      if (generatorOverlay) {
        generatorOverlay.remove()
        generatorOverlay = null
      }
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
          background: ${colors.darkBg};
          border: 1px solid ${colors.border};
          border-radius: 12px;
          padding: 16px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: ${colors.textPrimary};
        ">
          <div style="margin-bottom: 12px; font-weight: 600;">Generate Password</div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: ${colors.textSecondary};">Length: <span id="nemo-gen-length-val">${settings.length}</span></span>
            </div>
            <input type="range" id="nemo-gen-length" min="8" max="64" value="${settings.length}"
              style="width: 100%; accent-color: ${colors.green};">
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
            color: ${colors.green};
          ">
            Click generate
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="nemo-gen-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: ${colors.cardBg};
              border: 1px solid ${colors.border};
              border-radius: 6px;
              color: ${colors.textPrimary};
              cursor: pointer;
              font-size: 12px;
            ">
              Generate
            </button>
            <button id="nemo-gen-fill" style="
              flex: 1;
              padding: 8px 12px;
              background: ${colors.green};
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
        preview.style.color = colors.green
        fillBtn.disabled = false
      }

      const fill = async () => {
        if (!currentPassword) return
        field.value = currentPassword
        simulateInput(field)

        const username = findUsernameOnPage()
        await sendBgMessage('ADD_ENTRY', {
          title: window.location.hostname,
          username: username || undefined,
          password: currentPassword,
          url: window.location.href
        })

        hideGeneratorOverlay()
      }

      lengthSlider.addEventListener('input', () => {
        lengthVal.textContent = lengthSlider.value
      })

      panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', updateSettings)
      })

      genBtn.addEventListener('click', generate)
      fillBtn.addEventListener('click', fill)

      generate()
    }

    function findUsernameOnPage(): string | null {
      const selectors = [
        'input[type="email"]',
        'input[name*="user" i]',
        'input[name*="email" i]',
        'input[id*="user" i]',
        'input[id*="email" i]'
      ]

      for (const selector of selectors) {
        const input = document.querySelector(selector) as HTMLInputElement
        if (input?.value) return input.value
      }

      return null
    }

    function fillPasswordFields(username: string, password: string, scopeField?: HTMLInputElement) {
      const scope = scopeField?.closest('form') || document

      const textInputs = scope.querySelectorAll('input[type="text"], input[type="email"]')
      textInputs.forEach((input) => {
        if (input instanceof HTMLInputElement && isUsernameField(input)) {
          input.value = username
          simulateInput(input)
        }
      })

      const passwordInputs = scope.querySelectorAll('input[type="password"]')
      passwordInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.value = password
          simulateInput(input)
        }
      })
    }

    function addHoverEffect(el: HTMLElement, normalBg: string, hoverBg: string) {
      el.addEventListener('mouseenter', () => {
        el.style.background = hoverBg
        el.style.transform = 'scale(1.05)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.background = normalBg
        el.style.transform = 'scale(1)'
      })
    }

    function schedulePositionUpdate(fn: () => void) {
      cancelAnimationFrame(positionRafId)
      positionRafId = requestAnimationFrame(fn)
    }

    function createNemoButton(field: HTMLInputElement) {
      if (!field.parentElement || field.dataset.nemoButton) return

      field.dataset.nemoButton = 'true'

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
        background: ${colors.darkBg};
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
        background: ${colors.cardBg};
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${colors.green};
        padding: 0;
        z-index: 2147483646;
        transition: all 0.2s;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      `

      const updatePositions = () => {
        const rect = field.getBoundingClientRect()
        const scrollX = window.scrollX
        const scrollY = window.scrollY

        button.style.left = `${rect.right - 36 + scrollX}px`
        button.style.top = `${rect.top + (rect.height - 28) / 2 + scrollY}px`

        genButton.style.left = `${rect.right - 72 + scrollX}px`
        genButton.style.top = `${rect.top + (rect.height - 28) / 2 + scrollY}px`
      }

      const debouncedUpdate = () => schedulePositionUpdate(updatePositions)

      updatePositions()

      window.addEventListener('scroll', debouncedUpdate, { passive: true })
      window.addEventListener('resize', debouncedUpdate)

      
      document.body.appendChild(button)
      document.body.appendChild(genButton)

      addHoverEffect(button, colors.darkBg, colors.cardBg)
      addHoverEffect(genButton, colors.cardBg, '#444')

      button.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        currentField = field
        hideGeneratorOverlay()

        const state = await sendBgMessage('GET_VAULT_STATE')
        if (!state?.isUnlocked) {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
          return
        }

        if (overlayElement) {
          hideOverlay()
          return
        }

        const entries = await sendBgMessage('GET_ENTRIES_FOR_AUTOFILL', undefined, [])
        createOverlay(entries, (entry) => {
          fillPasswordFields(entry.username, entry.password, field)
        })
      })

      genButton.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        hideOverlay()

        const state = await sendBgMessage('GET_VAULT_STATE')
        if (!state?.isUnlocked) {
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
          return
        }

        if (generatorOverlay) {
          hideGeneratorOverlay()
          return
        }

        currentField = field
        createGeneratorOverlay(field)
      })

      field.addEventListener('focus', () => {
        currentField = field
        debouncedUpdate()
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

      const showButtons = () => {
        debouncedUpdate()
        button.style.opacity = '1'
        button.style.pointerEvents = 'auto'
        genButton.style.opacity = field === document.activeElement ? '1' : '0'
        genButton.style.pointerEvents = field === document.activeElement ? 'auto' : 'none'
      }

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

      const cleanup = () => {
        button.remove()
        genButton.remove()
        fieldObserver.disconnect()
        window.removeEventListener('scroll', debouncedUpdate)
        window.removeEventListener('resize', debouncedUpdate)
      }

      
      const cleanupObserver = new MutationObserver(() => {
        if (!field.isConnected) {
          cleanup()
          cleanupObserver.disconnect()
        }
      })

      cleanupObserver.observe(document.body, { childList: true, subtree: true })

      showButtons()
    }

    let detectTimeout: ReturnType<typeof setTimeout> | null = null

    function detectAndAttachButtons() {
      const passwordFields = document.querySelectorAll('input[type="password"]:not([data-nemo-button])')
      passwordFields.forEach((field) => {
        if (field instanceof HTMLInputElement) {
          createNemoButton(field)
        }
      })

      const allFields = document.querySelectorAll('input[type="text"]:not([data-nemo-button]), input[type="email"]:not([data-nemo-button])')
      allFields.forEach((field) => {
        if (field instanceof HTMLInputElement && isUsernameField(field)) {
          createNemoButton(field)
        }
      })
    }

    setTimeout(detectAndAttachButtons, 1000)

    const observer = new MutationObserver(() => {
      if (detectTimeout) return
      detectTimeout = setTimeout(() => {
        detectTimeout = null
        detectAndAttachButtons()
      }, 200)
    })
    observer.observe(document.body, { childList: true, subtree: true })

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('#nemo-autofill-overlay') && !target.closest('#nemo-generator-panel')) {
        hideOverlay()
        hideGeneratorOverlay()
      }
    })

    document.addEventListener('focusin', async (e) => {
      const target = e.target as HTMLInputElement
      if (target.type === 'password' || target.type === 'text' || target.type === 'email') {
        currentField = target

        const state = await getCachedVaultState()
        if (state?.isUnlocked && !overlayElement) {
          const entry = await getCachedEntryByUrl(window.location.href)
          if (entry) {
            const hostname = getHostnameFromUrl(window.location.href)
            const prefs = hostname ? await sendBgMessage('GET_SITE_PREFERENCES', hostname) : null

            if (prefs?.autoFillMode === 'never') return

            if (prefs?.autoFillMode === 'always' && prefs.preferredEntryId === entry.id) {
              fillPasswordFields(entry.username, entry.password, currentField ?? undefined)
            }
          }
        }
      }
    })

    let quickAddBanner: HTMLElement | null = null

    function isSignupForm(form: HTMLFormElement): boolean {
      const passwordFields = form.querySelectorAll('input[type="password"]')
      if (passwordFields.length === 0) return false

      const hasConfirmPassword = Array.from(passwordFields).some((field) => {
        const input = field as HTMLInputElement
        const autocomplete = input.getAttribute('autocomplete') || ''
        const name = input.name.toLowerCase()
        const id = input.id.toLowerCase()
        return autocomplete === 'new-password' ||
               name.includes('confirm') ||
               name.includes('verify') ||
               id.includes('confirm') ||
               id.includes('verify')
      })

      const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]')
      const hasSignupButton = Array.from(submitButtons).some((btn) => {
        const text = (btn.textContent || btn.getAttribute('value') || '').toLowerCase()
        return text.includes('sign up') ||
               text.includes('signup') ||
               text.includes('create') ||
               text.includes('register') ||
               text.includes('join') ||
               text.includes('get started')
      })

      return hasConfirmPassword || hasSignupButton
    }

    function extractFormCredentials(form: HTMLFormElement): { username?: string; password?: string; title: string } {
      const passwordFields = form.querySelectorAll('input[type="password"]')
      let password = ''
      for (const field of passwordFields) {
        const input = field as HTMLInputElement
        if (!input.value) continue
        if (!password || input.name.toLowerCase().includes('password')) {
          password = input.value
        }
      }

      const username = findUsernameOnPage() || ''

      return {
        username,
        password,
        title: window.location.hostname
      }
    }

    function createQuickAddBanner(credentials: { username?: string; password?: string; title: string }) {
      if (quickAddBanner) {
        quickAddBanner.remove()
      }

      const banner = document.createElement('div')
      banner.id = 'nemo-quick-add-banner'
      banner.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2147483647;
          background: ${colors.darkBg};
          border-bottom: 1px solid ${colors.border};
          padding: 12px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <span style="color: ${colors.textPrimary};">Save this account to Nemo?</span>
          <div style="display: flex; gap: 8px;">
            <button id="nemo-quick-add-yes" style="
              padding: 6px 12px;
              background: ${colors.green};
              border: none;
              border-radius: 6px;
              color: #000;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
            ">Yes</button>
            <button id="nemo-quick-add-no" style="
              padding: 6px 12px;
              background: transparent;
              border: 1px solid ${colors.border};
              border-radius: 6px;
              color: ${colors.textSecondary};
              font-size: 12px;
              cursor: pointer;
            ">No</button>
            <button id="nemo-quick-add-never" style="
              padding: 6px 12px;
              background: transparent;
              border: 1px solid ${colors.borderSubtle};
              border-radius: 6px;
              color: ${colors.textMuted};
              font-size: 12px;
              cursor: pointer;
            ">Never for this site</button>
          </div>
        </div>
      `

      document.body.appendChild(banner)
      quickAddBanner = banner

      const yesBtn = banner.querySelector('#nemo-quick-add-yes') as HTMLButtonElement
      const noBtn = banner.querySelector('#nemo-quick-add-no') as HTMLButtonElement
      const neverBtn = banner.querySelector('#nemo-quick-add-never') as HTMLButtonElement

      yesBtn.addEventListener('click', async () => {
        await sendBgMessage('ADD_ENTRY', {
          title: credentials.title,
          username: credentials.username,
          password: credentials.password,
          url: window.location.href
        })
        banner.remove()
        quickAddBanner = null
      })

      noBtn.addEventListener('click', () => {
        banner.remove()
        quickAddBanner = null
      })

      neverBtn.addEventListener('click', async () => {
        const hostname = getHostnameFromUrl(window.location.href)
        if (hostname) {
          await sendBgMessage('SET_SITE_PREFERENCES', {
            hostname,
            preferences: { autoFillMode: 'ask', quickAddDisabled: true }
          })
        }
        banner.remove()
        quickAddBanner = null
      })

      setTimeout(() => {
        if (quickAddBanner === banner) {
          banner.remove()
          quickAddBanner = null
        }
      }, 10000)
    }

    document.addEventListener('submit', async (e) => {
      const form = e.target as HTMLFormElement
      if (!isSignupForm(form)) return

      const hostname = getHostnameFromUrl(window.location.href)
      if (hostname) {
        const prefs = await sendBgMessage('GET_SITE_PREFERENCES', hostname)
        if (prefs?.quickAddDisabled) return
      }

      const state = await getCachedVaultState()
      if (!state?.isUnlocked) return

      const existingEntry = await getCachedEntryByUrl(window.location.href)
      if (existingEntry) return

      const credentials = extractFormCredentials(form)
      if (!credentials.password) return

      createQuickAddBanner(credentials)
    }, true)
  }
})
