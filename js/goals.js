// goals.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, formatDate, showToast, toggleSpinner } from './utils.js';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let allGoals = [];

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'goals', 'Savings Goals', user);
    setupListeners();
});

function setupListeners() {
    // Modals
    const gModal = document.getElementById('goal-modal');
    const fModal = document.getElementById('fund-modal');

    document.getElementById('btn-add-goal').addEventListener('click', () => {
        document.getElementById('goal-form').reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('modal-title').innerText = 'Create Savings Goal';
        gModal.classList.add('active');
    });

    document.getElementById('btn-cancel').addEventListener('click', () => gModal.classList.remove('active'));
    document.getElementById('btn-cancel-fund').addEventListener('click', () => fModal.classList.remove('active'));

    document.getElementById('goal-form').addEventListener('submit', handleSaveGoal);
    document.getElementById('fund-form').addEventListener('submit', handleAddFunds);

    listenToGoals();
}

function listenToGoals() {
    if (!currentUser) return;
    toggleSpinner(true);
    const q = query(collection(db, `users/${currentUser.uid}/goals`));
    
    onSnapshot(q, (snapshot) => {
        allGoals = [];
        snapshot.forEach(doc => {
            allGoals.push({ id: doc.id, ...doc.data() });
        });
        renderGoals();
        toggleSpinner(false);
    });
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    const emptyState = document.getElementById('empty-state');
    const cur = localStorage.getItem('currency') || '₹';

    container.innerHTML = '';
    
    if (allGoals.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        allGoals.forEach(g => {
            let percent = (g.currentAmount / g.targetAmount) * 100;
            if (percent > 100) percent = 100;
            
            // Calc months left
            let monthsLeftText = "No deadline";
            if (g.deadline) {
                const today = new Date();
                const dl = new Date(g.deadline);
                const diffTime = dl - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < 0) monthsLeftText = "Deadline passed";
                else if (diffDays < 30) monthsLeftText = `${diffDays} days left`;
                else monthsLeftText = `${Math.ceil(diffDays/30)} months left`;
            }

            const card = document.createElement('div');
            card.className = 'goal-card';
            card.innerHTML = `
                <div class="goal-menu delete-goal-btn" data-id="${g.id}" title="Delete Goal"><i class="fa-solid fa-trash"></i></div>
                <div class="goal-icon"><i class="fa-solid fa-trophy"></i></div>
                <div class="goal-title">${g.name}</div>
                <div class="goal-deadline"><i class="fa-regular fa-calendar"></i> ${monthsLeftText}</div>
                
                <div class="goal-amounts">
                    <span>${formatCurrency(g.currentAmount, cur)}</span>
                    <span style="color:var(--text-secondary)">${formatCurrency(g.targetAmount, cur)}</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar bg-accent" style="width: ${percent}%"></div>
                </div>
                <div style="text-align: right; font-size: 0.8rem; margin-top: 0.2rem;">${percent.toFixed(1)}%</div>
                
                <button class="btn btn-outline add-funds-btn" data-id="${g.id}">Add Funds</button>
            `;
            container.appendChild(card);
        });

        document.querySelectorAll('.add-funds-btn').forEach(btn => btn.addEventListener('click', openAddFunds));
        document.querySelectorAll('.delete-goal-btn').forEach(btn => btn.addEventListener('click', handleDeleteGoal));
    }
}

async function handleSaveGoal(e) {
    e.preventDefault();
    toggleSpinner(true);
    
    const id = document.getElementById('goal-id').value;
    const payload = {
        name: document.getElementById('g-name').value,
        targetAmount: parseFloat(document.getElementById('g-target').value),
        currentAmount: parseFloat(document.getElementById('g-current').value),
        deadline: document.getElementById('g-deadline').value
    };

    try {
        if (id) {
            await updateDoc(doc(db, `users/${currentUser.uid}/goals`, id), payload);
            showToast('Goal updated', 'success');
        } else {
            await addDoc(collection(db, `users/${currentUser.uid}/goals`), payload);
            showToast('Goal created', 'success');
        }
        document.getElementById('goal-modal').classList.remove('active');
    } catch (e) {
        showToast('Failed to save goal', 'error');
    } finally {
        toggleSpinner(false);
    }
}

function openAddFunds(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const g = allGoals.find(x => x.id === id);
    if (!g) return;

    document.getElementById('fund-goal-id').value = id;
    document.getElementById('fund-goal-name').innerText = g.name;
    document.getElementById('f-amount').value = '';
    
    document.getElementById('fund-modal').classList.add('active');
}

async function handleAddFunds(e) {
    e.preventDefault();
    toggleSpinner(true);
    const id = document.getElementById('fund-goal-id').value;
    const addAmount = parseFloat(document.getElementById('f-amount').value);
    
    const g = allGoals.find(x => x.id === id);
    if(g) {
        try {
            await updateDoc(doc(db, `users/${currentUser.uid}/goals`, id), {
                currentAmount: g.currentAmount + addAmount
            });
            showToast('Funds added successfully', 'success');
            document.getElementById('fund-modal').classList.remove('active');
        } catch (e) {
            showToast('Failed to add funds', 'error');
        }
    }
    toggleSpinner(false);
}

async function handleDeleteGoal(e) {
    if(!confirm("Delete this goal?")) return;
    const id = e.currentTarget.getAttribute('data-id');
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/goals`, id));
        showToast('Goal deleted', 'success');
    } catch(e) {
        showToast('Error deleting goal', 'error');
    }
}
