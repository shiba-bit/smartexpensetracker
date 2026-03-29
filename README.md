# Expense Tracker System

A complete Personal Expense Tracker web application built using HTML, CSS, Vanilla JavaScript, and Firebase for serverless backend functionality.

## Features
1. **Authentication:** Register and login via Firebase Auth.
2. **Dashboard:** Live insights and summarized balances.
3. **Expense & Income Logging:** Fully functional CRUD with filtering.
4. **Budgeting:** Set global and category-specific budget limits to control spending.
5. **Analytics:** Chart.js integration showing categorical breakdown, daily spending trends, and 6-month comparisons.
6. **Savings Goals:** Set up multiple savings goals and fund them progressively.
7. **Calendar Heatmap:** Monthly visualization showing days of high/low spending.
8. **AI Insights:** Rule-based heuristics acting as an intelligent advisor based on your tracked data.
9. **Premium UI:** Smooth glassmorphism, responsive mobile-first design, dark/light toggle.

## Setup Guide

### 1. Firebase Configuration
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Authentication** via Email/Password.
4. Create a **Firestore Database** in **Production Mode**.
5. Enable the following specific Security Rules under your Firestore settings:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null
                            && request.auth.uid == userId;
       }
     }
   }
   ```
6. Get your **Firebase Config Object** from Project Settings.
7. Open `js/firebase-config.js` and paste your specific keys substituting the placeholders.

### 2. Local Development
Simply open `login.html` or `index.html` via Live Server or any static local server. No `npm install` or build step is required since this is a pure Vanilla HTML/JS project!

### 3. Deployment
This project is configured optimally for zero-config deployment on Vercel. 
- Commit to GitHub.
- Import the repo to Vercel.
- Deploy.

## Live Demo
Vercel Live URL: *(Pending Deployment)*
