/**
 * Firebase configuration for Sokoban game
 * Handles authentication and cloud storage for user progress
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Check for environment variables and provide fallbacks for development
const getEnvVar = (key, fallback = null) => {
  // Check if import.meta.env is available (Vite environment)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  // Fallback for other environments
  return fallback;
};

// Firebase configuration using environment variables with fallbacks
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', "AIzaSyCkdLx8D9-TQChO9w-fjGn8fDaQvLVgeXc"),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', "sokoban-5212e.firebaseapp.com"),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', "sokoban-5212e"),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', "sokoban-5212e.firebasestorage.app"),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', "512895282389"),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', "1:512895282389:web:aaa192833941c42a97465c"),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', "G-DMJVSDP9EP")
};

// Initialize Firebase
let app;
let auth;
let db;

// Verify we have minimal required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn("Firebase configuration is incomplete. Authentication features will be disabled.");
}

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
  
  // Initialize auth
  auth = getAuth(app);
  
  // Initialize Firestore with error handling
  try {
    db = getFirestore(app);
    console.log("Firestore initialized successfully");
  } catch (firestoreError) {
    console.error("Error initializing Firestore:", firestoreError);
    // Continue without Firestore - auth will still work
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  console.warn("Authentication features will be disabled");
  // Don't show an alert as it's disruptive - just disable auth features
}

/**
 * Current user state
 */
let currentUser = null;

/**
 * Register a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise} - Promise resolving to user credentials
 */
export async function registerUser(email, password, displayName) {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Please check your .env configuration.");
  }
  
  try {
    // First create the user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile to add display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });
    
    // Try to create the user document in Firestore, but don't fail registration if this fails
    try {
      if (db) {
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          displayName: displayName,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          progress: {
            currentLevel: 0,
            completedLevels: [],
            timeAttackBestTimes: {}
          }
        });
        console.log("User document created successfully in Firestore");
      } else {
        console.warn("Firestore not initialized, skipping document creation");
      }
    } catch (firestoreError) {
      console.error("Error creating user document in Firestore:", firestoreError);
      // Don't rethrow the error - we want the registration to succeed even if Firestore fails
    }
    
    return userCredential;
  } catch (error) {
    console.error("Error registering user:", error);
    
    // Provide more specific error messages based on Firebase error codes
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('This email address is already in use. Please try logging in instead.');
      case 'auth/invalid-email':
        throw new Error('The email address is invalid.');
      case 'auth/operation-not-allowed':
        throw new Error('Email/Password sign-up is not enabled in Firebase console.');
      case 'auth/weak-password':
        throw new Error('The password is too weak. Please choose a stronger password.');
      default:
        throw error;
    }
  }
}

/**
 * Sign in existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Promise resolving to user credentials
 */
export async function signInUser(email, password) {
  if (!auth) {
    throw new Error("Firebase Auth is not initialized. Please check your .env configuration.");
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login timestamp if Firestore is available
    if (db) {
      try {
        await updateDoc(doc(db, "users", userCredential.user.uid), {
          lastLogin: serverTimestamp()
        });
      } catch (firestoreError) {
        console.warn("Failed to update last login timestamp:", firestoreError);
        // Don't fail the sign-in if this update fails
      }
    }
    
    return userCredential;
  } catch (error) {
    console.error("Error signing in:", error);
    
    // Provide more specific error messages based on Firebase error codes
    switch (error.code) {
      case 'auth/operation-not-allowed':
        throw new Error('Email/Password sign-in is not enabled in Firebase console');
      case 'auth/user-disabled':
        throw new Error('Your account has been disabled');
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        throw new Error('Invalid email or password');
      case 'auth/too-many-requests':
        throw new Error('Too many failed login attempts, please try again later');
      default:
        throw error;
    }
  }
}

/**
 * Sign out current user
 * @returns {Promise} - Promise resolving when sign out is complete
 */
export async function signOutUser() {
  if (!auth) {
    console.warn("Firebase Auth is not initialized, no need to sign out");
    return true;
  }
  
  try {
    await signOut(auth);
    currentUser = null;
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

/**
 * Get the current authenticated user
 * @returns {Object|null} - Current user or null if not authenticated
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Check if user is logged in
 * @returns {boolean} - True if user is logged in
 */
export function isLoggedIn() {
  return currentUser !== null;
}

/**
 * Set up auth state change listener
 * @param {Function} callback - Callback to run when auth state changes
 * @returns {Function|null} - Unsubscribe function or null if auth is not initialized
 */
export function onAuthChange(callback) {
  // Check if auth is properly initialized
  if (!auth) {
    console.warn("Firebase Auth is not initialized. Authentication features will be disabled.");
    // Call the callback immediately with null to indicate no user is logged in
    callback(null);
    // Return a dummy unsubscribe function
    return () => {};
  }
  
  // Auth is initialized, set up the listener
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

/**
 * Save user progress to Firestore
 * @param {Object} progress - Progress data to save
 * @returns {Promise} - Promise resolving when save is complete
 */
export async function saveUserProgress(progress) {
  if (!currentUser) {
    throw new Error("No authenticated user found");
  }
  
  // Check if Firestore is initialized
  if (!db) {
    console.warn("Firestore not initialized, progress cannot be saved to cloud");
    return false;
  }
  
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    
    // Try to get the document first to see if it exists
    const docSnapshot = await getDoc(userDocRef);
    
    if (docSnapshot.exists()) {
      // Document exists, update it
      await updateDoc(userDocRef, {
        "progress": progress,
        "lastUpdated": serverTimestamp()
      });
    } else {
      // Document doesn't exist, create it
      await setDoc(userDocRef, {
        email: currentUser.email,
        displayName: currentUser.displayName || '',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        progress: progress
      });
    }
    
    console.log("Progress saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    
    // Check if it's a permissions error
    if (error.code === 'permission-denied') {
      console.warn("Firestore permissions issue. Cannot save progress to cloud.");
      // Only show the alert once per session to avoid annoying the user
      if (!window.shownFirestorePermissionAlert) {
        alert("Cloud save is unavailable due to permissions. Your progress will be saved locally only.");
        window.shownFirestorePermissionAlert = true;
      }
    }
    
    // Don't throw the error, just return false to indicate failure
    return false;
  }
}

/**
 * Load user progress from Firestore
 * @returns {Promise<Object>} - Promise resolving to progress data
 */
export async function loadUserProgress() {
  if (!currentUser) {
    throw new Error("No authenticated user found");
  }
  
  // Check if Firestore is initialized
  if (!db) {
    console.warn("Firestore not initialized, returning default progress");
    return {
      currentLevel: 0,
      completedLevels: [],
      timeAttackBestTimes: {}
    };
  }
  
  try {
    // Try to access the document
    const userDocRef = doc(db, "users", currentUser.uid);
    const docSnapshot = await getDoc(userDocRef);
    
    if (docSnapshot.exists()) {
      return docSnapshot.data().progress;
    } else {
      console.log("User document not found, creating initial document");
      
      // Document doesn't exist, create it with initial data
      const initialProgress = {
        currentLevel: 0,
        completedLevels: [],
        timeAttackBestTimes: {}
      };
      
      try {
        await setDoc(userDocRef, {
          email: currentUser.email,
          displayName: currentUser.displayName || '',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          progress: initialProgress
        });
        console.log("Created initial user document");
        return initialProgress;
      } catch (createError) {
        console.error("Failed to create initial document:", createError);
        
        // Check if it's a permissions error
        if (createError.code === 'permission-denied') {
          console.warn("Firestore permissions issue. Please check your security rules.");
          alert("Cloud save is unavailable due to permissions. Your progress will be saved locally only.");
        }
        
        return initialProgress; // Return default progress even if creation fails
      }
    }
  } catch (error) {
    console.error("Error loading user progress:", error);
    
    // Check if it's a permissions error
    if (error.code === 'permission-denied') {
      console.warn("Firestore permissions issue. Please check your security rules.");
      alert("Cloud save is unavailable due to permissions. Your progress will be saved locally only.");
    }
    
    // Return default progress on error
    return {
      currentLevel: 0,
      completedLevels: [],
      timeAttackBestTimes: {}
    };
  }
}

// Export Firebase instances
export { auth, db };