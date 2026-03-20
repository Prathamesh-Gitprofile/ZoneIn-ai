import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { X } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface FocusModeSectionProps {
  onExit: () => void;
  videoTitle?: string;
}

export function FocusModeSection({ onExit, videoTitle }: FocusModeSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
      
      gsap.fromTo(
        videoRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, delay: 0.1 }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="fixed inset-0 z-50 bg-[#0B0B0D] flex flex-col items-center justify-center"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <h2 className="text-sm text-[#A7A7AD] line-clamp-1 max-w-md">
          {videoTitle || 'Focus Mode'}
        </h2>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-full border border-[#FF2D8D] text-[#FF2D8D] text-sm font-medium hover:bg-[#FF2D8D] hover:text-white transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Exit Focus
        </button>
      </div>

      {/* Video container */}
      <div
        ref={videoRef}
        className="w-[86vw] h-[72vh] rounded-2xl overflow-hidden bg-[#121214]"
      >
        {/* This would be the actual video player in focus mode */}
        <div className="w-full h-full flex items-center justify-center text-[#A7A7AD]">
          <p>Focus mode active - Video player would be here</p>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-[#A7A7AD]/60">
        Press ESC to exit
      </div>
    </div>
  );
}
