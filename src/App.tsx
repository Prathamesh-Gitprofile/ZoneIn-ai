import { useState, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { HeroSection } from '@/sections/HeroSection';
import { DashboardSection } from '@/sections/DashboardSection';
import { PlayerSection } from '@/sections/PlayerSection';
import { StreaksSection } from '@/sections/StreaksSection';
import { SettingsSection } from '@/sections/SettingsSection';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import type { Playlist } from '@/types';

// Main App Content
function AppContent() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'player' | 'streaks' | 'settings'>('landing');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Handle navigation
  const navigateTo = (view: typeof currentView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartLearning = () => {
    if (user) {
      setCurrentView('dashboard');
    } else {
      toast.info('Please sign in to start learning', {
        description: 'Create a free account to track your progress',
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <div className="animate-pulse">
          <span className="text-2xl font-semibold text-[#F4F4F5]">ZoneIn.ai</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={mainRef} className="min-h-screen bg-[#0B0B0D] relative">
      {/* Grain overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-[#0B0B0D] to-transparent">
 <button 
  onClick={() => navigateTo('landing')}
  className="text-xl font-bold text-[#F4F4F5] hover:text-[#FF2D8D] transition-colors"
>
  ZoneIn.ai
</button>

  <div className="flex items-center gap-5">
    {user ? (
      <>
        <button onClick={() => navigateTo('dashboard')} className={`text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'text-[#FF2D8D]' : 'text-[#A7A7AD] hover:text-[#F4F4F5]'}`}>Dashboard</button>
        <button onClick={() => navigateTo('streaks')} className={`text-sm font-medium transition-colors ${currentView === 'streaks' ? 'text-[#FF2D8D]' : 'text-[#A7A7AD] hover:text-[#F4F4F5]'}`}>Streaks</button>
        <button onClick={() => navigateTo('settings')} className={`text-sm font-medium transition-colors ${currentView === 'settings' ? 'text-[#FF2D8D]' : 'text-[#A7A7AD] hover:text-[#F4F4F5]'}`}>Settings</button>
        {user.photoURL 
          ? <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.15)]"/>
          : <div className="w-8 h-8 rounded-full bg-[#FF2D8D] flex items-center justify-center text-xs text-white font-medium">{user.displayName?.[0]}</div>
        }
      </>
    ) : (
      <button
        onClick={() => signInWithGoogle()}
        className="border border-[rgba(255,255,255,0.15)] text-[#F4F4F5] hover:border-[#FF2D8D] hover:text-[#FF2D8D] rounded-full px-4 py-1.5 text-sm transition-colors"
      >
        Sign In
      </button>
    )}
  </div>
</nav>

      {/* Main content */}
      <main className="relative">
        {currentView === 'landing' && (
          <HeroSection 
            onStartLearning={handleStartLearning}
            onNavigateToDashboard={() => navigateTo('dashboard')}
          />
        )}
        
        {currentView === 'dashboard' && user && (
          <DashboardSection 
            onPlaylistSelect={handlePlaylistSelect}
          />
        )}
        
        {currentView === 'player' && selectedPlaylist && user && (
          <PlayerSection 
            playlist={selectedPlaylist}
            onBack={() => navigateTo('dashboard')}
            isFocusMode={isFocusMode}
            onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          />
        )}
        
        {currentView === 'streaks' && user && (
          <StreaksSection />
        )}
        
        {currentView === 'settings' && user && (
          <SettingsSection />
        )}
      </main>

      {/* Toast notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#121214',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#F4F4F5',
          },
        }}
      />
    </div>
  );
}

// Root App with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
