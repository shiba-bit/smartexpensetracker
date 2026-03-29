// reports.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { toggleSpinner } from './utils.js';
import { collection, query, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', '#6C5CE7',
    '#FD79A8', '#00B894', '#0984E3', '#B2BEC3'
];

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'reports', 'Analytics Reports', user);
    
    // Set default month
    const now = new Date();
    document.getElementById('pie-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    document.getElementById('pie-month').addEventListener('change', loadPieChartData);

    // Setup Export
    document.getElementById('btn-export').addEventListener('click', handleExportCSV);

    loadAllCharts();
});

async function loadAllCharts() {
    toggleSpinner(true);
    await Promise.all([
        loadBarChartData(),
        loadPieChartData(),
        loadLineChartData(),
        loadMoodChartData()
    ]);
    toggleSpinner(false);
}

async function loadMoodChartData() {
    const { expSnap } = await fetchAllData();
    const catTotal = {};
    const catRegret = {};

    expSnap.forEach(doc => {
        const e = doc.data();
        const cat = e.category;
        catTotal[cat] = (catTotal[cat] || 0) + 1;
        if (e.mood === 'Regret') {
            catRegret[cat] = (catRegret[cat] || 0) + 1;
        }
    });

    const labels = [];
    const data = [];

    for (const cat in catTotal) {
        labels.push(cat);
        data.push(((catRegret[cat] || 0) / catTotal[cat]) * 100);
    }

    const ctx = document.getElementById('moodChart');
    if (window.myMoodInst) window.myMoodInst.destroy();

    window.myMoodInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Regret',
                data: data,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(150,150,150,0.1)' }, ticks: { color: 'var(--text-secondary)', callback: function(val){return val+'%'} } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function fetchAllData() {
    if(!currentUser) return { expSnap: [], incSnap: [] };
    const [expSnap, incSnap] = await Promise.all([
        getDocs(collection(db, `users/${currentUser.uid}/expenses`)),
        getDocs(collection(db, `users/${currentUser.uid}/income`))
    ]);
    return { expSnap, incSnap };
}

async function loadBarChartData() {
    const { expSnap, incSnap } = await fetchAllData();
    const monthlyData = {};
    
    // Initialize last 6 months
    const now = new Date();
    for(let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        monthlyData[k] = { inc: 0, exp: 0, label: d.toLocaleString('default', { month: 'short' }) };
    }

    const processDocs = (snap, type) => {
        snap.forEach(doc => {
            const data = doc.data();
            const yyyymm = data.date.substring(0, 7);
            if (monthlyData[yyyymm]) {
                monthlyData[yyyymm][type] += parseFloat(data.amount);
            }
        });
    };

    processDocs(incSnap, 'inc');
    processDocs(expSnap, 'exp');

    const labels = Object.values(monthlyData).map(x => x.label);
    const incData = Object.values(monthlyData).map(x => x.inc);
    const expData = Object.values(monthlyData).map(x => x.exp);

    const ctx = document.getElementById('barChart');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Income', data: incData, backgroundColor: '#10b981', borderRadius: 4 },
                { label: 'Expense', data: expData, backgroundColor: '#ef4444', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(150,150,150,0.1)' }, ticks: { color: 'var(--text-secondary)' } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)' } }
            },
            plugins: { legend: { labels: { color: 'var(--text-primary)' } } }
        }
    });
}

async function loadPieChartData() {
    const monthFilter = document.getElementById('pie-month').value;
    const { expSnap } = await fetchAllData();
    const catMap = {};

    expSnap.forEach(doc => {
        const e = doc.data();
        if (e.date.startsWith(monthFilter)) {
            catMap[e.category] = (catMap[e.category] || 0) + parseFloat(e.amount);
        }
    });

    const ctx = document.getElementById('pieChart');
    if (window.myPieChartInst) window.myPieChartInst.destroy();

    window.myPieChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catMap),
            datasets: [{
                data: Object.values(catMap),
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: 'var(--text-primary)' } } }
        }
    });
}

async function loadLineChartData() {
    const now = new Date();
    const currYYYYMM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Init array of zeros
    const dailyData = Array(daysInMonth).fill(0);
    const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const { expSnap } = await fetchAllData();
    
    expSnap.forEach(doc => {
        const e = doc.data();
        if (e.date.startsWith(currYYYYMM)) {
            const dayIndex = parseInt(e.date.split('-')[2]) - 1;
            if(dayIndex >= 0 && dayIndex < daysInMonth) {
                dailyData[dayIndex] += parseFloat(e.amount);
            }
        }
    });

    const ctx = document.getElementById('lineChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Daily Spending',
                data: dailyData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(150,150,150,0.1)' }, ticks: { color: 'var(--text-secondary)' } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-secondary)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function handleExportCSV() {
    if(!currentUser) return;
    toggleSpinner(true);
    try {
        const { expSnap, incSnap } = await fetchAllData();
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Type,Date,Description,Category_Source,Amount,Mode_Recurring\n";

        incSnap.forEach(doc => {
            const d = doc.data();
            csvContent += `Income,${d.date},"${d.description}","${d.source}",${d.amount},${d.isRecurring}\n`;
        });
        
        expSnap.forEach(doc => {
            const d = doc.data();
            csvContent += `Expense,${d.date},"${d.description}","${d.category}",${d.amount},${d.paymentMode}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `tracker_export_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(e) {
        console.error(e);
    } finally {
        toggleSpinner(false);
    }
}
