/**
 * UI Controller - Handles all interface logic and event listeners.
 */
class UI {
    constructor() {
        // Core Elements
        this.inventoryList = document.getElementById('inventory-list');
        this.addItemBtn = document.getElementById('add-item-btn');
        this.modalOverlay = document.getElementById('modal-container');
        this.addItemModal = document.getElementById('add-item-modal');
        this.closeModalBtn = document.getElementById('close-modal');
        this.addItemForm = document.getElementById('add-item-form');

        // Custom Dropdown Elements
        this.sortDropdownTrigger = document.getElementById('sort-trigger');
        this.sortMenu = document.getElementById('sort-menu');
        this.sortCurrentLabel = document.getElementById('sort-current');
        this.sortOptions = document.querySelectorAll('.dropdown-option');

        // Item Detail Modal
        this.detailModal = document.getElementById('item-detail-modal');
        this.closeDetailModalBtn = document.getElementById('close-detail-modal');
        this.deleteItemBtn = document.getElementById('delete-item-btn');
        this.editItemBtn = document.getElementById('edit-item-btn');

        // Confirmation Modal
        this.confirmDialog = document.getElementById('confirm-dialog');
        this.confirmMessage = document.getElementById('confirm-message');
        this.confirmCancelBtn = document.getElementById('confirm-cancel');
        this.confirmProceedBtn = document.getElementById('confirm-proceed');

        // Settings Modal
        this.settingsBtn = document.getElementById('settings-btn');
        this.settingsModal = document.getElementById('settings-modal');
        this.closeSettingsBtn = document.getElementById('close-settings');
        this.exportBtns = document.querySelectorAll('.btn-export');

        // Scroll Indicators
        this.scrollWrapper = document.querySelector('.scroll-wrapper');

        this.currentDetailId = null;
        this.currentEditId = null;
        this.isEditMode = false;
        this.currentChart = null;
        this.currentSort = 'newest';
        this.onConfirm = null;

        this.init();
    }

    /** Shorthand for translation */
    t(key) {
        return window.i18n.t(key);
    }

    init() {
        // Store subscriptions
        window.store.subscribe((items) => {
            this.renderInventory(this.sortItems(items));
            if (this.currentDetailId) {
                const updatedItem = items.find(i => i.id === this.currentDetailId);
                if (updatedItem) this.updateDetailModal(updatedItem);
            }
        });

        // i18n subscriptions — re-render everything when language changes
        window.i18n.subscribe(() => {
            this.refreshStaticUI();
            this.renderInventory(this.sortItems(window.store.items));
        });

        // Event Listeners
        this.addItemBtn.addEventListener('click', () => this.toggleModal(true));
        this.closeModalBtn.addEventListener('click', () => this.toggleModal(false));
        this.closeDetailModalBtn.addEventListener('click', () => this.toggleDetailModal(false));

        // Settings Listeners
        this.settingsBtn.addEventListener('click', () => this.toggleSettings(true));
        this.closeSettingsBtn.addEventListener('click', () => this.toggleSettings(false));
        this.exportBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                this.handleExport(format);
            });
        });

        // Custom Dropdown Listeners
        this.sortDropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.sortMenu.classList.toggle('hidden');
        });

        this.sortOptions.forEach(option => {
            option.addEventListener('click', () => {
                const val = option.dataset.value;
                this.currentSort = val;
                this.sortCurrentLabel.textContent = this.getSortLabel(val);

                // Update selection UI
                this.sortOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                this.sortMenu.classList.add('hidden');
                this.renderInventory(this.sortItems(window.store.items));
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (this.sortMenu) this.sortMenu.classList.add('hidden');
        });

        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.toggleModal(false);
                this.toggleDetailModal(false);
                this.toggleConfirmDialog(false);
            }
        });

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.toggleSettings(false);
        });

        this.addItemForm.addEventListener('submit', (e) => this.handleSaveItem(e));
        this.deleteItemBtn.addEventListener('click', () => this.handleDeleteItem());
        this.editItemBtn.addEventListener('click', () => this.handleEditItem());
        this.confirmCancelBtn.addEventListener('click', () => this.toggleConfirmDialog(false));
        this.confirmProceedBtn.addEventListener('click', () => {
            if (this.onConfirm) this.onConfirm();
            this.toggleConfirmDialog(false);
        });

        // Initialize scroll indicators
        this.inventoryList.addEventListener('scroll', () => this.handleScroll());
        this.handleScroll();

        // Language & Currency Selectors in Settings
        this.initLanguageSelector();
        this.initCurrencySelector();

        // Set initial static text
        this.refreshStaticUI();
    }

    /** Map sort value to its translated label */
    getSortLabel(value) {
        const map = {
            'newest': 'sortNewest',
            'most-used': 'sortMostUsed',
            'best-value': 'sortBestValue',
            'waste': 'sortWaste',
            'price': 'sortHighestPrice'
        };
        return this.t(map[value] || 'sortNewest');
    }

    /** Update all static (non-data-driven) text in the DOM */
    refreshStaticUI() {
        // Header
        document.querySelector('.app-header h1').textContent = this.t('appTitle');

        // Sort dropdown
        this.sortCurrentLabel.textContent = this.getSortLabel(this.currentSort);
        this.sortOptions.forEach(option => {
            option.textContent = this.getSortLabel(option.dataset.value);
        });

        // Settings sidebar
        document.querySelector('#settings-modal .sidebar-header h2').textContent = this.t('settingsTitle');
        document.querySelector('.settings-section h3').textContent = this.t('settingsDataMgmt');
        document.querySelector('.settings-desc').textContent = this.t('settingsDataDesc');

        // Language & Currency section titles
        const langTitle = document.getElementById('lang-section-title');
        if (langTitle) langTitle.textContent = this.t('settingsLanguage');
        const currencyTitle = document.getElementById('currency-section-title');
        if (currencyTitle) currencyTitle.textContent = this.t('settingsCurrency');

        // Update currency selector labels for the current language
        this.refreshCurrencyLabels();

        // Export buttons
        const exportKeys = [
            { format: 'json', label: 'exportJSON', desc: 'exportJSONDesc' },
            { format: 'csv', label: 'exportCSV', desc: 'exportCSVDesc' },
            { format: 'markdown', label: 'exportMarkdown', desc: 'exportMarkdownDesc' }
        ];
        this.exportBtns.forEach(btn => {
            const format = btn.dataset.format;
            const keys = exportKeys.find(k => k.format === format);
            if (keys) {
                btn.querySelector('.export-label').textContent = this.t(keys.label);
                btn.querySelector('.export-desc').textContent = this.t(keys.desc);
            }
        });

        // Confirm dialog static text
        document.querySelector('#confirm-dialog .modal-header h2').textContent = this.t('confirmTitle');
        this.confirmMessage.textContent = this.t('confirmDefault');
        this.confirmCancelBtn.textContent = this.t('confirmCancel');
        this.confirmProceedBtn.textContent = this.t('confirmDelete');

        // Detail modal static
        document.querySelector('#item-detail-modal .detail-stat-row .detail-label').textContent = this.t('currentCostPerUse');
        this.deleteItemBtn.textContent = this.t('btnDelete');
        this.editItemBtn.textContent = this.t('btnEdit');

        // Detail stat grid labels
        const detailLabels = document.querySelectorAll('.detail-stat-grid .detail-label');
        if (detailLabels[0]) detailLabels[0].textContent = this.t('labelPrice');
        if (detailLabels[1]) detailLabels[1].textContent = this.t('labelTotalUses');

        // Detail info list labels
        const infoLabels = document.querySelectorAll('.detail-info-list .detail-label');
        if (infoLabels[0]) infoLabels[0].textContent = this.t('labelNetCost');
        if (infoLabels[1]) infoLabels[1].textContent = this.t('labelCategoryDetail');
        if (infoLabels[2]) infoLabels[2].textContent = this.t('labelAddedOn');

        // Add/Edit Form labels
        document.querySelector('label[for="item-name"]').textContent = this.t('labelName');
        document.querySelector('label[for="item-price"]').textContent = this.t('labelBuyPrice');
        document.querySelector('label[for="item-resale"]').textContent = this.t('labelResale');
        document.querySelector('label[for="item-category"]').textContent = this.t('labelCategory');

        // Form placeholders
        document.getElementById('item-name').placeholder = this.t('placeholderName');
        document.getElementById('item-category').placeholder = this.t('placeholderCategory');

        // Update currency symbols in form
        const curObj = I18n.currencies.find(c => c.code === window.i18n.currentCurrency) || I18n.currencies[0];
        document.querySelectorAll('.currency-symbol').forEach(el => {
            el.textContent = curObj.symbol;
        });

        // Form button text (only if not in edit mode currently)
        const submitBtn = this.addItemForm.querySelector('.btn-submit');
        submitBtn.textContent = this.isEditMode ? this.t('btnUpdate') : this.t('btnSave');
        document.getElementById('modal-title').textContent = this.isEditMode ? this.t('editItem') : this.t('addNewItem');

        // Language section header
        const langHeader = document.getElementById('lang-section-title');
        if (langHeader) langHeader.textContent = this.t('settingsLanguage');
    }

    /** Initialize the language selector buttons in Settings */
    initLanguageSelector() {
        const langContainer = document.getElementById('language-selector');
        if (!langContainer) return;

        I18n.languages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-option' + (lang.code === window.i18n.currentLang ? ' active' : '');
            btn.dataset.lang = lang.code;
            btn.textContent = lang.label;
            btn.addEventListener('click', () => {
                window.i18n.setLanguage(lang.code);
                // Update active state
                langContainer.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            langContainer.appendChild(btn);
        });
    }

    /** Initialize the currency selector buttons in Settings */
    initCurrencySelector() {
        const container = document.getElementById('currency-selector');
        if (!container) return;

        I18n.currencies.forEach(cur => {
            const btn = document.createElement('button');
            btn.className = 'currency-option' + (cur.code === window.i18n.currentCurrency ? ' active' : '');
            btn.dataset.currency = cur.code;

            const names = I18n.currencyNames[window.i18n.currentLang] || I18n.currencyNames['en'];
            btn.innerHTML = `<span class="currency-sym">${cur.symbol}</span><span class="currency-name">${names[cur.code]}</span>`;

            btn.addEventListener('click', () => {
                window.i18n.setCurrency(cur.code);
                container.querySelectorAll('.currency-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            container.appendChild(btn);
        });
    }

    /** Update currency button labels when language changes */
    refreshCurrencyLabels() {
        const container = document.getElementById('currency-selector');
        if (!container) return;
        const names = I18n.currencyNames[window.i18n.currentLang] || I18n.currencyNames['en'];
        container.querySelectorAll('.currency-option').forEach(btn => {
            const code = btn.dataset.currency;
            const nameEl = btn.querySelector('.currency-name');
            if (nameEl && names[code]) nameEl.textContent = names[code];
        });
    }

    handleScroll() {
        if (!this.scrollWrapper) return;

        const { scrollTop, scrollHeight, clientHeight } = this.inventoryList;

        // Show top glow if NOT at the very top
        if (scrollTop > 5) {
            this.scrollWrapper.classList.add('has-scrolled-top');
        } else {
            this.scrollWrapper.classList.remove('has-scrolled-top');
        }

        // Show bottom glow if NOT at the very bottom
        if (scrollTop + clientHeight < scrollHeight - 5) {
            this.scrollWrapper.classList.add('has-scrolled-bottom');
        } else {
            this.scrollWrapper.classList.remove('has-scrolled-bottom');
        }
    }

    toggleSettings(show) {
        if (show) {
            this.settingsModal.classList.add('open');
            this.setScrollLock(true);
        } else {
            this.settingsModal.classList.remove('open');
            this.setScrollLock(false);
        }
    }

    handleExport(format) {
        const items = window.store.items;
        let content, fileName, mimeType;

        switch (format) {
            case 'json':
                content = window.exporter.toJSON(items);
                fileName = `cost-per-use-export-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
                break;
            case 'csv':
                content = window.exporter.toCSV(items);
                fileName = `cost-per-use-export-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
                break;
            case 'markdown':
                content = window.exporter.toMarkdown(items);
                fileName = `cost-per-use-report-${new Date().toISOString().split('T')[0]}.md`;
                mimeType = 'text/markdown';
                break;
        }

        if (content) {
            window.exporter.downloadFile(content, fileName, mimeType);
        }
    }

    toggleModal(show, editItem = null) {
        this.isEditMode = !!editItem;
        this.currentEditId = editItem ? editItem.id : null;

        if (show) {
            this.modalOverlay.classList.remove('hidden');
            this.addItemModal.classList.remove('hidden');
            this.detailModal.classList.add('hidden');

            const title = document.getElementById('modal-title');
            const submitBtn = this.addItemForm.querySelector('.btn-submit');

            if (this.isEditMode) {
                title.textContent = this.t('editItem');
                submitBtn.textContent = this.t('btnUpdate');
                document.getElementById('item-name').value = editItem.name;
                document.getElementById('item-price').value = editItem.price;
                document.getElementById('item-resale').value = editItem.resaleValue || '';
                document.getElementById('item-category').value = editItem.category || '';
            } else {
                title.textContent = this.t('addNewItem');
                submitBtn.textContent = this.t('btnSave');
                this.addItemForm.reset();
            }

            document.getElementById('item-name').focus();
            this.setScrollLock(true);
        } else {
            this.modalOverlay.classList.add('hidden');
            this.addItemModal.classList.add('hidden');
            this.addItemForm.reset();
            this.setScrollLock(false);
        }
    }

    toggleDetailModal(show, item = null) {
        if (show && item) {
            this.currentDetailId = item.id;
            this.updateDetailModal(item);
            this.modalOverlay.classList.remove('hidden');
            this.detailModal.classList.remove('hidden');
            this.addItemModal.classList.add('hidden');
            this.setScrollLock(true);
        } else {
            this.currentDetailId = null;
            this.modalOverlay.classList.add('hidden');
            this.detailModal.classList.add('hidden');
            this.setScrollLock(false);
        }
    }

    toggleConfirmDialog(show, message = '', onConfirm = null) {
        if (show) {
            this.confirmMessage.textContent = message;
            this.onConfirm = onConfirm;
            this.modalOverlay.classList.remove('hidden');
            this.confirmDialog.classList.remove('hidden');
            this.setScrollLock(true);
        } else {
            this.onConfirm = null;
            this.confirmDialog.classList.add('hidden');
            if (!this.currentDetailId) {
                this.modalOverlay.classList.add('hidden');
                this.setScrollLock(false);
            }
        }
    }

    updateDetailModal(item) {
        document.getElementById('detail-title').textContent = item.name;
        const netCost = item.price - (item.resaleValue || 0);
        const costPerUse = this.calculateCostPerUse(item);

        document.getElementById('detail-cost-value').textContent = this.formatCurrencyCompact(costPerUse);
        document.getElementById('detail-price-value').textContent = this.formatCurrencyCompact(item.price);
        document.getElementById('detail-uses-value').textContent = item.useCount;
        document.getElementById('detail-net-cost').textContent = this.formatCurrencyCompact(netCost);
        document.getElementById('detail-category-value').textContent = item.category || this.t('categoryNone');
        document.getElementById('detail-date-value').textContent = new Date(item.dateCreated).toLocaleDateString();

        this.renderChart(item);
    }

    renderChart(item) {
        const ctx = document.getElementById('usage-chart').getContext('2d');
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const labels = [];
        const grossData = [];
        const netData = [];

        const maxUses = Math.max(item.useCount, 1);
        const netCost = item.price - (item.resaleValue || 0);

        for (let i = 1; i <= maxUses; i++) {
            labels.push(`${this.t('btnUseLabel')} ${i}`);
            grossData.push(item.price / i);
            if (i === maxUses && (item.resaleValue || 0) > 0) {
                netData.push(netCost / i);
            } else {
                netData.push(null);
            }
        }

        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: this.t('graphGrossCPU'),
                        data: grossData,
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderDash: [5, 5],
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: this.t('graphTrueCost'),
                        data: netData,
                        borderColor: '#10b981',
                        backgroundColor: '#10b981',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: (item.resaleValue || 0) > 0,
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 10 },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                return `${label}: ${this.formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { display: maxUses < 10, color: '#64748b' }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#64748b',
                            callback: (val) => this.formatCurrency(val)
                        }
                    }
                }
            }
        });
    }

    sortItems(items) {
        const sorted = [...items];
        switch (this.currentSort) {
            case 'most-used': return sorted.sort((a, b) => b.useCount - a.useCount);
            case 'best-value': return sorted.sort((a, b) => this.calculateCostPerUse(a) - this.calculateCostPerUse(b));
            case 'waste': return sorted.sort((a, b) => this.calculateCostPerUse(b) - this.calculateCostPerUse(a));
            case 'price': return sorted.sort((a, b) => b.price - a.price);
            default: return sorted.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
        }
    }

    handleDeleteItem() {
        if (this.currentDetailId) {
            this.toggleConfirmDialog(true, this.t('confirmDeletePermanent'), () => {
                window.store.deleteItem(this.currentDetailId);
                this.toggleDetailModal(false);
            });
        }
    }

    handleEditItem() {
        if (this.currentDetailId) {
            const item = window.store.items.find(i => i.id === this.currentDetailId);
            if (item) this.toggleModal(true, item);
        }
    }

    handleSaveItem(e) {
        e.preventDefault();
        const name = document.getElementById('item-name').value;
        const price = document.getElementById('item-price').value;
        const resale = document.getElementById('item-resale').value;
        const category = document.getElementById('item-category').value;

        if (name && price) {
            const parsedPrice = Math.max(0, parseFloat(price));
            const parsedResale = Math.max(0, parseFloat(resale) || 0);

            if (this.isEditMode && this.currentEditId) {
                window.store.updateItem(this.currentEditId, {
                    name,
                    price: parsedPrice,
                    resaleValue: parsedResale,
                    category
                });
            } else {
                window.store.addItem(name, parsedPrice, category, parsedResale);
            }
            this.toggleModal(false);
        }
    }

    calculateCostPerUse(item) {
        const netCost = item.price - (item.resaleValue || 0);
        return item.useCount === 0 ? netCost : netCost / item.useCount;
    }

    formatCurrency(amount) {
        const cur = I18n.currencies.find(c => c.code === window.i18n.currentCurrency) || I18n.currencies[0];
        return new Intl.NumberFormat(cur.locale, { style: 'currency', currency: cur.code }).format(amount);
    }

    /** Compact display for large amounts (1M+). Uses the UI language for abbreviations. */
    formatCurrencyCompact(amount) {
        const abs = Math.abs(amount);
        if (abs < 1_000_000) return this.formatCurrency(amount);

        const cur = I18n.currencies.find(c => c.code === window.i18n.currentCurrency) || I18n.currencies[0];
        const lang = window.i18n.currentLang;
        return new Intl.NumberFormat(lang, {
            style: 'currency',
            currency: cur.code,
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1
        }).format(amount);
    }

    renderInventory(items) {
        if (items.length === 0) {
            this.inventoryList.innerHTML = `<div class="empty-state"><p>${this.t('emptyStateAction')}</p></div>`;
            return;
        }
        this.inventoryList.innerHTML = '';
        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'item-card animate-in';
            card.dataset.id = item.id; // Assign ID for targeted selection
            card.style.animationDelay = `${index * 0.05}s`;
            const costPerUse = this.calculateCostPerUse(item);
            const costLabel = item.useCount === 0 ? this.t('netCost') : this.t('costPerUse');
            card.innerHTML = `
                <div class="item-info">
                    <div class="item-header">
                        <span class="item-name">${item.name}</span>
                        ${item.category ? `<span class="item-category">${item.category}</span>` : ''}
                    </div>
                    <div class="item-stats">
                        <span class="cost-label">${costLabel}</span>
                        <span class="cost-value">${this.formatCurrencyCompact(costPerUse)}</span>
                        <div class="card-meta">
                            <span class="use-count">${item.useCount} ${this.t('uses')}</span>
                            ${item.resaleValue > 0 ? `<span class="resale-tag">${this.t('resalePrefix')}: ${this.formatCurrencyCompact(item.resaleValue)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button class="btn-use" data-id="${item.id}"><span>${this.t('btnUse')}</span><label>${this.t('btnUseLabel')}</label></button>
            `;
            card.querySelector('.btn-use').addEventListener('click', (e) => {
                e.stopPropagation();
                window.store.incrementUse(item.id, true); // Silent update
                this.updateItemCard(item.id); // Targeted DOM update
            });
            card.addEventListener('click', () => this.toggleDetailModal(true, item));
            this.inventoryList.appendChild(card);
        });

        // Update scroll indicators after rendering
        this.handleScroll();
    }

    /**
     * Surgically update a specific item card in the DOM.
     * Prevents full list re-renders on every "Use" click.
     */
    updateItemCard(id) {
        const item = window.store.items.find(i => i.id === id);
        if (!item) return;

        const card = this.inventoryList.querySelector(`.item-card[data-id="${id}"]`);
        if (!card) return;

        const costPerUse = this.calculateCostPerUse(item);

        // Update Labels
        const labelEl = card.querySelector('.cost-label');
        const valueEl = card.querySelector('.cost-value');
        const countEl = card.querySelector('.use-count');

        if (labelEl) labelEl.textContent = item.useCount === 0 ? this.t('netCost') : this.t('costPerUse');
        if (valueEl) valueEl.textContent = this.formatCurrencyCompact(costPerUse);
        if (countEl) countEl.textContent = `${item.useCount} ${this.t('uses')}`;

        // Scale effect for feedback
        card.classList.remove('pulse');
        void card.offsetWidth; // Trigger reflow
        card.classList.add('pulse');
    }

    /**
     * Prevents background scrolling when a modal or sidebar is open.
     */
    setScrollLock(lock) {
        if (lock) {
            document.body.style.overflow = 'hidden';
            if (this.inventoryList) this.inventoryList.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            if (this.inventoryList) this.inventoryList.style.overflow = 'auto';
        }
    }
}

window.ui = new UI();
