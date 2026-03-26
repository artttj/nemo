(function() {
    'use strict';

    const STATE = {
        locked: true,
        credentials: [],
        filter: 'all',
        search: '',
        expandedItem: null
    };

    const DOM = {
        lockedScreen: document.getElementById('locked-screen'),
        vaultScreen: document.getElementById('vault-screen'),
        vaultList: document.querySelector('[data-list="credentials"]'),
        searchInput: document.querySelector('[data-input="search"]'),
        filterBtns: document.querySelectorAll('[data-filter]')
    };

    const ICONS = {
        login: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
        card: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>`,
        note: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
        copy: `<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
        chevron: `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`
    };

    function init() {
        loadState();
        bindEvents();
        render();
    }

    function loadState() {
        chrome.storage.local.get(['locked', 'credentials'], (result) => {
            STATE.locked = result.locked !== false;
            STATE.credentials = result.credentials || [];
            updateScreen();
        });
    }

    function saveState() {
        chrome.storage.local.set({
            locked: STATE.locked,
            credentials: STATE.credentials
        });
    }

    function bindEvents() {
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]');
            if (!action) return;

            const actionType = action.dataset.action;

            switch (actionType) {
                case 'unlock':
                    unlock();
                    break;
                case 'lock':
                    lock();
                    break;
                case 'add':
                    addSampleCredential();
                    break;
                case 'sync':
                case 'biometric':
                case 'recover':
                    break;
            }
        });

        document.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('[data-filter]');
            if (!filterBtn) return;

            DOM.filterBtns.forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            STATE.filter = filterBtn.dataset.filter;
            STATE.expandedItem = null;
            render();
        });

        document.addEventListener('input', (e) => {
            if (e.target.dataset.input === 'search') {
                STATE.search = e.target.value.toLowerCase();
                STATE.expandedItem = null;
                render();
            }
        });

        DOM.vaultList.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.copy-btn');
            if (copyBtn) {
                const value = copyBtn.dataset.value;
                if (value) {
                    navigator.clipboard.writeText(value);
                    copyBtn.style.color = 'var(--accent)';
                    setTimeout(() => {
                        copyBtn.style.color = '';
                    }, 500);
                }
                e.stopPropagation();
                return;
            }

            const item = e.target.closest('.list-item');
            if (!item) return;

            const itemId = item.dataset.id;
            toggleItem(itemId);
        });
    }

    function unlock() {
        STATE.locked = false;
        saveState();
        updateScreen();
    }

    function lock() {
        STATE.locked = true;
        STATE.expandedItem = null;
        saveState();
        updateScreen();
    }

    function updateScreen() {
        DOM.lockedScreen.classList.toggle('active', STATE.locked);
        DOM.vaultScreen.classList.toggle('active', !STATE.locked);
    }

    function toggleItem(itemId) {
        if (STATE.expandedItem === itemId) {
            STATE.expandedItem = null;
        } else {
            STATE.expandedItem = itemId;
        }
        render();
    }

    function addSampleCredential() {
        const samples = [
            { title: 'GitHub', username: 'johndoe', url: 'github.com', type: 'login' },
            { title: 'AWS Console', username: 'dev@nemo.io', url: 'aws.amazon.com', type: 'login' },
            { title: 'Stripe', username: 'nemo-inc', url: 'dashboard.stripe.com', type: 'login' },
            { title: 'Visa •••• 4242', number: '4242 4242 4242 4242', type: 'card' },
            { title: 'WiFi Password', value: 'super-secret-2026', type: 'note' }
        ];

        const sample = samples.find(s => !STATE.credentials.find(c => c.title === s.title));
        if (sample) {
            STATE.credentials.push({
                id: Date.now().toString(),
                ...sample
            });
            saveState();
            render();
        }
    }

    function deleteCredential(id) {
        STATE.credentials = STATE.credentials.filter(c => c.id !== id);
        STATE.expandedItem = null;
        saveState();
        render();
    }

    function render() {
        let filtered = STATE.credentials;

        if (STATE.filter !== 'all') {
            filtered = filtered.filter(c => c.type === STATE.filter);
        }

        if (STATE.search) {
            filtered = filtered.filter(c =>
                c.title.toLowerCase().includes(STATE.search) ||
                (c.username && c.username.toLowerCase().includes(STATE.search)) ||
                (c.url && c.url.toLowerCase().includes(STATE.search))
            );
        }

        if (filtered.length === 0) {
            DOM.vaultList.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <p class="empty-text">No credentials ${STATE.search ? 'found' : 'yet'}</p>
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(cred => {
            const isExpanded = STATE.expandedItem === cred.id;
            const subtext = cred.username || cred.url || cred.type;

            html += `
                <div class="list-item ${isExpanded ? 'selected' : ''}" data-id="${cred.id}">
                    <div class="item-icon">${ICONS[cred.type] || ICONS.login}</div>
                    <div class="item-content">
                        <div class="item-title">${cred.title}</div>
                        <div class="item-subtext">${subtext}</div>
                    </div>
                    <div class="item-actions">
                        <button class="item-action-btn" title="Copy password">
                            ${ICONS.copy}
                        </button>
                        ${ICONS.chevron}
                    </div>
                </div>
                <div class="item-detail ${isExpanded ? 'expanded' : ''}">
                    ${renderDetail(cred)}
                </div>
            `;
        });

        DOM.vaultList.innerHTML = html;
    }

    function renderDetail(cred) {
        let rows = '';

        if (cred.username) {
            rows += `
                <div class="detail-row">
                    <span class="detail-label">Username</span>
                    <span class="detail-value">
                        ${cred.username}
                        <button class="copy-btn" data-value="${cred.username}">${ICONS.copy}</button>
                    </span>
                </div>
            `;
        }

        if (cred.password) {
            rows += `
                <div class="detail-row">
                    <span class="detail-label">Password</span>
                    <span class="detail-value">
                        ••••••••••••
                        <button class="copy-btn" data-value="${cred.password}">${ICONS.copy}</button>
                    </span>
                </div>
            `;
        }

        if (cred.number) {
            rows += `
                <div class="detail-row">
                    <span class="detail-label">Number</span>
                    <span class="detail-value">
                        ${cred.number}
                        <button class="copy-btn" data-value="${cred.number}">${ICONS.copy}</button>
                    </span>
                </div>
            `;
        }

        if (cred.url) {
            rows += `
                <div class="detail-row">
                    <span class="detail-label">URL</span>
                    <span class="detail-value">${cred.url}</span>
                </div>
            `;
        }

        if (cred.value) {
            rows += `
                <div class="detail-row">
                    <span class="detail-label">Value</span>
                    <span class="detail-value">
                        ${cred.value}
                        <button class="copy-btn" data-value="${cred.value}">${ICONS.copy}</button>
                    </span>
                </div>
            `;
        }

        return `
            ${rows}
            <div class="detail-actions">
                <button class="detail-btn" data-action="edit">Edit</button>
                <button class="detail-btn danger" data-action="delete" data-id="${cred.id}">Delete</button>
            </div>
        `;
    }

    init();
})();
