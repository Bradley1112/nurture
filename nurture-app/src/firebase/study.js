import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Adds a new study session document to the user's studyPlan sub-collection.
 * 
 * @param {string} userId The ID of the user.
 * @param {object} sessionData The data for the study session.
 * @returns {string} The ID of the newly created session document.
 */
export const addStudySession = async (userId, sessionData) => {
    const db = getFirestore();
    const studyPlanRef = collection(db, 'users', userId, 'studyPlan');

    const docData = {
        ...sessionData,
        scheduledDate: serverTimestamp(), // Using server timestamp for consistency
        status: 'in-progress', // Session starts immediately
        sessionType: 'learning', // Defaulting to learning, could be adapted
        performanceSummary: null, // To be filled after completion
    };

    const docRef = await addDoc(studyPlanRef, docData);
    return docRef.id;
};
