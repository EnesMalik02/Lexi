import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config - Kullanıcı bu bilgileri sağlayacak
const firebaseConfig = {
  apiKey: "AIzaSyBKC54GA8fXel7ncMe7aRTWqtLAUISpPyI",
  authDomain: "persona-5c309.firebaseapp.com",
  projectId: "persona-5c309",
  storageBucket: "persona-5c309.firebasestorage.app",
  messagingSenderId: "940349503350",
  appId: "1:940349503350:web:0ff681641ef66db712ac57",
  measurementId: "G-Z762CNE9L8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;

