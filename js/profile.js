import { db, auth } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { showToast, toggleSpinner } from './utils.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

requireAuth(async (user) => {
    currentUser = user;
    
    // Load existing profile from Firestore to pass into header if needed
    let profileData = { name: user.displayName, phone: '', bio: '' };
    try {
        const docSnap = await getDoc(doc(db, "users", user.uid, "profile", "data"));
        if (docSnap.exists()) {
            profileData = { ...profileData, ...docSnap.data() };
        }
    } catch(e) {}

    setupCommonUI('app-container', 'profile', 'User Profile', profileData);
    populateForm(user, profileData);
    setupListeners();
});

function populateForm(user, profileData) {
    const actualName = user.displayName || user.name || '';
    document.getElementById('prof-name').value = actualName;
    document.getElementById('prof-email').value = user.email || '';
    document.getElementById('prof-bio').value = profileData.bio || '';
    
    if(user.metadata && user.metadata.creationTime) {
        document.getElementById('profile-created-date').innerText = new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    updateDisplayAvatars(actualName || 'U', user.email);
}

function updateDisplayAvatars(name, email) {
    const firstLet = name ? name.charAt(0).toUpperCase() : 'U';
    document.getElementById('profile-name-display').innerText = name;
    document.getElementById('profile-email-display').innerText = email;
    document.getElementById('profile-avatar-display').innerText = firstLet;
}

function setupListeners() {
    // Live update profile avatar letter as user types
    document.getElementById('prof-name').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const letter = val ? val.charAt(0).toUpperCase() : 'U';
        document.getElementById('profile-avatar-display').innerText = letter;
    });

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleSpinner(true);
        
        const newName = document.getElementById('prof-name').value.trim();
        const bio = document.getElementById('prof-bio').value.trim();
        
        try {
            // Update Auth Profile
            if (newName !== currentUser.displayName && newName !== currentUser.name) {
                await updateProfile(auth.currentUser, { displayName: newName });
            }
            
            // Update Firestore Profile Document
            await setDoc(doc(db, "users", currentUser.uid, "profile", "data"), {
                bio: bio,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            // Update local display
            updateDisplayAvatars(newName, currentUser.email);
            
            // Update Header if available
            const headerNameEl = document.getElementById('header-user-name');
            const headerAvatarEl = document.getElementById('header-avatar');
            if (headerNameEl) headerNameEl.innerText = newName;
            if (headerAvatarEl) headerAvatarEl.innerText = newName.charAt(0).toUpperCase();
            
            showToast("Profile saved successfully!", "success");
        } catch (error) {
            console.error("Profile settings save failed:", error);
            showToast(error.message || "Failed to save profile settings.", "error");
        } finally {
            toggleSpinner(false);
        }
    });

    document.getElementById('btn-cancel-profile').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}
