// firebase.js - Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD586AysFPgwJAkEFAU-BXlMZEN0ecnbh8",
    authDomain: "football-system-a8887.firebaseapp.com",
    projectId: "football-system-a8887",
    storageBucket: "football-system-a8887.firebasestorage.app",
    messagingSenderId: "907218702953",
    appId: "1:907218702953:web:5a4a4d57735831a6be08f8",
    measurementId: "G-1HF16W0MSR"
};

// Initialize Firebase
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Make db available globally
window.db = firebase.firestore();
console.log("✅ Firebase initialized, db ready:", !!window.db);
