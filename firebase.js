// firebase.js — connects every page to your Firestore database.
// Loaded AFTER firebase-app-compat.js and firebase-firestore-compat.js,
// and BEFORE script.js / auth.js on every page.

const firebaseConfig = {
    apiKey:            "AIzaSyD586AysFPgwJAkEFAU-BXlMZEN0ecnbh8",
    authDomain:        "football-system-a8887.firebaseapp.com",
    databaseURL:       "https://football-system-a8887-default-rtdb.firebaseio.com",
    projectId:         "football-system-a8887",
    storageBucket:     "football-system-a8887.firebasestorage.app",
    messagingSenderId: "907218702953",
    appId:             "1:907218702953:web:5a4a4d57735831a6be08f8",
    measurementId:     "G-1HF16W0MSR"
};

(function () {
    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        console.log("✅ Firebase connected to project:", firebaseConfig.projectId);
    } catch (err) {
        console.error("❌ Firebase failed to start:", err);
    }
})();
