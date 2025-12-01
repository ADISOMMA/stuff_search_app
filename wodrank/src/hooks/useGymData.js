import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, appId } from '../firebase/config';

// Helper to determine if a user is a coach or owner of a gym
const isCoachOrOwner = (gym, user, isGlobalAdmin) => {
    if (!user || !gym) return false;
    if (isGlobalAdmin) return true;
    const role = gym.roles?.[user.uid];
    return role === 'owner' || role === 'coach';
};

export const useGymData = (user, isGlobalAdmin) => {
    const [myGyms, setMyGyms] = useState([]);
    const [allGyms, setAllGyms] = useState([]);
    const [currentGym, setCurrentGym] = useState(null);
    const [wods, setWods] = useState([]);
    const [scores, setScores] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [userCache, setUserCache] = useState({});
    const [loading, setLoading] = useState(true);

    // Effect 1: Fetch the list of all gyms and the user's gyms
    useEffect(() => {
        if (!user) {
            setMyGyms([]);
            setAllGyms([]);
            setCurrentGym(null);
            setLoading(false);
            return;
        }
        
        setLoading(true);

        // Listener for all gyms (for the "Join Gym" list)
        const allGymsUnsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gyms'), (snap) => {
            const allGymsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAllGyms(allGymsData);
        });

        // Listener for the user's specific gyms
        const userGymsQuery = isGlobalAdmin 
            ? collection(db, 'artifacts', appId, 'public', 'data', 'gyms')
            : query(collection(db, 'artifacts', appId, 'public', 'data', 'gyms'), where("members", "array-contains", user.uid));
            
        const userGymsUnsub = onSnapshot(userGymsQuery, async (snap) => {
            const myGymsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setMyGyms(myGymsData);

            // Logic to set the current active gym
            const lastGymId = localStorage.getItem('lastGymId');
            const currentGymStillValid = myGymsData.find(g => g.id === currentGym?.id);

            if (currentGym && currentGymStillValid) {
                // If current gym is still valid, just update it, don't change it
                setCurrentGym(currentGymStillValid);
            } else if (lastGymId && myGymsData.find(g => g.id === lastGymId)) {
                // If there's a valid last used gym in local storage
                setCurrentGym(myGymsData.find(g => g.id === lastGymId));
            } else if (myGymsData.length > 0) {
                // Otherwise, default to the first gym in the user's list
                setCurrentGym(myGymsData[0]);
            } else {
                // If user has no gyms
                setCurrentGym(null);
            }

            // --- User Cache Logic ---
            // Gather all user IDs from the gyms the user can manage
            const uidsToFetch = new Set();
            myGymsData.forEach(g => {
                if (isCoachOrOwner(g, user, isGlobalAdmin)) {
                    g.members?.forEach(m => uidsToFetch.add(m));
                    g.pendingMembers?.forEach(m => uidsToFetch.add(m));
                }
            });
            // Also add users from scores to the cache
            scores.forEach(s => uidsToFetch.add(s.userId));

            const missingUids = [...uidsToFetch].filter(id => !userCache[id]);
            if (missingUids.length > 0) {
                const newCache = { ...userCache };
                await Promise.all(missingUids.map(async id => {
                    try {
                        const userDocSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'user_directory', id));
                        if (userDocSnap.exists()) {
                            newCache[id] = userDocSnap.data();
                        }
                    } catch (e) {
                        console.error("Failed to fetch user for cache:", e);
                    }
                }));
                setUserCache(newCache);
            }
            // --- End User Cache ---

            setLoading(false);
        });

        return () => {
            allGymsUnsub();
            userGymsUnsub();
        };
    }, [user, isGlobalAdmin]); // Reruns when user logs in/out

    // Effect 2: Fetch data related to the currently active gym
    useEffect(() => {
        if (!currentGym) {
            setWods([]);
            setScores([]);
            setChallenges([]);
            return;
        }

        localStorage.setItem('lastGymId', currentGym.id);

        const wodUnsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'wods'), where("gymId", "==", currentGym.id)), (snap) => {
            setWods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const scoreUnsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'scores'), where("gymId", "==", currentGym.id)), (snap) => {
            setScores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const challengeUnsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'challenges'), where("gymId", "==", currentGym.id)), (snap) => {
            setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            wodUnsub();
            scoreUnsub();
            challengeUnsub();
        };
    }, [currentGym]); // Reruns only when the active gym changes

    // Function to manually change the current gym
    const selectGym = (gym) => {
        setLoading(true); // Optional: show loading state while data for the new gym is being fetched
        setCurrentGym(gym);
        // The useEffect above will handle fetching the new data and setting loading to false
    };

    return {
        loading,
        myGyms,
        allGyms,
        currentGym,
        wods,
        scores,
        challenges,
        userCache,
        selectGym,
    };
};
