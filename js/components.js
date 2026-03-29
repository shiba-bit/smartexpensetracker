// js/components.js
import { handleLogout } from './auth.js';

export function injectSidebar(activeId) {
    const sidebarHTML = `
        <nav class="sidebar glass-panel" id="main-sidebar">
            <div class="sidebar-logo">
                <i class="fa-solid fa-wallet"></i>
                <span class="sidebar-text" data-i18n="appTitle">Tracker</span>
            </div>
            <ul class="nav-links">
                <a href="index.html" class="nav-item ${activeId === 'dashboard' ? 'active' : ''}">
                    <i class="fa-solid fa-chart-pie"></i><span class="sidebar-text" data-i18n="navDashboard">Dashboard</span>
                </a>
                <a href="expenses.html" class="nav-item ${activeId === 'expenses' ? 'active' : ''}">
                    <i class="fa-solid fa-arrow-trend-down"></i><span class="sidebar-text" data-i18n="navExpenses">Expenses</span>
                </a>
                <a href="income.html" class="nav-item ${activeId === 'income' ? 'active' : ''}">
                    <i class="fa-solid fa-arrow-trend-up"></i><span class="sidebar-text" data-i18n="navIncome">Income</span>
                </a>
                <a href="budget.html" class="nav-item ${activeId === 'budget' ? 'active' : ''}">
                    <i class="fa-solid fa-money-bill-wave"></i><span class="sidebar-text" data-i18n="navBudget">Budget</span>
                </a>
                <a href="reports.html" class="nav-item ${activeId === 'reports' ? 'active' : ''}">
                    <i class="fa-solid fa-chart-line"></i><span class="sidebar-text" data-i18n="navReports">Reports</span>
                </a>
                <a href="goals.html" class="nav-item ${activeId === 'goals' ? 'active' : ''}">
                    <i class="fa-solid fa-bullseye"></i><span class="sidebar-text" data-i18n="navGoals">Goals</span>
                </a>
                <a href="calendar.html" class="nav-item ${activeId === 'calendar' ? 'active' : ''}">
                    <i class="fa-solid fa-calendar-days"></i><span class="sidebar-text" data-i18n="navCalendar">Calendar</span>
                </a>
                <a href="score.html" class="nav-item ${activeId === 'score' ? 'active' : ''}">
                    <i class="fa-solid fa-star-half-stroke"></i><span class="sidebar-text" data-i18n="navScore">Spending Score</span>
                </a>
                <a href="challenge.html" class="nav-item ${activeId === 'challenge' ? 'active' : ''}">
                    <i class="fa-solid fa-fire-flame-curved"></i><span class="sidebar-text" data-i18n="navChallenge">No Spend Days</span>
                </a>
                <a href="timemachine.html" class="nav-item ${activeId === 'timemachine' ? 'active' : ''}">
                    <i class="fa-solid fa-clock-rotate-left"></i><span class="sidebar-text" data-i18n="navTimeMachine">Time Machine</span>
                </a>
                <a href="ai-insights.html" class="nav-item ${activeId === 'ai-insights' ? 'active' : ''}">
                    <i class="fa-solid fa-robot"></i><span class="sidebar-text" data-i18n="navInsights">AI Insights</span>
                </a>
                <a href="guide.html" class="nav-item ${activeId === 'guide' ? 'active' : ''}">
                    <i class="fa-solid fa-book-open-reader"></i><span class="sidebar-text" data-i18n="navGuide">User Guide</span>
                </a>
                <a href="profile.html" class="nav-item ${activeId === 'profile' ? 'active' : ''}">
                    <i class="fa-solid fa-user"></i><span class="sidebar-text" data-i18n="navProfile">Profile</span>
                </a>
                <a href="settings.html" class="nav-item ${activeId === 'settings' ? 'active' : ''}">
                    <i class="fa-solid fa-gear"></i><span class="sidebar-text" data-i18n="navSettings">Settings</span>
                </a>
            </ul>
            <div class="sidebar-footer" style="margin-top: auto;">
                <button id="logout-btn" class="btn btn-outline" style="width: 100%; justify-content: flex-start; margin-bottom: 2rem;">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> <span class="sidebar-text" data-i18n="navLogout">Logout</span>
                </button>
            </div>
        </nav>
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;
    return sidebarHTML;
}

export function injectHeader(title, userName) {
    const headerHTML = `
        <header class="top-header">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <button id="sidebar-toggle" class="btn-icon" style="font-size: 1.5rem; display: block; margin-right: 0.5rem;"><i class="fa-solid fa-bars"></i></button>
                <div>
                    <h2 data-i18n="pageTitle_${title.replace(/\s+/g, '')}">${title}</h2>
                    <p id="header-subtitle" data-i18n="headerSubtitle">Manage your money effectively</p>
                </div>
            </div>
            <div class="header-user">
                <div class="theme-toggle" id="theme-toggle" style="cursor: pointer; font-size: 1.2rem; margin-right: 15px;">
                    <i class="fa-solid fa-moon"></i>
                </div>
                <div style="text-align: right;" class="hide-mobile">
                    <div style="font-weight: 600;" id="header-user-name">${userName || ''}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);" data-i18n="headerVerified">Verified User</div>
                </div>
                <a href="profile.html" style="text-decoration: none;">
                    <div class="avatar" id="header-avatar">${(userName ? userName.charAt(0) : 'U').toUpperCase()}</div>
                </a>
                <button id="header-logout-btn" class="btn btn-outline hide-mobile" style="margin-left: 15px; padding: 0.3rem 0.8rem; font-size: 0.85rem; border-color: var(--danger); color: var(--danger);" title="Logout">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        </header>
    `;
    return headerHTML;
}

export function injectFooter() {
    return `
        <footer class="app-footer" style="background-color: #282A35; color: #fff; padding: 2rem 2rem 1.5rem; width: 100%; font-family: 'Inter', sans-serif; overflow-x: hidden;">
            <style>
                @media (max-width: 768px) {
                    .w3-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
                    .w3-footer-bottom { flex-direction: column !important; text-align: center !important; gap: 1rem !important; }
                }
                @media (max-width: 480px) {
                    .w3-footer-grid { grid-template-columns: 1fr !important; text-align: center !important; }
                }
            </style>
            <div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Main Links Grid (Highly Compressed) -->
                <div class="w3-footer-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem;">
                    
                    <div>
                        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">Product</h4>
                        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; margin: 0;">
                            <li><a href="index.html" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Dashboard & Tracking</a></li>
                            <li><a href="budget.html" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Smart Budgeting & Goals</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">Intelligence</h4>
                        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; margin: 0;">
                            <li><a href="reports.html" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Data Reports & Scores</a></li>
                            <li><a href="ai-insights.html" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Time Machine & AI</a></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">Resources</h4>
                        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; margin: 0;">
                            <li><a href="guide.html" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Developer API & Guides</a></li>
                            <li><a href="#" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Financial Strategies</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 style="color: #fff; font-size: 0.95rem; margin-bottom: 0.75rem; font-weight: 600;">Legal</h4>
                        <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; margin: 0;">
                            <li><a href="#" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Privacy Policy & Terms</a></li>
                            <li><a href="#" style="color: #ddd; text-decoration: none; font-size: 0.8rem; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'">Security Architecture</a></li>
                        </ul>
                    </div>

                </div>

                <!-- Bottom Strip (Horizontal Layout) -->
                <div class="w3-footer-bottom" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #383A45; padding-top: 1rem;">
                    
                    <!-- Logo -->
                    <div style="font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; letter-spacing: 0.5px;">
                        <i class="fa-solid fa-wallet" style="color: #04AA6D;"></i>
                        SMART EXPENSE TRACKER
                    </div>

                    <!-- Socials -->
                    <div style="display: flex; gap: 1rem; font-size: 1.2rem;">
                        <a href="#" style="color: #ddd; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'"><i class="fa-brands fa-facebook"></i></a>
                        <a href="#" style="color: #ddd; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'"><i class="fa-brands fa-instagram"></i></a>
                        <a href="#" style="color: #ddd; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'"><i class="fa-brands fa-linkedin"></i></a>
                        <a href="#" style="color: #ddd; transition: color 0.3s;" onmouseover="this.style.color='#04AA6D'" onmouseout="this.style.color='#ddd'"><i class="fa-brands fa-discord"></i></a>
                    </div>
                    
                    <!-- Copy -->
                    <p style="color: #aaa; font-size: 0.75rem; margin: 0;">
                        &copy; 2026-${new Date().getFullYear()} Smart Expense Tracker. All Rights Reserved.
                    </p>

                </div>
            </div>
        </footer>
    `;
}

export function setupCommonUI(containerId, activeId, title, profile) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Inject sidebar and wrap main content
    const mainContentHTML = container.innerHTML;
    container.innerHTML = `
        <div style="height: 4px; width: 100%; position: fixed; top: 0; left: 0; z-index: 9999; background: linear-gradient(90deg, #4338ca, #3b82f6, #10b981, #f59e0b, #ec4899); background-size: 200% 200%; animation: proGradientSlide 4s ease infinite;">
            <style>
                @keyframes proGradientSlide {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            </style>
        </div>
        <div style="display: flex; width: 100%; min-height: 100vh;">
            ${injectSidebar(activeId)}
            <div class="main-content" id="main-content" style="padding: 0; display: flex; flex-direction: column;">
                <div style="padding: 2rem 3rem; flex: 1;">
                    ${injectHeader(title, profile ? profile.displayName || profile.name : '')}
                    <div class="page-content fade-in">
                        ${mainContentHTML}
                    </div>
                </div>
            </div>
        </div>
        ${injectFooter()}
    `;

    // Setup Logout Event Listener
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('header-logout-btn')?.addEventListener('click', handleLogout);

    // Sidebar Toggle Logistics
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const toggleIcon = toggleBtn?.querySelector('i');
    
    toggleBtn?.addEventListener('click', () => {
        if(window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            document.getElementById('main-content').classList.toggle('expanded');
            if(sidebar.classList.contains('collapsed')) {
                toggleIcon.className = 'fa-solid fa-angle-right';
            } else {
                toggleIcon.className = 'fa-solid fa-bars';
            }
        }
    });

    overlay?.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    // Theme logic
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        const icon = document.querySelector('#theme-toggle i');
        if (icon) icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = document.querySelector('#theme-toggle i');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    
    // Apply Translation (if i18n loaded)
    if(window.translatePage) {
        window.translatePage(localStorage.getItem('lang') || 'en');
    }
}



