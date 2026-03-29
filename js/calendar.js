// calendar.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, toggleSpinner, formatDate } from './utils.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentViewDate = new Date();
let monthExpenses = [];
let globalNoSpendDates = [];

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'calendar', 'Calendar View', user);
    setupListeners();
    loadCalendar();
});

function setupListeners() {
    document.getElementById('prev-month').addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        loadCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        loadCalendar();
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('day-modal').classList.remove('active');
    });
    
    // Close modal on outside click
    document.getElementById('day-modal').addEventListener('click', (e) => {
        if (e.target.id === 'day-modal') {
            e.target.classList.remove('active');
        }
    });
}

async function loadCalendar() {
    if (!currentUser) return;
    toggleSpinner(true);
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    document.getElementById('current-month-year').innerText = currentViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Fetch this month's expenses
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`;

    try {
        const q = query(collection(db, `users/${currentUser.uid}/expenses`),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        const expSnap = await getDocs(q);
        
        // Fetch No Spend Challenge Dates
        const challengeRef = doc(db, `users/${currentUser.uid}/challenge/data`);
        const chSnap = await getDoc(challengeRef);
        if(chSnap.exists()) {
            globalNoSpendDates = chSnap.data().dates || [];
        }

        monthExpenses = [];
        expSnap.forEach(doc => {
            monthExpenses.push({ id: doc.id, ...doc.data() });
        });

        renderCalendarGrid(year, month, lastDay);
    } catch (e) {
        console.error(e);
    } finally {
        toggleSpinner(false);
    }
}

function renderCalendarGrid(year, month, lastDay) {
    const container = document.getElementById('calendar-days');
    container.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const cur = localStorage.getItem('currency') || '₹';

    // Group expenses by day
    const dailyTotals = {};
    const dailyTxns = {};
    monthExpenses.forEach(exp => {
        const d = parseInt(exp.date.split('-')[2]);
        dailyTotals[d] = (dailyTotals[d] || 0) + parseFloat(exp.amount);
        if(!dailyTxns[d]) dailyTxns[d] = [];
        dailyTxns[d].push(exp);
    });

    // Calc heatmap thresholds
    let maxSpent = 0;
    Object.values(dailyTotals).forEach(v => { if(v > maxSpent) maxSpent = v; });
    const midThreshold = maxSpent * 0.33;
    const highThreshold = maxSpent * 0.66;

    // Fill empty days before 1st
    for (let i = 0; i < firstDayIndex; i++) {
        container.insertAdjacentHTML('beforeend', `<div class="cal-day empty"></div>`);
    }

    // Fill actual days
    for (let i = 1; i <= lastDay; i++) {
        const spent = dailyTotals[i] || 0;
        let heatClass = '';
        if (spent > 0) {
            if (spent >= highThreshold) heatClass = 'heat-high';
            else if (spent >= midThreshold) heatClass = 'heat-medium';
            else heatClass = 'heat-low';
        }

        const formattedDate = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        let customHTML = '';
        if (globalNoSpendDates.includes(formattedDate)) {
            heatClass = 'heat-nospend';
            customHTML = `<div style="position:absolute; top:-12px; right:-12px; font-size:1.5rem; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">🌟</div><div class="day-spent" style="color:white; font-weight:700;">Zero Spend</div>`;
        } else {
            customHTML = `<div class="day-spent" style="${spent === 0 ? 'opacity: 0' : 'color: var(--text-primary)'}">${formatCurrency(spent, cur)}</div>`;
        }
        
        const dayEl = document.createElement('div');
        dayEl.className = `cal-day ${heatClass}`;
        dayEl.setAttribute('data-date', formattedDate);
        dayEl.setAttribute('data-day', i);
        dayEl.style.position = 'relative'; // Required for absolute star
        
        dayEl.innerHTML = `
            <div class="day-num">${i}</div>
            ${customHTML}
        `;
        
        dayEl.addEventListener('click', () => openDayModal(formattedDate, i, dailyTxns[i], spent));
        container.appendChild(dayEl);
    }
}

function openDayModal(dateStr, dayNum, txns, totalSpent) {
    document.getElementById('day-modal-title').innerText = `Transactions - ${formatDate(dateStr)}`;
    const list = document.getElementById('day-transactions-list');
    const cur = localStorage.getItem('currency') || '₹';
    
    if (!txns || txns.length === 0) {
        list.innerHTML = `<p style="text-align:center; color: var(--text-secondary); padding: 1rem;">No transactions on this day.</p>`;
    } else {
        let html = '';
        txns.forEach(t => {
            html += `
                <div class="day-transaction">
                    <div>
                        <div style="font-weight: 600;">${t.description}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${t.category} • ${t.paymentMode}</div>
                    </div>
                    <div style="font-weight: 700; color: var(--danger);">- ${formatCurrency(t.amount, cur)}</div>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    document.getElementById('day-total-spent').innerText = `Total: ${formatCurrency(totalSpent || 0, cur)}`;
    document.getElementById('day-modal').classList.add('active');
}
