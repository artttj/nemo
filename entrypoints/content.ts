export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,

  main() {
    let overlayElement: HTMLElement | null = null
    let isVisible = false

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

    function createOverlay(entry: {
      id: string
      title: string
      username: string
      password: string
      url?: string
    }) {
      if (overlayElement) {
        overlayElement.remove()
      }

      overlayElement = document.createElement('div')
      overlayElement.id = 'nemo-autofill-overlay'
      overlayElement.innerHTML = `
        <div style="
          position: fixed;
          z-index: 2147483647;
          background: #1a1a2e;
          border: 1px solid #4f46e5;
          border-radius: 8px;
          padding: 8px;
          min-width: 200px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            cursor: pointer;
            border-radius: 6px;
            transition: background 0.15s;
          " onmouseover="this.style.background='#2d2d44'" onmouseout="this.style.background='transparent'">
            <div style="
              width: 32px;
              height: 32px;
              background: #4f46e5;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 500; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.title}
              </div>
              <div style="font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.username}
              </div>
            </div>
          </div>
        </div>
      `

      overlayElement.addEventListener('click', () => {
        fillPasswordFields(entry.username, entry.password)
        hideOverlay()
      })

      document.body.appendChild(overlayElement)
      positionOverlay()
    }

    function positionOverlay() {
      if (!overlayElement) return

      const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement
      if (!passwordField) return

      const rect = passwordField.getBoundingClientRect()
      const overlay = overlayElement.querySelector('div') as HTMLElement

      if (rect.bottom + overlay.offsetHeight > window.innerHeight) {
        overlayElement.style.top = `${window.scrollY + rect.top - overlay.offsetHeight - 8}px`
      } else {
        overlayElement.style.top = `${window.scrollY + rect.bottom + 8}px`
      }

      overlayElement.style.left = `${window.scrollX + Math.max(8, Math.min(rect.left, window.innerWidth - overlayElement.offsetWidth - 8))}px`
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
      const usernameInputs = document.querySelectorAll(
        'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="email"], input[type="text"][id*="user"], input[type="text"][id*="email"], input[type="text"][autocomplete*="user"], input[type="text"][autocomplete*="email"]'
      )

      usernameInputs.forEach((input) => {
        if (input instanceof HTMLInputElement && !input.value) {
          input.value = username
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })

      passwordInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.value = password
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('change', { bubbles: true }))
        }
      })
    }

    function setupPasswordFieldDetection() {
      const checkForPasswordFields = () => {
        const passwordFields = document.querySelectorAll('input[type="password"]')

        passwordFields.forEach((field) => {
          if (!(field instanceof HTMLInputElement)) return

          if (!field.dataset.nemoDetected) {
            field.dataset.nemoDetected = 'true'

            const nemoButton = document.createElement('button')
            nemoButton.type = 'button'
            nemoButton.className = 'nemo-autofill-btn'
            nemoButton.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            `
            nemoButton.style.cssText = `
              position: absolute;
              right: 8px;
              top: 50%;
              transform: translateY(-50%);
              width: 24px;
              height: 24px;
              background: #4f46e5;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              padding: 0;
              z-index: 1000;
            `

            nemoButton.addEventListener('click', async (e) => {
              e.preventDefault()
              e.stopPropagation()

              const state = await getVaultState()
              if (!state?.isUnlocked) {
                chrome.runtime.sendMessage({ type: 'OPEN_POPUP' })
                return
              }

              const entry = await queryVaultForUrl(window.location.href)
              if (entry) {
                fillPasswordFields(entry.username, entry.password)
              }
            })

            const wrapper = document.createElement('div')
            wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;'

            field.parentNode?.insertBefore(wrapper, field)
            wrapper.appendChild(field.cloneNode(true))
            wrapper.appendChild(nemoButton)
            field.parentNode?.replaceChild(wrapper, field)
          }
        })
      }

      setTimeout(() => checkForPasswordFields(), 1000)

      document.addEventListener('focusin', async (e) => {
        if ((e.target as HTMLInputElement)?.type === 'password') {
          const state = await getVaultState()
          if (state?.isUnlocked) {
            const entry = await queryVaultForUrl(window.location.href)
            if (entry && !isVisible) {
              createOverlay(entry)
            }
          }
        }
      })

      document.addEventListener('focusout', (e) => {
        if ((e.target as HTMLInputElement)?.type === 'password') {
          setTimeout(() => {
            if (!document.querySelector('#nemo-autofill-overlay:hover')) {
              hideOverlay()
            }
          }, 150)
        }
      })

      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (!target.closest('#nemo-autofill-overlay') && !target.closest('.nemo-autofill-btn')) {
          hideOverlay()
        }
      })
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupPasswordFieldDetection)
    } else {
      setupPasswordFieldDetection()
    }
  }
})