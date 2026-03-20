import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserStreak } from '@/lib/firebase';

export function useStreak() {
  const { user, refreshUserData } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const calculateStreak = useCallback((lastWatchedDate: Date | null, currentStreak: number): number => {
    if (!lastWatchedDate) return 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = new Date(lastWatchedDate);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Already watched today, maintain streak
      return currentStreak;
    } else if (diffDays === 1) {
      // Watched yesterday, increment streak
      return currentStreak + 1;
    } else {
      // Streak broken, start new streak
      return 1;
    }
  }, []);

  const updateStreak = useCallback(async () => {
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if already updated today
      if (user.lastWatchedDate) {
        const lastDate = new Date(user.lastWatchedDate);
        lastDate.setHours(0, 0, 0, 0);
        
        if (lastDate.getTime() === today.getTime()) {
          // Already updated today
          setIsUpdating(false);
          return;
        }
      }
      
      const newStreak = calculateStreak(user.lastWatchedDate, user.streak);
      await updateUserStreak(user.uid, newStreak, today);
      await refreshUserData();
    } catch (error) {
      console.error('Error updating streak:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [user, isUpdating, calculateStreak, refreshUserData]);

  return {
    streak: user?.streak || 0,
    lastWatchedDate: user?.lastWatchedDate,
    updateStreak,
    isUpdating,
  };
}
