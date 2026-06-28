import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Use the credentials loaded in the environment or a generic config
  // In AI Studio, the actual Firebase project configuration is provided dynamically 
  // if you use the appropriate pattern, or we can fetch it from an endpoint if necessary.
  // Actually, AI Studio sets process.env variables, wait no.
  // According to Firebase integration skill: "Use an endpoint to fetch config if needed"
  // Let me just fetch it from a predefined endpoint or initialize normally.
};

// Actually, in the skill doc:
// The developer usually copies firebase-applet-config.json. Let's fetch it via HTTP.

let app;
let db;
let auth;

export const initFirebase = async () => {
  if (app) return;
  const res = await fetch('/firebase-applet-config.json');
  const config = await res.json();
  app = initializeApp(config);
  db = getFirestore(app, config.firestoreDatabaseId);
  auth = getAuth(app);
};

export const getDb = () => db;
export const getFirebaseAuth = () => auth;
