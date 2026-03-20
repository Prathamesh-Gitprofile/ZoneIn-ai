import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, MoreVertical, Play, Trash2, Edit2, CheckCircle, Calendar } from 'lucide-react';
import { getUserPlaylists, deletePlaylist, updatePlaylist, createPlaylist, createVideos } from '@/lib/firebase';
import { extractPlaylistId, getPlaylistWithVideos, parseDuration } from '@/lib/youtube';
import { toast } from 'sonner';
import type { Playlist } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface DashboardSectionProps {
  onPlaylistSelect: (playlist: Playlist) => void;
}

export function DashboardSection({ onPlaylistSelect }: DashboardSectionProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Fetch playlists
  useEffect(() => {
    if (!user) return;

    const fetchPlaylists = async () => {
      setIsLoading(true);
      try {
        const userPlaylists = await getUserPlaylists(user.uid);
        setPlaylists(userPlaylists);
      } catch (error) {
        console.error('Error fetching playlists:', error);
        toast.error('Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [user]);

  // Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            end: 'top 55%',
            scrub: 1,
          },
        }
      );

      // Grid cards animation
      const cards = gridRef.current?.children;
      if (cards) {
        gsap.fromTo(
          cards,
          { y: 60, scale: 0.97, opacity: 0 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 85%',
              end: 'top 55%',
              scrub: 1,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [playlists]);

  // Filter playlists
  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add playlist
  const handleAddPlaylist = async () => {
    if (!user || !newPlaylistUrl.trim()) return;

    setIsAddingPlaylist(true);
    try {
      const playlistId = extractPlaylistId(newPlaylistUrl);
      if (!playlistId) {
        toast.error('Invalid YouTube playlist URL');
        return;
      }

      // Check if playlist already exists
      const existingPlaylist = playlists.find((p) => p.youtubePlaylistId === playlistId);
      if (existingPlaylist) {
        toast.error('Playlist already added');
        return;
      }

      // Fetch playlist data from YouTube
      const { playlist, items } = await getPlaylistWithVideos(playlistId);

      // Create playlist in Firestore
      const newPlaylistId = await createPlaylist(user.uid, {
        youtubePlaylistId: playlistId,
        title: playlist.snippet.title,
        thumbnail: playlist.snippet.thumbnails?.medium?.url || playlist.snippet.thumbnails?.default?.url || '',
        totalVideos: playlist.contentDetails.itemCount,
        completedVideos: 0,
        lastWatchedAt: null,
        playbackSpeed: user.defaultPlaybackSpeed || 1,
      });

      // Create videos in Firestore
      const videosData = items.map((item, index) => {
        const duration = parseDuration(item.contentDetails?.duration || 'PT0S');
        return {
          playlistId: newPlaylistId,
          youtubeVideoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
          duration: duration.formatted,
          durationSeconds: duration.seconds,
          isCompleted: false,
          isRewatchFlagged: false,
          tags: [],
          watchedAt: null,
          position: index,
        };
      });

      await createVideos(videosData);

      // Refresh playlists
      const updatedPlaylists = await getUserPlaylists(user.uid);
      setPlaylists(updatedPlaylists);

      toast.success('Playlist added successfully!');
      setIsAddModalOpen(false);
      setNewPlaylistUrl('');
    } catch (error) {
      console.error('Error adding playlist:', error);
      toast.error('Failed to add playlist');
    } finally {
      setIsAddingPlaylist(false);
    }
  };

  // Delete playlist
  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await deletePlaylist(playlistId);
      setPlaylists(playlists.filter((p) => p.id !== playlistId));
      toast.success('Playlist deleted');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  // Rename playlist
  const handleRenamePlaylist = async (playlistId: string, newTitle: string) => {
    try {
      await updatePlaylist(playlistId, { title: newTitle });
      setPlaylists(
        playlists.map((p) => (p.id === playlistId ? { ...p, title: newTitle } : p))
      );
      toast.success('Playlist renamed');
    } catch (error) {
      console.error('Error renaming playlist:', error);
      toast.error('Failed to rename playlist');
    }
  };

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  // Calculate progress percentage
  const getProgress = (playlist: Playlist) => {
    if (playlist.totalVideos === 0) return 0;
    return Math.round((playlist.completedVideos / playlist.totalVideos) * 100);
  };

  return (
    <section ref={sectionRef} className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      {/* Header */}
      <div ref={headerRef} className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-4xl font-semibold text-[#F4F4F5]">My Playlists</h2>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A7A7AD]" />
              <Input
                type="text"
                placeholder="Search playlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#121214] border-[rgba(255,255,255,0.08)] rounded-full text-[#F4F4F5] placeholder:text-[#A7A7AD] w-64"
              />
            </div>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Playlist
            </Button>
          </div>
        </div>
      </div>

      {/* Playlists Grid */}
      <div ref={gridRef} className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Skeleton loaders
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tunl-card p-4 animate-pulse">
              <div className="aspect-video bg-[#1a1a1c] rounded-xl mb-4" />
              <div className="h-5 bg-[#1a1a1c] rounded mb-2" />
              <div className="h-4 bg-[#1a1a1c] rounded w-2/3" />
            </div>
          ))
        ) : filteredPlaylists.length === 0 ? (
          // Empty state
          <div className="col-span-full flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-[#121214] flex items-center justify-center mb-6">
              <Play className="w-8 h-8 text-[#A7A7AD]" />
            </div>
            <h3 className="text-xl font-semibold text-[#F4F4F5] mb-2">
              {searchQuery ? 'No playlists found' : 'No playlists yet'}
            </h3>
            <p className="text-[#A7A7AD] mb-6 text-center max-w-md">
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first playlist to get started with distraction-free learning'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Playlist
              </Button>
            )}
          </div>
        ) : (
          // Playlist cards
          filteredPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              className="tunl-card tunl-card-hover overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={playlist.thumbnail || '/placeholder-playlist.jpg'}
                  alt={playlist.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-transparent" />
                
                {/* Progress overlay */}
                <div className="absolute top-3 right-3">
                  <span className="tunl-pill text-xs bg-[#0B0B0D]/80">
                    {playlist.completedVideos}/{playlist.totalVideos}
                  </span>
                </div>

                {/* Menu */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-8 h-8 rounded-full bg-[#0B0B0D]/80 flex items-center justify-center hover:bg-[#0B0B0D]">
                        <MoreVertical className="w-4 h-4 text-[#F4F4F5]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#121214] border-[rgba(255,255,255,0.08)]">
                      <DropdownMenuItem
                        onClick={() => {
                          const newTitle = prompt('Enter new name:', playlist.title);
                          if (newTitle && newTitle !== playlist.title) {
                            handleRenamePlaylist(playlist.id, newTitle);
                          }
                        }}
                        className="text-[#F4F4F5] hover:bg-[#1a1a1c] cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeletePlaylist(playlist.id)}
                        className="text-[#ef4444] hover:bg-[#1a1a1c] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ">
                  <button
                    onClick={() => onPlaylistSelect(playlist)}
                    className="w-14 h-14 rounded-full bg-[#FF2D8D] flex items-center justify-center hover:scale-110 transition-transform pointer-events-auto"
                  >
                    <Play className="w-6 h-6 text-white ml-1" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-[#F4F4F5] mb-2 line-clamp-2" title={playlist.title}>
                  {playlist.title}
                </h3>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-1.5 bg-[#1a1a1c] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF2D8D] rounded-full transition-all duration-300"
                      style={{ width: `${getProgress(playlist)}%` }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex items-center justify-between text-xs text-[#A7A7AD]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {getProgress(playlist)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(playlist.lastWatchedAt)}
                    </span>
                  </div>
                </div>

                {/* Continue button */}
                <button
                  onClick={() => onPlaylistSelect(playlist)}
                  className="w-full mt-4 py-2.5 bg-[#1a1a1c] hover:bg-[#FF2D8D] text-[#F4F4F5] hover:text-white rounded-xl font-medium transition-colors"
                >
                  {playlist.completedVideos > 0 ? 'Continue' : 'Start'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Playlist Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Add Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm text-[#A7A7AD] mb-2 block">YouTube Playlist URL</label>
              <Input
                type="text"
                placeholder="https://youtube.com/playlist?list=..."
                value={newPlaylistUrl}
                onChange={(e) => setNewPlaylistUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlaylist()}
                className="bg-[#0B0B0D] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD]"
              />
            </div>
            <Button
              onClick={handleAddPlaylist}
              disabled={isAddingPlaylist || !newPlaylistUrl.trim()}
              className="w-full bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white"
            >
              {isAddingPlaylist ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Playlist
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
