/**
 * chart.js
 * Handles all Chart.js rendering: pie charts, bar charts, monthly reports.
 */

const AppCharts = (() => {
    'use strict';

    // Chart instances
    let monthlyChart = null;
    let expensePieChart = null;
    let incomePieChart = null;
    let monthlyReportChart = null;

    // Color palette
    const COLORS = [
        '#2563EB', '#22C55E', '#EF4444', '#F59E0B', '#06B6D4',
        '#8B5CF6', '#EC4899', '#10B981', '#6366F1', '#64748B',
        '#14B8A6', '#F97316', '#A855F7', '#3B82F6', '#84CC16'
    ];

    /** Get current theme colors */
    const getThemeColors = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            text: isDark ? '#F1F5F9' : '#0F172A',
            textMuted: isDark ? '#94A3B8' : '#64748B',
            grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(15, 23, 42, 0.06)',
            bg: isDark ? '#111827' : '#FFFFFF'
        };
    };

    /** Common chart options */
    const commonOptions = () => {
        const theme = getThemeColors();
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: theme.text,
                        font: { family: 'Poppins', size: 12 },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: theme.bg,
                    titleColor: theme.text,
                    bodyColor: theme.textMuted,
                    borderColor: theme.grid,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: 'Poppins', weight: '600' },
                    bodyFont: { family: 'Poppins' },
                    displayColors: true,
                    boxPadding: 6
                }
            }
        };
    };

    /**
     * Render the monthly overview bar chart (Dashboard)
     * @param {number} months - number of months to display
     */
    const renderMonthlyChart = (months = 6) => {
        const canvas = document.getElementById('monthlyChart');
        if (!canvas) return;

        const transactions = Storage.getTransactions();
        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(d.toLocaleDateString('en-US', { month: 'short' }));

            const monthIncome = transactions
                .filter(t => {
                    const td = new Date(t.date);
                    return t.type === 'income' &&
                        td.getMonth() === d.getMonth() &&
                        td.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const monthExpense = transactions
                .filter(t => {
                    const td = new Date(t.date);
                    return t.type === 'expense' &&
                        td.getMonth() === d.getMonth() &&
                        td.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + Number(t.amount), 0);

            incomeData.push(monthIncome);
            expenseData.push(monthExpense);
        }

        const theme = getThemeColors();

        if (monthlyChart) monthlyChart.destroy();
        monthlyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderColor: '#22C55E',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: '#EF4444',
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                ...commonOptions(),
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textMuted, font: { family: 'Poppins' } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: theme.grid },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Poppins' },
                            callback: (v) => Storage.getSettings().currency + v
                        }
                    }
                },
                plugins: {
                    ...commonOptions().plugins,
                    legend: {
                        ...commonOptions().plugins.legend,
                        position: 'top'
                    }
                }
            }
        });
    };

    /**
     * Render pie chart for expense by category
     */
    const renderExpensePieChart = () => {
        const canvas = document.getElementById('expensePieChart');
        if (!canvas) return;

        const transactions = Storage.getTransactions().filter(t => t.type === 'expense');
        const categories = Storage.getCategories();

        const categoryTotals = {};
        transactions.forEach(t => {
            categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + Number(t.amount);
        });

        const labels = [];
        const data = [];
        const colors = [];

        Object.keys(categoryTotals).forEach((catId, idx) => {
            const cat = categories.find(c => c.id === catId);
            labels.push(cat ? cat.name : 'Unknown');
            data.push(categoryTotals[catId]);
            colors.push(cat ? cat.color : COLORS[idx % COLORS.length]);
        });

        if (expensePieChart) expensePieChart.destroy();

        if (data.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const theme = getThemeColors();
            ctx.fillStyle = theme.textMuted;
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('No expense data', canvas.width / 2, canvas.height / 2);
            return;
        }

        expensePieChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: getThemeColors().bg,
                    hoverOffset: 10
                }]
            },
            options: {
                ...commonOptions(),
                cutout: '65%',
                plugins: {
                    ...commonOptions().plugins,
                    legend: {
                        ...commonOptions().plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    };

    /**
     * Render pie chart for income by category
     */
    const renderIncomePieChart = () => {
        const canvas = document.getElementById('incomePieChart');
        if (!canvas) return;

        const transactions = Storage.getTransactions().filter(t => t.type === 'income');
        const categories = Storage.getCategories();

        const categoryTotals = {};
        transactions.forEach(t => {
            categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + Number(t.amount);
        });

        const labels = [];
        const data = [];
        const colors = [];

        Object.keys(categoryTotals).forEach((catId, idx) => {
            const cat = categories.find(c => c.id === catId);
            labels.push(cat ? cat.name : 'Unknown');
            data.push(categoryTotals[catId]);
            colors.push(cat ? cat.color : COLORS[idx % COLORS.length]);
        });

        if (incomePieChart) incomePieChart.destroy();

        if (data.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const theme = getThemeColors();
            ctx.fillStyle = theme.textMuted;
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('No income data', canvas.width / 2, canvas.height / 2);
            return;
        }

        incomePieChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 3,
                    borderColor: getThemeColors().bg,
                    hoverOffset: 10
                }]
            },
            options: {
                ...commonOptions(),
                cutout: '65%',
                plugins: {
                    ...commonOptions().plugins,
                    legend: {
                        ...commonOptions().plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        });
    };

    /**
     * Render monthly report line/bar chart
     */
    const renderMonthlyReportChart = () => {
        const canvas = document.getElementById('monthlyReportChart');
        if (!canvas) return;

        const transactions = Storage.getTransactions();
        const now = new Date();
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        const balanceData = [];

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

            const monthIncome = transactions
                .filter(t => {
                    const td = new Date(t.date);
                    return t.type === 'income' &&
                        td.getMonth() === d.getMonth() &&
                        td.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + Number(t.amount), 0);

            const monthExpense = transactions
                .filter(t => {
                    const td = new Date(t.date);
                    return t.type === 'expense' &&
                        td.getMonth() === d.getMonth() &&
                        td.getFullYear() === d.getFullYear();
                })
                .reduce((sum, t) => sum + Number(t.amount), 0);

            incomeData.push(monthIncome);
            expenseData.push(monthExpense);
            balanceData.push(monthIncome - monthExpense);
        }

        const theme = getThemeColors();

        if (monthlyReportChart) monthlyReportChart.destroy();
        monthlyReportChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#22C55E',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#22C55E'
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#EF4444'
                    },
                    {
                        label: 'Balance',
                        data: balanceData,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#2563EB'
                    }
                ]
            },
            options: {
                ...commonOptions(),
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: theme.textMuted, font: { family: 'Poppins' } }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: theme.grid },
                        ticks: {
                            color: theme.textMuted,
                            font: { family: 'Poppins' },
                            callback: (v) => Storage.getSettings().currency + v
                        }
                    }
                },
                plugins: {
                    ...commonOptions().plugins,
                    legend: {
                        ...commonOptions().plugins.legend,
                        position: 'top'
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                }
            }
        });
    };

    /** Render all charts */
    const renderAll = () => {
        renderMonthlyChart(parseInt(document.getElementById('chartPeriod')?.value || '6', 10));
        renderExpensePieChart();
        renderIncomePieChart();
        renderMonthlyReportChart();
    };

    /** Update charts on theme change */
    const updateTheme = () => {
        renderAll();
    };

    /** Destroy all charts */
    const destroyAll = () => {
        [monthlyChart, expensePieChart, incomePieChart, monthlyReportChart].forEach(c => {
            if (c) c.destroy();
        });
        monthlyChart = expensePieChart = incomePieChart = monthlyReportChart = null;
    };

    return {
        renderMonthlyChart,
        renderExpensePieChart,
        renderIncomePieChart,
        renderMonthlyReportChart,
        renderAll,
        updateTheme,
        destroyAll
    };
})();
