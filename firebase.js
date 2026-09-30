// firebase.js — connects every page to your Firestore database.
// Loaded AFTER firebase-app-compat.js and firebase-firestore-compat.js,
// and BEFORE script.js / auth.js on every page.
//
// 1. Go to https://console.firebase.google.com → your project
// 2. Project settings (gear icon) → General → "Your apps" → Web app (</>)
// 3. Copy the values from "firebaseConfig" and paste them below.

const firebaseConfig = {
    apiKey:            "PASTE_YOUR_API_KEY",
    authDomain:        "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "PASTE_YOUR_PROJECT_ID",
    storageBucket:     "PASTE_YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId:             "PASTE_YOUR_APP_ID"
};

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
