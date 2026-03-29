var content=(function(){var e=Object.create,t=Object.defineProperty,n=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,a=Object.prototype.hasOwnProperty,o=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports),s=(e,i,o,s)=>{if(i&&typeof i==`object`||typeof i==`function`)for(var c=r(i),l=0,u=c.length,d;l<u;l++)d=c[l],!a.call(e,d)&&d!==o&&t(e,d,{get:(e=>i[e]).bind(null,d),enumerable:!(s=n(i,d))||s.enumerable});return e},c=(n,r,a)=>(a=n==null?{}:e(i(n)),s(r||!n||!n.__esModule?t(a,`default`,{value:n,enumerable:!0}):a,n));function l(e){return e}var u=class{constructor(e){if(e===`<all_urls>`)this.isAllUrls=!0,this.protocolMatches=[...u.PROTOCOLS],this.hostnameMatch=`*`,this.pathnameMatch=`*`;else{let t=/(.*):\/\/(.*?)(\/.*)/.exec(e);if(t==null)throw new f(e,`Incorrect format`);let[n,r,i,a]=t;p(e,r),m(e,i),this.protocolMatches=r===`*`?[`http`,`https`]:[r],this.hostnameMatch=i,this.pathnameMatch=a}}includes(e){if(this.isAllUrls)return!0;let t=typeof e==`string`?new URL(e):e instanceof Location?new URL(e.href):e;return!!this.protocolMatches.find(e=>{if(e===`http`)return this.isHttpMatch(t);if(e===`https`)return this.isHttpsMatch(t);if(e===`file`)return this.isFileMatch(t);if(e===`ftp`)return this.isFtpMatch(t);if(e===`urn`)return this.isUrnMatch(t)})}isHttpMatch(e){return e.protocol===`http:`&&this.isHostPathMatch(e)}isHttpsMatch(e){return e.protocol===`https:`&&this.isHostPathMatch(e)}isHostPathMatch(e){if(!this.hostnameMatch||!this.pathnameMatch)return!1;let t=[this.convertPatternToRegex(this.hostnameMatch),this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./,``))],n=this.convertPatternToRegex(this.pathnameMatch);return!!t.find(t=>t.test(e.hostname))&&n.test(e.pathname)}isFileMatch(e){throw Error(`Not implemented: file:// pattern matching. Open a PR to add support`)}isFtpMatch(e){throw Error(`Not implemented: ftp:// pattern matching. Open a PR to add support`)}isUrnMatch(e){throw Error(`Not implemented: urn:// pattern matching. Open a PR to add support`)}convertPatternToRegex(e){let t=this.escapeForRegex(e).replace(/\\\*/g,`.*`);return RegExp(`^${t}$`)}escapeForRegex(e){return e.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`)}},d=u;d.PROTOCOLS=[`http`,`https`,`file`,`ftp`,`urn`];var f=class extends Error{constructor(e,t){super(`Invalid match pattern "${e}": ${t}`)}};function p(e,t){if(!d.PROTOCOLS.includes(t)&&t!==`*`)throw new f(e,`${t} not a valid protocol (${d.PROTOCOLS.join(`, `)})`)}function m(e,t){if(t.includes(`:`))throw new f(e,`Hostname cannot include a port`);if(t.includes(`*`)&&t.length>1&&!t.startsWith(`*.`))throw new f(e,`If using a wildcard (*), it must go at the start of the hostname`)}var h={length:20,uppercase:!0,lowercase:!0,numbers:!0,symbols:!0},g=[`user`,`email`,`login`];function _(e){if(e.type===`email`)return!0;let t=e.getAttribute(`autocomplete`)||``,n=e.name.toLowerCase(),r=e.id.toLowerCase(),i=(e.placeholder||``).toLowerCase();return g.some(e=>t.includes(e)||n.includes(e)||r.includes(e)||i.includes(e))}var v=l({matches:[`<all_urls>`],allFrames:!0,main(){let e=null,t=null,n=null,r=0,i=null,a=null,o=5e3,s={darkBg:`#1A1A1A`,darkerBg:`#0D0D0D`,hoverBg:`#2A2A2A`,cardBg:`#333333`,textPrimary:`#FFFFFF`,textSecondary:`#737373`,textMuted:`#525252`,gold:`#C98700`,green:`#00FF88`,border:`rgba(255,255,255,0.1)`,borderSubtle:`rgba(255,255,255,0.05)`};async function c(e,t,n=null){try{let r=await chrome.runtime.sendMessage(t===void 0?{type:e}:{type:e,payload:t});return r.success?r.data:n}catch{return n}}async function l(){let e=Date.now();if(i&&e-i.timestamp<o)return i.data;let t=await c(`GET_VAULT_STATE`);return i={data:t,timestamp:e},t}async function u(e){let t=Date.now();if(a&&a.url===e&&t-a.timestamp<o)return a.data;let n=await c(`GET_ENTRY_BY_URL`,e);return a={url:e,data:n,timestamp:t},n}function d(e){try{return new URL(e).hostname.replace(/^www\./,``)}catch{return``}}function f(e){e.dispatchEvent(new Event(`input`,{bubbles:!0})),e.dispatchEvent(new Event(`change`,{bubbles:!0}))}function p(e){let{length:t,uppercase:n,lowercase:r,numbers:i,symbols:a}=e,o=``;if(r&&(o+=`abcdefghijklmnopqrstuvwxyz`),n&&(o+=`ABCDEFGHIJKLMNOPQRSTUVWXYZ`),i&&(o+=`0123456789`),a&&(o+=`!@#$%^&*`),o.length===0)return``;let s=256-256%o.length,c=``;for(;c.length<t;){let e=new Uint8Array(32);crypto.getRandomValues(e);for(let n=0;n<e.length&&c.length<t;n++)e[n]<s&&(c+=o.charAt(e[n]%o.length))}return c}function m(t,n){if(e&&e.remove(),t.length===0)e=document.createElement(`div`),e.innerHTML=`
          <div style="
            position: fixed;
            z-index: 2147483647;
            background: ${s.darkBg};
            border: 1px solid ${s.border};
            border-radius: 12px;
            padding: 16px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: ${s.textSecondary};
          ">
            No saved passwords found
          </div>
        `;else{e=document.createElement(`div`);let r=document.createElement(`div`);r.style.cssText=`
          position: fixed;
          z-index: 2147483647;
          background: ${s.darkBg};
          border: 1px solid ${s.border};
          border-radius: 12px;
          min-width: 320px;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;let i=document.createElement(`div`);i.style.cssText=`
          padding: 16px 20px;
          background: ${s.darkerBg};
          border-bottom: 1px solid ${s.border};
          font-size: 14px;
          font-weight: 600;
          color: ${s.textPrimary};
          display: flex;
          align-items: center;
          justify-content: space-between;
        `;let a=document.createElement(`span`);a.textContent=`Nemo Password Manager`;let o=document.createElement(`span`);o.style.cssText=`font-size: 12px; color: #737373; font-weight: 400;`,o.textContent=`${t.length} entries`,i.appendChild(a),i.appendChild(o),r.appendChild(i),t.forEach(e=>{let t=document.createElement(`div`);t.className=`nemo-entry-item`,t.style.cssText=`
            padding: 16px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: background 0.15s;
            display: flex;
            align-items: center;
            gap: 12px;
          `;let i=document.createElement(`div`);i.style.cssText=`
            width: 40px;
            height: 40px;
            background: ${e.favorite?s.gold:s.hoverBg};
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${e.favorite?s.textPrimary:s.textSecondary};
            font-size: 16px;
            font-weight: 600;
            flex-shrink: 0;
          `,i.textContent=e.title.charAt(0).toUpperCase(),t.appendChild(i);let a=document.createElement(`div`);a.style.cssText=`flex: 1; min-width: 0;`;let o=document.createElement(`div`);o.style.cssText=`font-size: 15px; font-weight: 500; color: #FFFFFF; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,o.textContent=e.title,a.appendChild(o);let c=document.createElement(`div`);if(c.style.cssText=`font-size: 13px; color: #737373; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,c.textContent=e.username||`No username`,a.appendChild(c),e.url){let t=``;try{t=new URL(e.url).hostname}catch{t=e.url}let n=document.createElement(`div`);n.style.cssText=`font-size: 11px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`,n.textContent=t,a.appendChild(n)}t.appendChild(a);let l=document.createElement(`div`);l.style.cssText=`
            width: 28px;
            height: 28px;
            background: ${s.hoverBg};
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${s.textSecondary};
            flex-shrink: 0;
          `,l.innerHTML=`
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          `,t.appendChild(l),t.addEventListener(`mouseenter`,()=>{t.style.background=s.hoverBg}),t.addEventListener(`mouseleave`,()=>{t.style.background=`transparent`}),t.addEventListener(`click`,()=>{n(e),v()}),r.appendChild(t)}),e.appendChild(r)}document.body.appendChild(e),g()}function g(){if(!e||!n)return;let t=e.querySelector(`div`);if(!t)return;let r=n.getBoundingClientRect(),i=window.innerHeight,a=window.innerWidth,o=r.bottom+8,s=a-r.right;o+400>i&&(o=r.top-400-8),s<16&&(s=16),t.style.position=`fixed`,t.style.top=`${o}px`,t.style.right=`${s}px`}function v(){e&&=(e.remove(),null)}function y(){t&&=(t.remove(),null)}function b(e){y();let n={...h},r=``;t=document.createElement(`div`),t.innerHTML=`
        <div id="nemo-generator-panel" style="
          position: fixed;
          z-index: 2147483647;
          background: ${s.darkBg};
          border: 1px solid ${s.border};
          border-radius: 12px;
          padding: 16px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: ${s.textPrimary};
        ">
          <div style="margin-bottom: 12px; font-weight: 600;">Generate Password</div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: ${s.textSecondary};">Length: <span id="nemo-gen-length-val">${n.length}</span></span>
            </div>
            <input type="range" id="nemo-gen-length" min="8" max="64" value="${n.length}"
              style="width: 100%; accent-color: ${s.green};">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-upper" ${n.uppercase?`checked`:``}>
              <span>ABC</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-lower" ${n.lowercase?`checked`:``}>
              <span>abc</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-numbers" ${n.numbers?`checked`:``}>
              <span>123</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-symbols" ${n.symbols?`checked`:``}>
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
            color: ${s.green};
          ">
            Click generate
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="nemo-gen-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: ${s.cardBg};
              border: 1px solid ${s.border};
              border-radius: 6px;
              color: ${s.textPrimary};
              cursor: pointer;
              font-size: 12px;
            ">
              Generate
            </button>
            <button id="nemo-gen-fill" style="
              flex: 1;
              padding: 8px 12px;
              background: ${s.green};
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
      `,document.body.appendChild(t);let i=t.querySelector(`#nemo-generator-panel`),a=e.getBoundingClientRect();i.style.top=`${a.bottom+8+window.scrollY}px`,i.style.left=`${a.left+window.scrollX}px`;let o=i.querySelector(`#nemo-gen-length`),l=i.querySelector(`#nemo-gen-length-val`),u=i.querySelector(`#nemo-gen-preview`),d=i.querySelector(`#nemo-gen-btn`),m=i.querySelector(`#nemo-gen-fill`),g=()=>{n.length=parseInt(o.value),n.uppercase=i.querySelector(`#nemo-gen-upper`).checked,n.lowercase=i.querySelector(`#nemo-gen-lower`).checked,n.numbers=i.querySelector(`#nemo-gen-numbers`).checked,n.symbols=i.querySelector(`#nemo-gen-symbols`).checked,l.textContent=String(n.length)},_=()=>{if(g(),!n.uppercase&&!n.lowercase&&!n.numbers&&!n.symbols){u.textContent=`Select at least one type`,u.style.color=`#FF6B6B`,m.disabled=!0;return}r=p(n),u.textContent=r,u.style.color=s.green,m.disabled=!1};o.addEventListener(`input`,()=>{l.textContent=o.value}),i.querySelectorAll(`input[type="checkbox"]`).forEach(e=>{e.addEventListener(`change`,g)}),d.addEventListener(`click`,_),m.addEventListener(`click`,async()=>{if(!r)return;e.value=r,f(e);let t=x();await c(`ADD_ENTRY`,{title:window.location.hostname,username:t||void 0,password:r,url:window.location.href}),y()}),_()}function x(){for(let e of[`input[type="email"]`,`input[name*="user" i]`,`input[name*="email" i]`,`input[id*="user" i]`,`input[id*="email" i]`]){let t=document.querySelector(e);if(t?.value)return t.value}return null}function S(e,t,n){let r=n?.closest(`form`)||document;r.querySelectorAll(`input[type="text"], input[type="email"]`).forEach(t=>{t instanceof HTMLInputElement&&_(t)&&(t.value=e,f(t))}),r.querySelectorAll(`input[type="password"]`).forEach(e=>{e instanceof HTMLInputElement&&(e.value=t,f(e))})}function C(e,t,n){e.addEventListener(`mouseenter`,()=>{e.style.background=n,e.style.transform=`scale(1.05)`}),e.addEventListener(`mouseleave`,()=>{e.style.background=t,e.style.transform=`scale(1)`})}function w(e){cancelAnimationFrame(r),r=requestAnimationFrame(e)}function T(r){if(!r.parentElement||r.dataset.nemoButton)return;r.dataset.nemoButton=`true`;let i=document.createElement(`button`);i.type=`button`,i.dataset.nemoAction=`fill`,i.innerHTML=`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      `,i.style.cssText=`
        position: absolute;
        width: 28px;
        height: 28px;
        background: ${s.darkBg};
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
      `;let a=document.createElement(`button`);a.type=`button`,a.dataset.nemoAction=`generate`,a.innerHTML=`
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
      `,a.style.cssText=`
        position: absolute;
        width: 28px;
        height: 28px;
        background: ${s.cardBg};
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${s.green};
        padding: 0;
        z-index: 2147483646;
        transition: all 0.2s;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      `;let o=()=>{let e=r.getBoundingClientRect(),t=window.scrollX,n=window.scrollY;i.style.left=`${e.right-36+t}px`,i.style.top=`${e.top+(e.height-28)/2+n}px`,a.style.left=`${e.right-72+t}px`,a.style.top=`${e.top+(e.height-28)/2+n}px`},l=()=>w(o);o(),window.addEventListener(`scroll`,l,{passive:!0}),window.addEventListener(`resize`,l),document.body.appendChild(i),document.body.appendChild(a),C(i,s.darkBg,s.cardBg),C(a,s.cardBg,`#444`),i.addEventListener(`click`,async t=>{if(t.preventDefault(),t.stopPropagation(),n=r,y(),!(await c(`GET_VAULT_STATE`))?.isUnlocked){chrome.runtime.sendMessage({type:`OPEN_POPUP`});return}if(e){v();return}m(await c(`GET_ENTRIES_FOR_AUTOFILL`,void 0,[]),e=>{S(e.username,e.password,r)})}),a.addEventListener(`click`,async e=>{if(e.preventDefault(),e.stopPropagation(),v(),!(await c(`GET_VAULT_STATE`))?.isUnlocked){chrome.runtime.sendMessage({type:`OPEN_POPUP`});return}if(t){y();return}n=r,b(r)}),r.addEventListener(`focus`,()=>{n=r,l(),a.style.opacity=`1`,a.style.pointerEvents=`auto`}),r.addEventListener(`blur`,()=>{setTimeout(()=>{!a.matches(`:hover`)&&!i.matches(`:hover`)&&(a.style.opacity=`0`,a.style.pointerEvents=`none`)},200)});let u=()=>{l(),i.style.opacity=`1`,i.style.pointerEvents=`auto`,a.style.opacity=r===document.activeElement?`1`:`0`,a.style.pointerEvents=r===document.activeElement?`auto`:`none`},d=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting?u():(i.style.opacity=`0`,a.style.opacity=`0`)})},{threshold:.5});d.observe(r);let f=()=>{i.remove(),a.remove(),d.disconnect(),window.removeEventListener(`scroll`,l),window.removeEventListener(`resize`,l)},p=new MutationObserver(()=>{r.isConnected||(f(),p.disconnect())});p.observe(document.body,{childList:!0,subtree:!0}),u()}let E=null;function D(){document.querySelectorAll(`input[type="password"]:not([data-nemo-button])`).forEach(e=>{e instanceof HTMLInputElement&&T(e)}),document.querySelectorAll(`input[type="text"]:not([data-nemo-button]), input[type="email"]:not([data-nemo-button])`).forEach(e=>{e instanceof HTMLInputElement&&_(e)&&T(e)})}setTimeout(D,1e3),new MutationObserver(()=>{E||=setTimeout(()=>{E=null,D()},200)}).observe(document.body,{childList:!0,subtree:!0}),document.addEventListener(`click`,e=>{let t=e.target;!t.closest(`#nemo-autofill-overlay`)&&!t.closest(`#nemo-generator-panel`)&&(v(),y())}),document.addEventListener(`focusin`,async t=>{let r=t.target;if((r.type===`password`||r.type===`text`||r.type===`email`)&&(n=r,(await l())?.isUnlocked&&!e)){let e=await u(window.location.href);if(e){let t=d(window.location.href),r=t?await c(`GET_SITE_PREFERENCES`,t):null;if(r?.autoFillMode===`never`)return;r?.autoFillMode===`always`&&r.preferredEntryId===e.id&&S(e.username,e.password,n??void 0)}}});let O=null;function k(e){let t=e.querySelectorAll(`input[type="password"]`);if(t.length===0)return!1;let n=Array.from(t).some(e=>{let t=e,n=t.getAttribute(`autocomplete`)||``,r=t.name.toLowerCase(),i=t.id.toLowerCase();return n===`new-password`||r.includes(`confirm`)||r.includes(`verify`)||i.includes(`confirm`)||i.includes(`verify`)}),r=e.querySelectorAll(`button[type="submit"], input[type="submit"]`),i=Array.from(r).some(e=>{let t=(e.textContent||e.getAttribute(`value`)||``).toLowerCase();return t.includes(`sign up`)||t.includes(`signup`)||t.includes(`create`)||t.includes(`register`)||t.includes(`join`)||t.includes(`get started`)});return n||i}function A(e){let t=e.querySelectorAll(`input[type="password"]`),n=``;for(let e of t){let t=e;t.value&&(!n||t.name.toLowerCase().includes(`password`))&&(n=t.value)}return{username:x()||``,password:n,title:window.location.hostname}}function j(e){O&&O.remove();let t=document.createElement(`div`);t.id=`nemo-quick-add-banner`,t.innerHTML=`
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2147483647;
          background: ${s.darkBg};
          border-bottom: 1px solid ${s.border};
          padding: 12px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <span style="color: ${s.textPrimary};">Save this account to Nemo?</span>
          <div style="display: flex; gap: 8px;">
            <button id="nemo-quick-add-yes" style="
              padding: 6px 12px;
              background: ${s.green};
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
              border: 1px solid ${s.border};
              border-radius: 6px;
              color: ${s.textSecondary};
              font-size: 12px;
              cursor: pointer;
            ">No</button>
            <button id="nemo-quick-add-never" style="
              padding: 6px 12px;
              background: transparent;
              border: 1px solid ${s.borderSubtle};
              border-radius: 6px;
              color: ${s.textMuted};
              font-size: 12px;
              cursor: pointer;
            ">Never for this site</button>
          </div>
        </div>
      `,document.body.appendChild(t),O=t;let n=t.querySelector(`#nemo-quick-add-yes`),r=t.querySelector(`#nemo-quick-add-no`),i=t.querySelector(`#nemo-quick-add-never`);n.addEventListener(`click`,async()=>{await c(`ADD_ENTRY`,{title:e.title,username:e.username,password:e.password,url:window.location.href}),t.remove(),O=null}),r.addEventListener(`click`,()=>{t.remove(),O=null}),i.addEventListener(`click`,async()=>{let e=d(window.location.href);e&&await c(`SET_SITE_PREFERENCES`,{hostname:e,preferences:{autoFillMode:`ask`,quickAddDisabled:!0}}),t.remove(),O=null}),setTimeout(()=>{O===t&&(t.remove(),O=null)},1e4)}document.addEventListener(`submit`,async e=>{if(!window.location.protocol.startsWith(`https`))return;let t=e.target;if(!k(t))return;let n=d(window.location.href);if(n&&(await c(`GET_SITE_PREFERENCES`,n))?.quickAddDisabled||!(await l())?.isUnlocked||await u(window.location.href))return;let r=A(t);r.password&&j(r)},!0)}}),y=c(o(((e,t)=>{(function(n,r){if(typeof define==`function`&&define.amd)define(`webextension-polyfill`,[`module`],r);else if(e!==void 0)r(t);else{var i={exports:{}};r(i),n.browser=i.exports}})(typeof globalThis<`u`?globalThis:typeof self<`u`?self:e,function(e){"use strict";if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id))throw Error(`This script should only be loaded in a browser extension.`);globalThis.browser&&globalThis.browser.runtime&&globalThis.browser.runtime.id?e.exports=globalThis.browser:e.exports=(e=>{let t={alarms:{clear:{minArgs:0,maxArgs:1},clearAll:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getAll:{minArgs:0,maxArgs:0}},bookmarks:{create:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},getChildren:{minArgs:1,maxArgs:1},getRecent:{minArgs:1,maxArgs:1},getSubTree:{minArgs:1,maxArgs:1},getTree:{minArgs:0,maxArgs:0},move:{minArgs:2,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeTree:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}},browserAction:{disable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},enable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},getBadgeBackgroundColor:{minArgs:1,maxArgs:1},getBadgeText:{minArgs:1,maxArgs:1},getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},openPopup:{minArgs:0,maxArgs:0},setBadgeBackgroundColor:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setBadgeText:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},browsingData:{remove:{minArgs:2,maxArgs:2},removeCache:{minArgs:1,maxArgs:1},removeCookies:{minArgs:1,maxArgs:1},removeDownloads:{minArgs:1,maxArgs:1},removeFormData:{minArgs:1,maxArgs:1},removeHistory:{minArgs:1,maxArgs:1},removeLocalStorage:{minArgs:1,maxArgs:1},removePasswords:{minArgs:1,maxArgs:1},removePluginData:{minArgs:1,maxArgs:1},settings:{minArgs:0,maxArgs:0}},commands:{getAll:{minArgs:0,maxArgs:0}},contextMenus:{remove:{minArgs:1,maxArgs:1},removeAll:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},cookies:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:1,maxArgs:1},getAllCookieStores:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},devtools:{inspectedWindow:{eval:{minArgs:1,maxArgs:2,singleCallbackArg:!1}},panels:{create:{minArgs:3,maxArgs:3,singleCallbackArg:!0},elements:{createSidebarPane:{minArgs:1,maxArgs:1}}}},downloads:{cancel:{minArgs:1,maxArgs:1},download:{minArgs:1,maxArgs:1},erase:{minArgs:1,maxArgs:1},getFileIcon:{minArgs:1,maxArgs:2},open:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},pause:{minArgs:1,maxArgs:1},removeFile:{minArgs:1,maxArgs:1},resume:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},extension:{isAllowedFileSchemeAccess:{minArgs:0,maxArgs:0},isAllowedIncognitoAccess:{minArgs:0,maxArgs:0}},history:{addUrl:{minArgs:1,maxArgs:1},deleteAll:{minArgs:0,maxArgs:0},deleteRange:{minArgs:1,maxArgs:1},deleteUrl:{minArgs:1,maxArgs:1},getVisits:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1}},i18n:{detectLanguage:{minArgs:1,maxArgs:1},getAcceptLanguages:{minArgs:0,maxArgs:0}},identity:{launchWebAuthFlow:{minArgs:1,maxArgs:1}},idle:{queryState:{minArgs:1,maxArgs:1}},management:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},getSelf:{minArgs:0,maxArgs:0},setEnabled:{minArgs:2,maxArgs:2},uninstallSelf:{minArgs:0,maxArgs:1}},notifications:{clear:{minArgs:1,maxArgs:1},create:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:0},getPermissionLevel:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},pageAction:{getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},hide:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},permissions:{contains:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},request:{minArgs:1,maxArgs:1}},runtime:{getBackgroundPage:{minArgs:0,maxArgs:0},getPlatformInfo:{minArgs:0,maxArgs:0},openOptionsPage:{minArgs:0,maxArgs:0},requestUpdateCheck:{minArgs:0,maxArgs:0},sendMessage:{minArgs:1,maxArgs:3},sendNativeMessage:{minArgs:2,maxArgs:2},setUninstallURL:{minArgs:1,maxArgs:1}},sessions:{getDevices:{minArgs:0,maxArgs:1},getRecentlyClosed:{minArgs:0,maxArgs:1},restore:{minArgs:0,maxArgs:1}},storage:{local:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},managed:{get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1}},sync:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}}},tabs:{captureVisibleTab:{minArgs:0,maxArgs:2},create:{minArgs:1,maxArgs:1},detectLanguage:{minArgs:0,maxArgs:1},discard:{minArgs:0,maxArgs:1},duplicate:{minArgs:1,maxArgs:1},executeScript:{minArgs:1,maxArgs:2},get:{minArgs:1,maxArgs:1},getCurrent:{minArgs:0,maxArgs:0},getZoom:{minArgs:0,maxArgs:1},getZoomSettings:{minArgs:0,maxArgs:1},goBack:{minArgs:0,maxArgs:1},goForward:{minArgs:0,maxArgs:1},highlight:{minArgs:1,maxArgs:1},insertCSS:{minArgs:1,maxArgs:2},move:{minArgs:2,maxArgs:2},query:{minArgs:1,maxArgs:1},reload:{minArgs:0,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeCSS:{minArgs:1,maxArgs:2},sendMessage:{minArgs:2,maxArgs:3},setZoom:{minArgs:1,maxArgs:2},setZoomSettings:{minArgs:1,maxArgs:2},update:{minArgs:1,maxArgs:2}},topSites:{get:{minArgs:0,maxArgs:0}},webNavigation:{getAllFrames:{minArgs:1,maxArgs:1},getFrame:{minArgs:1,maxArgs:1}},webRequest:{handlerBehaviorChanged:{minArgs:0,maxArgs:0}},windows:{create:{minArgs:0,maxArgs:1},get:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:1},getCurrent:{minArgs:0,maxArgs:1},getLastFocused:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}}};if(Object.keys(t).length===0)throw Error(`api-metadata.json has not been included in browser-polyfill`);class n extends WeakMap{constructor(e,t=void 0){super(t),this.createItem=e}get(e){return this.has(e)||this.set(e,this.createItem(e)),super.get(e)}}let r=e=>e&&typeof e==`object`&&typeof e.then==`function`,i=(t,n)=>(...r)=>{e.runtime.lastError?t.reject(Error(e.runtime.lastError.message)):n.singleCallbackArg||r.length<=1&&n.singleCallbackArg!==!1?t.resolve(r[0]):t.resolve(r)},a=e=>e==1?`argument`:`arguments`,o=(e,t)=>function(n,...r){if(r.length<t.minArgs)throw Error(`Expected at least ${t.minArgs} ${a(t.minArgs)} for ${e}(), got ${r.length}`);if(r.length>t.maxArgs)throw Error(`Expected at most ${t.maxArgs} ${a(t.maxArgs)} for ${e}(), got ${r.length}`);return new Promise((a,o)=>{if(t.fallbackToNoCallback)try{n[e](...r,i({resolve:a,reject:o},t))}catch(i){console.warn(`${e} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,i),n[e](...r),t.fallbackToNoCallback=!1,t.noCallback=!0,a()}else t.noCallback?(n[e](...r),a()):n[e](...r,i({resolve:a,reject:o},t))})},s=(e,t,n)=>new Proxy(t,{apply(t,r,i){return n.call(r,e,...i)}}),c=Function.call.bind(Object.prototype.hasOwnProperty),l=(e,t={},n={})=>{let r=Object.create(null);return new Proxy(Object.create(e),{has(t,n){return n in e||n in r},get(i,a,u){if(a in r)return r[a];if(!(a in e))return;let d=e[a];if(typeof d==`function`)if(typeof t[a]==`function`)d=s(e,e[a],t[a]);else if(c(n,a)){let t=o(a,n[a]);d=s(e,e[a],t)}else d=d.bind(e);else if(typeof d==`object`&&d&&(c(t,a)||c(n,a)))d=l(d,t[a],n[a]);else if(c(n,`*`))d=l(d,t[a],n[`*`]);else return Object.defineProperty(r,a,{configurable:!0,enumerable:!0,get(){return e[a]},set(t){e[a]=t}}),d;return r[a]=d,d},set(t,n,i,a){return n in r?r[n]=i:e[n]=i,!0},defineProperty(e,t,n){return Reflect.defineProperty(r,t,n)},deleteProperty(e,t){return Reflect.deleteProperty(r,t)}})},u=e=>({addListener(t,n,...r){t.addListener(e.get(n),...r)},hasListener(t,n){return t.hasListener(e.get(n))},removeListener(t,n){t.removeListener(e.get(n))}}),d=new n(e=>typeof e==`function`?function(t){e(l(t,{},{getContent:{minArgs:0,maxArgs:0}}))}:e),f=new n(e=>typeof e==`function`?function(t,n,i){let a=!1,o,s=new Promise(e=>{o=function(t){a=!0,e(t)}}),c;try{c=e(t,n,o)}catch(e){c=Promise.reject(e)}let l=c!==!0&&r(c);return c!==!0&&!l&&!a?!1:((e=>{e.then(e=>{i(e)},e=>{let t;t=e&&(e instanceof Error||typeof e.message==`string`)?e.message:`An unexpected error occurred`,i({__mozWebExtensionPolyfillReject__:!0,message:t})}).catch(e=>{console.error(`Failed to send onMessage rejected reply`,e)})})(l?c:s),!0)}:e),p=({reject:t,resolve:n},r)=>{e.runtime.lastError?e.runtime.lastError.message===`The message port closed before a response was received.`?n():t(Error(e.runtime.lastError.message)):r&&r.__mozWebExtensionPolyfillReject__?t(Error(r.message)):n(r)},m=(e,t,n,...r)=>{if(r.length<t.minArgs)throw Error(`Expected at least ${t.minArgs} ${a(t.minArgs)} for ${e}(), got ${r.length}`);if(r.length>t.maxArgs)throw Error(`Expected at most ${t.maxArgs} ${a(t.maxArgs)} for ${e}(), got ${r.length}`);return new Promise((e,t)=>{let i=p.bind(null,{resolve:e,reject:t});r.push(i),n.sendMessage(...r)})},h={devtools:{network:{onRequestFinished:u(d)}},runtime:{onMessage:u(f),onMessageExternal:u(f),sendMessage:m.bind(null,`sendMessage`,{minArgs:1,maxArgs:3})},tabs:{sendMessage:m.bind(null,`sendMessage`,{minArgs:2,maxArgs:3})}},g={clear:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}};return t.privacy={network:{"*":g},services:{"*":g},websites:{"*":g}},l(e,h,t)})(chrome)})}))(),1).default,b={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)},x=class e extends Event{constructor(t,n){super(e.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}static EVENT_NAME=S(`wxt:locationchange`)};function S(e){return`${y?.runtime?.id}:content:${e}`}function C(e){let t,n;return{run(){t??=(n=new URL(location.href),e.setInterval(()=>{let e=new URL(location.href);e.href!==n.href&&(window.dispatchEvent(new x(e,n)),n=e)},1e3))}}}var w=class e{constructor(e,t){this.contentScriptName=e,this.options=t,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}static SCRIPT_STARTED_MESSAGE_TYPE=S(`wxt:content-script-started`);isTopFrame=window.self===window.top;abortController;locationWatcher=C(this);receivedMessageIds=new Set;get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return y.runtime.id??this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener(`abort`,e),()=>this.signal.removeEventListener(`abort`,e)}block(){return new Promise(()=>{})}setInterval(e,t){let n=setInterval(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearInterval(n)),n}setTimeout(e,t){let n=setTimeout(()=>{this.isValid&&e()},t);return this.onInvalidated(()=>clearTimeout(n)),n}requestAnimationFrame(e){let t=requestAnimationFrame((...t)=>{this.isValid&&e(...t)});return this.onInvalidated(()=>cancelAnimationFrame(t)),t}requestIdleCallback(e,t){let n=requestIdleCallback((...t)=>{this.signal.aborted||e(...t)},t);return this.onInvalidated(()=>cancelIdleCallback(n)),n}addEventListener(e,t,n,r){t===`wxt:locationchange`&&this.isValid&&this.locationWatcher.run(),e.addEventListener?.(t.startsWith(`wxt:`)?S(t):t,n,{...r,signal:this.signal})}notifyInvalidated(){this.abort(`Content script context invalidated`),b.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:e.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},`*`)}verifyScriptStartedEvent(t){let n=t.data?.type===e.SCRIPT_STARTED_MESSAGE_TYPE,r=t.data?.contentScriptName===this.contentScriptName,i=!this.receivedMessageIds.has(t.data?.messageId);return n&&r&&i}listenForNewerScripts(e){let t=!0,n=n=>{if(this.verifyScriptStartedEvent(n)){this.receivedMessageIds.add(n.data.messageId);let r=t;if(t=!1,r&&e?.ignoreFirstEvent)return;this.notifyInvalidated()}};addEventListener(`message`,n),this.onInvalidated(()=>removeEventListener(`message`,n))}},T=Symbol(`null`),E=0,D=class extends Map{constructor(){super(),this._objectHashes=new WeakMap,this._symbolHashes=new Map,this._publicKeys=new Map;let[e]=arguments;if(e!=null){if(typeof e[Symbol.iterator]!=`function`)throw TypeError(typeof e+` is not iterable (cannot read property Symbol(Symbol.iterator))`);for(let[t,n]of e)this.set(t,n)}}_getPublicKeys(e,t=!1){if(!Array.isArray(e))throw TypeError(`The keys parameter must be an array`);let n=this._getPrivateKey(e,t),r;return n&&this._publicKeys.has(n)?r=this._publicKeys.get(n):t&&(r=[...e],this._publicKeys.set(n,r)),{privateKey:n,publicKey:r}}_getPrivateKey(e,t=!1){let n=[];for(let r of e){r===null&&(r=T);let e=typeof r==`object`||typeof r==`function`?`_objectHashes`:typeof r==`symbol`?`_symbolHashes`:!1;if(!e)n.push(r);else if(this[e].has(r))n.push(this[e].get(r));else if(t){let t=`@@mkm-ref-${E++}@@`;this[e].set(r,t),n.push(t)}else return!1}return JSON.stringify(n)}set(e,t){let{publicKey:n}=this._getPublicKeys(e,!0);return super.set(n,t)}get(e){let{publicKey:t}=this._getPublicKeys(e);return super.get(t)}has(e){let{publicKey:t}=this._getPublicKeys(e);return super.has(t)}delete(e){let{publicKey:t,privateKey:n}=this._getPublicKeys(e);return!!(t&&super.delete(t)&&this._publicKeys.delete(n))}clear(){super.clear(),this._symbolHashes.clear(),this._publicKeys.clear()}get[Symbol.toStringTag](){return`ManyKeysMap`}get size(){return super.size}};function O(e){if(typeof e!=`object`||!e)return!1;let t=Object.getPrototypeOf(e);return t!==null&&t!==Object.prototype&&Object.getPrototypeOf(t)!==null||Symbol.iterator in e?!1:Symbol.toStringTag in e?Object.prototype.toString.call(e)===`[object Module]`:!0}function k(e,t,n=`.`,r){if(!O(t))return k(e,{},n,r);let i=Object.assign({},t);for(let t in e){if(t===`__proto__`||t===`constructor`)continue;let a=e[t];a!=null&&(r&&r(i,t,a,n)||(Array.isArray(a)&&Array.isArray(i[t])?i[t]=[...a,...i[t]]:O(a)&&O(i[t])?i[t]=k(a,i[t],(n?`${n}.`:``)+t.toString(),r):i[t]=a))}return i}function A(e){return(...t)=>t.reduce((t,n)=>k(t,n,``,e),{})}var j=A(),M=e=>e===null?{isDetected:!1}:{isDetected:!0,result:e},N=()=>({target:globalThis.document,unifyProcess:!0,detector:M,observeConfigs:{childList:!0,subtree:!0,attributes:!0},signal:void 0,customMatcher:void 0}),P=(e,t)=>j(e,t),F=new D;function I(e){let{defaultOptions:t}=e;return(e,n)=>{let{target:r,unifyProcess:i,observeConfigs:a,detector:o,signal:s,customMatcher:c}=P(n,t),l=[e,r,i,a,o,s,c],u=F.get(l);if(i&&u)return u;let d=new Promise(async(t,n)=>{if(s?.aborted)return n(s.reason);let i=new MutationObserver(async n=>{for(let a of n){if(s?.aborted){i.disconnect();break}let n=await L({selector:e,target:r,detector:o,customMatcher:c});if(n.isDetected){i.disconnect(),t(n.result);break}}});s?.addEventListener(`abort`,()=>(i.disconnect(),n(s.reason)),{once:!0});let l=await L({selector:e,target:r,detector:o,customMatcher:c});if(l.isDetected)return t(l.result);i.observe(r,a)}).finally(()=>{F.delete(l)});return F.set(l,d),d}}async function L({target:e,selector:t,detector:n,customMatcher:r}){return await n(r?r(t):e.querySelector(t))}I({defaultOptions:N()}),o(((e,t)=>{var n=/^[a-z](?:[\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*-(?:[\x2D\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*$/;t.exports=function(e){return n.test(e)}}))();var R={debug:(...e)=>([...e],void 0),log:(...e)=>([...e],void 0),warn:(...e)=>([...e],void 0),error:(...e)=>([...e],void 0)};return(async()=>{try{let{main:e,...t}=v;return await e(new w(`content`,t))}catch(e){throw R.error(`The content script "content" crashed on startup!`,e),e}})()})();