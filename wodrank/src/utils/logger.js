import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../firebase/config';

export const logAction = async (level, action, details, user) => {
  try {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'system_logs'), {
      level,
      action,
      details: JSON.stringify(details),
      userId: user?.uid || 'system',
      userEmail: user?.email || 'unknown',
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log action:", error);
  }
};
