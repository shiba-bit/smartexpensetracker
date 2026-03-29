// auth.js
import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, toggleSpinner } from './utils.js';

// Login User
export async function handleLogin(email, password) {
    if (!auth) {
        showToast('Firebase is not configured yet. Please check step 1.', 'error');
        return;
    }
    toggleSpinner(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showToast('Login successful!', 'success');
        setTimeout(() => window.location.href = 'index.html', 1000);
    } catch (error) {
        showToast(error.message, 'error');
        console.error("Login Error:", error);
    } finally {
        toggleSpinner(false);
    }
}

// Register User
export async function handleRegister(email, password, userData) {
    if (!auth) {
        showToast('Firebase is not configured yet. Please check step 1.', 'error');
        return;
    }
    toggleSpinner(true);
    try {
        // Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save extra user info to Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: userData.name,
            email: email,
            phone: userData.phone,
            occupation: userData.occupation,
            monthlyBudget: 0,
            currency: '₹',
            theme: 'light',
            createdAt: new Date().toISOString()
        });

        // Setup default categories
        const defaultCategories = [
            { name: "Food", color: "#FF6B6B", icon: "🍔" },
            { name: "Transport", color: "#4ECDC4", icon: "🚌" },
            { name: "Rent", color: "#45B7D1", icon: "🏠" },
            { name: "Stationery", color: "#FDCB6E", icon: "📚" },
            { name: "Entertainment", color: "#6C5CE7", icon: "🎮" },
            { name: "Healthcare", color: "#FD79A8", icon: "💊" },
            { name: "Shopping", color: "#00B894", icon: "🛍️" },
            { name: "Utilities", color: "#0984E3", icon: "⚡" },
            { name: "Other", color: "#B2BEC3", icon: "📦" }
        ];

        for (let i = 0; i < defaultCategories.length; i++) {
            const cat = defaultCategories[i];
            await setDoc(doc(db, `users/${user.uid}/categories`, `cat_${i}`), cat);
        }

        showToast('Registration successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);
    } catch (error) {
        showToast(error.message, 'error');
        console.error("Register Error:", error);
    } finally {
        toggleSpinner(false);
    }
}

// Logout
export function handleLogout() {
    if (!auth) return;
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        showToast(error.message, 'error');
    });
}

// Route Protection and Global Auth Listener
export function requireAuth(onAuthenticatedCallback) {
    if (!auth) {
        console.warn("Firebase not configured. Mocking auth for UI testing.");
        if (onAuthenticatedCallback) onAuthenticatedCallback({ uid: "TEST_USER", name: "Guest User" });
        return;
    }
    
    // Create an overlay to prevent flash of content
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100%'; overlay.style.height = '100%';
    overlay.style.backgroundColor = 'var(--bg-primary)';
    overlay.style.zIndex = '999999';
    document.body.appendChild(overlay);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            document.body.removeChild(overlay);
            if (onAuthenticatedCallback) {
                // Fetch User profile to get name and global settings
                try {
                    const docSnap = await getDoc(doc(db, "users", user.uid));
                    let profileData = {};
                    if (docSnap.exists()) {
                        profileData = docSnap.data();
                        localStorage.setItem('currency', profileData.currency || '₹');
                        if (profileData.theme) {
                            localStorage.setItem('theme', profileData.theme);
                            document.documentElement.setAttribute('data-theme', profileData.theme === 'dark' ? 'dark' : 'light');
                        }
                    }
                    onAuthenticatedCallback({ ...user, ...profileData });
                } catch(e) {
                    onAuthenticatedCallback(user);
                }
            }
        } else {
            // No user is signed in
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
                window.location.href = 'login.html';
            } else {
                if(document.body.contains(overlay)) document.body.removeChild(overlay);
            }
        }
    });
}
