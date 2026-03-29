// timemachine.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, toggleSpinner } from './utils.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let allExpenses = [];
let availableMonths = [];
let currMonthStr = ''; // YYYY-MM
let categoriesRawMap = {};

requireAuth(async (user) => {
    currentUser = user;
    setupCommonUI('app-container', 'timemachine', 'Time Machine', user);
    
    // Set current month string
    const now = new Date();
    currMonthStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    
    document.getElementById('btn-compare').addEventListener('click', runComparison);
    document.getElementById('tm-month-select').addEventListener('change', (e) => {
        document.getElementById('btn-compare').disabled = !e.target.value;
    });

    await initializeTimeMachine();
});

async function initializeTimeMachine() {
    toggleSpinner(true);
    
    // Fetch categories to get icons easily later
    const catSnap = await getDocs(collection(db, `users/${currentUser.uid}/categories`));
    catSnap.forEach(doc => { const c=doc.data(); categoriesRawMap[c.name] = c; });

    // Fetch all expenses to find unique past months
    const expSnap = await getDocs(collection(db, `users/${currentUser.uid}/expenses`));
    
    const uniqueMonths = new Set();
    expSnap.forEach(doc => {
        const data = doc.data();
        allExpenses.push(data);
        const yyyymm = data.date.substring(0, 7);
        if(yyyymm !== currMonthStr) {
            uniqueMonths.add(yyyymm);
        }
    });

    // Sort descending layout
    availableMonths = Array.from(uniqueMonths).sort().reverse();
    
    // Fallback: If no past months exist, inject the last 3 months natively so UI functions
    if(availableMonths.length === 0) {
        let tempDate = new Date();
        for(let i=0; i<3; i++) {
            tempDate.setMonth(tempDate.getMonth() - 1);
            let y = tempDate.getFullYear();
            let m = String(tempDate.getMonth()+1).padStart(2,'0');
            availableMonths.push(`${y}-${m}`);
        }
    }
    
    const select = document.getElementById('tm-month-select');
    availableMonths.forEach(m => {
        const [yy, mm] = m.split('-');
        const d = new Date(yy, parseInt(mm)-1, 1);
        const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        select.insertAdjacentHTML('beforeend', `<option value="${m}">${label}</option>`);
    });

    toggleSpinner(false);
}

function runComparison() {
    const targetMonth = document.getElementById('tm-month-select').value;
    if(!targetMonth) return;
    
    // Switch Views
    document.getElementById('tm-empty-state').classList.add('hidden');
    document.getElementById('tm-results-view').classList.remove('hidden');

    const [yy, mm] = targetMonth.split('-');
    const labelPast = new Date(yy, parseInt(mm)-1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    document.getElementById('lbl-past-month').innerText = labelPast;
    document.getElementById('th-past-month').innerText = labelPast;

    // Aggregate Current
    let currTotal = 0;
    const currCatMap = {};

    // Aggregate Target
    let pastTotal = 0;
    const pastCatMap = {};
    
    const uniqueCats = new Set();

    allExpenses.forEach(exp => {
        const cat = exp.category || 'Other';
        const amt = parseFloat(exp.amount);
        const yyyymm = exp.date.substring(0, 7);
        
        if (yyyymm === currMonthStr) {
            currTotal += amt;
            currCatMap[cat] = (currCatMap[cat] || 0) + amt;
            uniqueCats.add(cat);
        } else if (yyyymm === targetMonth) {
            pastTotal += amt;
            pastCatMap[cat] = (pastCatMap[cat] || 0) + amt;
            uniqueCats.add(cat);
        }
    });

    const curSymbol = localStorage.getItem('currency') || '₹';
    document.getElementById('val-curr-total').innerText = formatCurrency(currTotal, curSymbol);
    document.getElementById('val-past-total').innerText = formatCurrency(pastTotal, curSymbol);

    // Calculate Variance
    const diff = currTotal - pastTotal;
    const varianceEl = document.getElementById('val-overall-variance');
    const summaryEl = document.getElementById('lbl-overall-summary');
    
    if (diff > 0) {
        varianceEl.className = 'diff-bad';
        varianceEl.innerHTML = `+ ${formatCurrency(diff, curSymbol)} <i class="fa-solid fa-arrow-trend-up"></i>`;
        summaryEl.innerText = "You have spent more this month compared to your past timeline.";
    } else if (diff < 0) {
        varianceEl.className = 'diff-good';
        varianceEl.innerHTML = `- ${formatCurrency(Math.abs(diff), curSymbol)} <i class="fa-solid fa-arrow-trend-down"></i>`;
        summaryEl.innerText = "Great job! You have controlled your spending and saved money.";
    } else {
        varianceEl.className = 'diff-neutral';
        varianceEl.innerText = "No Difference";
        summaryEl.innerText = "Your spending is identical.";
    }

    // Render Table
    const tbody = document.getElementById('tm-table-body');
    tbody.innerHTML = '';
    
    const sortedCats = Array.from(uniqueCats).sort();
    
    sortedCats.forEach(cat => {
        const cVal = currCatMap[cat] || 0;
        const pVal = pastCatMap[cat] || 0;
        const catDiff = cVal - pVal;
        
        const catInfo = categoriesRawMap[cat] || { icon: '📦' };

        let difHtml = ''; let statusHtml = '';
        if (catDiff > 0) {
            difHtml = `<span class="diff-bad">+${formatCurrency(catDiff, curSymbol)}</span>`;
            statusHtml = `<i class="fa-solid fa-arrow-up text-danger"></i> Increased`;
        } else if (catDiff < 0) {
            difHtml = `<span class="diff-good">-${formatCurrency(Math.abs(catDiff), curSymbol)}</span>`;
            statusHtml = `<i class="fa-solid fa-arrow-down text-success"></i> Decreased`;
        } else {
            difHtml = `<span class="diff-neutral">0</span>`;
            statusHtml = `<span class="text-secondary">-</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-size: 1.1rem; margin-right: 8px;">${catInfo.icon}</span> ${cat}</td>
            <td style="text-align: center;">${cVal > 0 ? formatCurrency(cVal, curSymbol) : '-'}</td>
            <td style="text-align: center;">${pVal > 0 ? formatCurrency(pVal, curSymbol) : '-'}</td>
            <td style="text-align: center;">${difHtml}</td>
            <td style="text-align: right;">${statusHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}
