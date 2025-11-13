// FILE: firebase.js
// Replace the firebaseConfig object with your project's config from Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyBGpKTPHvhxb4LmZYj8K-PKHcPMcC8XYOg",
  authDomain: "my-music-32aa2.firebaseapp.com",
  projectId: "my-music-32aa2",
  storageBucket: "my-music-32aa2.firebasestorage.app",
  messagingSenderId: "751635494444",
  appId: "1:751635494444:web:87f3b1edba21d39f238389",
  measurementId: "G-H0027Y1ZRT",
};

if (typeof firebase === "undefined") {
  console.error(
    "Firebase SDK not loaded. Make sure firebase scripts are included in index.html"
  );
} else {
  firebase.initializeApp(firebaseConfig);
  window._firebaseAuth = firebase.auth();
  window._firestore = firebase.firestore();
}
