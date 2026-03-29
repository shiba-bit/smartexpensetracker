// challenge.js
import { db } from './firebase-config.js';
import { requireAuth } from './auth.js';
import { setupCommonUI } from './components.js';
import { toggleSpinner } from './utils.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let noSpendDates = []; // Array of YYYY-MM-DD
let currentStreak = 0;
let bestStreak = 0;

requireAuth(async (user) => {
    currentUser = user;
    setupCommonUI('app-container', 'challenge', 'Zero Spend', user);
    
    document.getElementById('btn-mark-today').addEventListener('click', handleMarkToday);
    document.getElementById('btn-unlock-today').addEventListener('click', handleUnlockToday);
    
    await fetchChallengeData();
});

async function fetchChallengeData() {
    toggleSpinner(true);
    
    // 1. Fetch tracker doc
    const ref = doc(db, `users/${currentUser.uid}/challenge/data`);
    const snap = await getDoc(ref);
    if(snap.exists()) {
        const d = snap.data();
        noSpendDates = d.dates || [];
        bestStreak = d.bestStreak || 0;
    }
    
    calculateStreaks();
    await verifyTodayEligibility();
    renderUI();
    
    toggleSpinner(false);
}

function calculateStreaks() {
    if(noSpendDates.length === 0) {
        currentStreak = 0;
        return;
    }
    
    // Sort descending
    const sorted = [...noSpendDates].sort((a,b) => new Date(b) - new Date(a));
    
    let streakCounter = 0;
    let expectedDate = new Date();
    
    // Check if yesterday or today is the start of the streak
    const todayStr = expectedDate.toISOString().split('T')[0];
    let yesterday = new Date(expectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];
    
    if (sorted[0] !== todayStr && sorted[0] !== yestStr) {
        // the streak is broken immediately
        currentStreak = 0;
        return;
    }

    let ptrDate = new Date(sorted[0]);
    for(let i=0; i<sorted.length; i++) {
        const currStr = ptrDate.toISOString().split('T')[0];
        if(sorted[i] === currStr) {
            streakCounter++;
            ptrDate.setDate(ptrDate.getDate() - 1); // move back one day
        } else {
            break; // gap found
        }
    }
    
    currentStreak = streakCounter;
    if(currentStreak > bestStreak) {
        bestStreak = currentStreak;
        // update best streak in BG
        setDoc(doc(db, `users/${currentUser.uid}/challenge/data`), { 
            dates: noSpendDates, bestStreak: bestStreak 
        }, { merge: true });
    }
}

async function verifyTodayEligibility() {
    const today = new Date().toISOString().split('T')[0];
    const btn = document.getElementById('btn-mark-today');
    const uBtn = document.getElementById('btn-unlock-today');
    const msg = document.getElementById('validation-msg');
    
    if (noSpendDates.includes(today)) {
        btn.disabled = true;
        btn.style.display = 'none';
        uBtn.style.display = 'inline-block';
        msg.textContent = "You have already secured your No Spend victory today.";
        msg.style.color = "white";
        return;
    } else {
        btn.style.display = 'inline-block';
        uBtn.style.display = 'none';
    }
    
    // Check expenses for today
    const expQ = query(collection(db, `users/${currentUser.uid}/expenses`), where("date", "==", today));
    const snap = await getDocs(expQ);
    
    if (!snap.empty) {
        btn.disabled = true;
        msg.textContent = `❌ Cannot activate: You logged ${snap.size} expense(s) today.`;
        msg.style.color = "#ef4444";
    } else {
        btn.disabled = false;
        msg.textContent = "✅ Verified: 0 expenses logged today.";
        msg.style.color = "#10b981";
    }
}

function renderUI() {
    document.getElementById('val-current-streak').innerHTML = `${currentStreak} <i class="fa-solid fa-fire" style="color: #ef4444; font-size: 1.5rem;"></i>`;
    document.getElementById('val-best-streak').innerHTML = `${bestStreak} <i class="fa-solid fa-trophy" style="font-size: 1.5rem;"></i>`;
    document.getElementById('val-total-days').innerHTML = `${noSpendDates.length} <i class="fa-solid fa-calendar-check" style="color: #10b981; font-size: 1.5rem;"></i>`;
    
    // Manage Badges
    const b3 = document.getElementById('badge-3');
    const b7 = document.getElementById('badge-7');
    const b14 = document.getElementById('badge-14');
    const b30 = document.getElementById('badge-30');
    
    if(currentStreak >= 3) b3.classList.add('unlocked'); else b3.classList.remove('unlocked');
    if(currentStreak >= 7) b7.classList.add('unlocked'); else b7.classList.remove('unlocked');
    if(currentStreak >= 14) b14.classList.add('unlocked'); else b14.classList.remove('unlocked');
    if(currentStreak >= 30) b30.classList.add('unlocked'); else b30.classList.remove('unlocked');
}

async function handleMarkToday(e) {
    e.preventDefault();
    toggleSpinner(true);
    try {
        const today = new Date().toISOString().split('T')[0];
        if(!noSpendDates.includes(today)) {
            noSpendDates.push(today);
            
            await setDoc(doc(db, `users/${currentUser.uid}/challenge/data`), {
                dates: noSpendDates,
                bestStreak: bestStreak
            }, { merge: true });
            
            calculateStreaks();
            await verifyTodayEligibility();
            renderUI();
            
            // Trigger confetti equivalent logic manually without library
            alert("Victory! Today is secured as a No Spend Day."); 
        }
    } catch(err) {
        console.error(err);
        alert("Failed to save.");
    } finally {
        toggleSpinner(false);
    }
}

async function handleUnlockToday(e) {
    e.preventDefault();
    if(!confirm("Are you sure you want to unlock today? This will break any streak relying on today's success.")) return;
    
    toggleSpinner(true);
    try {
        const today = new Date().toISOString().split('T')[0];
        noSpendDates = noSpendDates.filter(d => d !== today);
        
        await setDoc(doc(db, `users/${currentUser.uid}/challenge/data`), {
            dates: noSpendDates,
            bestStreak: bestStreak
        }, { merge: true });
        
        calculateStreaks();
        await verifyTodayEligibility();
        renderUI();
        
    } catch(err) {
        console.error(err);
        alert("Failed to unlock.");
    } finally {
        toggleSpinner(false);
    }
}
