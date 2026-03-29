// weeklyreport.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { formatCurrency } from './utils.js';

export async function renderWeeklyReports(uid) {
    const container = document.getElementById('weekly-reports-container');
    if (!container) return;
    
    container.innerHTML = `<div class="spinner" style="width: 30px; height: 30px; border-width: 3px; margin: 0 auto;"></div>`;

    // Calculate Last 4 Weeks based on JS Dates
    const weeks = [];
    const now = new Date();
    // Start from last Sunday
    let end = new Date(now);
    end.setDate(now.getDate() - now.getDay()); // Last Sunday
    
    for(let i=0; i<4; i++) {
        let start = new Date(end);
        start.setDate(end.getDate() - 6); // Previous Monday
        
        weeks.push({
            start: new Date(start), // copy
            end: new Date(end),     // copy
            label: `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })}`,
            totalSpent: 0,
            catMap: {}
        });
        
        // Move end date back 1 week
        end.setDate(end.getDate() - 7);
    }

    try {
        const earliestStart = weeks[3].start.toISOString().split('T')[0];
        const latestEnd = new Date().toISOString().split('T')[0];

        const q = query(collection(db, `users/${uid}/expenses`),
            where("date", ">=", earliestStart),
            where("date", "<=", latestEnd)
        );
        const snap = await getDocs(q);
        
        snap.forEach(doc => {
            const exp = doc.data();
            const eDate = new Date(exp.date);
            
            // Find which week it falls in
            for(let w of weeks) {
                // Ignore time for accurate inclusive day comparison
                const sCompare = new Date(w.start).setHours(0,0,0,0);
                const eCompare = new Date(w.end).setHours(23,59,59,999);
                const tgtCompare = eDate.getTime();
                
                if (tgtCompare >= sCompare && tgtCompare <= eCompare) {
                    w.totalSpent += parseFloat(exp.amount);
                    w.catMap[exp.category] = (w.catMap[exp.category] || 0) + parseFloat(exp.amount);
                    break;
                }
            }
        });

        // Generate HTML
        const cur = localStorage.getItem('currency') || '₹';
        let html = '';
        
        weeks.forEach((w, idx) => {
            let topCat = "None";
            let topAmt = 0;
            for(const [cat, amt] of Object.entries(w.catMap)) {
                if (amt > topAmt) { topAmt = amt; topCat = cat; }
            }

            // Assign tips
            let tip = "Steady spending. Keep it up!";
            let icon = 'fa-thumbs-up'; let color = '#10b981';
            
            if (topAmt > 0 && (topAmt / w.totalSpent) > 0.5) {
                tip = `Warning: 50%+ spent on ${topCat}.`;
                icon = 'fa-triangle-exclamation'; color = '#f59e0b';
            } else if (w.totalSpent === 0) {
                tip = "Zero Spend Week! Incredible!";
                icon = 'fa-star'; color = '#6366f1';
            } else if (idx > 0 && w.totalSpent > weeks[idx-1].totalSpent) {
                tip = "Spending increased this week.";
                icon = 'fa-arrow-trend-up'; color = '#ef4444';
            } else if (idx > 0 && w.totalSpent < weeks[idx-1].totalSpent) {
                tip = "Awesome! You spent less this week.";
                icon = 'fa-arrow-trend-down'; color = '#10b981';
            }

            html += `
                <div class="glass-panel" style="min-width: 250px; padding: 1.5rem; flex: 1;">
                    <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">${w.label}</div>
                    <div style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 1rem;">${formatCurrency(w.totalSpent, cur)}</div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.5rem;">
                        <span style="color: var(--text-secondary);">Top Cat:</span>
                        <span style="font-weight: 600;">${topCat}</span>
                    </div>
                    
                    <div style="display: flex; align-items: flex-start; gap: 0.5rem; margin-top: 1rem;">
                        <i class="fa-solid ${icon}" style="color: ${color}; padding-top: 3px;"></i>
                        <span style="font-size: 0.85rem; color: var(--text-primary);">${tip}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<p style="color: var(--danger);">Failed to load weekly reports.</p>`;
    }
}
