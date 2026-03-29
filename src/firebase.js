// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Added this

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAyHcvP8cTFIuB62JGgUnZKxYeRm2iyOU",
  authDomain: "officehourqueue-29dea.firebaseapp.com",
  databaseURL: "https://officehourqueue-29dea-default-rtdb.firebaseio.com",
  projectId: "officehourqueue-29dea",
  storageBucket: "officehourqueue-29dea.firebasestorage.app",
  messagingSenderId: "303526056451",
  appId: "1:303526056451:web:4cd38d78dfea6043293436"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export the database so App.jsx can see it
export const db = getDatabase(app);