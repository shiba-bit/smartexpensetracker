// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD_sfxtlkaB0suXJyHethcy6o3NLnKf4pc",
  authDomain: "personal-expense-tracker-86fa2.firebaseapp.com",
  projectId: "personal-expense-tracker-86fa2",
  storageBucket: "personal-expense-tracker-86fa2.firebasestorage.app",
  messagingSenderId: "815345469819",
  appId: "1:815345469819:web:dc545a03dcb7081cb515de"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
