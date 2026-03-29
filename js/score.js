// score.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { toggleSpinner } from './utils.js';
import { collection, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let currentScore = 0;
let userBudget = 0;
let totalExpenses = 0;

requireAuth(async (user) => {
    currentUser = user;
    setupCommonUI('app-container', 'score', 'Spending Score', user);
    
    await initializeScoreData();
});

async function initializeScoreData() {
    toggleSpinner(true);
    
    // 1. Fetch User Profile for total budget limit
    const profileSnap = await getDoc(doc(db, "users", currentUser.uid));
    if (profileSnap.exists() && profileSnap.data().monthlyBudget) {
        userBudget = parseFloat(profileSnap.data().monthlyBudget);
    }

    // 2. Fetch current month expenses
    const now = new Date();
    const currYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const expSnap = await getDocs(collection(db, `users/${currentUser.uid}/expenses`));
    
    totalExpenses = 0;
    expSnap.forEach(d => {
        const e = d.data();
        if(e.date.startsWith(currYYYYMM)) {
            totalExpenses += parseFloat(e.amount);
        }
    });

    calculateScore();
    renderScoreUI();
    generateTips();
    await generateHistoricalChart(expSnap); // Pass snapshot for past processing
    
    toggleSpinner(false);
}

function calculateScore() {
    // Score logic
    if (userBudget === 0) {
        currentScore = 50; // Needs budget
    } else if (totalExpenses === 0) {
        currentScore = 100;
    } else if (totalExpenses <= userBudget) {
        // Linearly drops from 100 to 70 as expense approaches budget
        const ratio = totalExpenses / userBudget;
        currentScore = 100 - (ratio * 30);
    } else {
        // Penalized heavily for going over budget
        const overageRatio = (totalExpenses - userBudget) / userBudget;
        currentScore = Math.max(0, 70 - (overageRatio * 100));
    }
    
    currentScore = Math.round(currentScore);
    
    // Save to Firestore to persist history tracking
    const now = new Date();
    const currYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    setDoc(doc(db, `users/${currentUser.uid}/scores`, currYYYYMM), {
        score: currentScore,
        month: currYYYYMM,
        updatedAt: new Date().toISOString()
    });
}

function renderScoreUI() {
    const scoreValEl = document.getElementById('score-value');
    const circleEl = document.getElementById('score-circle');
    const badgeEl = document.getElementById('grade-badge');
    
    // Animate score
    let start = 0;
    const duration = 1500;
    const step = (currentScore / duration) * 20;
    
    const interval = setInterval(() => {
        start += step;
        if(start >= currentScore) {
            start = currentScore;
            clearInterval(interval);
        }
        scoreValEl.textContent = Math.round(start);
        const percent = (start / 100) * 360;
        circleEl.style.background = `conic-gradient(var(--accent-color) ${percent}deg, transparent 0deg)`;
    }, 20);

    // Grade Logic
    let grade = 'F'; let cls = 'grade-f';
    if(currentScore >= 90) { grade = 'A'; cls = 'grade-a'; }
    else if(currentScore >= 80) { grade = 'B'; cls = 'grade-b'; }
    else if(currentScore >= 70) { grade = 'C'; cls = 'grade-c'; }
    else if(currentScore >= 60) { grade = 'D'; cls = 'grade-d'; }

    badgeEl.textContent = `Grade: ${grade}`;
    badgeEl.className = `grade-badge ${cls}`;
}

function generateTips() {
    const list = document.getElementById('tips-container');
    list.innerHTML = '';
    
    const allTips = [];
    if(userBudget === 0) {
        allTips.push("You haven't set a Monthly Budget limit. Head to Settings so we can grade your spending properly!");
    } else {
        if (currentScore >= 90) {
            allTips.push("Fantastic discipline! You are staying well under your allocated budget constraints.");
            allTips.push("Consider pushing your surplus money directly into your Active Savings Goals.");
            allTips.push("Try a 'No Spend Day' challenge to squeeze even more value out of this month.");
        } else if (currentScore >= 70) {
            allTips.push("You are on track, but approaching your limits. Keep an eye on non-essential categories.");
            allTips.push("Check your top-spending category in Reports and try to reduce it by 10% next week.");
            allTips.push("Avoid impulse purchases for the next 48 hours to secure a higher grade.");
        } else {
            allTips.push("Warning: You have exceeded or are dangerously close to breaking your monthly budget.");
            allTips.push("Freeze all discretionary spending immediately to prevent further grade erosion.");
            allTips.push("Review last week's expenses and identify 3 purchases that could have been avoided.");
        }
    }
    
    allTips.slice(0,3).forEach(tip => {
        list.insertAdjacentHTML('beforeend', `
            <div class="tip-item">
                <i class="fa-solid fa-bolt tip-icon"></i>
                <div>
                    <p style="color: var(--text-primary); margin:0;">${tip}</p>
                </div>
            </div>
        `);
    });
}

async function generateHistoricalChart() {
    const scoreSnap = await getDocs(collection(db, `users/${currentUser.uid}/scores`));
    const scoresMap = {};
    
    scoreSnap.forEach(d => {
        const s = d.data();
        scoresMap[s.month] = s.score;
    });

    // Last 6 months labels
    const labels = [];
    const data = [];
    const now = new Date();
    
    for(let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        labels.push(d.toLocaleString('default', { month: 'short' }));
        data.push(scoresMap[k] || 0);
    }
    
    // Override current month with real-time processed score dynamically
    data[5] = currentScore;

    const ctx = document.getElementById('scoreChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending Score',
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(150,150,150,0.1)' }, ticks: { color: 'var(--text-secondary)' } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
