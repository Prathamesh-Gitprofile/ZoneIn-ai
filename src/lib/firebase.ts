import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, deleteDoc, updateDoc, increment, Timestamp, writeBatch } from 'firebase/firestore';
import type { Playlist, Video, Note, CodeSnippet, Summary, QuizResult, Activity } from '@/types';

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Export with fallback
export { auth, db };
export { onAuthStateChanged };
export type { FirebaseUser };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions with fallback
export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase not configured');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logOut = async () => {
  if (!auth) {
    throw new Error('Firebase not configured');
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Firestore helper functions with fallback
export const createUserDocument = async (user: FirebaseUser) => {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: Timestamp.now(),
      streak: 0,
      lastWatchedDate: null,
      defaultPlaybackSpeed: 1,
    });
  }
};

export const getUserData = async (uid: string) => {
  if (!db) return null;
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
};

export const updateUserStreak = async (uid: string, streak: number, lastWatchedDate: Date) => {
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    streak,
    lastWatchedDate: Timestamp.fromDate(lastWatchedDate),
  });
};

// Playlist functions
export const createPlaylist = async (uid: string, playlistData: Omit<Playlist, 'id' | 'uid' | 'addedAt'>) => {
  if (!db) throw new Error('Firebase not configured');
  const playlistsRef = collection(db, 'playlists');
  const newPlaylistRef = doc(playlistsRef);
  
  await setDoc(newPlaylistRef, {
    ...playlistData,
    uid,
    addedAt: Timestamp.now(),
  });
  
  return newPlaylistRef.id;
};

export const getUserPlaylists = async (uid: string) => {
  if (!db) return [];
  const playlistsRef = collection(db, 'playlists');
  const q = query(playlistsRef, where('uid', '==', uid), orderBy('addedAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    addedAt: doc.data().addedAt?.toDate(),
    lastWatchedAt: doc.data().lastWatchedAt?.toDate(),
  })) as Playlist[];
};

export const updatePlaylist = async (playlistId: string, updates: Partial<Playlist>) => {
  if (!db) return;
  const playlistRef = doc(db, 'playlists', playlistId);
  await updateDoc(playlistRef, updates);
};

export const deletePlaylist = async (playlistId: string) => {
  if (!db) return;
  // Delete all videos first
  const videosRef = collection(db, 'videos');
  const q = query(videosRef, where('playlistId', '==', playlistId));
  const videoSnapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  videoSnapshot.docs.forEach(videoDoc => {
    batch.delete(videoDoc.ref);
  });
  
  // Delete the playlist
  batch.delete(doc(db, 'playlists', playlistId));
  await batch.commit();
};

// Video functions
export const createVideos = async (videos: Omit<Video, 'id'>[]) => {
  if (!db) return;
  const batch = writeBatch(db);
  const videosRef = collection(db, 'videos');
  
  videos.forEach(video => {
    const newVideoRef = doc(videosRef);
    batch.set(newVideoRef, video);
  });
  
  await batch.commit();
};

export const getPlaylistVideos = async (playlistId: string) => {
  if (!db) return [];
  const videosRef = collection(db, 'videos');
  const q = query(videosRef, where('playlistId', '==', playlistId), orderBy('position', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    watchedAt: doc.data().watchedAt?.toDate(),
  })) as Video[];
};

export const updateVideo = async (videoId: string, updates: Partial<Video>) => {
  if (!db) return;
  const videoRef = doc(db, 'videos', videoId);
  await updateDoc(videoRef, updates);
};

// Note functions
export const createNote = async (noteData: Omit<Note, 'id' | 'createdAt'>) => {
  if (!db) throw new Error('Firebase not configured');
  const notesRef = collection(db, 'notes');
  const newNoteRef = doc(notesRef);
  
  await setDoc(newNoteRef, {
    ...noteData,
    createdAt: Timestamp.now(),
  });
  
  return newNoteRef.id;
};

export const getVideoNotes = async (videoId: string) => {
  if (!db) return [];
  const notesRef = collection(db, 'notes');
  const q = query(notesRef, where('videoId', '==', videoId), orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Note[];
};

export const updateNote = async (noteId: string, text: string) => {
  if (!db) return;
  const noteRef = doc(db, 'notes', noteId);
  await updateDoc(noteRef, { text });
};

export const deleteNote = async (noteId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'notes', noteId));
};

// Code snippet functions
export const createSnippet = async (snippetData: Omit<CodeSnippet, 'id' | 'createdAt'>) => {
  if (!db) throw new Error('Firebase not configured');
  const snippetsRef = collection(db, 'snippets');
  const newSnippetRef = doc(snippetsRef);
  
  await setDoc(newSnippetRef, {
    ...snippetData,
    createdAt: Timestamp.now(),
  });
  
  return newSnippetRef.id;
};

export const getVideoSnippets = async (videoId: string) => {
  if (!db) return [];
  const snippetsRef = collection(db, 'snippets');
  const q = query(snippetsRef, where('videoId', '==', videoId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as CodeSnippet[];
};

export const deleteSnippet = async (snippetId: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'snippets', snippetId));
};

// Summary functions
export const createOrUpdateSummary = async (videoId: string, uid: string, text: string) => {
  if (!db) return;
  const summariesRef = collection(db, 'summaries');
  const q = query(summariesRef, where('videoId', '==', videoId), where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    const newSummaryRef = doc(summariesRef);
    await setDoc(newSummaryRef, {
      videoId,
      uid,
      text,
      updatedAt: Timestamp.now(),
    });
  } else {
    const summaryRef = doc(db, 'summaries', querySnapshot.docs[0].id);
    await updateDoc(summaryRef, {
      text,
      updatedAt: Timestamp.now(),
    });
  }
};

export const getVideoSummary = async (videoId: string, uid: string) => {
  if (!db) return null;
  const summariesRef = collection(db, 'summaries');
  const q = query(summariesRef, where('videoId', '==', videoId), where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) return null;
  
  return {
    id: querySnapshot.docs[0].id,
    ...querySnapshot.docs[0].data(),
    updatedAt: querySnapshot.docs[0].data().updatedAt?.toDate(),
  } as Summary;
};

// Quiz result functions
export const saveQuizResult = async (resultData: Omit<QuizResult, 'id' | 'completedAt'>) => {
  if (!db) throw new Error('Firebase not configured');
  const quizResultsRef = collection(db, 'quizResults');
  const newResultRef = doc(quizResultsRef);
  
  await setDoc(newResultRef, {
    ...resultData,
    completedAt: Timestamp.now(),
  });
  
  return newResultRef.id;
};

export const getVideoQuizResult = async (videoId: string, uid: string) => {
  if (!db) return null;
  const quizResultsRef = collection(db, 'quizResults');
  const q = query(quizResultsRef, where('videoId', '==', videoId), where('uid', '==', uid));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) return null;
  
  return {
    id: querySnapshot.docs[0].id,
    ...querySnapshot.docs[0].data(),
    completedAt: querySnapshot.docs[0].data().completedAt?.toDate(),
  } as QuizResult;
};

// Activity functions
export const logActivity = async (uid: string, videosWatched: number, minutesWatched: number) => {
  if (!db) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activitiesRef = collection(db, 'activities');
  const q = query(
    activitiesRef,
    where('uid', '==', uid),
    where('date', '>=', Timestamp.fromDate(today))
  );
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    const newActivityRef = doc(activitiesRef);
    await setDoc(newActivityRef, {
      uid,
      date: Timestamp.fromDate(today),
      videosWatched,
      minutesWatched,
    });
  } else {
    const activityRef = doc(db, 'activities', querySnapshot.docs[0].id);
    await updateDoc(activityRef, {
      videosWatched: increment(videosWatched),
      minutesWatched: increment(minutesWatched),
    });
  }
};

export const getUserActivities = async (uid: string, days: number = 365) => {
  if (!db) return [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  const activitiesRef = collection(db, 'activities');
  const q = query(
    activitiesRef,
    where('uid', '==', uid),
    where('date', '>=', Timestamp.fromDate(startDate)),
    orderBy('date', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate(),
  })) as Activity[];
};

// Export Timestamp for use in other files
export { Timestamp };
