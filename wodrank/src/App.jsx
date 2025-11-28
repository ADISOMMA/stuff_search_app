import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Trophy, Dumbbell, User, Plus, ChevronLeft, ChevronRight,
  Flame, LogOut, Settings, Shield, Clipboard, ThumbsUp,
  Trash2, Mail, Lock, MapPin, Check, X, Edit3, AlertTriangle, Ban, Users, Crown, Search, UserPlus
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc,
  deleteDoc, setDoc, getDoc, serverTimestamp, query, where, arrayUnion, arrayRemove, getDocs
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, deleteUser,
  signInWithPopup, GoogleAuthProvider
} from 'firebase/auth';

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDiztnUyXBZ2V-oGb1psdWKVDmevZhye18",
  authDomain: "wodrank-c888b.firebaseapp.com",
  projectId: "wodrank-c888b",
  storageBucket: "wodrank-c888b.firebasestorage.app",
  messagingSenderId: "181966268720",
  appId: "1:181966268720:web:59aa032ba904fe38f240f5",
  measurementId: "G-NTTQJY7JLC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "wodrank-production";

// --- CONSTANTS & UTILS ---
const GLOBAL_ROLES = { ADMIN: 'admin', USER: 'user' };
const GYM_ROLES = { OWNER: 'owner', COACH: 'coach', ATHLETE: 'athlete' };
const AVATARS = ["🦁", "🐺", "🦊", "🐯", "🐶", "🦍", "🦄", "💀", "👽", "🤖", "🎃", "💪", "🏋️", "🤸", "🔥"];
const formatDate = (date) => date.toISOString().split('T')[0];

// --- COMPONENTS ---
const Card = ({ children, className = '' }) => <div className={`bg-slate-800 rounded-xl shadow-lg border border-slate-700/50 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, size = 'md', type = "button" }) => {
  const sizes = { xs: "px-2 py-1 text-[10px]", sm: "px-3 py-2 text-xs", md: "px-4 py-3", lg: "px-6 py-4 text-lg" };
  const baseStyle = `${sizes[size]} rounded-lg font-bold transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed`;
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
    ghost: "text-slate-400 hover:text-white",
    outline: "border border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-500",
    google: "bg-white text-slate-800 hover:bg-slate-100 border border-slate-300",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};
const Badge = ({ children, color = 'slate', onClick, active }) => {
  const colors = { slate: 'bg-slate-700 text-slate-300', emerald: 'bg-emerald-500/20 text-emerald-400', blue: 'bg-blue-500/20 text-blue-400', purple: 'bg-purple-500/20 text-purple-400', orange: 'bg-orange-500/20 text-orange-400', red: 'bg-red-500/20 text-red-400', yellow: 'bg-yellow-500/20 text-yellow-400' };
  const activeStyle = active ? "ring-2 ring-emerald-500 bg-emerald-500/10" : "";
  return <span onClick={onClick} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-default ${colors[color] || colors.slate} ${activeStyle} ${onClick ? 'cursor-pointer' : ''}`}>{children}</span>;
};
const Dialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Conferma", cancelText = "Annulla" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 z-[100]">
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6 text-sm">{message}</p>
        <div className="flex gap-3"><Button variant="secondary" onClick={onCancel} className="flex-1">{cancelText}</Button><Button variant="danger" onClick={onConfirm} className="flex-1">{confirmText}</Button></div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function FitRankApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState('calendar');
  const [currentGym, setCurrentGym] = useState(null);

  const [myGyms, setMyGyms] = useState([]);
  const [allGyms, setAllGyms] = useState([]);
  const [wods, setWods] = useState([]);
  const [scores, setScores] = useState([]);
  const [userCache, setUserCache] = useState({});

  // Admin & Management State
  const [allUsers, setAllUsers] = useState([]);
  const [gymToManage, setGymToManage] = useState(null);
  const [memberEmailToAdd, setMemberEmailToAdd] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date());

  // WOD States
  const [isWodModalOpen, setIsWodModalOpen] = useState(false);
  const [editingWod, setEditingWod] = useState(null);
  const [scoreWod, setScoreWod] = useState(null);

  // Leaderboard States
  const [leaderboardWodId, setLeaderboardWodId] = useState(null);
  const [leaderboardMode, setLeaderboardMode] = useState('WOD'); // 'WOD' or 'ATTENDANCE'
  const [viewingUser, setViewingUser] = useState(null);

  const [isGymModalOpen, setIsGymModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');

  const [newWodData, setNewWodData] = useState({ title: '', type: 'FORTIME', timeCap: '', description: '' });
  const [scoreData, setScoreData] = useState({ min: 0, sec: 0, val: '', rx: true, note: '' });
  const [newGymName, setNewGymName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- HELPERS ---
  const isGlobalAdmin = useMemo(() => currentUser?.globalRole === GLOBAL_ROLES.ADMIN, [currentUser]);
  const getMyGymRole = (gym) => {
    if (!currentUser || !gym) return null;
    if (isGlobalAdmin) return GYM_ROLES.OWNER;
    return gym.roles?.[currentUser.uid] || null;
  };
  const isCoachOrOwner = (gym) => {
    const role = getMyGymRole(gym);
    return role === GYM_ROLES.COACH || role === GYM_ROLES.OWNER;
  };

  const getUserName = (uid) => userCache[uid]?.name || uid.substring(0, 6) + '...';
  const getUserAvatar = (uid) => userCache[uid]?.avatar || '👤';

  // --- INIT ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const d = userDoc.data();
          if (d.blocked) { alert("Account bloccato."); await signOut(auth); return; }
          setCurrentUser({ uid: user.uid, email: user.email, ...d });
        } else {
          setCurrentUser({ uid: user.uid, email: user.email, name: user.displayName || 'Atleta', globalRole: GLOBAL_ROLES.USER, avatar: user.photoURL || '🦁' });
        }
      } else {
        setCurrentUser(null);
        setCurrentGym(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LISTENERS (STABLE) ---

  // 1. Fetch MY Gyms (FIXED: Removed dependency on userCache to prevent loop)
  useEffect(() => {
    if (!currentUser) return;
    const gymQuery = isGlobalAdmin
      ? collection(db, 'artifacts', appId, 'public', 'data', 'gyms')
      : query(collection(db, 'artifacts', appId, 'public', 'data', 'gyms'), where("members", "array-contains", currentUser.uid));

    const unsub = onSnapshot(gymQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyGyms(data);

      if (!currentGym && data.length > 0) setCurrentGym(data[0]);
      else if (currentGym) {
        const updated = data.find(g => g.id === currentGym.id);
        if (updated) setCurrentGym(updated);
        else if (data.length > 0) setCurrentGym(data[0]);
        else setCurrentGym(null);
      }
    });
    return () => unsub();
  }, [currentUser, isGlobalAdmin]);

  // 2. Fetch ALL Gyms
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'gyms');
    const unsub = onSnapshot(q, (snap) => setAllGyms(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [currentUser]);

  // 3. Fetch ALL Users (Admin Only)
  useEffect(() => {
    if (!isGlobalAdmin) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'user_directory');
    const unsub = onSnapshot(q, (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [isGlobalAdmin]);

  // 4. WODs & Scores (FIXED: Removed userCache update logic from here)
  useEffect(() => {
    if (!currentGym) { setWods([]); setScores([]); return; }
    const wodsQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'wods'), where("gymId", "==", currentGym.id));
    const scoresQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), where("gymId", "==", currentGym.id));

    const unsubWods = onSnapshot(wodsQ, (snap) => setWods(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubScores = onSnapshot(scoresQ, (snap) => setScores(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubWods(); unsubScores(); };
  }, [currentGym]);

  // 5. USER RESOLVER (NEW: Dedicated Effect to handle names securely without loops)
  useEffect(() => {
    if (!currentUser || myGyms.length === 0 && scores.length === 0) return;

    const resolveUsers = async () => {
      const uidsToFetch = new Set();

      // 1. From Gym Members/Pending
      myGyms.forEach(g => {
        g.members?.forEach(u => uidsToFetch.add(u));
        if (isCoachOrOwner(g)) g.pendingMembers?.forEach(u => uidsToFetch.add(u));
      });

      // 2. From Scores
      scores.forEach(s => {
        uidsToFetch.add(s.userId);
        // Pre-fill cache from scores if available to save reads
        if (s.userName && !userCache[s.userId]) {
          setUserCache(prev => ({ ...prev, [s.userId]: { name: s.userName, avatar: s.userAvatar } }));
          uidsToFetch.delete(s.userId);
        }
      });

      // Filter what we really lack
      const missing = [...uidsToFetch].filter(uid => !userCache[uid]);
      if (missing.length === 0) return;

      // Batch fetch from public directory (simplified one-by-one for robustness)
      const newResolved = {};
      await Promise.all(missing.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid));
          if (snap.exists()) newResolved[uid] = snap.data();
        } catch (e) { console.log("Error resolving user", uid); }
      }));

      if (Object.keys(newResolved).length > 0) {
        setUserCache(prev => ({ ...prev, ...newResolved }));
      }
    };

    resolveUsers();
    // Dep array carefully selected to run only when source data changes
  }, [myGyms, scores, currentUser]);


  // --- COMPUTED ---
  const showConfirm = (title, message, action) => { setDialog({ isOpen: true, title, message, onConfirm: async () => { await action(); setDialog({ ...dialog, isOpen: false }); } }); };
  const formatDate = (date) => date.toISOString().split('T')[0];
  const todaysWods = useMemo(() => wods.filter(w => w.date === formatDate(selectedDate)), [wods, selectedDate]);

  useEffect(() => {
    if (todaysWods.length > 0 && !todaysWods.find(w => w.id === leaderboardWodId)) {
      setLeaderboardWodId(todaysWods[0].id);
    }
  }, [todaysWods, leaderboardWodId]);

  const getWodLeaderboard = (wodId) => {
    if (!wodId) return [];
    const wod = wods.find(w => w.id === wodId);
    if (!wod) return [];
    return scores
      .filter(s => s.wodId === wodId)
      .sort((a, b) => wod.type === 'FORTIME' ? a.numericValue - b.numericValue : b.numericValue - a.numericValue)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  };

  // CALCOLO CLASSIFICA COSTANZA (Mese Corrente)
  const getAttendanceLeaderboard = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const attendanceMap = {};
    scores.forEach(score => {
      const scoreDate = score.createdAt?.toDate ? score.createdAt.toDate() : new Date();
      if (scoreDate.getMonth() === currentMonth && scoreDate.getFullYear() === currentYear) {
        if (!attendanceMap[score.userId]) attendanceMap[score.userId] = { userId: score.userId, userName: score.userName, userAvatar: score.userAvatar, count: 0 };
        attendanceMap[score.userId].count += 1;
      }
    });
    return Object.values(attendanceMap).sort((a, b) => b.count - a.count).map((u, i) => ({ ...u, rank: i + 1 }));
  };

  const getUserHistory = (uid) => {
    return scores.filter(s => s.userId === uid).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  };

  // --- ACTIONS ---
  const handleRegister = async (e) => { e.preventDefault(); if (!fullName.trim()) { setAuthError("Nome obbligatorio."); return; } setIsSubmitting(true); try { const { user } = await createUserWithEmailAndPassword(auth, email, password); const profile = { name: fullName, globalRole: GLOBAL_ROLES.USER, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)], createdAt: serverTimestamp() }; await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), profile); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', user.uid), { ...profile, uid: user.uid }); setCurrentUser({ uid: user.uid, email: user.email, ...profile }); } catch (e) { setAuthError(e.message); } finally { setIsSubmitting(false); } };
  const handleLogin = async (e) => { e.preventDefault(); setIsSubmitting(true); try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { setAuthError("Credenziali invalide"); } finally { setIsSubmitting(false); } };
  const handleSocialLogin = async (provider) => { setAuthError(''); setIsSubmitting(true); try { const result = await signInWithPopup(auth, provider); const user = result.user; const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'); const userDoc = await getDoc(userDocRef); if (!userDoc.exists()) { const profile = { name: user.displayName || 'Atleta', email: user.email, globalRole: GLOBAL_ROLES.USER, avatar: user.photoURL || AVATARS[0], createdAt: serverTimestamp() }; await setDoc(userDocRef, profile); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', user.uid), { ...profile, uid: user.uid }); setCurrentUser({ uid: user.uid, ...profile }); } } catch (e) { setAuthError(e.message); } finally { setIsSubmitting(false); } };
  const handleResetPassword = async () => { if (!email) { setAuthError("Email richiesta."); return; } try { await sendPasswordResetEmail(auth, email); alert("Email inviata."); } catch (e) { setAuthError(e.message); } };
  const handleDeleteAccount = () => { showConfirm("Elimina Account", "Irreversibile.", async () => { try { await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data')); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', currentUser.uid)); await deleteUser(auth.currentUser); } catch (e) { alert(e.message); } }); };
  const updateAvatar = async (newAvatar) => { const ref = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'profile', 'data'); await updateDoc(ref, { avatar: newAvatar }); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', currentUser.uid), { avatar: newAvatar }); setCurrentUser(p => ({ ...p, avatar: newAvatar })); };

  const handleCreateGym = async () => { if (!newGymName) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gyms'), { name: newGymName, members: [currentUser.uid], pendingMembers: [], roles: { [currentUser.uid]: GYM_ROLES.OWNER }, createdAt: serverTimestamp() }); setNewGymName(''); setIsGymModalOpen(false); };
  const handleJoinGym = async (gymId) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { pendingMembers: arrayUnion(currentUser.uid) }); alert("Richiesta inviata!"); };
  const handleApproveMember = async (gymId, memberId) => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { pendingMembers: arrayRemove(memberId), members: arrayUnion(memberId), [`roles.${memberId}`]: GYM_ROLES.ATHLETE }); } catch (e) { alert(e.message); } };
  const handleRejectMember = async (gymId, memberId) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { pendingMembers: arrayRemove(memberId) }); };
  const handleLeaveGym = (gymId) => { showConfirm("Lascia Palestra", "Sicuro?", async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { members: arrayRemove(currentUser.uid) }); setCurrentGym(null); }); };

  const handleManageGymToggle = (gym) => { setGymToManage(gym); setMemberEmailToAdd(''); };
  const handleCoachRemoveMember = (uid) => { showConfirm("Rimuovi", "Sicuro?", async () => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), { members: arrayRemove(uid), pendingMembers: arrayRemove(uid) }); setGymToManage(p => ({ ...p, members: p.members.filter(m => m !== uid) })); }); };
  const handleCoachToggleRole = async (uid, currentRole) => { const newRole = currentRole === GYM_ROLES.COACH ? GYM_ROLES.ATHLETE : GYM_ROLES.COACH; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), { [`roles.${uid}`]: newRole }); setGymToManage(p => ({ ...p, roles: { ...p.roles, [uid]: newRole } })); };
  const handleCoachAddMemberByEmail = async () => { if (!memberEmailToAdd) return; setIsSubmitting(true); try { const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'user_directory'), where("email", "==", memberEmailToAdd)); const snap = await getDocs(q); if (snap.empty) alert("Email non trovata."); else { const targetUid = snap.docs[0].id; if (gymToManage.members.includes(targetUid)) alert("Già iscritto."); else { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), { members: arrayUnion(targetUid), pendingMembers: arrayRemove(targetUid), [`roles.${targetUid}`]: GYM_ROLES.ATHLETE }); alert("Aggiunto!"); setGymToManage(p => ({ ...p, members: [...p.members, targetUid] })); setMemberEmailToAdd(''); } } } catch (e) { alert(e.message); } finally { setIsSubmitting(false); } };

  const handleAdminDeleteGym = (gymId) => showConfirm("Elimina", "Sicuro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId)));
  const handleAdminToggleBlockUser = async (uid, s) => { await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { blocked: !s }); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid), { blocked: !s }); };
  const handleAdminChangeGlobalRole = async (uid, r) => { await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { globalRole: r }); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid), { globalRole: r }); };
  const handleAdminAddUserToGym = async (uid, gymId) => { if (!gymId) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { members: arrayUnion(uid), pendingMembers: arrayRemove(uid), [`roles.${uid}`]: GYM_ROLES.ATHLETE }); };
  const handleAdminRemoveUserFromGym = (uid, gymId) => showConfirm("Rimuovi", "Sicuro?", async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), { members: arrayRemove(uid) }));

  const handleEditWodInit = (wod) => { setEditingWod(wod); setNewWodData({ title: wod.title, type: wod.type, timeCap: wod.timeCap || '', description: wod.description }); setIsWodModalOpen(true); };
  const handleSaveWod = async () => { if (!newWodData.title) return; const d = { ...newWodData, date: formatDate(selectedDate), gymId: currentGym.id, createdBy: currentUser.name }; if (editingWod) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wods', editingWod.id), { ...d, updatedAt: serverTimestamp() }); else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'wods'), { ...d, createdAt: serverTimestamp() }); setIsWodModalOpen(false); setEditingWod(null); setNewWodData({ title: '', type: 'FORTIME', timeCap: '', description: '' }); };

  const handleSaveScore = async () => {
    let nv = 0, rd = ''; const targetWod = scoreWod;
    if (targetWod.type === 'FORTIME') { nv = (scoreData.min * 60) + scoreData.sec; rd = `${scoreData.min}:${scoreData.sec.toString().padStart(2, '0')}`; }
    else { nv = parseFloat(scoreData.val); rd = `${scoreData.val} ${targetWod.type === 'AMRAP' ? 'Reps' : 'Kg'}`; }
    if (!nv && nv !== 0) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), { wodId: targetWod.id, gymId: currentGym.id, userId: currentUser.uid, userName: currentUser.name, userAvatar: currentUser.avatar, numericValue: nv, resultDisplay: rd, rx: scoreData.rx, note: scoreData.note, likes: 0, createdAt: serverTimestamp() });
    setIsScoreModalOpen(false); setScoreWod(null); setScoreData({ min: 0, sec: 0, val: '', rx: true, note: '' });
  };

  if (!currentUser) return <AuthScreen mode={authMode} setMode={setAuthMode} email={email} setEmail={setEmail} pass={password} setPass={setPassword} name={fullName} setName={setFullName} onSubmit={authMode === 'login' ? handleLogin : handleRegister} onSocialLogin={handleSocialLogin} onResetPassword={handleResetPassword} error={authError} loading={isSubmitting} />;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 px-4 shadow-xl">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setActiveTab('gyms')}>
            {currentGym ? (
              <div className="flex flex-col"><div className="flex items-center gap-1"><span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Palestra Attiva</span>{isCoachOrOwner(currentGym) && <Badge color="yellow">COACH</Badge>}</div><span className="font-black text-white text-lg leading-none flex items-center gap-1">{currentGym.name} <ChevronRight size={14} className="text-slate-500" /></span></div>
            ) : <div className="flex items-center gap-2"><Flame className="text-emerald-500 fill-emerald-500" size={24} /><span className="font-black text-xl italic tracking-tight">WOD<span className="text-emerald-500">RANK</span></span></div>}
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl cursor-pointer hover:scale-105 transition overflow-hidden" onClick={() => setActiveTab('profile')}>{currentUser.avatar?.startsWith('http') ? <img src={currentUser.avatar} alt="Av" className="w-full h-full object-cover" /> : currentUser.avatar}</div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {activeTab === 'calendar' && (
          currentGym ? (
            <>
              <DateNavigator date={selectedDate} setDate={setSelectedDate} />
              <div className="space-y-6">
                {todaysWods.map(wod => (
                  <div key={wod.id}>
                    <WodCard wod={wod} onLog={() => { setScoreWod(wod); setIsScoreModalOpen(true); }} isAdmin={isCoachOrOwner(currentGym)} onDelete={() => showConfirm("Elimina WOD", "Sicuro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wods', wod.id)))} onEdit={() => handleEditWodInit(wod)} />
                    <LeaderboardPreview scores={getWodLeaderboard(wod.id)} onMore={() => { setLeaderboardWodId(wod.id); setActiveTab('leaderboard'); }} />
                  </div>
                ))}
                {todaysWods.length === 0 && <EmptyWodState canCreate={isCoachOrOwner(currentGym)} onCreate={() => setIsWodModalOpen(true)} onFindGym={() => setActiveTab('gyms')} />}
                {todaysWods.length > 0 && isCoachOrOwner(currentGym) && <div className="flex justify-center pt-2"><Button variant="outline" onClick={() => setIsWodModalOpen(true)}><Plus size={16} /> Aggiungi altro WOD</Button></div>}
              </div>
            </>
          ) : <div className="text-center py-20"><div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-500 mx-auto"><MapPin size={40} className="text-emerald-500" /></div><h2 className="text-2xl font-bold text-white mb-2">Nessuna palestra attiva</h2><Button onClick={() => setActiveTab('gyms')}>Vai alle Palestre</Button></div>
        )}

        {activeTab === 'leaderboard' && currentGym && (
          <div className="space-y-4">
            <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
              <button onClick={() => setLeaderboardMode('WOD')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${leaderboardMode === 'WOD' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'}`}>WOD</button>
              <button onClick={() => setLeaderboardMode('ATTENDANCE')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${leaderboardMode === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'}`}>Costanza (Mese)</button>
            </div>
            {leaderboardMode === 'WOD' ? (
              <>
                {todaysWods.length > 1 && <div className="flex gap-2 overflow-x-auto pb-2">{todaysWods.map((w, i) => <Badge key={w.id} color={leaderboardWodId === w.id ? 'emerald' : 'slate'} onClick={() => setLeaderboardWodId(w.id)} active={leaderboardWodId === w.id}>{w.title || `WOD ${i + 1}`}</Badge>)}</div>}
                {leaderboardWodId ? <FullLeaderboard wod={todaysWods.find(w => w.id === leaderboardWodId)} scores={getWodLeaderboard(leaderboardWodId)} currentUserId={currentUser.uid} onLike={async (id, likes) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id), { likes: (likes || 0) + 1 })} onDelete={(id) => showConfirm("Elimina Score", "Sicuro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id)))} isAdmin={isCoachOrOwner(currentGym)} onUserClick={(uid) => setViewingUser(uid)} /> : <div className="text-center text-slate-500 py-10">Nessun WOD selezionato.</div>}
              </>
            ) : (
              <div className="space-y-3 pb-20">
                <div className="flex justify-between items-end mb-4 px-2"><h2 className="text-xl font-black italic text-white uppercase">Stakanovisti di {new Date().toLocaleString('it-IT', { month: 'long' })}</h2></div>
                {getAttendanceLeaderboard().map((u, idx) => (
                  <div key={u.userId} onClick={() => setViewingUser(u.userId)} className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-750">
                    <div className="flex items-center gap-4">
                      <div className={`font-black text-lg w-6 text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-300' : 'text-orange-600'}`}>{idx + 1}</div>
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg overflow-hidden">{u.userAvatar?.startsWith('http') ? <img src={u.userAvatar} className="w-full h-full object-cover" /> : u.userAvatar}</div>
                      <div className="font-bold text-white">{u.userName}</div>
                    </div>
                    <div className="flex flex-col items-end"><div className="text-2xl font-black text-blue-400">{u.count}</div><div className="text-[9px] uppercase text-slate-500">WOD</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'gyms' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white">Le tue Palestre</h2><Button size="sm" onClick={() => setIsGymModalOpen(true)}><Plus size={16} /> Crea</Button></div>
            <div className="grid gap-3">
              {myGyms.map(g => (
                <div key={g.id} className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-2 transition ${currentGym?.id === g.id ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}`} onClick={() => { setCurrentGym(g); setActiveTab('calendar'); }}>
                  <div className="flex justify-between items-center w-full">
                    <div><div className="font-bold text-lg text-white flex items-center gap-2">{g.name}{getMyGymRole(g) === GYM_ROLES.OWNER && <Crown size={14} className="text-yellow-500" />}{getMyGymRole(g) === GYM_ROLES.COACH && <Shield size={14} className="text-blue-500" />}</div><div className="text-xs text-slate-400">{g.members?.length || 0} Membri</div></div>
                    <div className="flex gap-2 items-center">{isCoachOrOwner(g) && <button onClick={(e) => { e.stopPropagation(); handleManageGymToggle(g); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-300 hover:text-white transition"><Settings size={16} /></button>}{currentGym?.id === g.id && <Check className="text-emerald-500" />}</div>
                  </div>
                  {isCoachOrOwner(g) && g.pendingMembers?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10" onClick={e => e.stopPropagation()}>
                      <div className="text-[10px] font-bold text-yellow-500 uppercase mb-2">Richieste di accesso ({g.pendingMembers.length})</div>
                      {g.pendingMembers.map(uid => (<div key={uid} className="flex justify-between items-center py-1"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] overflow-hidden">{getUserAvatar(uid)?.startsWith('http') ? <img src={getUserAvatar(uid)} className="w-full h-full object-cover" /> : getUserAvatar(uid)}</div><span className="text-sm font-bold text-slate-200">{getUserName(uid)}</span></div><div className="flex gap-2"><button onClick={() => handleApproveMember(g.id, uid)} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40"><Check size={14} /></button><button onClick={() => handleRejectMember(g.id, uid)} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40"><X size={14} /></button></div></div>))}
                    </div>
                  )}
                  {!isCoachOrOwner(g) && <div className="mt-2 pt-2 border-t border-white/10 flex gap-2" onClick={e => e.stopPropagation()}><button onClick={() => handleLeaveGym(g.id)} className="text-[10px] text-red-400 hover:underline">Lascia</button></div>}
                </div>
              ))}
              {myGyms.length === 0 && <div className="text-center py-4 text-slate-500 text-sm">Non sei iscritto a nessuna palestra.</div>}
            </div>
            <div><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Search size={14} /> Tutte le Palestre</h3><div className="space-y-2">{allGyms.filter(g => !g.members?.includes(currentUser.uid)).map(g => { const isPending = g.pendingMembers?.includes(currentUser.uid); return (<div key={g.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center"><div className="font-bold text-slate-300">{g.name}</div><Button size="sm" variant={isPending ? "ghost" : "outline"} onClick={() => !isPending && handleJoinGym(g.id)} disabled={isPending}>{isPending ? "In attesa..." : "Unisciti"}</Button></div>) })}{allGyms.filter(g => !g.members?.includes(currentUser.uid)).length === 0 && <div className="text-center py-4 text-slate-500 text-xs italic">Non ci sono altre palestre disponibili.</div>}</div></div>
          </div>
        )}

        {activeTab === 'admin' && isGlobalAdmin && (
          <div className="space-y-12">
            <div className="flex items-center gap-2 mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl"><Shield className="text-purple-400 w-10 h-10" /><div><h2 className="text-xl font-black text-white">Super Admin</h2><p className="text-slate-400 text-xs">Controllo totale.</p></div></div>
            <section>
              <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Dumbbell size={16} /> Gestione Palestre ({allGyms.length})</h3>
              <div className="grid gap-3">{allGyms.map(g => (<div key={g.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-sm"><div><div className="font-bold text-white text-lg">{g.name}</div><div className="text-xs text-slate-500 font-mono">ID: {g.id} • Membri: {g.members?.length || 0}</div></div><button onClick={() => handleAdminDeleteGym(g.id)} className="p-2 bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition"><Trash2 size={18} /></button></div>))}</div>
            </section>
            <section>
              <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Users size={16} /> Gestione Utenti ({allUsers.length})</h3>
              <div className="space-y-4">
                {allUsers.map(u => (
                  <Card key={u.uid} className="p-4 border-slate-700 bg-slate-800/50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl overflow-hidden border border-slate-600">{u.avatar?.startsWith('http') ? <img src={u.avatar} className="w-full h-full object-cover" /> : u.avatar}</div><div><div className={`font-bold text-white flex items-center gap-2 ${u.blocked ? 'line-through text-red-400' : ''}`}>{u.name}{u.globalRole === GLOBAL_ROLES.ADMIN && <Shield size={12} className="text-purple-500" />}</div><div className="text-xs text-slate-500 font-mono">{u.email}</div></div></div>
                      <div className="flex gap-1"><button onClick={() => handleAdminToggleBlockUser(u.uid, u.blocked)} className={`p-2 rounded-lg transition ${u.blocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>{u.blocked ? <Check size={16} /> : <Ban size={16} />}</button>{u.globalRole !== GLOBAL_ROLES.ADMIN && <button onClick={() => handleAdminChangeGlobalRole(u.uid, GLOBAL_ROLES.ADMIN)} className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg"><Shield size={16} /></button>}</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Iscrizioni Palestre</div>
                      <div className="flex flex-wrap gap-2 mb-3">{allGyms.filter(g => g.members?.includes(u.uid)).map(g => (<span key={g.id} className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs text-slate-300 flex items-center gap-2">{g.name} <button onClick={() => handleAdminRemoveUserFromGym(u.uid, g.id)} className="hover:text-red-400"><X size={12} /></button></span>))}{allGyms.filter(g => g.members?.includes(u.uid)).length === 0 && <span className="text-slate-600 text-xs italic">Nessuna iscrizione</span>}</div>
                      <div className="flex gap-2"><select className="bg-slate-800 text-slate-300 text-xs rounded p-2 border border-slate-700 flex-1 outline-none" onChange={(e) => { if (e.target.value) handleAdminAddUserToGym(u.uid, e.target.value); e.target.value = ""; }}><option value="">+ Aggiungi a palestra...</option>{allGyms.filter(g => !g.members?.includes(u.uid)).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}</select></div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 text-center">
            <div className="relative inline-block"><div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-6xl shadow-2xl overflow-hidden">{currentUser.avatar?.startsWith('http') ? <img src={currentUser.avatar} alt="av" className="w-full h-full object-cover" /> : currentUser.avatar}</div><button className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg"><Edit3 size={14} /></button></div>
            <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto bg-slate-800 p-3 rounded-xl border border-slate-700">{AVATARS.map(av => (<button key={av} onClick={() => updateAvatar(av)} className={`text-2xl hover:scale-125 transition ${currentUser.avatar === av ? 'opacity-100 scale-110' : 'opacity-50'}`}>{av}</button>))}</div>
            <div><h2 className="text-2xl font-black text-white">{currentUser.name}</h2><div className="flex justify-center gap-2 mt-2"><Badge color="purple">{currentUser.globalRole}</Badge><Badge color="blue">{currentUser.email}</Badge></div></div>
            <Button variant="outline" onClick={() => signOut(auth)} className="w-full max-w-xs mx-auto"><LogOut size={18} /> Disconnetti</Button>
            <div className="pt-4 border-t border-slate-800 mt-6"><button onClick={handleDeleteAccount} className="flex items-center justify-center gap-2 text-red-500 hover:text-red-400 text-xs mx-auto p-2 hover:bg-red-900/20 rounded transition"><AlertTriangle size={12} /> Elimina Account</button></div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-40">
        <div className="max-w-lg mx-auto flex justify-around p-1.5">
          <NavBtn icon={Calendar} label="WOD" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <NavBtn icon={Trophy} label="Classifica" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
          <NavBtn icon={Dumbbell} label="Palestre" active={activeTab === 'gyms'} onClick={() => setActiveTab('gyms')} />
          {isGlobalAdmin && <NavBtn icon={Shield} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
          <NavBtn icon={User} label="Profilo" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </nav>

      <Dialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} onConfirm={dialog.onConfirm} onCancel={() => setDialog({ ...dialog, isOpen: false })} />

      {isGymModalOpen && (
        <Modal title="Nuova Palestra" onClose={() => setIsGymModalOpen(false)}>
          <input autoFocus className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4" placeholder="Nome Palestra" value={newGymName} onChange={e => setNewGymName(e.target.value)} />
          <Button onClick={handleCreateGym} className="w-full">Crea Palestra</Button>
        </Modal>
      )}

      {gymToManage && (
        <Modal title={`Gestione ${gymToManage.name}`} onClose={() => setGymToManage(null)}>
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Aggiungi Membro</label>
              <div className="flex gap-2">
                <input className="bg-slate-900 border border-slate-700 rounded p-2 flex-1 text-white text-sm" placeholder="Email atleta..." value={memberEmailToAdd} onChange={e => setMemberEmailToAdd(e.target.value)} />
                <Button size="sm" onClick={handleCoachAddMemberByEmail} disabled={isSubmitting}><UserPlus size={16} /></Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Membri ({gymToManage.members?.length})</label>
              <div className="space-y-2">
                {gymToManage.members?.map(uid => {
                  const role = gymToManage.roles?.[uid] || GYM_ROLES.ATHLETE;
                  const isMe = uid === currentUser.uid;
                  return (
                    <div key={uid} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm overflow-hidden">{getUserAvatar(uid)?.startsWith('http') ? <img src={getUserAvatar(uid)} className="w-full h-full object-cover" /> : getUserAvatar(uid)}</div>
                        <div><div className="text-sm font-bold text-white">{getUserName(uid)}</div><Badge color={role === GYM_ROLES.OWNER ? 'yellow' : role === GYM_ROLES.COACH ? 'blue' : 'slate'}>{role}</Badge></div>
                      </div>
                      {!isMe && role !== GYM_ROLES.OWNER && <div className="flex gap-1"><button onClick={() => handleCoachToggleRole(uid, role)} className={`p-1.5 rounded ${role === GYM_ROLES.COACH ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`} title={role === GYM_ROLES.COACH ? "Rendi Atleta" : "Rendi Coach"}><Shield size={14} /></button><button onClick={() => handleCoachRemoveMember(uid)} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"><Trash2 size={14} /></button></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isWodModalOpen && (
        <Modal title={editingWod ? "Modifica WOD" : "Nuovo WOD"} onClose={() => { setIsWodModalOpen(false); setEditingWod(null); setNewWodData({ title: '', type: 'FORTIME', timeCap: '', description: '' }); }}>
          <input className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-3 font-bold" placeholder="Titolo (es. Murph)" value={newWodData.title} onChange={e => setNewWodData({ ...newWodData, title: e.target.value })} />
          <div className="flex gap-2 mb-3">
            <select className="bg-slate-900 p-3 rounded border border-slate-700 text-white flex-1" value={newWodData.type} onChange={e => setNewWodData({ ...newWodData, type: e.target.value })}>
              <option value="FORTIME">For Time</option>
              <option value="AMRAP">AMRAP</option>
              <option value="WEIGHT">Max Weight</option>
            </select>
            <input className="w-20 bg-slate-900 p-3 rounded border border-slate-700 text-white text-center" placeholder="TC" value={newWodData.timeCap} onChange={e => setNewWodData({ ...newWodData, timeCap: e.target.value })} />
          </div>
          <textarea className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4 h-32 font-mono text-sm" placeholder="Incolla descrizione WOD..." value={newWodData.description} onChange={e => setNewWodData({ ...newWodData, description: e.target.value })} />
          <Button onClick={handleSaveWod} className="w-full">{editingWod ? "Salva Modifiche" : "Pubblica"}</Button>
        </Modal>
      )}

      {isScoreModalOpen && scoreWod && (
        <Modal title={`Score: ${scoreWod.title}`} onClose={() => { setIsScoreModalOpen(false); setScoreWod(null); }}>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-4">
            {scoreWod.type === 'FORTIME' ? (
              <div className="flex gap-2 justify-center items-center">
                <select value={scoreData.min} onChange={e => setScoreData({ ...scoreData, min: parseInt(e.target.value) })} className="bg-slate-800 text-2xl p-2 rounded text-white border border-slate-600">{[...Array(60).keys()].map(i => <option key={i} value={i}>{i}</option>)}</select>
                <span className="text-2xl font-bold">:</span>
                <select value={scoreData.sec} onChange={e => setScoreData({ ...scoreData, sec: parseInt(e.target.value) })} className="bg-slate-800 text-2xl p-2 rounded text-white border border-slate-600">{[...Array(60).keys()].map(i => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}</select>
              </div>
            ) : (
              <input type="number" placeholder={scoreWod.type === 'AMRAP' ? 'Reps Totali' : 'Carico KG'} className="w-full bg-slate-800 text-3xl p-4 text-center rounded text-white border border-slate-600" value={scoreData.val} onChange={e => setScoreData({ ...scoreData, val: e.target.value })} />
            )}
          </div>
          <div onClick={() => setScoreData({ ...scoreData, rx: !scoreData.rx })} className={`p-3 rounded-lg border mb-4 cursor-pointer flex items-center gap-3 transition ${scoreData.rx ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-800 border-slate-600'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scoreData.rx ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'}`}>{scoreData.rx && <div className="w-2 h-2 bg-white rounded-full" />}</div>
            <span className="font-bold text-white">RX (Come prescritto)</span>
          </div>
          <input className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4 text-sm" placeholder="Note opzionali..." value={scoreData.note} onChange={e => setScoreData({ ...scoreData, note: e.target.value })} />
          <Button onClick={handleSaveScore} className="w-full">Salva Score</Button>
        </Modal>
      )}
    </div>
  );
}

// --- SUBCOMPONENTS ---
const NavBtn = ({ icon: Icon, label, active, onClick }) => <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition w-16 ${active ? 'text-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}><Icon size={20} className={active ? "fill-current opacity-20" : ""} strokeWidth={active ? 2.5 : 2} /><span className="text-[9px] font-bold uppercase tracking-wide">{label}</span></button>;
const AuthScreen = ({ mode, setMode, email, setEmail, pass, setPass, name, setName, onSubmit, onSocialLogin, onResetPassword, error, loading }) => <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden"><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div><div className="z-10 w-full max-w-md"><div className="text-center mb-8"><Flame className="w-16 h-16 text-emerald-500 mx-auto mb-2 animate-bounce" /><h1 className="text-5xl font-black tracking-tighter italic mb-1">WOD<span className="text-emerald-500">RANK</span></h1><p className="text-slate-400">La piattaforma per la competizione reale.</p></div><Card className="p-8 backdrop-blur-xl bg-slate-800/80 border-slate-700"><h2 className="text-2xl font-bold mb-6 text-white text-center">{mode === 'login' ? 'Accedi' : 'Crea Account'}</h2><div className="grid grid-cols-1 gap-3 mb-6"><Button variant="google" onClick={() => onSocialLogin(new GoogleAuthProvider())}>Continua con Google</Button></div><div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-400">Oppure con email</span></div></div><form onSubmit={onSubmit} className="space-y-4">{mode === 'register' && <Input icon={User} placeholder="Nome Atleta" value={name} onChange={e => setName(e.target.value)} />}<Input icon={Mail} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} /><Input icon={Lock} type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} />{mode === 'login' && <div className="text-right mt-1"><button type="button" onClick={onResetPassword} className="text-xs text-emerald-400 hover:text-emerald-300 transition">Password dimenticata?</button></div>}{error && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded text-center">{error}</div>}<Button type="submit" disabled={loading} className="w-full mt-2">{loading ? '...' : mode === 'login' ? 'Entra' : 'Registrati'}</Button></form><div className="text-center mt-6 pt-6 border-t border-slate-700"><button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-slate-400 text-sm hover:text-white transition">{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button></div></Card></div></div>;
const Input = ({ icon: Icon, ...props }) => <div className="relative"><Icon className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" /><input required className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-colors" {...props} /></div>;
const Modal = ({ title, onClose, children }) => <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"><Card className="w-full max-w-md flex flex-col max-h-[90vh]"><div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-xl"><h3 className="text-lg font-bold text-white">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button></div><div className="p-6 overflow-y-auto">{children}</div></Card></div>;
const DateNavigator = ({ date, setDate }) => <div className="flex items-center justify-between bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-md mb-4"><button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); }} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronLeft /></button><div className="flex items-center gap-2 font-bold text-lg"><Calendar className="w-5 h-5 text-emerald-500 mb-0.5" />{date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}</div><button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); }} className="p-3 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"><ChevronRight /></button></div>;
const WodCard = ({ wod, onLog, isAdmin, onDelete, onEdit }) => <Card className="overflow-hidden border-0 relative group mb-6">{isAdmin && <div className="absolute top-2 right-2 flex gap-2 z-20"><button onClick={onEdit} className="p-2 bg-black/40 hover:bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><Edit3 size={16} /></button><button onClick={onDelete} className="p-2 bg-black/40 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button></div>}<div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 relative overflow-hidden"><Dumbbell size={100} className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 text-white" /><div className="relative z-10"><h2 className="text-3xl font-black text-white italic uppercase tracking-tight shadow-black drop-shadow-md">{wod.title}</h2><div className="flex gap-2 mt-3"><Badge color="white" className="bg-white/20 text-white border border-white/20">{wod.type}</Badge>{wod.timeCap && <Badge color="white" className="bg-white/20 text-white border border-white/20">TC: {wod.timeCap}'</Badge>}</div></div></div><div className="p-6 bg-slate-800"><pre className="font-mono text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{wod.description}</pre><div className="mt-4 text-xs text-slate-500 text-right">Creato da: {wod.createdBy || 'Coach'}</div></div><div className="p-4 bg-slate-800 border-t border-slate-700"><Button onClick={onLog} className="w-full shadow-emerald-900/20"><Plus size={20} /> Registra Score</Button></div></Card>;
const EmptyWodState = ({ canCreate, onCreate, onFindGym }) => <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30 mb-6"><div className="bg-slate-800 inline-block p-4 rounded-full mb-4"><Clipboard className="h-8 w-8 text-slate-500" /></div><h3 className="text-xl font-bold text-white mb-1">Nessun WOD</h3><p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Riposo o non ancora programmato.</p><div className="flex gap-2 justify-center">{canCreate && <Button onClick={onCreate} variant="secondary"><Plus size={18} /> Aggiungi WOD</Button>}<Button onClick={onFindGym} variant="outline"><Search size={18} /> Trova Palestra</Button></div></div>;
const LeaderboardPreview = ({ scores, onMore }) => <div className="border border-slate-700 rounded-xl bg-slate-800 p-4"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Top 3 Live</h3><button onClick={onMore} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">Vedi Tutti</button></div><div className="space-y-2">{scores.slice(0, 3).map((s) => (<div key={s.id} className="flex justify-between items-center text-sm p-2 rounded bg-slate-700/30"><div className="flex items-center gap-3 flex-1 min-w-0"><span className={`font-bold w-4 text-center flex-shrink-0 ${s.rank === 1 ? 'text-yellow-400' : 'text-slate-500'}`}>{s.rank}</span><span className="text-slate-200 font-medium truncate">{s.userName}</span></div><div className="font-mono font-bold text-emerald-400 flex-shrink-0 ml-2">{s.resultDisplay}</div></div>))}{scores.length === 0 && <div className="text-center text-slate-500 text-xs italic">Nessuno score registrato.</div>}</div></div>;
// FIXED UI: Added proper truncation and flex layout to avoid overlap
const FullLeaderboard = ({ wod, scores, currentUserId, onLike, onDelete, isAdmin, onUserClick }) => <div className="space-y-3 pb-20"><div className="flex justify-between items-end mb-4 px-2"><h2 className="text-2xl font-black italic text-white uppercase tracking-tight">{wod ? wod.title : 'Generale'}</h2><Badge>{scores.length} Atleti</Badge></div>{scores.map((score, idx) => (<div key={score.id} className={`p-4 rounded-xl relative overflow-hidden border group ${score.userId === currentUserId ? 'bg-emerald-900/10 border-emerald-500/50' : 'bg-slate-800 border-slate-700'}`}>{(isAdmin || score.userId === currentUserId) && <button onClick={() => onDelete(score.id)} className="absolute top-2 right-2 p-1.5 text-slate-600 hover:text-red-400 z-20"><Trash2 size={14} /></button>}{idx < 3 && <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden"><div className={`absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 w-16 h-16 rotate-45 ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-600'} z-10`}></div><span className="absolute top-1 right-1 text-[10px] font-bold text-slate-900 z-20">#{idx + 1}</span></div>}<div className="flex items-start gap-4"><div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-2xl border border-slate-600 shadow-inner overflow-hidden cursor-pointer" onClick={() => onUserClick(score.userId)}>{score.userAvatar?.startsWith('http') ? <img src={score.userAvatar} className="w-full h-full object-cover" /> : (score.userAvatar || '🦁')}</div><div className="flex-grow min-w-0"><div className="flex justify-between items-start"><div><div className="font-bold text-slate-100 text-lg leading-none mb-1 truncate cursor-pointer hover:text-emerald-400 transition" onClick={() => onUserClick(score.userId)}>{score.userName}</div><div className="flex gap-2 items-center"><Badge color={score.rx ? 'emerald' : 'orange'}>{score.rx ? 'Rx' : 'Scaled'}</Badge></div></div><div className="text-2xl font-black text-emerald-400 font-mono tracking-tight pl-2">{score.resultDisplay}</div></div><div className="mt-3 pt-2 border-t border-slate-700/50 flex justify-between items-center">{score.note ? <span className="text-xs text-slate-500 italic truncate max-w-[150px]">"{score.note}"</span> : <span />}<button onClick={() => onLike(score.id, score.likes)} className={`flex items-center gap-1.5 text-xs font-bold transition ${score.likes > 0 ? 'text-blue-400' : 'text-slate-500'}`}><ThumbsUp size={14} className={score.likes ? "fill-current" : ""} /> {score.likes || 'Fist Bump'}</button></div></div></div></div>))}</div>;
const TimeInput = ({ minutes, setMinutes, seconds, setSeconds }) => <div className="flex items-center gap-2 justify-center"><div className="flex-1"><label className="block text-xs text-slate-400 text-center mb-1 font-bold uppercase">Minuti</label><select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-2xl font-mono text-white text-center appearance-none focus:border-emerald-500 outline-none">{[...Array(61).keys()].map(i => <option key={`m-${i}`} value={i}>{i.toString().padStart(2, '0')}</option>)}</select></div><div className="text-2xl font-bold text-slate-500 mt-6">:</div><div className="flex-1"><label className="block text-xs text-slate-400 text-center mb-1 font-bold uppercase">Secondi</label><select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-2xl font-mono text-white text-center appearance-none focus:border-emerald-500 outline-none">{[...Array(60).keys()].map(i => <option key={`s-${i}`} value={i}>{i.toString().padStart(2, '0')}</option>)}</select></div></div>;