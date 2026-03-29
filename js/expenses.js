// expenses.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { formatCurrency, formatDate, showToast, toggleSpinner } from './utils.js';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let allExpenses = [];
let categoriesMap = {}; // { catName: icon }

requireAuth(async (user) => {
    currentUser = user;
    setupCommonUI('app-container', 'expenses', 'Expenses', user);
    
    // Set default month filter
    const now = new Date();
    document.getElementById('filter-month').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    
    await fetchCategories();
    setupListeners();
});

async function fetchCategories() {
    if(!currentUser) return;
    try {
        const catSnap = await getDocs(collection(db, `users/${currentUser.uid}/categories`));
        const selectEl = document.getElementById('exp-category');
        const filterEl = document.getElementById('filter-category');
        selectEl.innerHTML = ''; filterEl.innerHTML = '<option value="">All Categories</option>';
        
        catSnap.forEach(doc => {
            const c = doc.data();
            categoriesMap[c.name] = { color: c.color, icon: c.icon };
            selectEl.insertAdjacentHTML('beforeend', `<option value="${c.name}">${c.icon} ${c.name}</option>`);
            filterEl.insertAdjacentHTML('beforeend', `<option value="${c.name}">${c.icon} ${c.name}</option>`);
        });
    } catch(e) {
        console.error("Fetch categories error:", e);
    }
}

function setupListeners() {
    // Modal controls
    const modal = document.getElementById('expense-modal');
    document.getElementById('btn-add-expense').addEventListener('click', () => {
        document.getElementById('expense-form').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('modal-title').innerText = 'Add Expense';
        // set today default
        document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        modal.classList.add('active');
    });

    document.getElementById('btn-cancel').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Form Submit
    document.getElementById('expense-form').addEventListener('submit', handleSaveExpense);

    // OCR Handlers
    document.getElementById('btn-ocr-scan').addEventListener('click', () => {
        document.getElementById('ocr-file-input').click();
    });
    document.getElementById('ocr-file-input').addEventListener('change', handleOCRScan);
    document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);

    // Filters
    document.getElementById('search-input').addEventListener('input', renderTable);
    document.getElementById('filter-category').addEventListener('change', renderTable);
    document.getElementById('filter-month').addEventListener('change', renderTable);

    // Fetch data listener
    listenToExpenses();
}

function listenToExpenses() {
    if (!currentUser) return;
    toggleSpinner(true);
    const expensesRef = collection(db, `users/${currentUser.uid}/expenses`);
    const q = query(expensesRef, orderBy("date", "desc"));
    
    onSnapshot(q, (snapshot) => {
        allExpenses = [];
        snapshot.forEach(doc => {
            allExpenses.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
        toggleSpinner(false);
    }, (error) => {
        console.error("Error listening to expenses:", error);
        toggleSpinner(false);
    });
}

function renderTable() {
    const tbody = document.getElementById('expenses-table-body');
    const emptyState = document.getElementById('empty-state');
    const search = document.getElementById('search-input').value.toLowerCase();
    const catFiler = document.getElementById('filter-category').value;
    const monthFilter = document.getElementById('filter-month').value; // YYYY-MM
    const cur = localStorage.getItem('currency') || '₹';

    let filtered = allExpenses.filter(exp => {
        let match = true;
        if (search && !exp.description.toLowerCase().includes(search)) match = false;
        if (catFiler && exp.category !== catFiler) match = false;
        if (monthFilter && !exp.date.startsWith(monthFilter)) match = false;
        return match;
    });

    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        filtered.forEach(exp => {
            const catInfo = categoriesMap[exp.category] || { color: '#ccc', icon: '📦' };
            
            // Mood styling logic
            let moodCls = 'mood-neutral'; let moodIcon = '😐'; let moodText = exp.mood || 'Neutral';
            if(exp.mood === 'Happy') { moodCls='mood-happy'; moodIcon='😊'; }
            if(exp.mood === 'Regret') { moodCls='mood-regret'; moodIcon='😰'; }
            if(exp.mood === 'Worth it') { moodCls='mood-worthit'; moodIcon='💎'; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDate(exp.date)}</td>
                <td style="font-weight: 500;">${exp.description}</td>
                <td>
                    <span class="category-badge" style="border: 1px solid ${catInfo.color}; color: ${catInfo.color};">
                        ${catInfo.icon} ${exp.category}
                    </span>
                </td>
                <td><span class="mood-badge ${moodCls}">${moodIcon} ${moodText}</span></td>
                <td><span style="font-size:0.85rem; color: var(--text-secondary);">${exp.paymentMode}</span></td>
                <td style="font-weight: 700;">${formatCurrency(exp.amount, cur)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon edit-btn" data-id="${exp.id}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon delete delete-btn" data-id="${exp.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Attach event listeners for buttons
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
    }
}

async function handleSaveExpense(e) {
    e.preventDefault();
    toggleSpinner(true);
    
    const id = document.getElementById('expense-id').value;
    const payload = {
        amount: parseFloat(document.getElementById('exp-amount').value),
        description: document.getElementById('exp-desc').value,
        date: document.getElementById('exp-date').value,
        category: document.getElementById('exp-category').value,
        paymentMode: document.getElementById('exp-mode').value,
        mood: document.getElementById('exp-mood').value,
        updatedAt: new Date().toISOString()
    };

    try {
        if (id) {
            // Edit
            await updateDoc(doc(db, `users/${currentUser.uid}/expenses`, id), payload);
            showToast('Expense updated successfully', 'success');
        } else {
            // Add
            payload.createdAt = new Date().toISOString();
            await addDoc(collection(db, `users/${currentUser.uid}/expenses`), payload);
            showToast('Expense added successfully', 'success');
        }
        document.getElementById('expense-modal').classList.remove('active');
    } catch (e) {
        console.error("Save Error:", e);
        showToast('Failed to save expense', 'error');
    } finally {
        toggleSpinner(false);
    }
}

function handleEditClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const exp = allExpenses.find(x => x.id === id);
    if (!exp) return;

    document.getElementById('expense-id').value = exp.id;
    document.getElementById('exp-amount').value = exp.amount;
    document.getElementById('exp-desc').value = exp.description;
    document.getElementById('exp-date').value = exp.date;
    document.getElementById('exp-category').value = exp.category;
    document.getElementById('exp-mode').value = exp.paymentMode;
    if(exp.mood) document.getElementById('exp-mood').value = exp.mood;
    
    document.getElementById('modal-title').innerText = 'Edit Expense';
    document.getElementById('expense-modal').classList.add('active');
}

async function handleDeleteClick(e) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    const id = e.currentTarget.getAttribute('data-id');
    toggleSpinner(true);
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/expenses`, id));
        showToast('Expense deleted', 'success');
    } catch (e) {
        console.error("Delete error:", e);
        showToast('Failed to delete', 'error');
    } finally {
        toggleSpinner(false);
    }
}

async function handleOCRScan(e) {
    const file = e.target.files[0];
    if (!file) return;

    toggleSpinner(true);
    showToast("Uploading Image to AI Scanner... Please wait.", "info");

    try {
        // Convert to Base64
        const base64Str = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        showToast("AI analyzing handwritten document...", "info");

        // Prepare FormData
        const formData = new FormData();
        formData.append('base64Image', base64Str);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('isTable', 'true');
        formData.append('engine', '2');

        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                'apikey': 'K81525695288957'
            },
            body: formData
        });

        const result = await response.json();
        
        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage[0]);
        }
        
        const parsedResults = result.ParsedResults;
        if (!parsedResults || parsedResults.length === 0) {
            throw new Error("No text found");
        }
        
        const text = parsedResults[0].ParsedText;
        
        // Simple Regex rules for parsing receipts
        // Try to find Dates:
        const dateRegex = /\b(\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4})\b/g;
        let dateFound = new Date().toISOString().split('T')[0];
        const dateMatch = text.match(dateRegex);
        if (dateMatch) {
            try {
                const parsed = new Date(dateMatch[0].replace(/[\/.]/g, '-'));
                if(!isNaN(parsed)) dateFound = parsed.toISOString().split('T')[0];
            } catch(e) {}
        }
        
        // Try to find Total Amount:
        const totalRegex = /(?:total|amount|due|balance|pay|sum)[\s.:]*\$?\s*(\d+(?:[.,]\d{2})?)/i;
        let amountFound = "0.00";
        const amtMatch = text.match(totalRegex);
        if (amtMatch && amtMatch[1]) {
            amountFound = parseFloat(amtMatch[1].replace(',', '.')).toFixed(2);
        } else {
            const nums = text.match(/\b\d+\.\d{2}\b/g);
            if(nums) {
                let max = 0;
                nums.forEach(n => {
                    const val = parseFloat(n);
                    if(val > max) max = val;
                });
                amountFound = max.toFixed(2);
            }
        }

        // Open Modal and Pre-fill
        document.getElementById('expense-form').reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('modal-title').innerText = 'AI Auto-Filled Expense';
        
        document.getElementById('exp-amount').value = amountFound > 0 ? amountFound : '';
        document.getElementById('exp-date').value = dateFound;
        document.getElementById('exp-desc').value = "Scanned Receipt";
        
        document.getElementById('expense-modal').classList.add('active');
        showToast("Scan Complete! Please verify amounts.", "success");
        
    } catch (err) {
        console.error("OCR Failed:", err);
        showToast("OCR Error! Please process manually.", "error");
    } finally {
        document.getElementById('ocr-file-input').value = '';
        toggleSpinner(false);
    }
}

function exportToCSV() {
    if (allExpenses.length === 0) {
        showToast("No data to export", "info");
        return;
    }
    
    const headers = ["Date", "Description", "Category", "Mood", "Payment Mode", "Amount"];
    const rows = allExpenses.map(exp => [
        exp.date,
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.category,
        exp.mood || "Neutral",
        exp.paymentMode,
        exp.amount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\\n"
        + rows.map(e => e.join(",")).join("\\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
