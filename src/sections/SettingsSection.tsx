import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  User, 
  Play, 
  Moon, 
  Bell, 
  Trash2, 
  LogOut,
  Camera,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

gsap.registerPlugin(ScrollTrigger);

export function SettingsSection() {
  const { user, logout, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [playbackSpeed, setPlaybackSpeed] = useState(user?.defaultPlaybackSpeed?.toString() || '1');
  const [notifications, setNotifications] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 1,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Save profile
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        displayName: displayName.trim(),
        defaultPlaybackSpeed: parseFloat(playbackSpeed),
      });
      toast.success('Profile updated');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  // Handle delete account (placeholder)
  const handleDeleteAccount = () => {
    toast.info('Account deletion is not implemented in this demo');
  };

  return (
    <section ref={sectionRef} className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-4xl font-semibold text-[#F4F4F5] mb-8">Settings</h2>

        <div ref={cardRef} className="space-y-6">
          {/* Profile Section */}
          <div className="bg-[#121214] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-[#FF2D8D]" />
              <h3 className="text-lg font-semibold text-[#F4F4F5]">Profile</h3>
            </div>

            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-20 h-20 rounded-full border-2 border-[rgba(255,255,255,0.08)]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1a1a1c] flex items-center justify-center border-2 border-[rgba(255,255,255,0.08)]">
                      <User className="w-8 h-8 text-[#A7A7AD]" />
                    </div>
                  )}
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FF2D8D] flex items-center justify-center hover:bg-[#FF2D8D]/90 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-sm text-[#A7A7AD]">Profile Picture</p>
                  <p className="text-xs text-[#A7A7AD]/60">Click to change</p>
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm text-[#A7A7AD]">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD]"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-[#A7A7AD]">
                  Email
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] text-[#A7A7AD] cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Playback Settings */}
          <div className="bg-[#121214] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Play className="w-5 h-5 text-[#FF2D8D]" />
              <h3 className="text-lg font-semibold text-[#F4F4F5]">Playback</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playbackSpeed" className="text-sm text-[#A7A7AD]">
                  Default Playback Speed
                </Label>
                <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] text-[#F4F4F5]">
                    <SelectValue placeholder="Select speed" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121214] border-[rgba(255,255,255,0.08)]">
                    <SelectItem value="0.5" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">0.5x</SelectItem>
                    <SelectItem value="0.75" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">0.75x</SelectItem>
                    <SelectItem value="1" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">1x (Normal)</SelectItem>
                    <SelectItem value="1.25" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">1.25x</SelectItem>
                    <SelectItem value="1.5" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">1.5x</SelectItem>
                    <SelectItem value="2" className="text-[#F4F4F5] focus:bg-[#1a1a1c]">2x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-[#121214] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-5 h-5 text-[#FF2D8D]" />
              <h3 className="text-lg font-semibold text-[#F4F4F5]">Theme</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#F4F4F5]">Dark Mode</p>
                <p className="text-xs text-[#A7A7AD]">Currently only dark mode is available</p>
              </div>
              <Switch checked={true} disabled className="data-[state=checked]:bg-[#FF2D8D]" />
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#121214] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-[#FF2D8D]" />
              <h3 className="text-lg font-semibold text-[#F4F4F5]">Notifications</h3>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#F4F4F5]">Enable Notifications</p>
                <p className="text-xs text-[#A7A7AD]">Get reminders to maintain your streak</p>
              </div>
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
                className="data-[state=checked]:bg-[#FF2D8D]" 
              />
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white rounded-xl py-3"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-[rgba(255,255,255,0.15)] text-[#A7A7AD] hover:text-[#F4F4F5] rounded-xl py-3"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>

          {/* Danger Zone */}
          <div className="bg-[#121214] rounded-2xl p-6 border border-[#ef4444]/20">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-5 h-5 text-[#ef4444]" />
              <h3 className="text-lg font-semibold text-[#ef4444]">Danger Zone</h3>
            </div>

            <p className="text-sm text-[#A7A7AD] mb-4">
              Once you delete your account, there is no going back. All your data will be permanently removed.
            </p>

            <Button
              onClick={handleDeleteAccount}
              variant="outline"
              className="border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 pb-4">
            <p className="text-xs text-[#A7A7AD]/60">
              © 2026 TunL • Built for focused learners
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
