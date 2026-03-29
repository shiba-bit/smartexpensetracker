// dashboard.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, toggleSpinner } from './utils.js';
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderWeeklyReports } from './weeklyreport.js';

let currentUser = null;

// Initialize Dashboard
requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'dashboard', 'Dashboard', user);
    loadDashboardData();
});

async function loadDashboardData() {
    if (!currentUser || currentUser.uid === "TEST_USER") return;
    
    toggleSpinner(true);
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Fetch Month's Expenses
        const expQuery = query(collection(db, `users/${currentUser.uid}/expenses`), 
            where("date", ">=", firstDayOfMonth),
            where("date", "<=", lastDayOfMonth)
        );
        const expSnap = await getDocs(expQuery);
        let totalExpense = 0;
        const expenses = [];
        expSnap.forEach(doc => {
            const data = doc.data();
            totalExpense += parseFloat(data.amount);
            expenses.push({ id: doc.id, ...data, type: 'expense' });
        });

        // Fetch Month's Income
        const incQuery = query(collection(db, `users/${currentUser.uid}/income`), 
            where("date", ">=", firstDayOfMonth),
            where("date", "<=", lastDayOfMonth)
        );
        const incSnap = await getDocs(incQuery);
        let totalIncome = 0;
        const incomes = [];
        incSnap.forEach(doc => {
            const data = doc.data();
            totalIncome += parseFloat(data.amount);
            incomes.push({ id: doc.id, ...data, type: 'income' });
        });

        const netBalance = totalIncome - totalExpense;
        const cur = localStorage.getItem('currency') || '₹';

        // Update DOM Elements
        document.getElementById('dash-income').innerHTML = formatCurrency(totalIncome, cur);
        document.getElementById('dash-expense').innerHTML = formatCurrency(totalExpense, cur);
        document.getElementById('dash-balance').innerHTML = formatCurrency(netBalance, cur);
        
        const balanceEl = document.getElementById('dash-balance');
        balanceEl.className = 'card-amount ' + (netBalance >= 0 ? 'text-success' : 'text-danger');

        // Render Recent Transactions
        renderRecentTransactions([...expenses, ...incomes]);
        
        // Render Chart
        renderCategoryChart(expenses);

        // Fetch Budget
        let monthlyBudget = parseFloat(currentUser.monthlyBudget) || 0;
        const budgetLimitEl = document.getElementById('dash-budget-limit');
        const budgetBarEl = document.getElementById('dash-budget-bar');
        const budgetTextEl = document.getElementById('dash-budget-text');
        
        if (monthlyBudget > 0) {
            budgetLimitEl.innerText = `Limit: ${formatCurrency(monthlyBudget, cur)}`;
            let percent = (totalExpense / monthlyBudget) * 100;
            if (percent > 100) percent = 100;
            
            budgetTextEl.innerText = `${percent.toFixed(1)}% Used`;
            budgetBarEl.style.width = `${percent}%`;
            
            budgetBarEl.className = 'progress-bar bg-success';
            if (percent > 80) budgetBarEl.className = 'progress-bar bg-warning';
            if (percent >= 100) budgetBarEl.className = 'progress-bar bg-danger';
        } else {
            budgetLimitEl.innerText = 'No budget set';
            budgetTextEl.innerText = '0%';
            budgetBarEl.style.width = '0%';
        }
        
        // Setup Score Widget
        let score = 0;
        if(monthlyBudget === 0) score = 50;
        else if(totalExpense === 0) score = 100;
        else if(totalExpense <= monthlyBudget) {
            score = 100 - ((totalExpense / monthlyBudget) * 30);
        } else {
            score = Math.max(0, 70 - (((totalExpense - monthlyBudget) / monthlyBudget) * 100));
        }
        score = Math.round(score);
        document.getElementById('dash-score-val').innerText = score;
        let grade = 'F'; let cls = 'text-danger';
        if(score >= 90) { grade = 'A'; cls = 'text-success'; }
        else if(score >= 80) { grade = 'B'; cls = 'text-info'; }
        else if(score >= 70) { grade = 'C'; cls = 'text-warning'; }
        else if(score >= 60) { grade = 'D'; cls = 'text-warning'; }
        const gEl = document.getElementById('dash-score-grade');
        gEl.innerText = `Grade: ${grade}`;
        gEl.className = cls;

        // Render Weekly Reports
        await renderWeeklyReports(currentUser.uid);

    } catch (e) {
        console.error("Dashboard Load Error", e);
    } finally {
        toggleSpinner(false);
    }
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>No recent transactions.</p>
            </div>
        `;
        return;
    }

    // Sort by date desc and limit to 5
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = transactions.slice(0, 5);
    const cur = localStorage.getItem('currency') || '₹';

    let html = '';
    recent.forEach(t => {
        const isExp = t.type === 'expense';
        const icon = isExp ? 'fa-arrow-turn-up text-danger' : 'fa-arrow-turn-down text-success';
        const colorClass = isExp ? 'text-danger' : 'text-success';
        const prefix = isExp ? '-' : '+';
        
        html += `
            <div class="transaction-item">
                <div class="t-left">
                    <div class="t-icon"><i class="fa-solid ${icon}"></i></div>
                    <div class="t-info">
                        <h4>${t.description || t.source || 'Transaction'}</h4>
                        <p>${new Date(t.date).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="t-amount ${colorClass}">${prefix}${formatCurrency(t.amount, cur)}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderCategoryChart(expenses) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (expenses.length === 0) {
        // Just show a default empty chart or leave it empty state
        return;
    }

    // Group expenses by category
    const catMap = {};
    expenses.forEach(e => {
        const cat = e.category || 'Other';
        catMap[cat] = (catMap[cat] || 0) + parseFloat(e.amount);
    });

    const labels = Object.keys(catMap);
    const data = Object.values(catMap);
    
    // Generate distinct colors
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7',
        '#FD79A8', '#00B894', '#0984E3', '#B2BEC3'
    ];

    if (window.myPieChart) window.myPieChart.destroy();
    
    // Use Chart.js globals safely via window
    window.myPieChart = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: 'var(--text-primary)'} }
            }
        }
    });
}
