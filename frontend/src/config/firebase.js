// Firebase Frontend Configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyC5eK4D0DacIbxU2nX7EsWMAE6zvr3AqWc",
    authDomain: "learning-english-with-michael.firebaseapp.com",
    projectId: "learning-english-with-michael",
    storageBucket: "learning-english-with-michael.firebasestorage.app",
    messagingSenderId: "756241741039",
    appId: "1:756241741039:web:4e751d8d385c0ce69bd71a",
    measurementId: "G-7BM6TWMVJ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Analytics (only in production)
let analytics = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    analytics = getAnalytics(app);
}

export { app, auth, analytics };
export default app;
