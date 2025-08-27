import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Signs up a new user with email and password, and creates a new document in the users collection.
 * @param {string} name 
 * @param {string} email 
 * @param {string} password 
 * @param {string} level 
 * @param {string} examDate 
 * @param {string} targetYear 
 * @returns {Promise<User>} The user object.
 */
export const signup = async (name, email, password, level, examDate, targetYear) => {
  // Create a new user with email and password
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Convert the exam date string to a Firebase Timestamp
  const [day, month, year] = examDate.split('/');
  const date = new Date(`${year}-${month}-${day}`);
  const firestoreTimestamp = Timestamp.fromDate(date);

  // Create a new document in the users collection with the user's data
  // Following the database structure specified in Part 1 of README
  await setDoc(doc(db, "users", user.uid), {
    name,
    level,
    dateToNextExam: firestoreTimestamp,
    targetOLevelYear: targetYear,
    createdAt: Timestamp.now(),
    onboardingCompleted: false // Will be set to true after quiz completion
  });

  // Update user profile with display name
  await updateProfile(user, {
    displayName: name
  });

  return user;
};

/**
 * Logs in a user with email and password.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<User>} The user object.
 */
export const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};