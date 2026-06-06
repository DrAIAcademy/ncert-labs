# NCERT Labs Website

A premium static website for NCERT, JEE and NEET interactive labs using HTML, CSS, JavaScript, Firebase Authentication and Firestore.

## Features

- Beautiful responsive homepage
- Lab library with search, subject filter, class filter and category filter
- Grid/list layout
- Pagination and labs per page control
- Admin dashboard
- Google/Gmail login via Firebase Authentication
- Add, edit and delete labs from UI
- Add image URL, lab URL, subject, class, category, difficulty, tags and featured status
- Admin settings for columns, rows and max labs per page
- Works on GitHub Pages
- Demo/localStorage fallback before Firebase setup

## Setup

### 1. Create Firebase project

Go to Firebase Console and create a project.

### 2. Enable Google login

Firebase Console > Authentication > Sign-in method > Google > Enable.

### 3. Enable Firestore

Firebase Console > Firestore Database > Create database.

### 4. Add Web App

Firebase Project Overview > Web App icon > Register app.
Copy the Firebase config.

### 5. Update firebase-config.js

Replace the placeholder config with your Firebase web config:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Then set your admin Gmail:

```js
export const ADMIN_EMAILS = [
  "your-real-gmail@gmail.com"
];
```

### 6. Update Firestore rules

Open `firestore.rules`, replace `yourgmail@gmail.com` with the same admin Gmail, then paste rules in:

Firebase Console > Firestore Database > Rules

Publish the rules.

### 7. Deploy on GitHub Pages

Upload these files to your GitHub repository:

- index.html
- style.css
- app.js
- firebase-config.js
- firestore.rules
- README.md

Then enable GitHub Pages from repository settings.

## Important

Admin restriction must be enforced in Firestore rules. The `ADMIN_EMAILS` array hides/shows UI controls, but real database security comes from Firestore rules.
