// firebase.js - Firebase configuration
// REPLACE THE VALUES BELOW WITH YOUR ACTUAL FIREBASE PROJECT CONFIG
// Get these from: Firebase Console -> Project Settings -> Your Apps -> SDK setup

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Make db available globally
window.db = firebase.firestore();

console.log("✅ Firebase initialized, db ready:", !!window.db);
