// 1) Create Firebase project
// 2) Enable Authentication > Google sign-in
// 3) Enable Firestore Database
// 4) Replace this config with your Firebase web app config

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

// Put your Gmail ID here. Only these emails will see admin write controls.
export const ADMIN_EMAILS = [
  "yourgmail@gmail.com"
];
