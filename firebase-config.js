// firebase-config.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDho8R8JE2c-wF_d8r7ghJvi_apfcdJMO8",
  authDomain: "fzone-social.firebaseapp.com",
  projectId: "fzone-social",
  storageBucket: "fzone-social.firebasestorage.app",
  messagingSenderId: "176280105162",
  appId: "1:176280105162:web:c09970d01f0164a15c8433",
  measurementId: "G-M51LSEY1QG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };