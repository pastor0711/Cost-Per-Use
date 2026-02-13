/**
 * Store Logic - Handles data persistence and state.
 */
class Store {
    constructor() {
        this.items = this.load();
        this.listeners = [];
        this.version = "1.0";
    }

    load() {
        const saved = localStorage.getItem('cost_per_use_data');
        let items = saved ? JSON.parse(saved) : [];

        // Guard against corrupted data
        if (!Array.isArray(items)) items = [];

        // Migration: Ensure all items have new fields
        return items.map(item => ({
            ...item,
            resaleValue: item.resaleValue || 0,
            usageHistory: item.usageHistory || []
        }));
    }

    save(silent = false) {
        localStorage.setItem('cost_per_use_data', JSON.stringify(this.items));
        if (!silent) this.notify();
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.items);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.items));
    }

    addItem(name, price, category = '', resaleValue = 0) {
        const newItem = {
            id: crypto.randomUUID(),
            name,
            price: parseFloat(price),
            resaleValue: parseFloat(resaleValue) || 0,
            category,
            useCount: 0,
            usageHistory: [],
            dateCreated: new Date().toISOString(),
            lastUsed: null
        };
        this.items.unshift(newItem);
        this.save();
    }

    incrementUse(id, silent = false) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.useCount++;
            item.lastUsed = new Date().toISOString();
            if (!item.usageHistory) item.usageHistory = [];
            item.usageHistory.push(Date.now());
            this.save(silent);
        }
    }

    deleteItem(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.save();
    }

    updateItem(id, updates) {
        const index = this.items.findIndex(i => i.id === id);
        if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updates };
            this.save();
        }
    }
}

// Global instance for other scripts to use
window.store = new Store();
