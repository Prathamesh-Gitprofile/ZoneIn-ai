import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Brain, Target, Play, Sparkles, Link, Eye, Zap } from 'lucide-react';
import { toast } from 'sonner';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onStartLearning: () => void;
  onNavigateToDashboard: () => void;
}

export function HeroSection({ onStartLearning, onNavigateToDashboard }: HeroSectionProps) {
  const { user, signInWithGoogle } = useAuth();
  const [playlistUrl, setPlaylistUrl] = useState('');
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.fromTo(headlineRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
        .fromTo(subheadlineRef.current, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
        .fromTo(inputRef.current, { y: 18, scale: 0.985, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7 }, '-=0.3')
        .fromTo(featuresRef.current?.children || [], { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 }, '-=0.3');

      // Steps scroll animation
      if (stepsRef.current?.children) {
        gsap.fromTo(
          stepsRef.current.children,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.6, stagger: 0.15,
            scrollTrigger: {
              trigger: stepsRef.current,
              start: 'top 80%',
              end: 'top 50%',
              scrub: false,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully!');
    } catch (error) {
      toast.error('Failed to sign in');
    }
  };

  const handleStart = () => {
    if (playlistUrl.trim()) {
      localStorage.setItem('pendingPlaylistUrl', playlistUrl);
    }
    if (user) {
      onNavigateToDashboard();
    } else {
      onStartLearning();
    }
  };

  const features = [
    { icon: BookOpen, title: 'Distraction Free', description: 'Clean interface with no recommendations or comments' },
    { icon: Target, title: 'Track Progress', description: 'Visual progress bars and completion tracking' },
    { icon: Brain, title: 'AI Quizzes', description: 'Generate quizzes to test your understanding' },
  ];

  const steps = [
    {
      number: '01',
      icon: Link,
      title: 'Paste any YouTube playlist',
      description: 'Drop in a playlist URL — courses, tutorials, lectures. ZoneIn.ai fetches every video instantly.',
    },
    {
      number: '02',
      icon: Eye,
      title: 'Watch without distractions',
      description: 'No recommendations, no comments, no rabbit holes. Just you and the content. Use focus mode for zero UI.',
    },
    {
      number: '03',
      icon: Zap,
      title: 'Learn actively',
      description: 'Take timestamped notes, save resources, generate AI summaries and quizzes — all in one place.',
    },
  ];

  return (
    <section ref={sectionRef} className="flex flex-col items-center relative overflow-hidden px-4">

      {/* Background spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(255,45,141,0.08) 0%, rgba(0,0,0,0) 55%)' }}
      />

      {/* Hero — full viewport height */}
      <div className="min-h-screen flex flex-col items-center justify-center w-full">
        <div className="text-center max-w-3xl mx-auto z-10">
          <h1
            ref={headlineRef}
            className="text-5xl md:text-7xl font-semibold text-[#F4F4F5] mb-6 tracking-tight"
            style={{ letterSpacing: '-0.02em', lineHeight: 0.95 }}
          >
            Learn without the noise.
          </h1>

          <p
            ref={subheadlineRef}
            className="text-lg md:text-xl text-[#A7A7AD] mb-10 max-w-xl mx-auto"
            style={{ lineHeight: 1.55 }}
          >
            Paste a YouTube playlist. Watch distraction-free. Take notes, track progress, and quiz yourself.
          </p>

          {/* Input */}
          <div
            ref={inputRef}
            className="bg-[#121214] border border-[rgba(255,255,255,0.08)] rounded-full p-2 flex items-center gap-2 max-w-2xl mx-auto mb-6"
          >
            <Input
              type="text"
              placeholder="Paste YouTube playlist URL..."
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              className="flex-1 bg-transparent border-0 text-[#F4F4F5] placeholder:text-[#A7A7AD] focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
            />
            <Button
              onClick={handleStart}
              className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white rounded-full px-6 py-2 font-medium"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          </div>

          <p className="text-sm text-[#A7A7AD] mb-16">
            Free. No account required to try. • Works with public playlists
          </p>

          {/* Feature cards */}
          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="tunl-card tunl-card-hover p-6 text-left">
                <div className="w-10 h-10 rounded-xl bg-[#FF2D8D]/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-[#FF2D8D]" />
                </div>
                <h3 className="text-lg font-semibold text-[#F4F4F5] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#A7A7AD]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS — below the fold */}
      <div className="w-full max-w-4xl mx-auto pb-24 z-10">

        {/* Section label */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
          <span className="text-xs font-medium text-[#555] uppercase tracking-widest">How it works</span>
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
        </div>

        {/* Steps */}
        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-6 left-[calc(100%+0px)] w-full h-px z-0"
                  style={{ background: 'linear-gradient(to right, rgba(255,45,141,0.2), transparent)', width: '24px', right: '-24px', left: 'auto' }}
                />
              )}

              <div className="tunl-card p-6 h-full relative z-10">
                {/* Step number */}
                <div className="flex items-center gap-3 mb-5">
                  <span
                    className="text-xs font-mono font-medium"
                    style={{ color: '#FF2D8D', letterSpacing: '0.05em' }}
                  >
                    {step.number}
                  </span>
                  <div className="h-px flex-1 bg-[rgba(255,45,141,0.15)]" />
                  <div className="w-8 h-8 rounded-lg bg-[#FF2D8D]/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-4 h-4 text-[#FF2D8D]" />
                  </div>
                </div>

                <h3 className="text-base font-semibold text-[#F4F4F5] mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-sm text-[#A7A7AD] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tag */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[#A7A7AD]">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs">Built for focused learners</span>
      </div>

    </section>
  );
}