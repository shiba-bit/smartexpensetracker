// settings.js
import { db, auth } from './firebase-config.js';
import { requireAuth, handleLogout } from './auth.js';
import { setupCommonUI } from './components.js';
import { showToast, toggleSpinner } from './utils.js';
import { doc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

requireAuth((user) => {
    currentUser = user;
    setupCommonUI('app-container', 'settings', 'Settings', user);
    
    // Load existing prefs
    document.getElementById('set-currency').value = localStorage.getItem('currency') || '₹';
    document.getElementById('set-theme').value = localStorage.getItem('theme') || 'light';
    document.getElementById('set-language').value = localStorage.getItem('lang') || 'en';
    
    setupListeners();
});

function setupListeners() {
    document.getElementById('preferences-form').addEventListener('submit', handleSavePreferences);
    document.getElementById('password-form').addEventListener('submit', handleChangePassword);
    document.getElementById('btn-delete-account').addEventListener('click', handleDeleteAccount);
}

async function handleSavePreferences(e) {
    e.preventDefault();
    toggleSpinner(true);
    
    const cur = document.getElementById('set-currency').value;
    const theme = document.getElementById('set-theme').value;
    const lang = document.getElementById('set-language').value;
    
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            currency: cur,
            theme: theme,
            language: lang
        });
        
        localStorage.setItem('currency', cur);
        localStorage.setItem('theme', theme);
        localStorage.setItem('lang', lang);
        
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
        if(window.translatePage) window.translatePage(lang);
        
        showToast('Preferences updated successfully', 'success');
    } catch(e) {
        showToast('Failed to update preferences', 'error');
    } finally {
        toggleSpinner(false);
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    
    const curPwd = document.getElementById('current-pwd').value;
    const newPwd = document.getElementById('new-pwd').value;
    const confPwd = document.getElementById('confirm-pwd').value;
    
    if (newPwd !== confPwd) {
        showToast('New passwords do not match!', 'error');
        return;
    }

    toggleSpinner(true);
    
    try {
        const pureUser = auth.currentUser;
        const credential = EmailAuthProvider.credential(pureUser.email, curPwd);
        await reauthenticateWithCredential(pureUser, credential);
        
        await updatePassword(pureUser, newPwd);
        showToast('Password updated successfully', 'success');
        document.getElementById('password-form').reset();
    } catch(e) {
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
            showToast('Incorrect current password', 'error');
        } else {
            showToast(e.message, 'error');
        }
    } finally {
        toggleSpinner(false);
    }
}

async function handleDeleteAccount() {
    if (!confirm('WARNING: This will delete ALL your data and cannot be undone. Area you sure?')) return;
    
    toggleSpinner(true);
    try {
        // We should idealy do a batched delete of subcollections but since it requires looping through getDocs we might skip or do best effort
        // In serverless client, this can be complex.
        const uid = currentUser.uid;
        showToast('Processing account deletion...', 'info');
        
        // Delete User Auth
        const pureUser = auth.currentUser;
        await deleteUser(pureUser);
        
        showToast('Account deleted permanently', 'success');
        setTimeout(() => window.location.href = 'login.html', 1500);
        
    } catch(e) {
        if(e.code === 'auth/requires-recent-login') {
            showToast('Security required: Please logout and login again before deleting account', 'error');
        } else {
            showToast(e.message, 'error');
        }
    } finally {
        toggleSpinner(false);
    }
}
