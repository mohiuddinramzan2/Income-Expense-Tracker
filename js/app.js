/**
 * app.js
 * Main application controller.
 * Handles navigation, form submissions, rendering, filters, exports.
 */

const App = (() => {
    'use strict';

    // Current state
    let currentTransactionType = 'income';
    let editingTransactionId = null;
    let editingCategoryId = null;
    let editingBudgetId = null;

    // ---------- INITIALIZATION ----------

    /** Initialize the app */
    const init = () => {
        UI.showLoader();

        // Apply saved theme
        const settings = Storage.getSettings();
        UI.applyTheme(settings.theme);

        // Initialize UI
        UI.initRipple();
        setupSidebar();
        setupNavigation();
        setupTopbar();
        setupModals();
        setupTransactionForm();
        setupCategoryForm();
        setupBudgetForm();
        setupSettings();
        setupFilters();
        setupExports();

        // Initial render
        renderAll();

        // Hide loader
        setTimeout(() => UI.hideLoader(), 400);

        // Welcome toast (only first visit)
        if (!localStorage.getItem('fintrack_welcomed')) {
            setTimeout(() => {
                UI.showToast('Welcome to FinTrack! Start by adding a transaction.', 'success', 'Hello!');
                localStorage.setItem('fintrack_welcomed', '1');
            }, 600);
        }
    };

    // ---------- SIDEBAR ----------

    const setupSidebar = () => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);

        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        const sidebarClose = document.getElementById('sidebarClose');

        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };
        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        menuToggle.addEventListener('click', openSidebar);
        sidebarClose.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);
    };

    // ---------- NAVIGATION ----------

    const setupNavigation = () => {
        const navLinks = document.querySelectorAll('.nav-link, .link-btn');
        const pageTitle = document.getElementById('pageTitle');

        const navigate = (section) => {
            // Update nav links
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
            if (activeLink) activeLink.classList.add('active');

            // Update sections
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(section + 'Section');
            if (target) target.classList.add('active');

            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                income: 'Income',
                expense: 'Expense',
                categories: 'Categories',
                budget: 'Budget',
                charts: 'Charts',
                reports: 'Reports',
                settings: 'Settings'
            };
            pageTitle.textContent = titles[section] || 'Dashboard';

            // Close sidebar on mobile
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebarOverlay')?.classList.remove('active');

            // Re-render charts when navigating to charts section
            if (section === 'charts' || section === 'dashboard') {
                setTimeout(() => AppCharts.renderAll(), 100);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.getAttribute('data-section');
                if (section) {
                    e.preventDefault();
                    navigate(section);
                }
            });
        });
    };

    // ---------- TOPBAR ----------

    const setupTopbar = () => {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', UI.toggleTheme);

        // Add transaction button
        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            openTransactionModal();
        });

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        let searchTimeout;
        globalSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim().toLowerCase();
                if (query.length > 0) {
                    // Navigate to reports and apply search
                    document.querySelector('.nav-link[data-section="reports"]').click();
                    document.getElementById('reportSearch').value = query;
                    renderReports();
                }
            }, 300);
        });

        // Chart period change
        document.getElementById('chartPeriod').addEventListener('change', (e) => {
            AppCharts.renderMonthlyChart(parseInt(e.target.value, 10));
        });
    };

    // ---------- MODALS ----------

    const setupModals = () => {
        // Close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) UI.closeModal(modal.id);
            });
        });

        // Click outside to close
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) UI.closeModal(overlay.id);
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') UI.closeAllModals();
        });

        // Open modal buttons (for income/expense sections)
        document.querySelectorAll('[data-open-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type') || 'income';
                openTransactionModal(null, type);
            });
        });

        // Add category button
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            openCategoryModal();
        });

        // Set budget button
        document.getElementById('setBudgetBtn').addEventListener('click', () => {
            openBudgetModal();
        });
    };

    // ---------- TRANSACTION FORM ----------

    const setupTransactionForm = () => {
        const form = document.getElementById('transactionForm');
        const typeButtons = document.querySelectorAll('.type-btn');
        const dateInput = document.getElementById('transactionDate');

        // Set default date to today
        dateInput.value = new Date().toISOString().split('T')[0];

        // Type toggle
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                typeButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                currentTransactionType = btn.getAttribute('data-type');
                populateCategorySelect();
            });
        });

        // Live validation clearing
        ['transactionTitle', 'transactionAmount', 'transactionDate', 'transactionCategory'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                UI.clearFieldError(id, id.replace('transaction', '').toLowerCase() + 'Error');
            });
        });

        // Form submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleTransactionSubmit();
        });
    };

    /** Populate category select based on current type */
    const populateCategorySelect = () => {
        const select = document.getElementById('transactionCategory');
        const categories = Storage.getCategories();
        const filtered = categories.filter(c =>
            c.type === currentTransactionType || c.type === 'both'
        );

        select.innerHTML = '<option value="">Select category</option>';
        filtered.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    };

    /** Open transaction modal (add or edit) */
    const openTransactionModal = (id = null, type = 'income') => {
        UI.clearFormErrors('transactionForm');
        const form = document.getElementById('transactionForm');
        form.reset();

        const title = document.getElementById('modalTitle');
        const dateInput = document.getElementById('transactionDate');
        dateInput.value = new Date().toISOString().split('T')[0];

        if (id) {
            // Edit mode
            const tx = Storage.getTransaction(id);
            if (!tx) return;
            editingTransactionId = id;
            title.textContent = 'Edit Transaction';
            document.getElementById('transactionId').value = id;
            document.getElementById('transactionTitle').value = tx.title;
            document.getElementById('transactionAmount').value = tx.amount;
            document.getElementById('transactionDate').value = tx.date;
            document.getElementById('transactionNote').value = tx.note || '';

            // Set type
            currentTransactionType = tx.type;
            document.querySelectorAll('.type-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-type') === tx.type);
                b.setAttribute('aria-selected', b.getAttribute('data-type') === tx.type ? 'true' : 'false');
            });

            populateCategorySelect();
            document.getElementById('transactionCategory').value = tx.categoryId;
        } else {
            // Add mode
            editingTransactionId = null;
            title.textContent = 'Add Transaction';
            document.getElementById('transactionId').value = '';
            currentTransactionType = type;
            document.querySelectorAll('.type-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-type') === type);
                b.setAttribute('aria-selected', b.getAttribute('data-type') === type ? 'true' : 'false');
            });
            populateCategorySelect();
        }

        UI.openModal('transactionModal');
        setTimeout(() => document.getElementById('transactionTitle').focus(), 200);
    };

    /** Handle transaction form submission */
    const handleTransactionSubmit = () => {
        UI.clearFormErrors('transactionForm');

        const title = document.getElementById('transactionTitle').value.trim();
        const amount = document.getElementById('transactionAmount').value;
        const date = document.getElementById('transactionDate').value;
        const categoryId = document.getElementById('transactionCategory').value;
        const note = document.getElementById('transactionNote').value.trim();

        let valid = true;

        if (!title) {
            UI.setFieldError('transactionTitle', 'titleError', 'Title is required');
            valid = false;
        } else if (title.length < 2) {
            UI.setFieldError('transactionTitle', 'titleError', 'Title must be at least 2 characters');
            valid = false;
        }

        if (!amount || Number(amount) <= 0) {
            UI.setFieldError('transactionAmount', 'amountError', 'Enter a valid amount');
            valid = false;
        }

        if (!date) {
            UI.setFieldError('transactionDate', 'dateError', 'Date is required');
            valid = false;
        }

        if (!categoryId) {
            UI.setFieldError('transactionCategory', 'categoryError', 'Please select a category');
            valid = false;
        }

        if (!valid) {
            UI.showToast('Please fix the errors in the form.', 'error');
            return;
        }

        const data = {
            type: currentTransactionType,
            title,
            amount: parseFloat(amount),
            date,
            categoryId,
            note
        };

        if (editingTransactionId) {
            Storage.updateTransaction(editingTransactionId, data);
            UI.showToast('Transaction updated successfully!', 'success');
        } else {
            Storage.addTransaction(data);
            UI.showToast('Transaction added successfully!', 'success');
        }

        UI.closeModal('transactionModal');
        renderAll();
    };

    /** Delete transaction with confirmation */
    const deleteTransaction = (id) => {
        UI.confirm(
            'This transaction will be permanently deleted.',
            () => {
                Storage.deleteTransaction(id);
                UI.showToast('Transaction deleted.', 'success');
                renderAll();
            },
            'Delete Transaction?'
        );
    };

    // ---------- CATEGORY FORM ----------

    const setupCategoryForm = () => {
        const form = document.getElementById('categoryForm');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleCategorySubmit();
        });
    };

    const openCategoryModal = (id = null) => {
        UI.clearFormErrors('categoryForm');
        const form = document.getElementById('categoryForm');
        form.reset();
        document.getElementById('categoryIcon').value = 'fa-solid fa-tag';
        document.getElementById('categoryColor').value = '#2563EB';

        const title = document.getElementById('categoryModalTitle');

        if (id) {
            const cat = Storage.getCategory(id);
            if (!cat) return;
            editingCategoryId = id;
            title.textContent = 'Edit Category';
            document.getElementById('categoryId').value = id;
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categoryIcon').value = cat.icon;
            document.getElementById('categoryColor').value = cat.color;
            document.getElementById('categoryType').value = cat.type;
        } else {
            editingCategoryId = null;
            title.textContent = 'Add Category';
            document.getElementById('categoryId').value = '';
        }

        UI.openModal('categoryModal');
    };

    const handleCategorySubmit = () => {
        UI.clearFormErrors('categoryForm');

        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value.trim() || 'fa-solid fa-tag';
        const color = document.getElementById('categoryColor').value;
        const type = document.getElementById('categoryType').value;

        if (!name) {
            UI.setFieldError('categoryName', 'categoryNameError', 'Category name is required');
            return;
        }
        if (name.length < 2) {
            UI.setFieldError('categoryName', 'categoryNameError', 'Name must be at least 2 characters');
            return;
        }

        const data = { name, icon, color, type };

        if (editingCategoryId) {
            Storage.updateCategory(editingCategoryId, data);
            UI.showToast('Category updated!', 'success');
        } else {
            Storage.addCategory(data);
            UI.showToast('Category added!', 'success');
        }

        UI.closeModal('categoryModal');
        renderAll();
    };

    const deleteCategory = (id) => {
        UI.confirm(
            'Delete this category? Transactions using it will keep their category reference.',
            () => {
                Storage.deleteCategory(id);
                UI.showToast('Category deleted.', 'success');
                renderAll();
            },
            'Delete Category?'
        );
    };

    // ---------- BUDGET FORM ----------

    const setupBudgetForm = () => {
        const form = document.getElementById('budgetForm');
        const typeSelect = document.getElementById('budgetType');
        const categoryGroup = document.getElementById('budgetCategoryGroup');

        typeSelect.addEventListener('change', () => {
            categoryGroup.style.display = typeSelect.value === 'category' ? 'block' : 'none';
            if (typeSelect.value === 'category') {
                populateBudgetCategorySelect();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleBudgetSubmit();
        });
    };

    const populateBudgetCategorySelect = () => {
        const select = document.getElementById('budgetCategory');
        const categories = Storage.getCategories().filter(c => c.type === 'expense' || c.type === 'both');
        select.innerHTML = '<option value="">Select category</option>';
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    };

    const openBudgetModal = (id = null) => {
        UI.clearFormErrors('budgetForm');
        const form = document.getElementById('budgetForm');
        form.reset();

        const title = document.getElementById('budgetModalTitle');
        const typeSelect = document.getElementById('budgetType');
        const categoryGroup = document.getElementById('budgetCategoryGroup');

        if (id) {
            const budget = Storage.getBudgets().find(b => b.id === id);
            if (!budget) return;
            editingBudgetId = id;
            title.textContent = 'Edit Budget';
            document.getElementById('budgetId').value = id;
            typeSelect.value = budget.type;
            document.getElementById('budgetAmount').value = budget.amount;
            if (budget.type === 'category') {
                categoryGroup.style.display = 'block';
                populateBudgetCategorySelect();
                document.getElementById('budgetCategory').value = budget.categoryId;
            } else {
                categoryGroup.style.display = 'none';
            }
        } else {
            editingBudgetId = null;
            title.textContent = 'Set Budget';
            document.getElementById('budgetId').value = '';
            typeSelect.value = 'monthly';
            categoryGroup.style.display = 'none';
        }

        UI.openModal('budgetModal');
    };

    const handleBudgetSubmit = () => {
        UI.clearFormErrors('budgetForm');

        const type = document.getElementById('budgetType').value;
        const amount = document.getElementById('budgetAmount').value;
        const categoryId = type === 'category' ? document.getElementById('budgetCategory').value : null;

        let valid = true;

        if (!amount || Number(amount) <= 0) {
            UI.setFieldError('budgetAmount', 'budgetAmountError', 'Enter a valid amount');
            valid = false;
        }
        if (type === 'category' && !categoryId) {
            UI.setFieldError('budgetCategory', 'budgetCategoryError', 'Select a category');
            valid = false;
        }

        if (!valid) return;

        const data = {
            type,
            amount: parseFloat(amount),
            categoryId: type === 'category' ? categoryId : null
        };

        Storage.addBudget(data);
        UI.showToast('Budget saved!', 'success');
        UI.closeModal('budgetModal');
        renderAll();
    };

    const deleteBudget = (id) => {
        UI.confirm(
            'Delete this budget?',
            () => {
                Storage.deleteBudget(id);
                UI.showToast('Budget deleted.', 'success');
                renderAll();
            },
            'Delete Budget?'
        );
    };

    // ---------- SETTINGS ----------

    const setupSettings = () => {
        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('change', UI.toggleTheme);

        // Currency change
        document.getElementById('currencySelect').addEventListener('change', (e) => {
            Storage.updateSetting('currency', e.target.value);
            UI.showToast('Currency updated!', 'success');
            renderAll();
        });

        // Delete all
        document.getElementById('deleteAllBtn').addEventListener('click', () => {
            UI.confirm(
                'This will permanently delete ALL your data including transactions, categories and budgets. This action cannot be undone.',
                () => {
                    Storage.clearAll();
                    UI.showToast('All data has been deleted.', 'success');
                    // Reinitialize defaults
                    Storage.getCategories();
                    renderAll();
                    document.getElementById('currencySelect').value = '$';
                },
                'Delete All Data?'
            );
        });

        // Load current settings into UI
        const settings = Storage.getSettings();
        document.getElementById('currencySelect').value = settings.currency;
    };

    // ---------- FILTERS ----------

    const setupFilters = () => {
        // Income filters
        ['incomeSearch', 'incomeCategory', 'incomeDateFrom', 'incomeDateTo'].forEach(id => {
            document.getElementById(id).addEventListener('input', renderIncome);
            document.getElementById(id).addEventListener('change', renderIncome);
        });
        document.getElementById('clearIncomeFilters').addEventListener('click', () => {
            ['incomeSearch', 'incomeCategory', 'incomeDateFrom', 'incomeDateTo'].forEach(id => {
                document.getElementById(id).value = '';
            });
            renderIncome();
        });

        // Expense filters
        ['expenseSearch', 'expenseCategory', 'expenseDateFrom', 'expenseDateTo'].forEach(id => {
            document.getElementById(id).addEventListener('input', renderExpense);
            document.getElementById(id).addEventListener('change', renderExpense);
        });
        document.getElementById('clearExpenseFilters').addEventListener('click', () => {
            ['expenseSearch', 'expenseCategory', 'expenseDateFrom', 'expenseDateTo'].forEach(id => {
                document.getElementById(id).value = '';
            });
            renderExpense();
        });

        // Report filters
        ['reportSearch', 'reportType', 'reportCategory', 'reportDateFrom', 'reportDateTo'].forEach(id => {
            document.getElementById(id).addEventListener('input', renderReports);
            document.getElementById(id).addEventListener('change', renderReports);
        });
        document.getElementById('clearReportFilters').addEventListener('click', () => {
            ['reportSearch', 'reportType', 'reportCategory', 'reportDateFrom', 'reportDateTo'].forEach(id => {
                document.getElementById(id).value = '';
            });
            renderReports();
        });
    };

    /** Apply filters to transactions */
    const applyFilters = (transactions, searchId, categoryId, dateFromId, dateToId, typeFilter = null) => {
        const search = document.getElementById(searchId).value.trim().toLowerCase();
        const category = document.getElementById(categoryId).value;
        const dateFrom = document.getElementById(dateFromId).value;
        const dateTo = document.getElementById(dateToId).value;

        return transactions.filter(t => {
            if (typeFilter && t.type !== typeFilter) return false;
            if (search && !t.title.toLowerCase().includes(search) &&
                !(t.note && t.note.toLowerCase().includes(search))) return false;
            if (category && t.categoryId !== category) return false;
            if (dateFrom && t.date < dateFrom) return false;
            if (dateTo && t.date > dateTo) return false;
            return true;
        });
    };

    // ---------- EXPORTS ----------

    const setupExports = () => {
        document.getElementById('exportCSV').addEventListener('click', exportCSV);
        document.getElementById('exportPDF').addEventListener('click', exportPDF);
    };

    const exportCSV = () => {
        const transactions = getFilteredReportTransactions();
        if (transactions.length === 0) {
            UI.showToast('No data to export.', 'warning');
            return;
        }

        const categories = Storage.getCategories();
        const currency = Storage.getSettings().currency;

        const headers = ['Date', 'Type', 'Title', 'Category', 'Note', 'Amount'];
        const rows = transactions.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return [
                t.date,
                t.type,
                `"${(t.title || '').replace(/"/g, '""')}"`,
                cat ? cat.name : '',
                `"${(t.note || '').replace(/"/g, '""')}"`,
                (t.type === 'expense' ? '-' : '') + currency + Number(t.amount).toFixed(2)
            ];
        });

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const filename = `fintrack-report-${new Date().toISOString().split('T')[0]}.csv`;

        saveFileToDevice(filename, csv, 'text/csv;charset=utf-8;', false).then(() => {
            UI.showToast('CSV exported successfully!', 'success');
        }).catch(err => {
            console.error('CSV export failed:', err);
            UI.showToast('Failed to export CSV.', 'error');
        });
    };

    // Detects whether we're running inside the Capacitor native app (Android/iOS)
    // or in a regular browser, and saves the file appropriately in each case.
    // base64Data should be true if `data` is already a base64 string (used for PDF),
    // false if `data` is plain text (used for CSV).
    const saveFileToDevice = async (filename, data, mimeType, isBase64) => {
        const isNativeApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

        if (isNativeApp) {
            // Running inside the Android/iOS app. Modern Android (10+) restricts
            // direct writes to Directory.Documents/ExternalStorage without extra
            // permissions, so we write to the app's private Cache directory
            // instead (no permissions needed) and then hand it off to the
            // system Share sheet, where the user can save it to Downloads,
            // Drive, WhatsApp, etc.
            const { Filesystem, Directory } = window.Capacitor.Plugins;
            const { Share } = window.Capacitor.Plugins;
            const base64Data = isBase64 ? data : btoa(unescape(encodeURIComponent(data)));

            await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache,
                recursive: true
            });

            const fileInfo = await Filesystem.getUri({ path: filename, directory: Directory.Cache });

            if (Share && Share.share) {
                await Share.share({ title: filename, url: fileInfo.uri });
            } else {
                UI.showToast(`Saved: ${filename}`, 'success');
            }
        } else {
            // Running in a regular browser: use the standard Blob download trick.
            const blobData = isBase64
                ? Uint8Array.from(atob(data), c => c.charCodeAt(0))
                : data;
            const blob = new Blob([blobData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const exportPDF = () => {
        if (typeof window.jspdf === 'undefined') {
            UI.showToast('PDF library not loaded. Please try again.', 'error');
            return;
        }

        const transactions = getFilteredReportTransactions();
        if (transactions.length === 0) {
            UI.showToast('No data to export.', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const categories = Storage.getCategories();
        const currency = Storage.getSettings().currency;

        // Title
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235);
        doc.text('FinTrack - Financial Report', 14, 20);

        // Date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

        // Summary
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`Total Transactions: ${transactions.length}`, 14, 36);
        doc.text(`Total Income: ${currency}${totalIncome.toFixed(2)}`, 14, 42);
        doc.text(`Total Expense: ${currency}${totalExpense.toFixed(2)}`, 14, 48);
        doc.text(`Balance: ${currency}${(totalIncome - totalExpense).toFixed(2)}`, 14, 54);

        // Table
        const tableData = transactions.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return [
                t.date,
                t.type.charAt(0).toUpperCase() + t.type.slice(1),
                UI.truncate(t.title, 25),
                cat ? cat.name : '-',
                UI.truncate(t.note || '-', 20),
                (t.type === 'expense' ? '-' : '') + currency + Number(t.amount).toFixed(2)
            ];
        });

        doc.autoTable({
            head: [['Date', 'Type', 'Title', 'Category', 'Note', 'Amount']],
            body: tableData,
            startY: 62,
            styles: { font: 'helvetica', fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        const filename = `fintrack-report-${new Date().toISOString().split('T')[0]}.pdf`;
        const pdfBase64 = doc.output('datauristring').split(',')[1];

        saveFileToDevice(filename, pdfBase64, 'application/pdf', true).then(() => {
            UI.showToast('PDF exported successfully!', 'success');
        }).catch(err => {
            console.error('PDF export failed:', err);
            UI.showToast('Failed to export PDF.', 'error');
        });
    };

    const getFilteredReportTransactions = () => {
        const transactions = Storage.getTransactions();
        const reportType = document.getElementById('reportType').value;
        return applyFilters(
            transactions,
            'reportSearch',
            'reportCategory',
            'reportDateFrom',
            'reportDateTo',
            reportType || null
        );
    };

    // ---------- RENDERING ----------

    /** Render everything */
    const renderAll = () => {
        renderDashboard();
        renderIncome();
        renderExpense();
        renderCategories();
        renderBudget();
        renderReports();
        populateFilterCategories();
        AppCharts.renderAll();
    };

    /** Populate filter category dropdowns */
    const populateFilterCategories = () => {
        const categories = Storage.getCategories();
        const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both');
        const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');

        const fillSelect = (id, cats) => {
            const select = document.getElementById(id);
            if (!select) return;
            const current = select.value;
            select.innerHTML = '<option value="">All Categories</option>';
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                select.appendChild(opt);
            });
            select.value = current;
        };

        fillSelect('incomeCategory', incomeCats);
        fillSelect('expenseCategory', expenseCats);
        fillSelect('reportCategory', categories);
    };

    /** Render dashboard stats and recent transactions */
    const renderDashboard = () => {
        const transactions = Storage.getTransactions();
        const currency = Storage.getSettings().currency;

        const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const balance = totalIncome - totalExpense;

        document.getElementById('totalBalance').textContent = UI.formatCurrency(balance, currency);
        document.getElementById('totalIncome').textContent = UI.formatCurrency(totalIncome, currency);
        document.getElementById('totalExpense').textContent = UI.formatCurrency(totalExpense, currency);
        document.getElementById('totalTransactions').textContent = transactions.length;

        // Calculate monthly trend
        const now = new Date();
        const thisMonth = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const lastMonth = transactions.filter(t => {
            const d = new Date(t.date);
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        });

        const thisMonthIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const lastMonthIncome = lastMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const thisMonthExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const lastMonthExpense = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

        const calcTrend = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev * 100).toFixed(1);
        };

        const incomeTrend = calcTrend(thisMonthIncome, lastMonthIncome);
        const expenseTrend = calcTrend(thisMonthExpense, lastMonthExpense);
        const balanceTrend = calcTrend(thisMonthIncome - thisMonthExpense, lastMonthIncome - lastMonthExpense);

        const setTrend = (id, value) => {
            const el = document.getElementById(id);
            const num = parseFloat(value);
            const isUp = num >= 0;
            el.className = `stat-trend ${isUp ? 'up' : 'down'}`;
            el.innerHTML = `<i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'}"></i> ${Math.abs(num)}% this month`;
        };

        setTrend('incomeTrend', incomeTrend);
        setTrend('expenseTrend', expenseTrend);
        setTrend('balanceTrend', balanceTrend);
        document.getElementById('transactionsTrend').innerHTML =
            `<i class="fa-solid fa-chart-line"></i> ${thisMonth.length} this month`;

        // Recent transactions
        const recent = transactions.slice(0, 6);
        const list = document.getElementById('recentTransactions');

        if (recent.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    <h3>No Transactions Yet</h3>
                    <p>Start tracking by adding your first transaction.</p>
                </div>
            `;
            return;
        }

        const categories = Storage.getCategories();
        list.innerHTML = recent.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const icon = cat ? cat.icon : 'fa-solid fa-circle';
            const color = cat ? cat.color : '#64748B';
            return `
                <li class="transaction-item">
                    <div class="tx-icon ${t.type}" style="background:${color}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="tx-info">
                        <div class="tx-title">${UI.escapeHtml(t.title)}</div>
                        <div class="tx-meta">
                            <span>${cat ? UI.escapeHtml(cat.name) : 'Unknown'}</span>
                            <span>•</span>
                            <span>${UI.formatDate(t.date)}</span>
                        </div>
                    </div>
                    <div class="tx-amount ${t.type}">
                        ${t.type === 'expense' ? '-' : '+'}${UI.formatCurrency(t.amount, currency)}
                    </div>
                </li>
            `;
        }).join('');
    };

    /** Render income table */
    const renderIncome = () => {
        const transactions = Storage.getTransactions().filter(t => t.type === 'income');
        const filtered = applyFilters(transactions, 'incomeSearch', 'incomeCategory', 'incomeDateFrom', 'incomeDateTo');
        renderTransactionTable(filtered, 'incomeTableBody', 'incomeEmpty');
    };

    /** Render expense table */
    const renderExpense = () => {
        const transactions = Storage.getTransactions().filter(t => t.type === 'expense');
        const filtered = applyFilters(transactions, 'expenseSearch', 'expenseCategory', 'expenseDateFrom', 'expenseDateTo');
        renderTransactionTable(filtered, 'expenseTableBody', 'expenseEmpty');
    };

    /** Render reports table */
    const renderReports = () => {
        const transactions = getFilteredReportTransactions();
        renderTransactionTable(transactions, 'reportTableBody', 'reportEmpty', true);
    };

    /** Generic transaction table renderer */
    const renderTransactionTable = (transactions, tbodyId, emptyId, showType = false) => {
        const tbody = document.getElementById(tbodyId);
        const empty = document.getElementById(emptyId);
        const currency = Storage.getSettings().currency;
        const categories = Storage.getCategories();

        if (transactions.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            tbody.parentElement.parentElement.querySelector('.data-table').style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        tbody.parentElement.parentElement.querySelector('.data-table').style.display = 'table';

        // Sort by date desc
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sorted.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            const typeBadge = showType ?
                `<span class="badge ${t.type}">${t.type}</span>` : '';
            return `
                <tr>
                    <td>${UI.formatDate(t.date)}</td>
                    ${showType ? `<td>${typeBadge}</td>` : ''}
                    <td><strong>${UI.escapeHtml(t.title)}</strong></td>
                    <td>
                        ${cat ? `
                            <span style="display:inline-flex;align-items:center;gap:6px;">
                                <span style="width:8px;height:8px;border-radius:50%;background:${cat.color};display:inline-block;"></span>
                                ${UI.escapeHtml(cat.name)}
                            </span>
                        ` : '-'}
                    </td>
                    <td>${UI.escapeHtml(UI.truncate(t.note || '-', 30))}</td>
                    <td class="text-right">
                        <strong class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                            ${t.type === 'expense' ? '-' : '+'}${UI.formatCurrency(t.amount, currency)}
                        </strong>
                    </td>
                    <td class="text-center">
                        <div class="action-btns">
                            <button class="action-btn edit" onclick="App.editTransaction('${t.id}')" aria-label="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="action-btn delete" onclick="App.deleteTransaction('${t.id}')" aria-label="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    /** Render categories */
    const renderCategories = () => {
        const categories = Storage.getCategories();
        const grid = document.getElementById('categoriesGrid');
        const transactions = Storage.getTransactions();

        grid.innerHTML = categories.map(c => {
            const count = transactions.filter(t => t.categoryId === c.id).length;
            return `
                <div class="category-card">
                    <div class="category-icon" style="background:${c.color}">
                        <i class="${c.icon}"></i>
                    </div>
                    <div class="category-info">
                        <div class="category-name">${UI.escapeHtml(c.name)}</div>
                        <div class="category-type">${c.type} • ${count} tx</div>
                    </div>
                    ${!c.default ? `
                        <div class="category-actions">
                            <button class="action-btn edit" onclick="App.editCategory('${c.id}')" aria-label="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="action-btn delete" onclick="App.deleteCategory('${c.id}')" aria-label="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    };

    /** Render budget section */
    const renderBudget = () => {
        const budgets = Storage.getBudgets();
        const transactions = Storage.getTransactions();
        const categories = Storage.getCategories();
        const currency = Storage.getSettings().currency;
        const now = new Date();

        // Current month expenses
        const currentMonthExpenses = transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        // Monthly budget
        const monthlyBudget = budgets.find(b => b.type === 'monthly');
        const budgetSpentEl = document.getElementById('budgetSpent');
        const budgetTotalEl = document.getElementById('budgetTotal');
        const budgetProgressEl = document.getElementById('budgetProgressBar');
        const budgetRemainingEl = document.getElementById('budgetRemaining');
        const budgetPercentEl = document.getElementById('budgetPercent');

        if (monthlyBudget) {
            const totalSpent = currentMonthExpenses.reduce((s, t) => s + Number(t.amount), 0);
            const percent = Math.min((totalSpent / monthlyBudget.amount) * 100, 100);
            const remaining = monthlyBudget.amount - totalSpent;

            budgetSpentEl.textContent = UI.formatCurrency(totalSpent, currency);
            budgetTotalEl.textContent = UI.formatCurrency(monthlyBudget.amount, currency);
            budgetProgressEl.style.width = percent + '%';
            budgetProgressEl.className = 'progress-fill' +
                (percent >= 100 ? ' danger' : percent >= 75 ? ' warning' : '');
            budgetRemainingEl.textContent = `${UI.formatCurrency(Math.abs(remaining), currency)} ${remaining >= 0 ? 'remaining' : 'over budget'}`;
            budgetPercentEl.textContent = percent.toFixed(1) + '%';
        } else {
            budgetSpentEl.textContent = UI.formatCurrency(0, currency);
            budgetTotalEl.textContent = UI.formatCurrency(0, currency);
            budgetProgressEl.style.width = '0%';
            budgetRemainingEl.textContent = 'No budget set';
            budgetPercentEl.textContent = '0%';
        }

        // Category budgets
        const budgetList = document.getElementById('budgetList');
        const budgetEmpty = document.getElementById('budgetEmpty');
        const categoryBudgets = budgets.filter(b => b.type === 'category');

        if (categoryBudgets.length === 0 && !monthlyBudget) {
            budgetList.innerHTML = '';
            budgetEmpty.style.display = 'block';
            return;
        }
        budgetEmpty.style.display = 'none';

        budgetList.innerHTML = categoryBudgets.map(b => {
            const cat = categories.find(c => c.id === b.categoryId);
            if (!cat) return '';
            const spent = currentMonthExpenses
                .filter(t => t.categoryId === b.categoryId)
                .reduce((s, t) => s + Number(t.amount), 0);
            const percent = Math.min((spent / b.amount) * 100, 100);

            return `
                <li class="budget-item">
                    <div class="budget-item-header">
                        <div class="budget-item-title">
                            <span style="width:10px;height:10px;border-radius:50%;background:${cat.color};display:inline-block;"></span>
                            ${UI.escapeHtml(cat.name)}
                        </div>
                        <div class="budget-item-actions">
                            <button class="action-btn edit" onclick="App.editBudget('${b.id}')" aria-label="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="action-btn delete" onclick="App.deleteBudget('${b.id}')" aria-label="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="budget-item-amount">
                        ${UI.formatCurrency(spent, currency)} of ${UI.formatCurrency(b.amount, currency)}
                    </div>
                    <div class="progress-bar" style="margin-top:10px;">
                        <div class="progress-fill ${percent >= 100 ? 'danger' : percent >= 75 ? 'warning' : ''}"
                             style="width:${percent}%"></div>
                    </div>
                </li>
            `;
        }).join('');
    };

    // ---------- PUBLIC API ----------

    return {
        init,
        editTransaction: (id) => openTransactionModal(id),
        deleteTransaction,
        editCategory: (id) => openCategoryModal(id),
        deleteCategory,
        editBudget: (id) => openBudgetModal(id),
        deleteBudget
    };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
