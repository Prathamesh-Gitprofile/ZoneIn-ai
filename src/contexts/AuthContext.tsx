import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithGoogle, 
  logOut, 
  createUserDocument,
  getUserData,
  type FirebaseUser 
} from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is not configured, skip auth and show demo mode
    if (!auth) {
      console.log('Firebase not configured - running in demo mode');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Create user document if it doesn't exist
        await createUserDocument(firebaseUser);
        
        // Get user data from Firestore
        const userData = await getUserData(firebaseUser.uid);
        if (userData) {
          setUser({
            uid: firebaseUser.uid,
            displayName: userData.displayName || firebaseUser.displayName,
            email: userData.email || firebaseUser.email,
            photoURL: userData.photoURL || firebaseUser.photoURL,
            createdAt: userData.createdAt?.toDate(),
            streak: userData.streak || 0,
            lastWatchedDate: userData.lastWatchedDate?.toDate() || null,
            defaultPlaybackSpeed: userData.defaultPlaybackSpeed || 1,
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase not configured');
    }
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      setUser(null);
      setFirebaseUser(null);
      return;
    }
    try {
      await logOut();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user || !db) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, updates);
      
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    if (!firebaseUser || !db) return;
    
    try {
      const userData = await getUserData(firebaseUser.uid);
      if (userData) {
        setUser({
          uid: firebaseUser.uid,
          displayName: userData.displayName || firebaseUser.displayName,
          email: userData.email || firebaseUser.email,
          photoURL: userData.photoURL || firebaseUser.photoURL,
          createdAt: userData.createdAt?.toDate(),
          streak: userData.streak || 0,
          lastWatchedDate: userData.lastWatchedDate?.toDate() || null,
          defaultPlaybackSpeed: userData.defaultPlaybackSpeed || 1,
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    updateUserProfile,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
