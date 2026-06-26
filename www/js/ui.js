/**
 * ui.js
 * UI helper functions: toast, modal, confirm, ripple, theme, formatting.
 */

const UI = (() => {
    'use strict';

    // ---------- TOAST ----------

    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {string} title
     * @param {number} duration
     */
    const showToast = (message, type = 'info', title = '', duration = 3500) => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-solid fa-check',
            error: 'fa-solid fa-xmark',
            warning: 'fa-solid fa-triangle-exclamation',
            info: 'fa-solid fa-circle-info'
        };
        const defaultTitles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-icon"><i class="${icons[type] || icons.info}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title || defaultTitles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        container.appendChild(toast);

        const remove = () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.toast-close').addEventListener('click', remove);
        setTimeout(remove, duration);
    };

    // ---------- MODAL ----------

    /** Open a modal by ID */
    const openModal = (id) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    /** Close a modal by ID */
    const closeModal = (id) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    /** Close all modals */
    const closeAllModals = () => {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
            m.setAttribute('aria-hidden', 'true');
        });
        document.body.style.overflow = '';
    };

    // ---------- CONFIRM ----------

    /**
     * Show a confirmation dialog
     * @param {string} message
     * @param {Function} onConfirm
     * @param {string} title
     */
    const confirm = (message, onConfirm, title = 'Are you sure?') => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOk');
        const cancelBtn = document.getElementById('confirmCancel');

        titleEl.textContent = title;
        messageEl.textContent = message;

        openModal('confirmModal');

        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            closeModal('confirmModal');
        };

        const handleOk = () => { cleanup(); onConfirm(); };
        const handleCancel = () => { cleanup(); };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
    };

    // ---------- RIPPLE EFFECT ----------

    /** Attach ripple effect to all buttons */
    const initRipple = () => {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn, .icon-btn, .action-btn, .nav-link');
            if (!btn) return;

            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    };

    // ---------- THEME ----------

    /** Apply theme to document */
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
        const toggle = document.getElementById('darkModeToggle');
        if (toggle) toggle.checked = theme === 'dark';
    };

    /** Toggle between light and dark */
    const toggleTheme = () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        Storage.updateSetting('theme', next);
        // Re-render charts with new theme
        if (typeof AppCharts !== 'undefined' && AppCharts.updateTheme) {
            AppCharts.updateTheme();
        }
    };

    // ---------- FORMAT HELPERS ----------

    /**
     * Format a number as currency
     * @param {number} amount
     * @param {string} currency
     * @returns {string}
     */
    const formatCurrency = (amount, currency = '$') => {
        const num = Number(amount) || 0;
        const formatted = Math.abs(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return (num < 0 ? '-' : '') + currency + formatted;
    };

    /**
     * Format a date string
     * @param {string} dateStr - ISO date string
     * @param {string} format - 'short' | 'long'
     * @returns {string}
     */
    const formatDate = (dateStr, format = 'short') => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        if (format === 'long') {
            return date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    /**
     * Get month/year label from date
     * @param {Date|string} date
     * @returns {string}
     */
    const getMonthYearLabel = (date) => {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    /**
     * Truncate text
     * @param {string} text
     * @param {number} max
     * @returns {string}
     */
    const truncate = (text, max = 40) => {
        if (!text) return '';
        return text.length > max ? text.substring(0, max) + '...' : text;
    };

    /**
     * Escape HTML to prevent XSS
     * @param {string} str
     * @returns {string}
     */
    const escapeHtml = (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // ---------- LOADER ----------

    const showLoader = () => {
        const loader = document.getElementById('loaderOverlay');
        if (loader) loader.classList.remove('hidden');
    };

    const hideLoader = () => {
        const loader = document.getElementById('loaderOverlay');
        if (loader) loader.classList.add('hidden');
    };

    // ---------- VALIDATION ----------

    /**
     * Set field error
     * @param {string} inputId
     * @param {string} errorId
     * @param {string} message
     */
    const setFieldError = (inputId, errorId, message) => {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        if (input) input.classList.add('invalid');
        if (error) error.textContent = message;
    };

    /** Clear field error */
    const clearFieldError = (inputId, errorId) => {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        if (input) input.classList.remove('invalid');
        if (error) error.textContent = '';
    };

    /** Clear all errors in a form */
    const clearFormErrors = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
        form.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    };

    // ---------- EXPORT ----------
    return {
        showToast,
        openModal,
        closeModal,
        closeAllModals,
        confirm,
        initRipple,
        applyTheme,
        toggleTheme,
        formatCurrency,
        formatDate,
        getMonthYearLabel,
        truncate,
        escapeHtml,
        showLoader,
        hideLoader,
        setFieldError,
        clearFieldError,
        clearFormErrors
    };
})();
