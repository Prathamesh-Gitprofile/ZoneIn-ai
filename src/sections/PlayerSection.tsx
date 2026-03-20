import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft, Focus, SkipBack, SkipForward, CheckCircle, Flag, PanelLeft, X,
} from 'lucide-react';
import { getPlaylistVideos, updateVideo, updatePlaylist, logActivity } from '@/lib/firebase';
import { NotesPanel } from '@/components/player/NotesPanel';
import { ResourcesPanel } from '@/components/player/ResourcesPanel';
import { AISummaryPanel } from '@/components/player/AISummaryPanel';
import { QuizPanel } from '@/components/player/QuizPanel';
import { toast } from 'sonner';
import { useStreak } from '@/hooks/useStreak';
import type { Playlist, Video } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface PlayerSectionProps {
  playlist: Playlist;
  onBack: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export function PlayerSection({ playlist, onBack, isFocusMode, onToggleFocusMode }: PlayerSectionProps) {
  const { user } = useAuth();
  const { updateStreak } = useStreak();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // ESC to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) onToggleFocusMode();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, onToggleFocusMode]);

  // Poll YouTube iframe for current timestamp every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current?.contentWindow) {
        playerRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }), '*'
        );
        playerRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }), '*'
        );
      }
    }, 1000);

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.info?.currentTime !== undefined) {
          setCurrentTime(data.info.currentTime);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [currentVideo]);

  // Fetch videos
  useEffect(() => {
    if (!user) return;
    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const playlistVideos = await getPlaylistVideos(playlist.id);
        setVideos(playlistVideos);
        const uncompletedVideo = playlistVideos.find(v => !v.isCompleted);
        const videoToPlay = uncompletedVideo || playlistVideos[0];
        if (videoToPlay) setCurrentVideo(videoToPlay);
      } catch (error) {
        console.error('Error fetching videos:', error);
        toast.error('Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };
    fetchVideos();
  }, [playlist.id, user]);

  const handleMarkComplete = async () => {
    if (!currentVideo) return;
    try {
      const newStatus = !currentVideo.isCompleted;
      await updateVideo(currentVideo.id, { isCompleted: newStatus, watchedAt: newStatus ? new Date() : null });
      setVideos(videos.map(v => v.id === currentVideo.id ? { ...v, isCompleted: newStatus } : v));
      setCurrentVideo({ ...currentVideo, isCompleted: newStatus });
      const completedCount = videos.filter(v => v.id === currentVideo.id ? newStatus : v.isCompleted).length;
      await updatePlaylist(playlist.id, { completedVideos: completedCount, lastWatchedAt: new Date() });
      if (newStatus) {
        await logActivity(user!.uid, 1, Math.floor(currentVideo.durationSeconds / 60));
        await updateStreak();
      }
      toast.success(newStatus ? 'Marked as complete!' : 'Marked as incomplete');
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video status');
    }
  };

  const handleRewatchFlag = async () => {
    if (!currentVideo) return;
    try {
      const newFlag = !currentVideo.isRewatchFlagged;
      await updateVideo(currentVideo.id, { isRewatchFlagged: newFlag });
      setVideos(videos.map(v => v.id === currentVideo.id ? { ...v, isRewatchFlagged: newFlag } : v));
      setCurrentVideo({ ...currentVideo, isRewatchFlagged: newFlag });
      toast.success(newFlag ? 'Flagged for rewatch' : 'Removed rewatch flag');
    } catch (error) {
      console.error('Error flagging video:', error);
      toast.error('Failed to update flag');
    }
  };

  const handleSpeedChange = async (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerRef.current?.contentWindow) {
      playerRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [speed] }), '*'
      );
    }
    try {
      await updatePlaylist(playlist.id, { playbackSpeed: speed });
    } catch (error) {
      console.error('Error updating speed:', error);
    }
  };

 const navigateToVideo = (video: Video) => {
  setCurrentVideo(video);
  setCurrentTime(0);
  setPlaybackSpeed(1);
  };

  const handlePrev = () => {
    const idx = videos.findIndex(v => v.id === currentVideo?.id);
    if (idx > 0) navigateToVideo(videos[idx - 1]);
  };

  const handleNext = () => {
    const idx = videos.findIndex(v => v.id === currentVideo?.id);
    if (idx < videos.length - 1) navigateToVideo(videos[idx + 1]);
  };

  const currentIndex = videos.findIndex(v => v.id === currentVideo?.id);
  const progressText = `${currentIndex + 1} / ${videos.length} videos`;

  const getEstimatedTimeRemaining = () => {
    const remainingVideos = videos.slice(currentIndex + 1);
    const totalSeconds = remainingVideos.reduce((acc, v) => acc + v.durationSeconds, 0);
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}m remaining`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m remaining`;
  };

  if (isLoading) {
    return (
      <section className="min-h-screen pt-20 flex items-center justify-center">
        <div className="animate-pulse">
          <span className="text-lg text-[#A7A7AD]">Loading playlist...</span>
        </div>
      </section>
    );
  }

  if (!currentVideo) {
    return (
      <section className="min-h-screen pt-20 flex flex-col items-center justify-center">
        <p className="text-[#A7A7AD] mb-4">No videos found in this playlist</p>
        <Button onClick={onBack} variant="outline">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="min-h-screen pt-16 pb-8 px-4">

      {/* FOCUS MODE OVERLAY */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 bg-[#0B0B0D] flex flex-col items-center justify-center">
          <p className="absolute top-5 left-5 text-sm text-[#A7A7AD] max-w-lg truncate">{currentVideo.title}</p>
          <div className="absolute top-4 right-4">
            <button
              onClick={onToggleFocusMode}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#FF2D8D] text-[#FF2D8D] text-sm font-medium hover:bg-[#FF2D8D] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Exit Focus
            </button>
          </div>
          <div className="w-[88vw] h-[80vh] rounded-2xl overflow-hidden bg-[#121214]">
            <iframe
              src={`https://www.youtube.com/embed/${currentVideo.youtubeVideoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&enablejsapi=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentVideo.title}
            />
          </div>
          <p className="absolute bottom-5 text-xs text-[#555]">Press ESC to exit focus mode</p>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-[#121214] flex items-center justify-center hover:bg-[#1a1a1c] transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#F4F4F5]" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#F4F4F5] line-clamp-1">{playlist.title}</h2>
            <p className="text-sm text-[#A7A7AD]">{progressText}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="tunl-pill text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FF2D8D] mr-2" />
            {getEstimatedTimeRemaining()}
          </span>
          <button
            onClick={onToggleFocusMode}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFocusMode ? 'bg-[#FF2D8D] text-white' : 'bg-[#121214] text-[#A7A7AD] hover:text-[#F4F4F5]'}`}
            title="Focus mode"
          >
            <Focus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex gap-4 items-start">

        {/* LEFT */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${showSidebar ? 'flex-1 min-w-0' : 'w-full'}`}>

          {/* Video */}
          <div className="bg-[#121214] rounded-2xl overflow-hidden" style={{ height: '480px' }}>
            <iframe
              ref={playerRef}
              src={`https://www.youtube.com/embed/${currentVideo.youtubeVideoId}?autoplay=0&modestbranding=1&rel=0&showinfo=0&controls=1&enablejsapi=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentVideo.title}
            />
          </div>

          {/* Controls */}
          <div className="bg-[#121214] rounded-2xl p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[#F4F4F5] mb-0.5 line-clamp-1">{currentVideo.title}</h3>
                <p className="text-sm text-[#A7A7AD]">{currentVideo.duration}</p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={handleRewatchFlag}
                  className={`p-2 rounded-lg transition-colors ${currentVideo.isRewatchFlagged ? 'bg-[#FF2D8D]/20 text-[#FF2D8D]' : 'bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5]'}`}
                  title="Flag for rewatch"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={handleMarkComplete}
                  className={`p-2 rounded-lg transition-colors ${currentVideo.isCompleted ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5]'}`}
                  title="Mark as complete"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="p-2 rounded-lg bg-[#1a1a1c] text-[#F4F4F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#252528] transition-colors">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={handleNext} disabled={currentIndex === videos.length - 1} className="p-2 rounded-lg bg-[#1a1a1c] text-[#F4F4F5] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#252528] transition-colors">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#A7A7AD] mr-1">Speed:</span>
                {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${playbackSpeed === speed ? 'bg-[#FF2D8D] text-white' : 'bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5]'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 rounded-lg bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5] transition-colors" title="Toggle playlist">
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-[#121214] rounded-2xl p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#0B0B0D] p-1 rounded-xl w-full mb-4">
                <TabsTrigger value="notes" className="flex-1 data-[state=active]:bg-[#1a1a1c] data-[state=active]:text-[#FF2D8D] text-[#A7A7AD] rounded-lg text-sm py-2">Notes</TabsTrigger>
                <TabsTrigger value="resources" className="flex-1 data-[state=active]:bg-[#1a1a1c] data-[state=active]:text-[#FF2D8D] text-[#A7A7AD] rounded-lg text-sm py-2">Resources</TabsTrigger>
                <TabsTrigger value="summary" className="flex-1 data-[state=active]:bg-[#1a1a1c] data-[state=active]:text-[#FF2D8D] text-[#A7A7AD] rounded-lg text-sm py-2">AI Summary</TabsTrigger>
                <TabsTrigger value="quiz" className="flex-1 data-[state=active]:bg-[#1a1a1c] data-[state=active]:text-[#FF2D8D] text-[#A7A7AD] rounded-lg text-sm py-2">Quiz</TabsTrigger>
              </TabsList>
              <div className="min-h-[320px]">
                <TabsContent value="notes" className="m-0">
                  <NotesPanel video={currentVideo} currentTime={currentTime} onSeek={(time) => setCurrentTime(time)} />
                </TabsContent>
                <TabsContent value="resources" className="m-0">
                  <ResourcesPanel video={currentVideo} />
                </TabsContent>
                <TabsContent value="summary" className="m-0">
                  <AISummaryPanel video={currentVideo} />
                </TabsContent>
                <TabsContent value="quiz" className="m-0">
                  <QuizPanel video={currentVideo} />
                </TabsContent>
              </div>
            </Tabs>
          </div>

        </div>

        {/* RIGHT — playlist */}
        {showSidebar && (
          <div className="w-[340px] flex-shrink-0 sticky top-20">
            <div className="bg-[#121214] rounded-2xl p-4" style={{ height: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <h4 className="text-sm font-semibold text-[#F4F4F5] mb-3 sticky top-0 bg-[#121214] pb-2">Playlist</h4>
              <div className="space-y-1">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => navigateToVideo(video)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                      video.id === currentVideo.id ? 'bg-[#FF2D8D]/20 border border-[#FF2D8D]/30' : 'hover:bg-[#1a1a1c]'
                    }`}
                  >
                    <span className={`text-xs w-5 text-center flex-shrink-0 ${video.id === currentVideo.id ? 'text-[#FF2D8D]' : 'text-[#A7A7AD]'}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${video.id === currentVideo.id ? 'text-[#F4F4F5] font-medium' : 'text-[#A7A7AD]'}`}>
                        {video.title}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5">{video.duration}</p>
                    </div>
                    {video.isCompleted && <CheckCircle className="w-3.5 h-3.5 text-[#22c55e] flex-shrink-0" />}
                    {video.isRewatchFlagged && <Flag className="w-3.5 h-3.5 text-[#FF2D8D] flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}