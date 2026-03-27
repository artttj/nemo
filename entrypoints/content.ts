import { defineContentScript } from 'wxt/sandbox'

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,

  main() {
    console.log('[Nemo] Content script loaded')
    
    let overlayElement: HTMLElement | null = null
    let nemoButton: HTMLElement | null = null
    let isVisible = false
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

      button.addEventListener('mouseenter', () => {
        button.style.background = '#D99600'
        button.style.transform = 'translateY(-50%) scale(1.05)'
      })

      button.addEventListener('mouseleave', () => {
        button.style.background = '#C98700'
        button.style.transform = 'translateY(-50%) scale(1)'
      })

      button.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()

        currentField = field

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

      const parent = field.parentElement
      parent.insertBefore(wrapper, field)
      wrapper.appendChild(field.cloneNode(true))
      wrapper.appendChild(button)
      parent.replaceChild(wrapper, field)

      // Re-reference the field in wrapper
      const newField = wrapper.querySelector('input') as HTMLInputElement
      newField.addEventListener('focus', () => {
        currentField = newField
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

    // Close overlay on click outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('#nemo-autofill-overlay')) {
        hideOverlay()
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
