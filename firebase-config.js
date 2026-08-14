const firebaseConfig = {
   apiKey: "AIzaSyD19OlxhsiRiwY6sJmFr0lum6h86k4skA4",
    authDomain: "student-registration-174bb.firebaseapp.com",
    projectId: "student-registration-174bb",
    storageBucket: "student-registration-174bb.firebasestorage.app",
    messagingSenderId: "983077364745",
    appId: "1:983077364745:web:d7952ecc544277094304d8",
    measurementId: "G-M1RWKN7N3T"
};

// Initialize Firebase (uses the compat SDK loaded in index.html)
firebase.initializeApp(firebaseConfig);

// Used by script.js — do not rename. File uploads use Cloudinary instead
// of Firebase Storage, so we only need Firestore here.
const db = firebase.firestore();