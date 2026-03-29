// ai-insights.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { getDocs, collection, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatCurrency } from './utils.js';

let currentUser = null;
const API_URL = "https://api.example.com"; // Placeholder if user ever wants to add real LLM endpoint

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'ai-insights', 'Smart AI Insights', user);
    
    document.getElementById('btn-analyze').addEventListener('click', generateInsights);
    
    // Auto generate on load
    generateInsights();
});

async function generateInsights() {
    if(!currentUser) return;
    const loadingEl = document.getElementById('ai-loading');
    const listEl = document.getElementById('insights-list');
    
    loadingEl.style.display = 'flex';
    listEl.innerHTML = '';
    
    try {
        // Build data context
        const [expSnap, incSnap, budSnap] = await Promise.all([
            getDocs(collection(db, `users/${currentUser.uid}/expenses`)),
            getDocs(collection(db, `users/${currentUser.uid}/income`)),
            getDocs(collection(db, `users/${currentUser.uid}/budgets`))
        ]);
        
        const expenses = [], incomes = [], budgets = [];
        expSnap.forEach(d => expenses.push(d.data()));
        incSnap.forEach(d => incomes.push(d.data()));
        budSnap.forEach(d => budgets.push(d.data()));
        
        // --- LOCAL HEURISTIC AI ENGINE --- //
        // To keep this app serverless and free, we use a heuristic rules engine
        // that feels like an AI analyzing patterns.
        
        let insights = [];
        const cur = localStorage.getItem('currency') || '₹';
        const now = new Date();
        const yyyymm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        
        let totalMonthlyExp = 0, totalMonthlyInc = 0;
        let catTotals = {};
        
        expenses.forEach(e => {
            if(e.date.startsWith(yyyymm)) {
                totalMonthlyExp += parseFloat(e.amount);
                catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount);
            }
        });
        
        incomes.forEach(i => {
            if(i.date.startsWith(yyyymm)) {
                totalMonthlyInc += parseFloat(i.amount);
            }
        });

        // Rule 1: Savings Rate
        if (totalMonthlyInc > 0) {
            const savingsRate = ((totalMonthlyInc - totalMonthlyExp) / totalMonthlyInc) * 100;
            if (savingsRate > 20) {
                insights.push({
                    type: 'success',
                    icon: 'fa-piggy-bank',
                    title: 'Excellent Savings Rate! 🏆',
                    desc: `You're saving ${savingsRate.toFixed(1)}% of your income this month. Rule of thumb is 20%, so you're doing incredibly well. Consider investing the surplus.`
                });
            } else if (savingsRate < 5 && savingsRate > 0) {
                insights.push({
                    type: 'warning',
                    icon: 'fa-triangle-exclamation',
                    title: 'Low Savings Margin ⚠️',
                    desc: `You've spent almost everything you earned this month. Try to cut back on non-essential categories to build your emergency fund.`
                });
            } else if (savingsRate < 0) {
                insights.push({
                    type: 'warning',
                    icon: 'fa-skull',
                    title: 'Deficit Alert! 🔴',
                    desc: `You are spending more than you earn! Your deficit is ${formatCurrency(totalMonthlyExp - totalMonthlyInc, cur)}. Review your top expenses immediately.`
                });
            }
        } else if (totalMonthlyExp > 0) {
            insights.push({
                type: 'info',
                icon: 'fa-circle-info',
                title: 'No Income Tracked 📅',
                desc: `You have expenses of ${formatCurrency(totalMonthlyExp, cur)} but no income tracked this month. Adding income helps AI calculate your savings rate.`
            });
        }
        
        // Rule 2: Top Spending Category
        if (Object.keys(catTotals).length > 0) {
            let topCat = null, maxAmount = 0;
            for(const [cat, amt] of Object.entries(catTotals)) {
                if(amt > maxAmount) { maxAmount = amt; topCat = cat; }
            }
            const ratio = (maxAmount / totalMonthlyExp) * 100;
            
            if (ratio > 40) {
                insights.push({
                    type: 'warning',
                    icon: 'fa-chart-pie',
                    title: `High Spending on ${topCat} 📊`,
                    desc: `Your major leak is ${topCat}. It accounts for ${ratio.toFixed(1)}% of all your expenses (${formatCurrency(maxAmount, cur)}). Finding cheaper alternatives here will have massive impact.`
                });
            } else {
                insights.push({
                    type: 'success',
                    icon: 'fa-layer-group',
                    title: 'Well-Distributed Spending 🧩',
                    desc: `Your highest expense is ${topCat} (${ratio.toFixed(1)}%), showing excellent diversification of your budget across categories.`
                });
            }
            
            // Food specific rule
            if (topCat === 'Food' && ratio > 30) {
                insights.push({
                    type: 'info',
                    icon: 'fa-utensils',
                    title: 'Food Budget Hack 🍳',
                    desc: `Since Food is a major expense, try bulk-cooking 2 dinners a week. Meal prepping can cut this category cost by up to 40%.`
                });
            }
        }
        
        // Rule 3: Missing Budget Limits
        if (budgets.length === 0 && currentUser.monthlyBudget === 0) {
            insights.push({
                type: 'info',
                icon: 'fa-money-bill-wave',
                title: 'Set Budget Limits 🎯',
                desc: 'You haven\'t set up any budget limits yet. Setting strict limits for high-spend categories is the #1 way to build wealth faster.'
            });
        }
        
        // Render
        if(insights.length === 0) {
            insights.push({
                type: 'info', icon: 'fa-robot', title: 'Need More Data 📈',
                desc: 'Add more transactions and I will analyze your patterns over time.'
            });
        }
        
        // Simulate thinking delay for effect
        setTimeout(() => {
            loadingEl.style.display = 'none';
            let html = '';
            insights.forEach(ins => {
                html += `
                    <div class="insight-card type-${ins.type} fade-in">
                        <div class="insight-icon"><i class="fa-solid ${ins.icon}"></i></div>
                        <div class="insight-content">
                            <h4>${ins.title}</h4>
                            <p>${ins.desc}</p>
                        </div>
                    </div>
                `;
            });
            listEl.innerHTML = html;
        }, 1500);
        
    } catch(e) {
        console.error(e);
        loadingEl.style.display = 'none';
        listEl.innerHTML = '<p style="color:red">Failed to generate insights.</p>';
    }
}
