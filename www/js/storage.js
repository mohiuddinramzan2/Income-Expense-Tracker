/**
 * storage.js
 * Handles all localStorage operations for the Income & Expense Tracker.
 * Provides a clean API for CRUD operations on transactions, categories, budgets and settings.
 */

const Storage = (() => {
    'use strict';

    // Storage Keys
    const KEYS = {
        TRANSACTIONS: 'fintrack_transactions',
        CATEGORIES: 'fintrack_categories',
        BUDGETS: 'fintrack_budgets',
        SETTINGS: 'fintrack_settings'
    };

    // Default Categories
    const DEFAULT_CATEGORIES = [
        { id: 'cat_food', name: 'Food', icon: 'fa-solid fa-utensils', color: '#F59E0B', type: 'expense', default: true },
        { id: 'cat_shopping', name: 'Shopping', icon: 'fa-solid fa-bag-shopping', color: '#EC4899', type: 'expense', default: true },
        { id: 'cat_transport', name: 'Transport', icon: 'fa-solid fa-car', color: '#06B6D4', type: 'expense', default: true },
        { id: 'cat_bills', name: 'Bills', icon: 'fa-solid fa-file-invoice-dollar', color: '#EF4444', type: 'expense', default: true },
        { id: 'cat_health', name: 'Health', icon: 'fa-solid fa-heart-pulse', color: '#22C55E', type: 'expense', default: true },
        { id: 'cat_education', name: 'Education', icon: 'fa-solid fa-graduation-cap', color: '#8B5CF6', type: 'expense', default: true },
        { id: 'cat_salary', name: 'Salary', icon: 'fa-solid fa-money-bill-wave', color: '#10B981', type: 'income', default: true },
        { id: 'cat_business', name: 'Business', icon: 'fa-solid fa-briefcase', color: '#2563EB', type: 'income', default: true },
        { id: 'cat_freelance', name: 'Freelance', icon: 'fa-solid fa-laptop-code', color: '#6366F1', type: 'income', default: true },
        { id: 'cat_others', name: 'Others', icon: 'fa-solid fa-ellipsis', color: '#64748B', type: 'both', default: true }
    ];

    // Default Settings
    const DEFAULT_SETTINGS = {
        theme: 'light',
        currency: '$'
    };

    /**
     * Safely get item from localStorage
     * @param {string} key
     * @param {*} fallback
     * @returns {*}
     */
    const getItem = (key, fallback = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (err) {
            console.error(`Storage.getItem error for ${key}:`, err);
            return fallback;
        }
    };

    /**
     * Safely set item to localStorage
     * @param {string} key
     * @param {*} value
     */
    const setItem = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
            console.error(`Storage.setItem error for ${key}:`, err);
        }
    };

    /**
     * Remove item from localStorage
     * @param {string} key
     */
    const removeItem = (key) => {
        try {
            localStorage.removeItem(key);
        } catch (err) {
            console.error(`Storage.removeItem error for ${key}:`, err);
        }
    };

    // ---------- TRANSACTIONS ----------

    /** Get all transactions */
    const getTransactions = () => getItem(KEYS.TRANSACTIONS, []);

    /** Save all transactions */
    const saveTransactions = (transactions) => setItem(KEYS.TRANSACTIONS, transactions);

    /** Add a new transaction */
    const addTransaction = (transaction) => {
        const transactions = getTransactions();
        const newTx = {
            id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            ...transaction,
            createdAt: new Date().toISOString()
        };
        transactions.unshift(newTx);
        saveTransactions(transactions);
        return newTx;
    };

    /** Update an existing transaction */
    const updateTransaction = (id, updates) => {
        const transactions = getTransactions();
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], ...updates, updatedAt: new Date().toISOString() };
            saveTransactions(transactions);
            return transactions[index];
        }
        return null;
    };

    /** Delete a transaction */
    const deleteTransaction = (id) => {
        const transactions = getTransactions();
        const filtered = transactions.filter(t => t.id !== id);
        saveTransactions(filtered);
        return filtered.length < transactions.length;
    };

    /** Get transaction by ID */
    const getTransaction = (id) => {
        return getTransactions().find(t => t.id === id) || null;
    };

    // ---------- CATEGORIES ----------

    /** Get all categories (initialize with defaults if empty) */
    const getCategories = () => {
        let categories = getItem(KEYS.CATEGORIES, null);
        if (!categories) {
            categories = DEFAULT_CATEGORIES;
            saveCategories(categories);
        }
        return categories;
    };

    /** Save all categories */
    const saveCategories = (categories) => setItem(KEYS.CATEGORIES, categories);

    /** Add a new category */
    const addCategory = (category) => {
        const categories = getCategories();
        const newCat = {
            id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            ...category,
            default: false
        };
        categories.push(newCat);
        saveCategories(categories);
        return newCat;
    };

    /** Update a category */
    const updateCategory = (id, updates) => {
        const categories = getCategories();
        const index = categories.findIndex(c => c.id === id);
        if (index !== -1) {
            categories[index] = { ...categories[index], ...updates };
            saveCategories(categories);
            return categories[index];
        }
        return null;
    };

    /** Delete a category */
    const deleteCategory = (id) => {
        const categories = getCategories();
        const filtered = categories.filter(c => c.id !== id);
        saveCategories(filtered);
        return filtered.length < categories.length;
    };

    /** Get category by ID */
    const getCategory = (id) => {
        return getCategories().find(c => c.id === id) || null;
    };

    // ---------- BUDGETS ----------

    /** Get all budgets */
    const getBudgets = () => getItem(KEYS.BUDGETS, []);

    /** Save all budgets */
    const saveBudgets = (budgets) => setItem(KEYS.BUDGETS, budgets);

    /** Add a budget */
    const addBudget = (budget) => {
        const budgets = getBudgets();
        const newBudget = {
            id: 'bud_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            ...budget
        };
        // If monthly budget exists, replace it
        if (budget.type === 'monthly') {
            const existing = budgets.findIndex(b => b.type === 'monthly');
            if (existing !== -1) {
                budgets[existing] = newBudget;
                saveBudgets(budgets);
                return newBudget;
            }
        }
        // If category budget for same category exists, replace
        if (budget.type === 'category') {
            const existing = budgets.findIndex(b => b.type === 'category' && b.categoryId === budget.categoryId);
            if (existing !== -1) {
                budgets[existing] = newBudget;
                saveBudgets(budgets);
                return newBudget;
            }
        }
        budgets.push(newBudget);
        saveBudgets(budgets);
        return newBudget;
    };

    /** Delete a budget */
    const deleteBudget = (id) => {
        const budgets = getBudgets();
        const filtered = budgets.filter(b => b.id !== id);
        saveBudgets(filtered);
        return filtered.length < budgets.length;
    };

    // ---------- SETTINGS ----------

    /** Get settings */
    const getSettings = () => {
        let settings = getItem(KEYS.SETTINGS, null);
        if (!settings) {
            settings = DEFAULT_SETTINGS;
            saveSettings(settings);
        }
        return settings;
    };

    /** Save settings */
    const saveSettings = (settings) => setItem(KEYS.SETTINGS, settings);

    /** Update a single setting */
    const updateSetting = (key, value) => {
        const settings = getSettings();
        settings[key] = value;
        saveSettings(settings);
        return settings;
    };

    // ---------- CLEAR ALL ----------

    /** Clear all data */
    const clearAll = () => {
        Object.values(KEYS).forEach(key => removeItem(key));
    };

    // Public API
    return {
        getTransactions,
        saveTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransaction,

        getCategories,
        saveCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategory,

        getBudgets,
        saveBudgets,
        addBudget,
        deleteBudget,

        getSettings,
        saveSettings,
        updateSetting,

        clearAll,
        DEFAULT_CATEGORIES
    };
})();
