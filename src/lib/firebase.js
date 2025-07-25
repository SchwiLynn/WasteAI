// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSYFs6wzmoOoyo40yV5XATx985s4e90hM",
  authDomain: "wasteai-8b302.firebaseapp.com",
  projectId: "wasteai-8b302",
  storageBucket: "wasteai-8b302.appspot.com",
  messagingSenderId: "331728893636",
  appId: "1:331728893636:web:9a201ef908a41f2d09fb91",
  measurementId: "G-7DY92FEFDB"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const storage = getStorage(app);
const db = getFirestore(app);

export { app, storage, db };