// firebase.js - Firebase compat mode
const firebaseConfig = {
    apiKey: "AIzaSyD586AysFPgwJAkEFAU-BXlMZEN0ecnbh8",
    authDomain: "football-system-a8887.firebaseapp.com",
    projectId: "football-system-a8887",
    storageBucket: "football-system-a8887.firebasestorage.app",
    messagingSenderId: "907218702953",
    appId: "1:907218702953:web:5a4a4d57735831a6be08f8",
    measurementId: "G-1HF16W0MSR"
};

// Initialize Firebase compat
if (typeof firebase === "undefined") {
    console.error("Firebase SDK not loaded. Make sure you included the compat scripts in the HTML.");
} else {
    try {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        console.log("Firebase initialized, Firestore ready.");
    } catch (e) {
        console.error("Firebase init error:", e);
    }
}