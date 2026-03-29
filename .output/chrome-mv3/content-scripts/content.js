var content=function(){"use strict";var xe=Object.defineProperty;var he=(N,$,R)=>$ in N?xe(N,$,{enumerable:!0,configurable:!0,writable:!0,value:R}):N[$]=R;var I=(N,$,R)=>he(N,typeof $!="symbol"?$+"":$,R);function N(o){return o}const $={length:20,uppercase:!0,lowercase:!0,numbers:!0,symbols:!0},R=["user","email","login"];function se(o){if(o.type==="email")return!0;const r=o.getAttribute("autocomplete")||"",s=o.name.toLowerCase(),g=o.id.toLowerCase(),A=(o.placeholder||"").toLowerCase();return R.some(b=>r.includes(b)||s.includes(b)||g.includes(b)||A.includes(b))}const ie={matches:["<all_urls>"],allFrames:!0,main(){let o=null,r=null,s=null,g=0,A=null,b=null;const C=5e3,d={darkBg:"#1A1A1A",darkerBg:"#0D0D0D",hoverBg:"#2A2A2A",cardBg:"#333333",textPrimary:"#FFFFFF",textSecondary:"#737373",textMuted:"#525252",gold:"#C98700",green:"#00FF88",border:"rgba(255,255,255,0.1)",borderSubtle:"rgba(255,255,255,0.05)"};async function L(e,t,n=null){try{const i=await chrome.runtime.sendMessage(t!==void 0?{type:e,payload:t}:{type:e});return i.success?i.data:n}catch{return n}}async function j(){const e=Date.now();if(A&&e-A.timestamp<C)return A.data;const t=await L("GET_VAULT_STATE");return A={data:t,timestamp:e},t}async function B(e){const t=Date.now();if(b&&b.url===e&&t-b.timestamp<C)return b.data;const n=await L("GET_ENTRY_BY_URL",e);return b={url:e,data:n,timestamp:t},n}function H(e){try{return new URL(e).hostname.replace(/^www\./,"")}catch{return""}}function q(e){e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))}function U(e){const{length:t,uppercase:n,lowercase:i,numbers:x,symbols:m}=e;let l="";if(i&&(l+="abcdefghijklmnopqrstuvwxyz"),n&&(l+="ABCDEFGHIJKLMNOPQRSTUVWXYZ"),x&&(l+="0123456789"),m&&(l+="!@#$%^&*"),l.length===0)return"";const v=256-256%l.length;let k="";for(;k.length<t;){const h=new Uint8Array(32);crypto.getRandomValues(h);for(let y=0;y<h.length&&k.length<t;y++)h[y]<v&&(k+=l.charAt(h[y]%l.length))}return k}function O(e,t){if(o&&o.remove(),e.length===0)o=document.createElement("div"),o.innerHTML=`
          <div style="
            position: fixed;
            z-index: 2147483647;
            background: ${d.darkBg};
            border: 1px solid ${d.border};
            border-radius: 12px;
            padding: 16px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: ${d.textSecondary};
          ">
            No saved passwords found
          </div>
        `;else{o=document.createElement("div");const n=document.createElement("div");n.style.cssText=`
          position: fixed;
          z-index: 2147483647;
          background: ${d.darkBg};
          border: 1px solid ${d.border};
          border-radius: 12px;
          min-width: 320px;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;const i=document.createElement("div");i.style.cssText=`
          padding: 16px 20px;
          background: ${d.darkerBg};
          border-bottom: 1px solid ${d.border};
          font-size: 14px;
          font-weight: 600;
          color: ${d.textPrimary};
          display: flex;
          align-items: center;
          justify-content: space-between;
        `;const x=document.createElement("span");x.textContent="Nemo Password Manager";const m=document.createElement("span");m.style.cssText="font-size: 12px; color: #737373; font-weight: 400;",m.textContent=`${e.length} entries`,i.appendChild(x),i.appendChild(m),n.appendChild(i),e.forEach(l=>{const v=document.createElement("div");v.className="nemo-entry-item",v.style.cssText=`
            padding: 16px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            transition: background 0.15s;
            display: flex;
            align-items: center;
            gap: 12px;
          `;const k=document.createElement("div");k.style.cssText=`
            width: 40px;
            height: 40px;
            background: ${l.favorite?d.gold:d.hoverBg};
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${l.favorite?d.textPrimary:d.textSecondary};
            font-size: 16px;
            font-weight: 600;
            flex-shrink: 0;
          `,k.textContent=l.title.charAt(0).toUpperCase(),v.appendChild(k);const h=document.createElement("div");h.style.cssText="flex: 1; min-width: 0;";const y=document.createElement("div");y.style.cssText="font-size: 15px; font-weight: 500; color: #FFFFFF; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",y.textContent=l.title,h.appendChild(y);const M=document.createElement("div");if(M.style.cssText="font-size: 13px; color: #737373; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",M.textContent=l.username||"No username",h.appendChild(M),l.url){let _="";try{_=new URL(l.url).hostname}catch{_=l.url}const re=document.createElement("div");re.style.cssText="font-size: 11px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",re.textContent=_,h.appendChild(re)}v.appendChild(h);const F=document.createElement("div");F.style.cssText=`
            width: 28px;
            height: 28px;
            background: ${d.hoverBg};
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${d.textSecondary};
            flex-shrink: 0;
          `,F.innerHTML=`
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          `,v.appendChild(F),v.addEventListener("mouseenter",()=>{v.style.background=d.hoverBg}),v.addEventListener("mouseleave",()=>{v.style.background="transparent"}),v.addEventListener("click",()=>{t(l),D()}),n.appendChild(v)}),o.appendChild(n)}document.body.appendChild(o),G()}function G(){if(!o||!s)return;const e=o.querySelector("div");if(!e)return;const t=s.getBoundingClientRect(),n=window.innerHeight,i=window.innerWidth,x=400;let m=t.bottom+8,l=i-t.right;m+x>n&&(m=t.top-x-8),l<16&&(l=16),e.style.position="fixed",e.style.top=`${m}px`,e.style.right=`${l}px`}function D(){o&&(o.remove(),o=null)}function P(){r&&(r.remove(),r=null)}function ne(e){P();const t={...$};let n="";r=document.createElement("div"),r.innerHTML=`
        <div id="nemo-generator-panel" style="
          position: fixed;
          z-index: 2147483647;
          background: ${d.darkBg};
          border: 1px solid ${d.border};
          border-radius: 12px;
          padding: 16px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: ${d.textPrimary};
        ">
          <div style="margin-bottom: 12px; font-weight: 600;">Generate Password</div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: ${d.textSecondary};">Length: <span id="nemo-gen-length-val">${t.length}</span></span>
            </div>
            <input type="range" id="nemo-gen-length" min="8" max="64" value="${t.length}"
              style="width: 100%; accent-color: ${d.green};">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-upper" ${t.uppercase?"checked":""}>
              <span>ABC</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-lower" ${t.lowercase?"checked":""}>
              <span>abc</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-numbers" ${t.numbers?"checked":""}>
              <span>123</span>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="nemo-gen-symbols" ${t.symbols?"checked":""}>
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
            color: ${d.green};
          ">
            Click generate
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="nemo-gen-btn" style="
              flex: 1;
              padding: 8px 12px;
              background: ${d.cardBg};
              border: 1px solid ${d.border};
              border-radius: 6px;
              color: ${d.textPrimary};
              cursor: pointer;
              font-size: 12px;
            ">
              Generate
            </button>
            <button id="nemo-gen-fill" style="
              flex: 1;
              padding: 8px 12px;
              background: ${d.green};
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
      `,document.body.appendChild(r);const i=r.querySelector("#nemo-generator-panel"),x=e.getBoundingClientRect();i.style.top=`${x.bottom+8+window.scrollY}px`,i.style.left=`${x.left+window.scrollX}px`;const m=i.querySelector("#nemo-gen-length"),l=i.querySelector("#nemo-gen-length-val"),v=i.querySelector("#nemo-gen-preview"),k=i.querySelector("#nemo-gen-btn"),h=i.querySelector("#nemo-gen-fill"),y=()=>{t.length=parseInt(m.value),t.uppercase=i.querySelector("#nemo-gen-upper").checked,t.lowercase=i.querySelector("#nemo-gen-lower").checked,t.numbers=i.querySelector("#nemo-gen-numbers").checked,t.symbols=i.querySelector("#nemo-gen-symbols").checked,l.textContent=String(t.length)},M=()=>{if(y(),!t.uppercase&&!t.lowercase&&!t.numbers&&!t.symbols){v.textContent="Select at least one type",v.style.color="#FF6B6B",h.disabled=!0;return}n=U(t),v.textContent=n,v.style.color=d.green,h.disabled=!1},F=async()=>{if(!n)return;e.value=n,q(e);const _=W();await L("ADD_ENTRY",{title:window.location.hostname,username:_||void 0,password:n,url:window.location.href}),P()};m.addEventListener("input",()=>{l.textContent=m.value}),i.querySelectorAll('input[type="checkbox"]').forEach(_=>{_.addEventListener("change",y)}),k.addEventListener("click",M),h.addEventListener("click",F),M()}function W(){const e=['input[type="email"]','input[name*="user" i]','input[name*="email" i]','input[id*="user" i]','input[id*="email" i]'];for(const t of e){const n=document.querySelector(t);if(n!=null&&n.value)return n.value}return null}function J(e,t,n){const i=(n==null?void 0:n.closest("form"))||document;i.querySelectorAll('input[type="text"], input[type="email"]').forEach(l=>{l instanceof HTMLInputElement&&se(l)&&(l.value=e,q(l))}),i.querySelectorAll('input[type="password"]').forEach(l=>{l instanceof HTMLInputElement&&(l.value=t,q(l))})}function z(e,t,n){e.addEventListener("mouseenter",()=>{e.style.background=n,e.style.transform="scale(1.05)"}),e.addEventListener("mouseleave",()=>{e.style.background=t,e.style.transform="scale(1)"})}function a(e){cancelAnimationFrame(g),g=requestAnimationFrame(e)}function c(e){if(!e.parentElement||e.dataset.nemoButton)return;e.dataset.nemoButton="true";const t=document.createElement("button");t.type="button",t.dataset.nemoAction="fill",t.innerHTML=`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      `,t.style.cssText=`
        position: absolute;
        width: 28px;
        height: 28px;
        background: ${d.darkBg};
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
      `;const n=document.createElement("button");n.type="button",n.dataset.nemoAction="generate",n.innerHTML=`
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
      `,n.style.cssText=`
        position: absolute;
        width: 28px;
        height: 28px;
        background: ${d.cardBg};
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${d.green};
        padding: 0;
        z-index: 2147483646;
        transition: all 0.2s;
        margin: 0;
        opacity: 0;
        pointer-events: none;
      `;const i=()=>{const h=e.getBoundingClientRect(),y=window.scrollX,M=window.scrollY;t.style.left=`${h.right-36+y}px`,t.style.top=`${h.top+(h.height-28)/2+M}px`,n.style.left=`${h.right-72+y}px`,n.style.top=`${h.top+(h.height-28)/2+M}px`},x=()=>a(i);i(),window.addEventListener("scroll",x,{passive:!0}),window.addEventListener("resize",x),document.body.appendChild(t),document.body.appendChild(n),z(t,d.darkBg,d.cardBg),z(n,d.cardBg,"#444"),t.addEventListener("click",async h=>{h.preventDefault(),h.stopPropagation(),s=e,P();const y=await L("GET_VAULT_STATE");if(!(y!=null&&y.isUnlocked)){chrome.runtime.sendMessage({type:"OPEN_POPUP"});return}if(o){D();return}const M=await L("GET_ENTRIES_FOR_AUTOFILL",void 0,[]);O(M,F=>{J(F.username,F.password,e)})}),n.addEventListener("click",async h=>{h.preventDefault(),h.stopPropagation(),D();const y=await L("GET_VAULT_STATE");if(!(y!=null&&y.isUnlocked)){chrome.runtime.sendMessage({type:"OPEN_POPUP"});return}if(r){P();return}s=e,ne(e)}),e.addEventListener("focus",()=>{s=e,x(),n.style.opacity="1",n.style.pointerEvents="auto"}),e.addEventListener("blur",()=>{setTimeout(()=>{!n.matches(":hover")&&!t.matches(":hover")&&(n.style.opacity="0",n.style.pointerEvents="none")},200)});const m=()=>{x(),t.style.opacity="1",t.style.pointerEvents="auto",n.style.opacity=e===document.activeElement?"1":"0",n.style.pointerEvents=e===document.activeElement?"auto":"none"},l=new IntersectionObserver(h=>{h.forEach(y=>{y.isIntersecting?m():(t.style.opacity="0",n.style.opacity="0")})},{threshold:.5});l.observe(e);const v=()=>{t.remove(),n.remove(),l.disconnect(),window.removeEventListener("scroll",x),window.removeEventListener("resize",x)},k=new MutationObserver(()=>{e.isConnected||(v(),k.disconnect())});k.observe(document.body,{childList:!0,subtree:!0}),m()}let p=null;function f(){document.querySelectorAll('input[type="password"]:not([data-nemo-button])').forEach(n=>{n instanceof HTMLInputElement&&c(n)}),document.querySelectorAll('input[type="text"]:not([data-nemo-button]), input[type="email"]:not([data-nemo-button])').forEach(n=>{n instanceof HTMLInputElement&&se(n)&&c(n)})}setTimeout(f,1e3),new MutationObserver(()=>{p||(p=setTimeout(()=>{p=null,f()},200))}).observe(document.body,{childList:!0,subtree:!0}),document.addEventListener("click",e=>{const t=e.target;!t.closest("#nemo-autofill-overlay")&&!t.closest("#nemo-generator-panel")&&(D(),P())}),document.addEventListener("focusin",async e=>{const t=e.target;if(t.type==="password"||t.type==="text"||t.type==="email"){s=t;const n=await j();if(n!=null&&n.isUnlocked&&!o){const i=await B(window.location.href);if(i){const x=H(window.location.href),m=x?await L("GET_SITE_PREFERENCES",x):null;if((m==null?void 0:m.autoFillMode)==="never")return;(m==null?void 0:m.autoFillMode)==="always"&&m.preferredEntryId===i.id&&J(i.username,i.password,s??void 0)}}}});let w=null;function S(e){const t=e.querySelectorAll('input[type="password"]');if(t.length===0)return!1;const n=Array.from(t).some(m=>{const l=m,v=l.getAttribute("autocomplete")||"",k=l.name.toLowerCase(),h=l.id.toLowerCase();return v==="new-password"||k.includes("confirm")||k.includes("verify")||h.includes("confirm")||h.includes("verify")}),i=e.querySelectorAll('button[type="submit"], input[type="submit"]'),x=Array.from(i).some(m=>{const l=(m.textContent||m.getAttribute("value")||"").toLowerCase();return l.includes("sign up")||l.includes("signup")||l.includes("create")||l.includes("register")||l.includes("join")||l.includes("get started")});return n||x}function u(e){const t=e.querySelectorAll('input[type="password"]');let n="";for(const x of t){const m=x;m.value&&(!n||m.name.toLowerCase().includes("password"))&&(n=m.value)}return{username:W()||"",password:n,title:window.location.hostname}}function T(e){w&&w.remove();const t=document.createElement("div");t.id="nemo-quick-add-banner",t.innerHTML=`
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 2147483647;
          background: ${d.darkBg};
          border-bottom: 1px solid ${d.border};
          padding: 12px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          <span style="color: ${d.textPrimary};">Save this account to Nemo?</span>
          <div style="display: flex; gap: 8px;">
            <button id="nemo-quick-add-yes" style="
              padding: 6px 12px;
              background: ${d.green};
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
              border: 1px solid ${d.border};
              border-radius: 6px;
              color: ${d.textSecondary};
              font-size: 12px;
              cursor: pointer;
            ">No</button>
            <button id="nemo-quick-add-never" style="
              padding: 6px 12px;
              background: transparent;
              border: 1px solid ${d.borderSubtle};
              border-radius: 6px;
              color: ${d.textMuted};
              font-size: 12px;
              cursor: pointer;
            ">Never for this site</button>
          </div>
        </div>
      `,document.body.appendChild(t),w=t;const n=t.querySelector("#nemo-quick-add-yes"),i=t.querySelector("#nemo-quick-add-no"),x=t.querySelector("#nemo-quick-add-never");n.addEventListener("click",async()=>{await L("ADD_ENTRY",{title:e.title,username:e.username,password:e.password,url:window.location.href}),t.remove(),w=null}),i.addEventListener("click",()=>{t.remove(),w=null}),x.addEventListener("click",async()=>{const m=H(window.location.href);m&&await L("SET_SITE_PREFERENCES",{hostname:m,preferences:{autoFillMode:"ask",quickAddDisabled:!0}}),t.remove(),w=null}),setTimeout(()=>{w===t&&(t.remove(),w=null)},1e4)}document.addEventListener("submit",async e=>{if(!window.location.protocol.startsWith("https"))return;const t=e.target;if(!S(t))return;const n=H(window.location.href);if(n){const l=await L("GET_SITE_PREFERENCES",n);if(l!=null&&l.quickAddDisabled)return}const i=await j();if(!(i!=null&&i.isUnlocked)||await B(window.location.href))return;const m=u(t);m.password&&T(m)},!0)}};var ae=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function le(o){return o&&o.__esModule&&Object.prototype.hasOwnProperty.call(o,"default")?o.default:o}var oe={exports:{}};(function(o,r){(function(s,g){g(o)})(typeof globalThis<"u"?globalThis:typeof self<"u"?self:ae,function(s){if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id))throw new Error("This script should only be loaded in a browser extension.");if(globalThis.browser&&globalThis.browser.runtime&&globalThis.browser.runtime.id)s.exports=globalThis.browser;else{const g="The message port closed before a response was received.",A=b=>{const C={alarms:{clear:{minArgs:0,maxArgs:1},clearAll:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getAll:{minArgs:0,maxArgs:0}},bookmarks:{create:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},getChildren:{minArgs:1,maxArgs:1},getRecent:{minArgs:1,maxArgs:1},getSubTree:{minArgs:1,maxArgs:1},getTree:{minArgs:0,maxArgs:0},move:{minArgs:2,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeTree:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}},browserAction:{disable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},enable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},getBadgeBackgroundColor:{minArgs:1,maxArgs:1},getBadgeText:{minArgs:1,maxArgs:1},getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},openPopup:{minArgs:0,maxArgs:0},setBadgeBackgroundColor:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setBadgeText:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},browsingData:{remove:{minArgs:2,maxArgs:2},removeCache:{minArgs:1,maxArgs:1},removeCookies:{minArgs:1,maxArgs:1},removeDownloads:{minArgs:1,maxArgs:1},removeFormData:{minArgs:1,maxArgs:1},removeHistory:{minArgs:1,maxArgs:1},removeLocalStorage:{minArgs:1,maxArgs:1},removePasswords:{minArgs:1,maxArgs:1},removePluginData:{minArgs:1,maxArgs:1},settings:{minArgs:0,maxArgs:0}},commands:{getAll:{minArgs:0,maxArgs:0}},contextMenus:{remove:{minArgs:1,maxArgs:1},removeAll:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},cookies:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:1,maxArgs:1},getAllCookieStores:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},devtools:{inspectedWindow:{eval:{minArgs:1,maxArgs:2,singleCallbackArg:!1}},panels:{create:{minArgs:3,maxArgs:3,singleCallbackArg:!0},elements:{createSidebarPane:{minArgs:1,maxArgs:1}}}},downloads:{cancel:{minArgs:1,maxArgs:1},download:{minArgs:1,maxArgs:1},erase:{minArgs:1,maxArgs:1},getFileIcon:{minArgs:1,maxArgs:2},open:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},pause:{minArgs:1,maxArgs:1},removeFile:{minArgs:1,maxArgs:1},resume:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},extension:{isAllowedFileSchemeAccess:{minArgs:0,maxArgs:0},isAllowedIncognitoAccess:{minArgs:0,maxArgs:0}},history:{addUrl:{minArgs:1,maxArgs:1},deleteAll:{minArgs:0,maxArgs:0},deleteRange:{minArgs:1,maxArgs:1},deleteUrl:{minArgs:1,maxArgs:1},getVisits:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1}},i18n:{detectLanguage:{minArgs:1,maxArgs:1},getAcceptLanguages:{minArgs:0,maxArgs:0}},identity:{launchWebAuthFlow:{minArgs:1,maxArgs:1}},idle:{queryState:{minArgs:1,maxArgs:1}},management:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},getSelf:{minArgs:0,maxArgs:0},setEnabled:{minArgs:2,maxArgs:2},uninstallSelf:{minArgs:0,maxArgs:1}},notifications:{clear:{minArgs:1,maxArgs:1},create:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:0},getPermissionLevel:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},pageAction:{getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},hide:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},permissions:{contains:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},request:{minArgs:1,maxArgs:1}},runtime:{getBackgroundPage:{minArgs:0,maxArgs:0},getPlatformInfo:{minArgs:0,maxArgs:0},openOptionsPage:{minArgs:0,maxArgs:0},requestUpdateCheck:{minArgs:0,maxArgs:0},sendMessage:{minArgs:1,maxArgs:3},sendNativeMessage:{minArgs:2,maxArgs:2},setUninstallURL:{minArgs:1,maxArgs:1}},sessions:{getDevices:{minArgs:0,maxArgs:1},getRecentlyClosed:{minArgs:0,maxArgs:1},restore:{minArgs:0,maxArgs:1}},storage:{local:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},managed:{get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1}},sync:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}}},tabs:{captureVisibleTab:{minArgs:0,maxArgs:2},create:{minArgs:1,maxArgs:1},detectLanguage:{minArgs:0,maxArgs:1},discard:{minArgs:0,maxArgs:1},duplicate:{minArgs:1,maxArgs:1},executeScript:{minArgs:1,maxArgs:2},get:{minArgs:1,maxArgs:1},getCurrent:{minArgs:0,maxArgs:0},getZoom:{minArgs:0,maxArgs:1},getZoomSettings:{minArgs:0,maxArgs:1},goBack:{minArgs:0,maxArgs:1},goForward:{minArgs:0,maxArgs:1},highlight:{minArgs:1,maxArgs:1},insertCSS:{minArgs:1,maxArgs:2},move:{minArgs:2,maxArgs:2},query:{minArgs:1,maxArgs:1},reload:{minArgs:0,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeCSS:{minArgs:1,maxArgs:2},sendMessage:{minArgs:2,maxArgs:3},setZoom:{minArgs:1,maxArgs:2},setZoomSettings:{minArgs:1,maxArgs:2},update:{minArgs:1,maxArgs:2}},topSites:{get:{minArgs:0,maxArgs:0}},webNavigation:{getAllFrames:{minArgs:1,maxArgs:1},getFrame:{minArgs:1,maxArgs:1}},webRequest:{handlerBehaviorChanged:{minArgs:0,maxArgs:0}},windows:{create:{minArgs:0,maxArgs:1},get:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:1},getCurrent:{minArgs:0,maxArgs:1},getLastFocused:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}}};if(Object.keys(C).length===0)throw new Error("api-metadata.json has not been included in browser-polyfill");class d extends WeakMap{constructor(c,p=void 0){super(p),this.createItem=c}get(c){return this.has(c)||this.set(c,this.createItem(c)),super.get(c)}}const L=a=>a&&typeof a=="object"&&typeof a.then=="function",j=(a,c)=>(...p)=>{b.runtime.lastError?a.reject(new Error(b.runtime.lastError.message)):c.singleCallbackArg||p.length<=1&&c.singleCallbackArg!==!1?a.resolve(p[0]):a.resolve(p)},B=a=>a==1?"argument":"arguments",H=(a,c)=>function(f,...E){if(E.length<c.minArgs)throw new Error(`Expected at least ${c.minArgs} ${B(c.minArgs)} for ${a}(), got ${E.length}`);if(E.length>c.maxArgs)throw new Error(`Expected at most ${c.maxArgs} ${B(c.maxArgs)} for ${a}(), got ${E.length}`);return new Promise((w,S)=>{if(c.fallbackToNoCallback)try{f[a](...E,j({resolve:w,reject:S},c))}catch(u){console.warn(`${a} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,u),f[a](...E),c.fallbackToNoCallback=!1,c.noCallback=!0,w()}else c.noCallback?(f[a](...E),w()):f[a](...E,j({resolve:w,reject:S},c))})},q=(a,c,p)=>new Proxy(c,{apply(f,E,w){return p.call(E,a,...w)}});let U=Function.call.bind(Object.prototype.hasOwnProperty);const O=(a,c={},p={})=>{let f=Object.create(null),E={has(S,u){return u in a||u in f},get(S,u,T){if(u in f)return f[u];if(!(u in a))return;let e=a[u];if(typeof e=="function")if(typeof c[u]=="function")e=q(a,a[u],c[u]);else if(U(p,u)){let t=H(u,p[u]);e=q(a,a[u],t)}else e=e.bind(a);else if(typeof e=="object"&&e!==null&&(U(c,u)||U(p,u)))e=O(e,c[u],p[u]);else if(U(p,"*"))e=O(e,c[u],p["*"]);else return Object.defineProperty(f,u,{configurable:!0,enumerable:!0,get(){return a[u]},set(t){a[u]=t}}),e;return f[u]=e,e},set(S,u,T,e){return u in f?f[u]=T:a[u]=T,!0},defineProperty(S,u,T){return Reflect.defineProperty(f,u,T)},deleteProperty(S,u){return Reflect.deleteProperty(f,u)}},w=Object.create(a);return new Proxy(w,E)},G=a=>({addListener(c,p,...f){c.addListener(a.get(p),...f)},hasListener(c,p){return c.hasListener(a.get(p))},removeListener(c,p){c.removeListener(a.get(p))}}),D=new d(a=>typeof a!="function"?a:function(p){const f=O(p,{},{getContent:{minArgs:0,maxArgs:0}});a(f)}),P=new d(a=>typeof a!="function"?a:function(p,f,E){let w=!1,S,u=new Promise(n=>{S=function(i){w=!0,n(i)}}),T;try{T=a(p,f,S)}catch(n){T=Promise.reject(n)}const e=T!==!0&&L(T);if(T!==!0&&!e&&!w)return!1;const t=n=>{n.then(i=>{E(i)},i=>{let x;i&&(i instanceof Error||typeof i.message=="string")?x=i.message:x="An unexpected error occurred",E({__mozWebExtensionPolyfillReject__:!0,message:x})}).catch(i=>{console.error("Failed to send onMessage rejected reply",i)})};return t(e?T:u),!0}),ne=({reject:a,resolve:c},p)=>{b.runtime.lastError?b.runtime.lastError.message===g?c():a(new Error(b.runtime.lastError.message)):p&&p.__mozWebExtensionPolyfillReject__?a(new Error(p.message)):c(p)},W=(a,c,p,...f)=>{if(f.length<c.minArgs)throw new Error(`Expected at least ${c.minArgs} ${B(c.minArgs)} for ${a}(), got ${f.length}`);if(f.length>c.maxArgs)throw new Error(`Expected at most ${c.maxArgs} ${B(c.maxArgs)} for ${a}(), got ${f.length}`);return new Promise((E,w)=>{const S=ne.bind(null,{resolve:E,reject:w});f.push(S),p.sendMessage(...f)})},J={devtools:{network:{onRequestFinished:G(D)}},runtime:{onMessage:G(P),onMessageExternal:G(P),sendMessage:W.bind(null,"sendMessage",{minArgs:1,maxArgs:3})},tabs:{sendMessage:W.bind(null,"sendMessage",{minArgs:2,maxArgs:3})}},z={clear:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}};return C.privacy={network:{"*":z},services:{"*":z},websites:{"*":z}},O(b,J,C)};s.exports=A(chrome)}})})(oe);var ce=oe.exports;const V=le(ce);function Y(o,...r){}const ge={debug:(...o)=>Y(console.debug,...o),log:(...o)=>Y(console.log,...o),warn:(...o)=>Y(console.warn,...o),error:(...o)=>Y(console.error,...o)},X=class X extends Event{constructor(r,s){super(X.EVENT_NAME,{}),this.newUrl=r,this.oldUrl=s}};I(X,"EVENT_NAME",ee("wxt:locationchange"));let Q=X;function ee(o){var r;return`${(r=V==null?void 0:V.runtime)==null?void 0:r.id}:content:${o}`}function de(o){let r,s;return{run(){r==null&&(s=new URL(location.href),r=o.setInterval(()=>{let g=new URL(location.href);g.href!==s.href&&(window.dispatchEvent(new Q(g,s)),s=g)},1e3))}}}const K=class K{constructor(r,s){I(this,"isTopFrame",window.self===window.top);I(this,"abortController");I(this,"locationWatcher",de(this));I(this,"receivedMessageIds",new Set);this.contentScriptName=r,this.options=s,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(r){return this.abortController.abort(r)}get isInvalid(){return V.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(r){return this.signal.addEventListener("abort",r),()=>this.signal.removeEventListener("abort",r)}block(){return new Promise(()=>{})}setInterval(r,s){const g=setInterval(()=>{this.isValid&&r()},s);return this.onInvalidated(()=>clearInterval(g)),g}setTimeout(r,s){const g=setTimeout(()=>{this.isValid&&r()},s);return this.onInvalidated(()=>clearTimeout(g)),g}requestAnimationFrame(r){const s=requestAnimationFrame((...g)=>{this.isValid&&r(...g)});return this.onInvalidated(()=>cancelAnimationFrame(s)),s}requestIdleCallback(r,s){const g=requestIdleCallback((...A)=>{this.signal.aborted||r(...A)},s);return this.onInvalidated(()=>cancelIdleCallback(g)),g}addEventListener(r,s,g,A){var b;s==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(b=r.addEventListener)==null||b.call(r,s.startsWith("wxt:")?ee(s):s,g,{...A,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),ge.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:K.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(r){var b,C,d;const s=((b=r.data)==null?void 0:b.type)===K.SCRIPT_STARTED_MESSAGE_TYPE,g=((C=r.data)==null?void 0:C.contentScriptName)===this.contentScriptName,A=!this.receivedMessageIds.has((d=r.data)==null?void 0:d.messageId);return s&&g&&A}listenForNewerScripts(r){let s=!0;const g=A=>{if(this.verifyScriptStartedEvent(A)){this.receivedMessageIds.add(A.data.messageId);const b=s;if(s=!1,b&&(r!=null&&r.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",g),this.onInvalidated(()=>removeEventListener("message",g))}};I(K,"SCRIPT_STARTED_MESSAGE_TYPE",ee("wxt:content-script-started"));let te=K;const me=Symbol("null");let ue=0;class pe extends Map{constructor(){super(),this._objectHashes=new WeakMap,this._symbolHashes=new Map,this._publicKeys=new Map;const[r]=arguments;if(r!=null){if(typeof r[Symbol.iterator]!="function")throw new TypeError(typeof r+" is not iterable (cannot read property Symbol(Symbol.iterator))");for(const[s,g]of r)this.set(s,g)}}_getPublicKeys(r,s=!1){if(!Array.isArray(r))throw new TypeError("The keys parameter must be an array");const g=this._getPrivateKey(r,s);let A;return g&&this._publicKeys.has(g)?A=this._publicKeys.get(g):s&&(A=[...r],this._publicKeys.set(g,A)),{privateKey:g,publicKey:A}}_getPrivateKey(r,s=!1){const g=[];for(let A of r){A===null&&(A=me);const b=typeof A=="object"||typeof A=="function"?"_objectHashes":typeof A=="symbol"?"_symbolHashes":!1;if(!b)g.push(A);else if(this[b].has(A))g.push(this[b].get(A));else if(s){const C=`@@mkm-ref-${ue++}@@`;this[b].set(A,C),g.push(C)}else return!1}return JSON.stringify(g)}set(r,s){const{publicKey:g}=this._getPublicKeys(r,!0);return super.set(g,s)}get(r){const{publicKey:s}=this._getPublicKeys(r);return super.get(s)}has(r){const{publicKey:s}=this._getPublicKeys(r);return super.has(s)}delete(r){const{publicKey:s,privateKey:g}=this._getPublicKeys(r);return!!(s&&super.delete(s)&&this._publicKeys.delete(g))}clear(){super.clear(),this._symbolHashes.clear(),this._publicKeys.clear()}get[Symbol.toStringTag](){return"ManyKeysMap"}get size(){return super.size}}new pe;function be(){}function Z(o,...r){}const Ae={debug:(...o)=>Z(console.debug,...o),log:(...o)=>Z(console.log,...o),warn:(...o)=>Z(console.warn,...o),error:(...o)=>Z(console.error,...o)};return(async()=>{try{const{main:o,...r}=ie,s=new te("content",r);return await o(s)}catch(o){throw Ae.error('The content script "content" crashed on startup!',o),o}})()}();
content;
