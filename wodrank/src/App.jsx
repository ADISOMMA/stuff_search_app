
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Trophy, Dumbbell, User, Plus, ChevronRight,
  Flame, Shield, BarChart2, Swords, Trash2
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import {
  collection, addDoc, onSnapshot, doc, updateDoc,
  deleteDoc, serverTimestamp, query, where,
  arrayUnion, arrayRemove, getDocs, deleteField
} from 'firebase/firestore';
import { db, appId, auth } from './firebase/config.js';
import { sendPasswordResetEmail } from 'firebase/auth';

// --- APP IMPORTS ---
import { formatDate } from './utils/date.js';
import { logAction } from './utils/logger.js';
import { GLOBAL_ROLES, GYM_ROLES, AVATARS, BENCHMARKS_DATA } from './constants.js';
import { useAuth } from './hooks/useAuth.js';
import { useGymData } from './hooks/useGymData.js';

// UI + Feature Components
import Button from './components/Button';
import Badge from './components/Badge';
import Modal from './components/Modal';
import Dialog from './components/Dialog';
import NavBtn from './components/NavBtn';
import TimeInput from './features/scores/components/TimeInput.jsx';
import CalendarView from './features/calendar/CalendarView.jsx';
import LeaderboardView from './features/leaderboard/LeaderboardView.jsx';
import GymsView from './features/gyms/GymsView.jsx';
import ChallengesView from './features/challenges/ChallengesView.jsx';
import BenchmarksView from './features/benchmarks/BenchmarksView.jsx';
import ProfileView from './features/profile/ProfileView.jsx';
import AdminView from './features/admin/AdminView.jsx';
import AuthFlow from './features/auth/AuthFlow.jsx';
import backSquatIcon from './assets/benchmarks/back_squat.svg';
import frontSquatIcon from './assets/benchmarks/front_squat.svg';
import deadliftIcon from './assets/benchmarks/deadlift.svg';
import benchIcon from './assets/benchmarks/bench.svg';
import snatchIcon from './assets/benchmarks/snatch.svg';
import cleanIcon from './assets/benchmarks/clean.svg';

export default function FitRankApp() {
  const { currentUser, loadingAuth, logout, deleteAccount, updateAvatar, updateProfile } = useAuth();
  const isGlobalAdmin = useMemo(
    () => currentUser?.globalRole === GLOBAL_ROLES.ADMIN,
    [currentUser]
  );

  const {
    loading: loadingGymData,
    myGyms,
    allGyms,
    currentGym,
    wods,
    scores,
    challenges,
    userCache,
    selectGym
  } = useGymData(currentUser, isGlobalAdmin);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('calendar');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isWodModalOpen, setIsWodModalOpen] = useState(false);
  const [editingWod, setEditingWod] = useState(null);
  const [scoreWod, setScoreWod] = useState(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null);
  const [isGymModalOpen, setIsGymModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isBenchmarkScoreModalOpen, setIsBenchmarkScoreModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [benchmarkScores, setBenchmarkScores] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newWodData, setNewWodData] = useState({ title: '', type: 'FORTIME', timeCap: '', description: '' });
  const [scoreData, setScoreData] = useState({ min: 0, sec: 0, val: '', rx: true, note: '' });
  const [newGymName, setNewGymName] = useState('');
  const [challengeData, setChallengeData] = useState({
    title: '',
    type: 'MOST_WODS',
    opponents: [],
    description: '',
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date(Date.now() + 7 * 86400000)),
    rxOnly: false
  });
  const [benchmarkTab, setBenchmarkTab] = useState('LIFTS');
  const [leaderboardWodId, setLeaderboardWodId] = useState(null);
  const [leaderboardMode, setLeaderboardMode] = useState('WOD');
  const [leaderboardTypeFilter, setLeaderboardTypeFilter] = useState('ALL');
  const [leaderboardRxFilter, setLeaderboardRxFilter] = useState('ALL');
  const [leaderboardOnlyMine, setLeaderboardOnlyMine] = useState(false);
  const [leaderboardUserFilter, setLeaderboardUserFilter] = useState('');
  const [viewingUser, setViewingUser] = useState(null);
  const [gymToManage, setGymToManage] = useState(null);
  const [memberEmailToAdd, setMemberEmailToAdd] = useState('');
  const [manageGymName, setManageGymName] = useState('');
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [adminUserToEdit, setAdminUserToEdit] = useState(null);
  const [adminUserForm, setAdminUserForm] = useState({ name: '', email: '' });
  const [benchmarkPercent, setBenchmarkPercent] = useState(70);
  const [themeId, setThemeId] = useState('slate-dark');
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [attendanceRange, setAttendanceRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  });

  const handleProfileFormChange = (form) => {
    setProfileForm(form);
    if (form.theme) setThemeId(form.theme);
  };

  const shiftAttendanceRange = (months) => {
    setAttendanceRange(prev => {
      const base = new Date(prev.start);
      base.setMonth(base.getMonth() + months, 1);
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
      return { start, end };
    });
  };

  const updateAttendanceRange = (startStr, endStr) => {
    const start = startStr ? new Date(startStr) : attendanceRange.start;
    const end = endStr ? new Date(endStr) : attendanceRange.end;
    end.setHours(23, 59, 59);
    setAttendanceRange({ start, end });
  };

  const BENCHMARK_ICON_MAP = {
    back_squat: backSquatIcon,
    front_squat: frontSquatIcon,
    deadlift: deadliftIcon,
    bench: benchIcon,
    snatch: snatchIcon,
    clean: cleanIcon,
  };

  // --- HELPERS ---
  const getMyGymRole = (gym) => {
    if (!currentUser || !gym) return null;
    if (isGlobalAdmin) return GYM_ROLES.OWNER;
    return gym.roles?.[currentUser.uid] || null;
  };
  const isCoachOrOwner = (gym) => {
    const role = getMyGymRole(gym);
    return role === GYM_ROLES.COACH || role === GYM_ROLES.OWNER;
  };
  const getUserName = (uid) => userCache[uid]?.name || `${uid.substring(0, 6)}...`;
  const getUserAvatar = (uid, fallback) => {
    const cached = userCache[uid];
    if (cached?.avatar) return cached.avatar;
    if (cached?.providerAvatar) return cached.providerAvatar;
    if (uid === currentUser?.uid && (currentUser?.avatar || currentUser?.providerAvatar)) {
      return currentUser.avatar || currentUser.providerAvatar;
    }
    return fallback || AVATARS[0] || 'A';
  };

  // --- LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'benchmark_scores'),
      (snap) => setBenchmarkScores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({ name: currentUser.name || '', email: currentUser.email || '', theme: currentUser.theme || 'slate-dark' });
      setThemeId(currentUser.theme || 'slate-dark');
    }
  }, [currentUser]);

  useEffect(() => {
    const html = document.documentElement;
    const themeClasses = ['theme-slate','theme-light'];
    themeClasses.forEach(c => html.classList.remove(c));
    const map = {
      'slate-dark': 'theme-slate',
      'light': 'theme-light'
    };
    const cls = map[themeId] || 'theme-slate';
    html.classList.add(cls);
  }, [themeId]);

  useEffect(() => {
    if (!isGlobalAdmin) return;
    const unsub = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'user_directory'),
      (snap) => setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [isGlobalAdmin]);

  // --- COMPUTED ---
  const todaysWods = useMemo(
    () => wods.filter(w => w.date === formatDate(selectedDate)),
    [wods, selectedDate]
  );

  const leaderboardWods = useMemo(() => {
    let list = [...wods];
    if (leaderboardTypeFilter !== 'ALL') {
      list = list.filter(w => w.type === leaderboardTypeFilter);
    }
    if (leaderboardOnlyMine && currentUser) {
      const myWodIds = new Set(scores.filter(s => s.userId === currentUser.uid).map(s => s.wodId));
      list = list.filter(w => myWodIds.has(w.id));
    }
    return list;
  }, [wods, leaderboardTypeFilter, leaderboardOnlyMine, scores, currentUser]);

  useEffect(() => {
    const pool = leaderboardWods.length > 0 ? leaderboardWods : todaysWods;
    if (pool.length > 0 && !pool.find(w => w.id === leaderboardWodId)) {
      setLeaderboardWodId(pool[0].id);
    }
  }, [todaysWods, leaderboardWodId, leaderboardWods]);

  const myChallenges = useMemo(() => {
    if (!currentGym || !currentUser) return { pending: [], active: [], completed: [] };
    const mine = challenges.filter(
      c =>
        c.participants?.includes(currentUser.uid) ||
        c.creatorId === currentUser.uid ||
        c.pendingParticipants?.includes(currentUser.uid)
    );
    return {
      pending: mine.filter(c => c.status === 'ACTIVE' && c.pendingParticipants?.includes(currentUser.uid)),
      active: mine.filter(c => c.status === 'ACTIVE' && c.participants?.includes(currentUser.uid)),
      completed: mine.filter(c => c.status === 'COMPLETED')
    };
  }, [challenges, currentUser, currentGym]);

  const getWodLeaderboard = (wid) => {
    const wod = wods.find(x => x.id === wid);
    if (!wod) return [];
    return scores
      .filter(s => s.wodId === wid)
      .sort((a, b) => wod.type === 'FORTIME' ? a.numericValue - b.numericValue : b.numericValue - a.numericValue)
      .map((s, i) => ({
        ...s,
        rank: i + 1,
        userAvatar: getUserAvatar(s.userId, s.userAvatar),
        userName: getUserName(s.userId)
      }));
  };

  const getBenchmarkType = (bid) => BENCHMARKS_DATA.LIFTS.find(b => b.id === bid) ? 'WEIGHT' : 'FORTIME';
  const getMyPR = (bid) => {
    const mine = benchmarkScores.filter(s => s.benchmarkId === bid && s.userId === currentUser?.uid);
    if (!mine.length) return null;
    const type = getBenchmarkType(bid);
    return type === 'WEIGHT' || type === 'AMRAP'
      ? mine.sort((a, b) => b.numericValue - a.numericValue)[0]
      : mine.sort((a, b) => a.numericValue - b.numericValue)[0];
  };
  const getBenchmarkLeaderboard = (bid) => {
    const bs = benchmarkScores.filter(s => s.benchmarkId === bid);
    const bestPerUser = {};
    const type = getBenchmarkType(bid);
    bs.forEach(s => {
      const existing = bestPerUser[s.userId];
      const better =
        !existing ||
        (type === 'WEIGHT' && s.numericValue > existing.numericValue) ||
        (type === 'FORTIME' && s.numericValue < existing.numericValue);
      if (better) bestPerUser[s.userId] = s;
    });
    return Object.values(bestPerUser)
      .sort((a, b) => type === 'WEIGHT' ? b.numericValue - a.numericValue : a.numericValue - b.numericValue)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  };

  const getAttendanceLeaderboard = () => {
    const start = attendanceRange.start;
    const end = attendanceRange.end;
    const attendance = {};
    scores.forEach(s => {
      const d = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
      if (d >= start && d <= end) {
        if (!attendance[s.userId]) {
          attendance[s.userId] = {
            userId: s.userId,
            userName: getUserName(s.userId),
            userAvatar: getUserAvatar(s.userId, s.userAvatar),
            count: 0
          };
        }
        attendance[s.userId].count += 1;
      }
    });
    return Object.values(attendance)
      .sort((a, b) => b.count - a.count)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  };

  const getUserHistory = (uid) =>
    scores.filter(s => s.userId === uid).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const getUserTrophies = (uid) => challenges.filter(c => c.status === 'COMPLETED' && c.winnerId === uid);
  const getChallengeLeaderboard = (challenge) => {
    const parts = challenge.participants || [];
    const map = {};
    parts.forEach(uid => { map[uid] = 0; });
    const start = new Date(challenge.startDate);
    const end = new Date(challenge.endDate);
    end.setHours(23, 59, 59);
    scores.forEach(s => {
      if (parts.includes(s.userId)) {
        const scoreDate = s.createdAt?.toDate ? s.createdAt.toDate() : new Date();
        if (scoreDate >= start && scoreDate <= end) {
          if (challenge.rxOnly && !s.rx) return;
          map[s.userId] = (map[s.userId] || 0) + 1;
        }
      }
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([uid, score]) => ({ uid, score, name: getUserName(uid), avatar: getUserAvatar(uid) }));
  };
  // --- ACTIONS ---
  const showConfirm = (title, message, onConfirm) =>
    setDialog({ isOpen: true, title, message, onConfirm: async () => { await onConfirm(); setDialog({ ...dialog, isOpen: false }); } });

  const handleCreateGym = async () => {
    if (!newGymName.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gyms'), {
        name: newGymName.trim(),
        members: [currentUser.uid],
        pendingMembers: [],
        roles: { [currentUser.uid]: GYM_ROLES.OWNER },
        createdAt: serverTimestamp()
      });
      logAction('INFO', 'CREATE_GYM', { name: newGymName }, currentUser);
      setNewGymName('');
      setIsGymModalOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinGym = async (gymId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymId), {
        pendingMembers: arrayUnion(currentUser.uid)
      });
      logAction('INFO', 'JOIN_GYM_REQUEST', { gymId }, currentUser);
      alert("Richiesta inviata!");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleManageGymToggle = (gym) => {
    setGymToManage(gym);
    setManageGymName(gym?.name || '');
    setMemberEmailToAdd('');
  };

  const handleCoachRemoveMember = (uid) => {
    if (!gymToManage) return;
    showConfirm("Rimuovi", "Sicuro?", async () => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), {
        members: arrayRemove(uid),
        pendingMembers: arrayRemove(uid),
        [`roles.${uid}`]: deleteField()
      });
      setGymToManage(p => {
        if (!p) return p;
        const updatedRoles = { ...(p.roles || {}) };
        delete updatedRoles[uid];
        return { ...p, members: (p.members || []).filter(m => m !== uid), roles: updatedRoles };
      });
    });
  };

  const handleCoachToggleRole = async (uid, currentRole) => {
    if (!gymToManage) return;
    const newRole = currentRole === GYM_ROLES.COACH ? GYM_ROLES.ATHLETE : GYM_ROLES.COACH;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), { [`roles.${uid}`]: newRole });
      setGymToManage(p => p ? ({ ...p, roles: { ...(p.roles || {}), [uid]: newRole } }) : p);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCoachAddMemberByEmail = async () => {
    if (!memberEmailToAdd.trim() || !gymToManage) return;
    setIsSubmitting(true);
    try {
      const snap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'user_directory'), where("email", "==", memberEmailToAdd.trim())));
      if (snap.empty) {
        alert("Email non trovata.");
      } else {
        const targetUid = snap.docs[0].id;
        if (gymToManage.members?.includes(targetUid)) {
          alert("Già iscritto.");
        } else {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), {
            members: arrayUnion(targetUid),
            pendingMembers: arrayRemove(targetUid),
            [`roles.${targetUid}`]: GYM_ROLES.ATHLETE
          });
          setGymToManage(p => p ? ({
            ...p,
            members: [...(p.members || []), targetUid],
            roles: { ...(p.roles || {}), [targetUid]: GYM_ROLES.ATHLETE }
          }) : p);
          setMemberEmailToAdd('');
        }
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameManagedGym = async () => {
    if (!gymToManage || !manageGymName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gymToManage.id), { name: manageGymName.trim() });
      setGymToManage(p => p ? ({ ...p, name: manageGymName.trim() }) : p);
      logAction('INFO', 'RENAME_GYM', { gymId: gymToManage.id, name: manageGymName.trim() }, currentUser);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteGymCascade = async (gym) => {
    if (!gym) return;
    setIsSubmitting(true);
    try {
      const wodSnap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'wods'), where('gymId', '==', gym.id)));
      const scoreSnap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), where('gymId', '==', gym.id)));
      const challengeSnap = await getDocs(query(collection(db, 'artifacts', appId, 'public', 'data', 'challenges'), where('gymId', '==', gym.id)));

      const deletions = [
        ...wodSnap.docs.map(d => deleteDoc(d.ref)),
        ...scoreSnap.docs.map(d => deleteDoc(d.ref)),
        ...challengeSnap.docs.map(d => deleteDoc(d.ref)),
        deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', gym.id)),
      ];
      await Promise.all(deletions);
      if (currentGym?.id === gym.id) {
        selectGym(null);
      }
      setGymToManage(null);
      logAction('WARN', 'DELETE_GYM', { gymId: gym.id, name: gym.name }, currentUser);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteGym = (gym) => {
    showConfirm(
      "Elimina Palestra",
      "Operazione irreversibile: tutti i WOD, score e sfide di questa palestra saranno rimossi. Procedere?",
      async () => await deleteGymCascade(gym)
    );
  };

  const handleOpenAdminUser = (user) => {
    setAdminUserToEdit(user);
    setAdminUserForm({ name: user.name || '', email: user.email || '' });
  };

  const handleSaveAdminUser = async () => {
    if (!adminUserToEdit) return;
    setIsSubmitting(true);
    try {
      const updates = { name: adminUserForm.name, email: adminUserForm.email };
      await updateDoc(doc(db, 'artifacts', appId, 'users', adminUserToEdit.id, 'profile', 'data'), updates);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', adminUserToEdit.id), updates);
      logAction('INFO', 'ADMIN_UPDATE_USER', { uid: adminUserToEdit.id, updates }, currentUser);
      setAdminUserToEdit(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminResetPassword = async () => {
    if (!adminUserForm.email) return;
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, adminUserForm.email);
      alert('Email di reset inviata.');
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMyProfile = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile(profileForm);
      alert('Profilo aggiornato.');
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveWod = async () => {
    if (!currentGym || !newWodData.title.trim()) return;
    setIsSubmitting(true);
    const payload = {
      ...newWodData,
      title: newWodData.title.trim(),
      date: formatDate(selectedDate),
      gymId: currentGym.id,
      createdBy: currentUser.name || currentUser.email,
    };
    try {
      if (editingWod) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wods', editingWod.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        logAction('INFO', 'UPDATE_WOD', { wodId: editingWod.id }, currentUser);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'wods'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        logAction('INFO', 'CREATE_WOD', { title: payload.title }, currentUser);
      }
      setIsWodModalOpen(false);
      setEditingWod(null);
      setNewWodData({ title: '', type: 'FORTIME', timeCap: '', description: '' });
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveScore = async () => {
    if (!scoreWod || !currentGym) return;
    setIsSubmitting(true);
    try {
      let numericValue = 0;
      let resultDisplay = '';
      if (scoreWod.type === 'FORTIME') {
        numericValue = (Number(scoreData.min) * 60) + Number(scoreData.sec);
        if (scoreWod.timeCap) {
          const cap = parseInt(scoreWod.timeCap, 10) * 60;
          if (numericValue > cap) {
            alert(`Tempo > Time Cap (${scoreWod.timeCap} min).`);
            setIsSubmitting(false);
            return;
          }
        }
        resultDisplay = `${scoreData.min}:${scoreData.sec.toString().padStart(2, '0')}`;
      } else {
        const val = scoreData.val.toString().replace(',', '.');
        numericValue = parseFloat(val);
        resultDisplay = `${numericValue} ${scoreWod.type === 'AMRAP' ? 'Reps' : 'Kg'}`;
      }
      if (Number.isNaN(numericValue)) {
        alert("Valore invalido");
        setIsSubmitting(false);
        return;
      }
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), {
        wodId: scoreWod.id,
        gymId: currentGym.id,
        userId: currentUser.uid,
        userName: currentUser.name || 'Atleta',
        userAvatar: currentUser.avatar || AVATARS[0] || 'A',
        numericValue,
        resultDisplay,
        rx: scoreData.rx,
        note: scoreData.note,
        likes: 0,
        createdAt: serverTimestamp()
      });
      logAction('INFO', 'SAVE_SCORE', { wodId: scoreWod.id }, currentUser);
      setIsScoreModalOpen(false);
      setScoreWod(null);
      setScoreData({ min: 0, sec: 0, val: '', rx: true, note: '' });
      alert("Salvato!");
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeData.title || challengeData.opponents.length === 0) {
      alert("Inserisci titolo e avversari.");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'challenges'), {
        title: challengeData.title,
        description: challengeData.description,
        type: challengeData.type,
        gymId: currentGym.id,
        creatorId: currentUser.uid,
        creatorName: currentUser.name,
        participants: [currentUser.uid],
        pendingParticipants: challengeData.opponents,
        status: 'ACTIVE',
        startDate: challengeData.startDate,
        endDate: challengeData.endDate,
        rxOnly: challengeData.rxOnly,
        createdAt: serverTimestamp()
      });
      logAction('INFO', 'CREATE_CHALLENGE', { title: challengeData.title }, currentUser);
      setIsChallengeModalOpen(false);
      setChallengeData({
        title: '',
        type: 'MOST_WODS',
        opponents: [],
        description: '',
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date(Date.now() + 7 * 86400000)),
        rxOnly: false
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptChallenge = async (cId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'challenges', cId), {
        pendingParticipants: arrayRemove(currentUser.uid),
        participants: arrayUnion(currentUser.uid)
      });
      logAction('INFO', 'ACCEPT_CHALLENGE', { challengeId: cId }, currentUser);
      alert("Accettata!");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeclineChallenge = async (cId) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'challenges', cId), {
        pendingParticipants: arrayRemove(currentUser.uid)
      });
      logAction('INFO', 'DECLINE_CHALLENGE', { challengeId: cId }, currentUser);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeclareWinner = async (cId, winnerId) => {
    if (!winnerId) return;
    showConfirm("Termina Sfida", "Dichiari vincitore?", async () => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'challenges', cId), {
        status: 'COMPLETED',
        winnerId
      });
      logAction('INFO', 'DECLARE_WINNER', { challengeId: cId, winnerId }, currentUser);
    });
  };

  // Admin Actions
  const handleAdminToggleBlockUser = async (uid, status) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { blocked: !status });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid), { blocked: !status });
      logAction('WARN', 'TOGGLE_BLOCK_USER', { uid, blocked: !status }, currentUser);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAdminChangeGlobalRole = async (uid, role) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'), { globalRole: role });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid), { globalRole: role });
      logAction('INFO', 'CHANGE_GLOBAL_ROLE', { uid, role }, currentUser);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAdminDeleteUser = (uid) => {
    showConfirm("Elimina Utente", "Azione irreversibile: il profilo sarà rimosso dal database (auth non toccata). Procedere?", async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', uid, 'profile', 'data'));
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', uid));
      logAction('WARN', 'ADMIN_DELETE_USER', { uid }, currentUser);
    });
  };

  const handleSaveBenchmarkScore = async () => {
    if (!selectedBenchmark || !currentUser) return;
    let numericValue = 0;
    let resultDisplay = '';
    const type = selectedBenchmark.type;
    if (type === 'FORTIME') {
      numericValue = (Number(scoreData.min) * 60) + Number(scoreData.sec);
      resultDisplay = `${scoreData.min}:${scoreData.sec.toString().padStart(2, '0')}`;
    } else {
      numericValue = parseFloat(scoreData.val);
      resultDisplay = `${scoreData.val} ${type === 'AMRAP' ? 'Reps' : 'Kg'}`;
    }
    if (Number.isNaN(numericValue)) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'benchmark_scores'), {
        benchmarkId: selectedBenchmark.id,
        userId: currentUser.uid,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        numericValue,
        resultDisplay,
        createdAt: serverTimestamp()
      });
      logAction('INFO', 'SAVE_BENCHMARK', { benchmarkId: selectedBenchmark.id }, currentUser);
      setIsBenchmarkScoreModalOpen(false);
      setScoreData({ min: 0, sec: 0, val: '', rx: true, note: '' });
    } catch (e) {
      alert(e.message);
    }
  };

  // --- AUTH GUARD ---
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Flame className="w-16 h-16 text-emerald-500 animate-bounce" />
      </div>
    );
  }
  if (!currentUser) return <AuthFlow />;

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 px-4 shadow-xl">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 mr-2" onClick={() => setActiveTab('gyms')}>
            {currentGym ? (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider shrink-0">Palestra Attiva</span>
                  {isCoachOrOwner(currentGym) && <Badge color="yellow">COACH</Badge>}
                </div>
                <span className="font-black text-white text-lg leading-tight flex items-center gap-1 break-words">
                  {currentGym.name}
                  <ChevronRight size={14} className="text-slate-500 shrink-0" />
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Flame className="text-emerald-500 fill-emerald-500 shrink-0" size={24} />
                <span className="font-black text-xl italic tracking-tight">
                  WOD<span className="text-emerald-500">RANK</span>
                </span>
              </div>
            )}
          </div>
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl cursor-pointer hover:scale-105 transition"
              onClick={() => setIsAvatarMenuOpen(p => !p)}
            >
              {currentUser.avatar?.startsWith?.('http')
                ? <img src={currentUser.avatar} alt="Av" className="w-full h-full object-cover rounded-full" />
                : (currentUser.avatar || 'A')}
            </div>
            {isAvatarMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700" onClick={() => { setActiveTab('profile'); setIsAvatarMenuOpen(false); }}>Profilo</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700" onClick={() => { setActiveTab('benchmarks'); setIsAvatarMenuOpen(false); }}>Benchmark</button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700" onClick={() => { setActiveTab('gyms'); setIsAvatarMenuOpen(false); }}>Palestre</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* CALENDAR */}
        {activeTab === 'calendar' && currentGym && (
          <CalendarView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            todaysWods={todaysWods}
            getWodLeaderboard={getWodLeaderboard}
            onLogScore={(wod) => { setScoreWod(wod); setIsScoreModalOpen(true); }}
            canManage={isCoachOrOwner(currentGym)}
            onDeleteWod={(wodId) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wods', wodId))}
            onEditWod={(wod) => {
              setEditingWod(wod);
              setNewWodData({ title: wod.title, type: wod.type, timeCap: wod.timeCap || '', description: wod.description });
              setIsWodModalOpen(true);
            }}
            onAddWod={() => setIsWodModalOpen(true)}
            onFindGym={() => setActiveTab('gyms')}
            onViewLeaderboard={(wodId) => {
              setLeaderboardWodId(wodId);
              setActiveTab('leaderboard');
            }}
          />
        )}

        {/* LEADERBOARD */}
        {activeTab === 'leaderboard' && currentGym && (
          <LeaderboardView
            leaderboardMode={leaderboardMode}
            onModeChange={setLeaderboardMode}
            wods={leaderboardWods}
            wodId={leaderboardWodId}
            onWodChange={setLeaderboardWodId}
            wod={wods.find(w => w.id === leaderboardWodId)}
            scores={getWodLeaderboard(leaderboardWodId)}
            currentUserId={currentUser.uid}
            onLike={async (id, l) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id), { likes: (l || 0) + 1 })}
            onDeleteScore={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'scores', id))}
            isAdmin={isCoachOrOwner(currentGym)}
            onUserClick={setViewingUser}
            attendance={getAttendanceLeaderboard()}
            typeFilter={leaderboardTypeFilter}
            onTypeFilterChange={setLeaderboardTypeFilter}
            rxFilter={leaderboardRxFilter}
            onRxFilterChange={setLeaderboardRxFilter}
            onlyMine={leaderboardOnlyMine}
            onToggleOnlyMine={() => setLeaderboardOnlyMine(p => !p)}
            userFilter={leaderboardUserFilter}
            onUserFilterChange={setLeaderboardUserFilter}
            attendanceRange={attendanceRange}
            onShiftAttendanceRange={shiftAttendanceRange}
            onAttendanceRangeChange={updateAttendanceRange}
          />
        )}

        {/* GYMS */}
        {activeTab === 'gyms' && (
          <GymsView
            myGyms={myGyms}
            allGyms={allGyms}
            currentGym={currentGym}
            currentUser={currentUser}
            onSelectGym={selectGym}
            onCreateGym={() => setIsGymModalOpen(true)}
            onJoinGym={handleJoinGym}
            canManageGym={(g) => isCoachOrOwner(g) || isGlobalAdmin}
            onManageGym={handleManageGymToggle}
            onDeleteGym={confirmDeleteGym}
          />
        )}

        {/* CHALLENGES */}
        {activeTab === 'challenges' && currentGym && (
          <ChallengesView
            myChallenges={myChallenges}
            currentUser={currentUser}
            onCreate={() => setIsChallengeModalOpen(true)}
            onAccept={handleAcceptChallenge}
            onDecline={handleDeclineChallenge}
            onDeclareWinner={handleDeclareWinner}
            getChallengeLeaderboard={getChallengeLeaderboard}
          />
        )}

        {/* BENCHMARKS */}
        {activeTab === 'benchmarks' && (
          <BenchmarksView
            benchmarkTab={benchmarkTab}
            onTabChange={setBenchmarkTab}
            benchmarksData={BENCHMARKS_DATA}
            getMyPR={getMyPR}
            onOpenBenchmark={(b) => { setSelectedBenchmark(b); setIsBenchmarkScoreModalOpen(false); setBenchmarkPercent(70); setScoreData({ min: 0, sec: 0, val: '' }); }}
          />
        )}

        {/* ADMIN */}
        {activeTab === 'admin' && isGlobalAdmin && (
          <AdminView
            allUsers={allUsers}
            gyms={allGyms}
            onToggleBlockUser={handleAdminToggleBlockUser}
            onChangeGlobalRole={handleAdminChangeGlobalRole}
            onManageGym={handleManageGymToggle}
            onDeleteGym={confirmDeleteGym}
            onEditUser={handleOpenAdminUser}
            onDeleteUser={handleAdminDeleteUser}
          />
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={currentUser}
            trophies={getUserTrophies(currentUser.uid)}
            onSignOut={logout}
            onDeleteAccount={() => showConfirm("Elimina Account", "Questa azione è irreversibile.", deleteAccount)}
            onUpdateAvatar={updateAvatar}
            profileForm={profileForm}
            onProfileChange={handleProfileFormChange}
            onSaveProfile={handleSaveMyProfile}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-40">
        <div className="max-w-lg mx-auto flex justify-around p-1.5">
          <NavBtn icon={Calendar} label="WOD" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
          <NavBtn icon={Trophy} label="Classifica" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
          <NavBtn icon={Swords} label="Sfide" active={activeTab === 'challenges'} onClick={() => setActiveTab('challenges')} />
          <NavBtn icon={BarChart2} label="Benchmark" active={activeTab === 'benchmarks'} onClick={() => setActiveTab('benchmarks')} />
          {isGlobalAdmin && <NavBtn icon={Shield} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
        </div>
      </nav>

      <Dialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={() => setDialog({ ...dialog, isOpen: false })}
      />

      {isGymModalOpen && (
        <Modal title="Nuova Palestra" onClose={() => setIsGymModalOpen(false)}>
          <input
            autoFocus
            className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4"
            placeholder="Nome Palestra"
            value={newGymName}
            onChange={e => setNewGymName(e.target.value)}
          />
          <Button onClick={handleCreateGym} className="w-full" disabled={isSubmitting}>
            Crea Palestra
          </Button>
        </Modal>
      )}

      {gymToManage && (
        <Modal title={`Gestione ${gymToManage.name}`} onClose={() => setGymToManage(null)}>
          <div className="space-y-6">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nome Palestra</label>
                <input
                  className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white"
                  value={manageGymName}
                  onChange={e => setManageGymName(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={handleRenameManagedGym} disabled={isSubmitting}>Salva</Button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Aggiungi Membro</label>
              <div className="flex gap-2">
                <input
                  className="bg-slate-900 border border-slate-700 rounded p-2 flex-1 text-white text-sm"
                  placeholder="Email atleta..."
                  value={memberEmailToAdd}
                  onChange={e => setMemberEmailToAdd(e.target.value)}
                />
                <Button size="sm" onClick={handleCoachAddMemberByEmail} disabled={isSubmitting}>Aggiungi</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Membri ({gymToManage.members?.length || 0})</label>
              <div className="space-y-2">
                {gymToManage.members?.map(uid => {
                  const role = gymToManage.roles?.[uid] || GYM_ROLES.ATHLETE;
                  const isMe = uid === currentUser.uid;
                  return (
                    <div key={uid} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm overflow-hidden">
                          {getUserAvatar(uid)?.startsWith?.('http') ? <img src={getUserAvatar(uid)} className="w-full h-full object-cover" /> : getUserAvatar(uid)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white truncate max-w-[120px]">{getUserName(uid)}</div>
                          <Badge color={role === GYM_ROLES.OWNER ? 'yellow' : role === GYM_ROLES.COACH ? 'blue' : 'slate'}>{role}</Badge>
                        </div>
                      </div>
                      {!isMe && role !== GYM_ROLES.OWNER && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCoachToggleRole(uid, role)}
                            className={`p-1.5 rounded ${role === GYM_ROLES.COACH ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}
                            title={role === GYM_ROLES.COACH ? "Rendi Atleta" : "Rendi Coach"}
                          >
                            <Shield size={14}/>
                          </button>
                          <button
                            onClick={() => handleCoachRemoveMember(uid)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:text-red-200 border border-red-700 bg-red-900/20"
              onClick={() => confirmDeleteGym(gymToManage)}
              disabled={isSubmitting}
            >
              Elimina palestra
            </Button>
          </div>
        </Modal>
      )}
      {isWodModalOpen && (
        <Modal
          title={editingWod ? "Modifica WOD" : "Nuovo WOD"}
          onClose={() => {
            setIsWodModalOpen(false);
            setEditingWod(null);
            setNewWodData({ title: '', type: 'FORTIME', timeCap: '', description: '' });
          }}
        >
          <input
            className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-3 font-bold"
            placeholder="Titolo (es. Murph)"
            value={newWodData.title}
            onChange={e => setNewWodData({ ...newWodData, title: e.target.value })}
          />
          <div className="flex gap-2 mb-3">
            <select
              className="bg-slate-900 p-3 rounded border border-slate-700 text-white flex-1"
              value={newWodData.type}
              onChange={e => setNewWodData({ ...newWodData, type: e.target.value })}
            >
              <option value="FORTIME">For Time</option>
              <option value="AMRAP">AMRAP</option>
              <option value="WEIGHT">Max Weight</option>
            </select>
            <input
              className="w-20 bg-slate-900 p-3 rounded border border-slate-700 text-white text-center"
              placeholder="TC"
              value={newWodData.timeCap}
              onChange={e => setNewWodData({ ...newWodData, timeCap: e.target.value })}
            />
          </div>
          <textarea
            className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4 h-32 font-mono text-sm"
            placeholder="Incolla descrizione WOD..."
            value={newWodData.description}
            onChange={e => setNewWodData({ ...newWodData, description: e.target.value })}
          />
          <Button onClick={handleSaveWod} className="w-full" disabled={isSubmitting}>
            {editingWod ? "Salva Modifiche" : "Pubblica"}
          </Button>
        </Modal>
      )}

      {isScoreModalOpen && scoreWod && (
        <Modal title={`Score: ${scoreWod.title}`} onClose={() => { setIsScoreModalOpen(false); setScoreWod(null); }}>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-4">
            {scoreWod.type === 'FORTIME' ? (
              <TimeInput
                minutes={scoreData.min}
                setMinutes={m => setScoreData({ ...scoreData, min: m })}
                seconds={scoreData.sec}
                setSeconds={s => setScoreData({ ...scoreData, sec: s })}
              />
            ) : (
              <input
                type="number"
                placeholder={scoreWod.type === 'AMRAP' ? 'Reps Totali' : 'Carico KG'}
                className="w-full bg-slate-800 text-3xl p-4 text-center rounded text-white border border-slate-600"
                value={scoreData.val}
                onChange={e => setScoreData({ ...scoreData, val: e.target.value })}
              />
            )}
          </div>
          <div
            onClick={() => setScoreData({ ...scoreData, rx: !scoreData.rx })}
            className={`p-3 rounded-lg border mb-4 cursor-pointer flex items-center gap-3 transition ${scoreData.rx ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-800 border-slate-600'}`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${scoreData.rx ? 'border-emerald-500 bg-emerald-500' : 'border-slate-400'}`}>
              {scoreData.rx && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <span className="font-bold text-white">RX (Come prescritto)</span>
          </div>
          <input
            className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white mb-4 text-sm"
            placeholder="Note opzionali..."
            value={scoreData.note}
            onChange={e => setScoreData({ ...scoreData, note: e.target.value })}
          />
          <Button onClick={handleSaveScore} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Salvataggio...' : 'Salva Score'}
          </Button>
        </Modal>
      )}

      {isChallengeModalOpen && (
        <Modal title="Lancia una Sfida" onClose={() => setIsChallengeModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase mb-1">Titolo della Sfida</label>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
                placeholder="Es. Chi fa più burpees?"
                value={challengeData.title}
                onChange={e => setChallengeData({ ...challengeData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase mb-1">Scegli Avversari</label>
              <div className="max-h-40 overflow-y-auto bg-slate-900 rounded border border-slate-700 p-2 space-y-1">
                {currentGym?.members?.filter(uid => uid !== currentUser.uid).map(uid => (
                  <div
                    key={uid}
                    onClick={() => {
                      const selected = challengeData.opponents.includes(uid)
                        ? challengeData.opponents.filter(id => id !== uid)
                        : [...challengeData.opponents, uid];
                      setChallengeData({ ...challengeData, opponents: selected });
                    }}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${challengeData.opponents.includes(uid) ? 'bg-emerald-900/30 border border-emerald-500/50' : 'hover:bg-slate-800'}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${challengeData.opponents.includes(uid) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                      {challengeData.opponents.includes(uid) && <span className="text-[10px] text-white">?</span>}
                    </div>
                    <span className="text-sm text-white">{getUserName(uid)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 font-bold uppercase mb-1">Inizio</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
                  value={challengeData.startDate}
                  onChange={e => setChallengeData({ ...challengeData, startDate: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 font-bold uppercase mb-1">Fine</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
                  value={challengeData.endDate}
                  onChange={e => setChallengeData({ ...challengeData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold uppercase mb-1">Tipo</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setChallengeData({ ...challengeData, type: 'MOST_WODS' })}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition ${challengeData.type === 'MOST_WODS' ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
                >
                  Più WOD
                </button>
                <button
                  onClick={() => setChallengeData({ ...challengeData, type: 'BEST_SCORE' })}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition ${challengeData.type === 'BEST_SCORE' ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 text-slate-400'}`}
                >
                  Score Migliore
                </button>
              </div>
              <div
                onClick={() => setChallengeData({ ...challengeData, rxOnly: !challengeData.rxOnly })}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition ${challengeData.rxOnly ? 'bg-red-900/20 border-red-500' : 'bg-slate-800 border-slate-600'}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${challengeData.rxOnly ? 'border-red-500 bg-red-500' : 'border-slate-400'}`}>
                  {challengeData.rxOnly && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="font-bold text-white text-sm">Solo RX</span>
              </div>
            </div>
            <Button onClick={handleCreateChallenge} disabled={isSubmitting} className="w-full mt-2">
              Lancia!
            </Button>
          </div>
        </Modal>
      )}

      {selectedBenchmark && (
        <Modal title={selectedBenchmark.title} onClose={() => { setSelectedBenchmark(null); setIsBenchmarkScoreModalOpen(false); }}>
          <div className="text-center mb-6">
            <div className="mb-2 flex justify-center">
              {BENCHMARK_ICON_MAP[selectedBenchmark.icon] ? (
                <img src={BENCHMARK_ICON_MAP[selectedBenchmark.icon]} alt={selectedBenchmark.title} className="w-12 h-12 benchmark-icon" />
              ) : (
                <div className="text-4xl">{selectedBenchmark.icon}</div>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-4 font-mono">{selectedBenchmark.desc}</p>
            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/30 mb-4">
              <div className="text-xs text-emerald-500 font-bold uppercase mb-1">Il tuo PR</div>
              <div className="text-3xl font-black text-white font-mono">
                {getMyPR(selectedBenchmark.id) ? getMyPR(selectedBenchmark.id).resultDisplay : "--"}
              </div>
            </div>
            {selectedBenchmark.type === 'WEIGHT' && getMyPR(selectedBenchmark.id) && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase mb-2">
                  <span>Calcolo Percentuale</span>
                  <span>{benchmarkPercent}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                    onClick={() => setBenchmarkPercent(p => Math.max(0, p - 5))}
                  >
                    -5%
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={benchmarkPercent}
                    onChange={e => setBenchmarkPercent(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <button
                    className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm"
                    onClick={() => setBenchmarkPercent(p => Math.min(120, p + 5))}
                  >
                    +5%
                  </button>
                </div>
                <div className="mt-3 text-lg font-black text-emerald-400">
                  {Math.round(getMyPR(selectedBenchmark.id).numericValue * (benchmarkPercent / 100) * 10) / 10} kg
                </div>
              </div>
            )}
            {!isBenchmarkScoreModalOpen && (
              <Button onClick={() => setIsBenchmarkScoreModalOpen(true)} className="w-full">
                <Plus size={18} /> Nuovo PR
              </Button>
            )}
          </div>
          {isBenchmarkScoreModalOpen ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
              <h4 className="text-sm font-bold text-white mb-3 text-center">Registra</h4>
              <div className="mb-4">
                {selectedBenchmark.type === 'FORTIME' ? (
                  <TimeInput
                    minutes={scoreData.min}
                    setMinutes={m => setScoreData({ ...scoreData, min: m })}
                    seconds={scoreData.sec}
                    setSeconds={s => setScoreData({ ...scoreData, sec: s })}
                  />
                ) : (
                  <input
                    type="number"
                    placeholder="KG"
                    className="w-full bg-slate-800 text-2xl p-3 text-center rounded border border-slate-600"
                    value={scoreData.val}
                    onChange={e => setScoreData({ ...scoreData, val: e.target.value })}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsBenchmarkScoreModalOpen(false)} className="flex-1">Annulla</Button>
                <Button onClick={handleSaveBenchmarkScore} className="flex-1">Salva</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mt-6 mb-2">
                <Trophy size={12} /> Top Atleti
              </div>
              {getBenchmarkLeaderboard(selectedBenchmark.id).slice(0, 5).map((s, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-slate-700/20 border border-slate-700/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`font-bold w-4 text-center shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : 'text-orange-600'}`}>{i + 1}</span>
                    <span className="text-sm text-slate-200 truncate">{s.userName}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 shrink-0 ml-2">{s.resultDisplay}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {viewingUser && (
        <Modal title="Scheda Atleta" onClose={() => setViewingUser(null)}>
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center text-4xl mb-2 overflow-hidden">
              {getUserAvatar(viewingUser)?.startsWith?.('http')
                ? <img src={getUserAvatar(viewingUser)} className="w-full h-full object-cover" />
                : getUserAvatar(viewingUser)}
            </div>
            <h3 className="text-xl font-black text-white">{getUserName(viewingUser)}</h3>
            <div className="text-slate-500 text-sm">{getUserHistory(viewingUser).length} WOD Completati</div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Storico</div>
            {getUserHistory(viewingUser).map(s => (
              <div key={s.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400 font-mono">{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : 'Data sconosciuta'}</div>
                  <div className="font-bold text-white text-sm truncate max-w-[150px]">{wods.find(w => w.id === s.wodId)?.title || 'WOD'}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="font-black text-emerald-400 font-mono">{s.resultDisplay}</div>
                  {s.rx
                    ? <span className="text-[9px] text-slate-500 font-bold bg-slate-800 px-1 rounded border border-slate-600">RX</span>
                    : <span className="text-[9px] text-orange-500">SC</span>}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {adminUserToEdit && (
        <Modal title="Modifica Utente" onClose={() => setAdminUserToEdit(null)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1">Nome</label>
              <input
                className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white"
                value={adminUserForm.name}
                onChange={e => setAdminUserForm({ ...adminUserForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-bold uppercase mb-1">Email</label>
              <input
                className="w-full bg-slate-900 p-3 rounded border border-slate-700 text-white"
                value={adminUserForm.email}
                onChange={e => setAdminUserForm({ ...adminUserForm, email: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSaveAdminUser} disabled={isSubmitting}>Salva</Button>
              <Button className="flex-1" variant="secondary" onClick={handleAdminResetPassword} disabled={isSubmitting}>Reset Password</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

