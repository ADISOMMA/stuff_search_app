import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  deleteUser,
  signInWithPopup,
  updateEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth, appId } from '../firebase/config.js';
import { logAction } from '../utils/logger.js';
import { GLOBAL_ROLES, AVATARS } from '../constants.js';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userProfileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        const docSnap = await getDoc(userProfileRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          // Retro-save provider avatar for Google users if missing
          if (!userData.providerAvatar && user.photoURL) {
            const payload = { providerAvatar: user.photoURL };
            await updateDoc(userProfileRef, payload);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', user.uid), payload);
            userData.providerAvatar = user.photoURL;
          }
          if (!userData.theme) {
            await updateDoc(userProfileRef, { theme: 'slate-dark' });
            userData.theme = 'slate-dark';
          }
          if (userData.blocked) {
            alert("Il tuo account è stato bloccato.");
            await signOut(auth);
            setCurrentUser(null);
          } else {
            setCurrentUser({ uid: user.uid, email: user.email, ...userData, providerAvatar: userData.providerAvatar || user.photoURL });
          }
        } else {
          // New user, likely from social login
          const newUserProfile = {
            name: user.displayName || 'Atleta',
            email: user.email,
            globalRole: GLOBAL_ROLES.USER,
            avatar: user.photoURL || AVATARS[Math.floor(Math.random() * AVATARS.length)],
            providerAvatar: user.photoURL || null,
            theme: 'slate-dark',
            createdAt: serverTimestamp()
          };
          await setDoc(userProfileRef, newUserProfile);
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', user.uid), { ...newUserProfile, uid: user.uid });
          setCurrentUser({ uid: user.uid, ...newUserProfile });
        }
      } else {
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email, password, fullName) => {
    if (!fullName.trim()) throw new Error("Il nome è obbligatorio.");
    
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    const profileData = {
      name: fullName,
      email: user.email,
      globalRole: GLOBAL_ROLES.USER,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      providerAvatar: null,
      theme: 'slate-dark',
      createdAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profileData);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', user.uid), { ...profileData, uid: user.uid });
    
    logAction('INFO', 'REGISTER', { uid: user.uid }, user);
  };

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const socialLogin = async (provider) => {
    const result = await signInWithPopup(auth, provider);
    logAction('INFO', 'SOCIAL_LOGIN', { uid: result.user.uid }, result.user);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email) => {
    if (!email) throw new Error("L'email è richiesta per il reset della password.");
    await sendPasswordResetEmail(auth, email);
    alert("Email di reset inviata.");
  };

  const deleteAccount = async () => {
    const userToDelete = auth.currentUser;
    if (!userToDelete) throw new Error("Nessun utente loggato.");

    await deleteDoc(doc(db, 'artifacts', appId, 'users', userToDelete.uid, 'profile', 'data'));
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', userToDelete.uid));
    
    logAction('WARN', 'DELETE_ACCOUNT', { uid: userToDelete.uid }, userToDelete);
    // This must be the last call
    await deleteUser(userToDelete);
  };

  const updateAvatar = async (newAvatar) => {
    if (!currentUser) return;
    const ref = doc(db,'artifacts',appId,'users',currentUser.uid,'profile','data');
    await updateDoc(ref, { avatar: newAvatar });
    await updateDoc(doc(db,'artifacts',appId,'public','data','user_directory',currentUser.uid), { avatar: newAvatar });
    setCurrentUser(p => ({ ...p, avatar: newAvatar }));
  };

  const updateProfile = async ({ name, email, theme }) => {
    if (!currentUser) return;
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) updates.email = email.trim();
    if (theme) updates.theme = theme;
    if (Object.keys(updates).length === 0) return;
    const ref = doc(db,'artifacts',appId,'users',currentUser.uid,'profile','data');
    await updateDoc(ref, updates);
    await updateDoc(doc(db,'artifacts',appId,'public','data','user_directory',currentUser.uid), updates);
    if (updates.email && auth.currentUser?.email !== updates.email) {
      try { await updateEmail(auth.currentUser, updates.email); } catch (e) { console.warn('Email update skipped:', e); }
    }
    setCurrentUser(p => ({ ...p, ...updates }));
    logAction('INFO', 'UPDATE_PROFILE', { updates }, currentUser);
  };

  return {
    currentUser,
    loadingAuth,
    register,
    login,
    socialLogin,
    logout,
    resetPassword,
    deleteAccount,
    updateAvatar,
    updateProfile,
  };
};
