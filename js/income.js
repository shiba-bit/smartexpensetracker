// income.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, formatDate, showToast, toggleSpinner } from './utils.js';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let allRecords = [];

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'income', 'Income', user);
    
    const now = new Date();
    document.getElementById('filter-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    
    setupListeners();
});

function setupListeners() {
    const modal = document.getElementById('data-modal');
    document.getElementById('btn-add').addEventListener('click', () => {
        document.getElementById('data-form').reset();
        document.getElementById('entry-id').value = '';
        document.getElementById('modal-title').innerText = 'Add Income';
        document.getElementById('in-date').value = new Date().toISOString().split('T')[0];
        modal.classList.add('active');
    });

    document.getElementById('btn-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    document.getElementById('data-form').addEventListener('submit', handleSaveData);

    // Filters
    document.getElementById('search-input').addEventListener('input', renderTable);
    document.getElementById('filter-source').addEventListener('change', renderTable);
    document.getElementById('filter-month').addEventListener('change', renderTable);

    listenToData();
}

function listenToData() {
    if (!currentUser) return;
    toggleSpinner(true);
    const inRef = collection(db, `users/${currentUser.uid}/income`);
    const q = query(inRef, orderBy("date", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allRecords = [];
        snapshot.forEach(doc => {
            allRecords.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
        toggleSpinner(false);
    }, (error) => {
        console.error("Error listening:", error);
        toggleSpinner(false);
    });
}

function renderTable() {
    const tbody = document.getElementById('data-table-body');
    const emptyState = document.getElementById('empty-state');
    const search = document.getElementById('search-input').value.toLowerCase();
    const sfFiler = document.getElementById('filter-source').value;
    const monthFilter = document.getElementById('filter-month').value; 
    const cur = localStorage.getItem('currency') || '₹';

    let filtered = allRecords.filter(rec => {
        let match = true;
        if (search && !rec.description.toLowerCase().includes(search)) match = false;
        if (sfFiler && rec.source !== sfFiler) match = false;
        if (monthFilter && !rec.date.startsWith(monthFilter)) match = false;
        return match;
    });

    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(rec => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(rec.date)}</td>
                <td style="font-weight: 500;">${rec.description}</td>
                <td><span class="source-badge">${rec.source}</span></td>
                <td>${rec.isRecurring ? '<i class="fa-solid fa-arrows-rotate text-success"></i> Yes' : '<span style="color:var(--text-secondary)">No</span>'}</td>
                <td style="font-weight: 700; color: var(--success);">${formatCurrency(rec.amount, cur)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit-btn" data-id="${rec.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon delete delete-btn" data-id="${rec.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
    }
}

async function handleSaveData(e) {
    e.preventDefault();
    toggleSpinner(true);
    
    const id = document.getElementById('entry-id').value;
    const payload = {
        amount: parseFloat(document.getElementById('in-amount').value),
        description: document.getElementById('in-desc').value,
        date: document.getElementById('in-date').value,
        source: document.getElementById('in-source').value,
        isRecurring: document.getElementById('in-recurring').checked,
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            await updateDoc(doc(db, `users/${currentUser.uid}/income`, id), payload);
            showToast('Income updated', 'success');
        } else {
            payload.createdAt = new Date().toISOString();
            await addDoc(collection(db, `users/${currentUser.uid}/income`), payload);
            showToast('Income added', 'success');
        }
        document.getElementById('data-modal').classList.remove('active');
    } catch (e) {
        console.error("Save Error:", e);
        showToast('Failed to save', 'error');
    } finally {
        toggleSpinner(false);
    }
}

function handleEditClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const rec = allRecords.find(x => x.id === id);
    if (!rec) return;

    document.getElementById('entry-id').value = rec.id;
    document.getElementById('in-amount').value = rec.amount;
    document.getElementById('in-desc').value = rec.description;
    document.getElementById('in-date').value = rec.date;
    document.getElementById('in-source').value = rec.source;
    document.getElementById('in-recurring').checked = rec.isRecurring || false;
    
    document.getElementById('modal-title').innerText = 'Edit Income';
    document.getElementById('data-modal').classList.add('active');
}

async function handleDeleteClick(e) {
    if (!confirm("Delete this income record?")) return;
    const id = e.currentTarget.getAttribute('data-id');
    toggleSpinner(true);
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/income`, id));
        showToast('Deleted', 'success');
    } catch (e) {
        showToast('Failed to delete', 'error');
    } finally {
        toggleSpinner(false);
    }
}
