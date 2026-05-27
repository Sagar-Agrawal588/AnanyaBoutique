import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const resolveFirebaseAuthDomain = () =>
  String(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveFirebaseAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
];
const isFirebaseConfigured = requiredFirebaseKeys.every(Boolean);

if (process.env.NODE_ENV === "development") {
  console.log("Firebase Config Loaded:", {
    apiKey: firebaseConfig.apiKey ? "Present" : "Missing",
    authDomain: firebaseConfig.authDomain ? "Present" : "Missing",
    projectId: firebaseConfig.projectId ? "Present" : "Missing",
    appId: firebaseConfig.appId ? "Present" : "Missing",
  });
}

export const firebaseApp = isFirebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

export const db = firebaseApp ? getFirestore(firebaseApp) : null;
