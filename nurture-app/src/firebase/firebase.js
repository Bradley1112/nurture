
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFEkOV9N1ofnc6d40KJFXQJjdQVcUMT0o",
  authDomain: "learning-buddies-89586.firebaseapp.com",
  projectId: "learning-buddies-89586",
  storageBucket: "learning-buddies-89586.firebasestorage.app",
  messagingSenderId: "487120218957",
  appId: "1:487120218957:web:74f2e9940017d0d680a504",
  measurementId: "G-WYL7VW7VYJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
