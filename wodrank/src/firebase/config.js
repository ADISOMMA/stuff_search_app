import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- CONFIGURAZIONE FIREBASE ---	
const firebaseConfig = {
  apiKey: "AIzaSyDiztnUyXBZ2V-oGb1psdWKVDmevZhye18",
  authDomain: "wodrank-c888b.firebaseapp.com",
  projectId: "wodrank-c888b",
  storageBucket: "wodrank-c888b.firebasestorage.app",
  messagingSenderId: "181966268720",
  appId: "1:181966268720:web:59aa032ba904fe38f240f5",
  measurementId: "G-NTTQJY7JLC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "wodrank-production";

export { auth, db, appId };
