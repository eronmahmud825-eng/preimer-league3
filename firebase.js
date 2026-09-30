// firebase.js — connects every page to your Firestore database.
// Loaded AFTER firebase-app-compat.js and firebase-firestore-compat.js,
// and BEFORE script.js / auth.js on every page.
//
// 1. Go to https://console.firebase.google.com → your project
// 2. Project settings (gear icon) → General → "Your apps" → Web app (</>)
// 3. Copy the values from "firebaseConfig" and paste them below.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD586AysFPgwJAkEFAU-BXlMZEN0ecnbh8",
  authDomain: "football-system-a8887.firebaseapp.com",
  databaseURL: "https://football-system-a8887-default-rtdb.firebaseio.com",
  projectId: "football-system-a8887",
  storageBucket: "football-system-a8887.firebasestorage.app",
  messagingSenderId: "907218702953",
  appId: "1:907218702953:web:5a4a4d57735831a6be08f8",
  measurementId: "G-1HF16W0MSR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

(function () {
    var notConfigured = Object.values(firebaseConfig).some(function (v) {
        return String(v).indexOf("PASTE_YOUR") !== -1;
    });

    if (notConfigured) {
        console.error("❌ firebase.js: firebaseConfig still has placeholder values. Paste your real config from the Firebase console.");
        window.addEventListener("DOMContentLoaded", function () {
            var bar = document.createElement("div");
            bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;padding:12px 16px;" +
                "background:#2e0a0a;border-top:1px solid #e74c3c;color:#ff8a8d;font:600 14px system-ui,sans-serif;text-align:center;";
            bar.textContent = "⚠️ Firebase isn't connected yet — open firebase.js and paste your firebaseConfig.";
            document.body.appendChild(bar);
        });
        return; // window.db stays undefined, pages show their own "not connected" messages
    }

    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        console.log("✅ Firebase connected to project:", firebaseConfig.projectId);
    } catch (err) {
        console.error("❌ Firebase failed to start:", err);
    }
})();
