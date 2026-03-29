// budget.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, showToast, toggleSpinner } from './utils.js';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let categories = [];
let categoryLimits = {};

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'budget', 'Budget Tracking', user);
    
    // Set default month
    const now = new Date();
    document.getElementById('budget-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    
    // If user has monthlyBudget set, populate the field
    if (user.monthlyBudget) {
        document.getElementById('monthly-limit').value = user.monthlyBudget;
    }

    setupListeners();
    loadCategories();
});

function setupListeners() {
    document.getElementById('overall-budget-form').addEventListener('submit', handleOverallBudget);
    document.getElementById('cat-budget-form').addEventListener('submit', handleCategoryBudget);
    document.getElementById('budget-month').addEventListener('change', loadBudgetData);
}

async function handleOverallBudget(e) {
    e.preventDefault();
    if (!currentUser) return;
    const limit = parseFloat(document.getElementById('monthly-limit').value);
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            monthlyBudget: limit
        });
        showToast('Overall monthly budget updated', 'success');
        currentUser.monthlyBudget = limit;
        loadBudgetData(); // Refresh tracking
    } catch (e) {
        console.error(e);
        showToast('Failed to update budget', 'error');
    }
}

async function loadCategories() {
    if(!currentUser) return;
    try {
        const catSnap = await getDocs(collection(db, `users/${currentUser.uid}/categories`));
        const selectEl = document.getElementById('cat-select');
        selectEl.innerHTML = '';
        categories = [];
        
        catSnap.forEach(doc => {
            const c = doc.data();
            categories.push({ id: doc.id, ...c });
            selectEl.insertAdjacentHTML('beforeend', `<option value="${c.name}">${c.icon} ${c.name}</option>`);
        });

        // Also fetch category limits
        const monthFilter = document.getElementById('budget-month').value;
        const [year, month] = monthFilter.split('-');
        const limitsSnap = await getDocs(collection(db, `users/${currentUser.uid}/budgets`));
        limitsSnap.forEach(d => {
            const data = d.data();
            // Store limits globally or specific to month
            // Your structure says: category, limitAmount, month, year
            if (data.month === month && data.year === year) {
                categoryLimits[data.category] = data.limitAmount;
            }
        });

        loadBudgetData(); // Start load after categories are ready
    } catch(e) {
        console.error("Fetch categories err:", e);
    }
}

async function handleCategoryBudget(e) {
    e.preventDefault();
    if (!currentUser) return;
    
    const cat = document.getElementById('cat-select').value;
    const limit = parseFloat(document.getElementById('cat-limit').value);
    const monthFilter = document.getElementById('budget-month').value;
    const [year, month] = monthFilter.split('-');

    try {
        // ID format: MMyyyy_category
        const budgetId = `${month}${year}_${cat.replace(/ /g, '')}`;
        await setDoc(doc(db, `users/${currentUser.uid}/budgets`, budgetId), {
            category: cat,
            limitAmount: limit,
            month: month,
            year: year
        });
        showToast(`Budget set for ${cat}`, 'success');
        categoryLimits[cat] = limit;
        loadBudgetData(); // Refresh tracking
    } catch (e) {
        console.error("Set category limit err:", e);
        showToast('Failed to set category limit', 'error');
    }
}

async function loadBudgetData() {
    if (!currentUser) return;
    toggleSpinner(true);
    
    const monthFilter = document.getElementById('budget-month').value;
    const [year, month] = monthFilter.split('-');
    const startDate = `${year}-${month}-01`;
    // Approximate end of month
    const endDate = `${year}-${month}-31`;

    try {
        // 1. Fetch expenses for the month
        const expQuery = query(collection(db, `users/${currentUser.uid}/expenses`),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const expSnap = await getDocs(expQuery);
        
        let totalSpent = 0;
        const catSpent = {};
        
        expSnap.forEach(d => {
            const exp = d.data();
            totalSpent += parseFloat(exp.amount);
            catSpent[exp.category] = (catSpent[exp.category] || 0) + parseFloat(exp.amount);
        });

        // 2. Fetch budgets for the selected month to update categoryLimits
        categoryLimits = {};
        const budgetsQuery = query(collection(db, `users/${currentUser.uid}/budgets`),
            where("month", "==", month),
            where("year", "==", year)
        );
        const bSnap = await getDocs(budgetsQuery);
        bSnap.forEach(d => {
            const b = d.data();
            categoryLimits[b.category] = b.limitAmount;
        });

        renderTracking(totalSpent, catSpent);

    } catch (e) {
        console.error("Load Tracking Err", e);
        document.getElementById('budget-tracking-container').innerHTML = `<div class="empty-state"><p>Error loading data.</p></div>`;
    } finally {
        toggleSpinner(false);
    }
}

function renderTracking(totalSpent, catSpent) {
    const container = document.getElementById('budget-tracking-container');
    const cur = localStorage.getItem('currency') || '₹';
    let html = '';

    // Overall Budget
    const overallLimit = parseFloat(currentUser.monthlyBudget) || 0;
    if (overallLimit > 0) {
        let percent = (totalSpent / overallLimit) * 100;
        let colorClass = 'bg-success';
        if (percent >= 80) colorClass = 'bg-warning';
        if (percent >= 100) colorClass = 'bg-danger';
        
        html += `
            <div class="budget-item">
                <div class="b-header">
                    <span class="b-label"><i class="fa-solid fa-wallet"></i> Overall Monthly</span>
                    <span class="b-amounts"><strong>${formatCurrency(totalSpent, cur)}</strong> / ${formatCurrency(overallLimit, cur)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar ${colorClass}" style="width: ${Math.min(percent, 100)}%"></div>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); text-align: right; margin-top: 0.2rem;">
                    ${percent.toFixed(1)}% Used
                </div>
            </div>
            <hr style="border:0; border-top: 1px solid var(--border-color); margin: 1.5rem 0;">
        `;
    }

    // Per Category
    const catsWithLimits = Object.keys(categoryLimits);
    if (catsWithLimits.length === 0 && overallLimit === 0) {
        html = `<div class="empty-state"><p>No budgets configured for this month.</p></div>`;
        container.innerHTML = html;
        return;
    }

    catsWithLimits.forEach(cat => {
        const limit = categoryLimits[cat];
        const spent = catSpent[cat] || 0;
        let percent = (spent / limit) * 100;
        
        let colorClass = 'bg-success';
        if (percent >= 80) colorClass = 'bg-warning';
        if (percent >= 100) colorClass = 'bg-danger';

        const catInfo = categories.find(c => c.name === cat) || { icon: '📦' };

        html += `
            <div class="budget-item">
                <div class="b-header">
                    <span class="b-label">${catInfo.icon} ${cat}</span>
                    <span class="b-amounts"><strong>${formatCurrency(spent, cur)}</strong> / ${formatCurrency(limit, cur)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar ${colorClass}" style="width: ${Math.min(percent, 100)}%"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}
