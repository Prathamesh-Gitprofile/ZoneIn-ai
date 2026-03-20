import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, BookOpen, Lightbulb, Target, AlertCircle, Check } from 'lucide-react';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { Video } from '@/types';

interface AISummary {
  id: string;
  videoId: string;
  uid: string;
  overview: string;
  bulletPoints: string[];
  keyTerms: { term: string; definition: string }[];
  takeaway: string;
  generatedAt: Date;
}

interface AISummaryPanelProps {
  video: Video;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

async function generateSummary(
  videoTitle: string
): Promise<Omit<AISummary, 'id' | 'videoId' | 'uid' | 'generatedAt'>> {
  const prompt = `You are an expert educational content summarizer. Based on this YouTube video title, generate a highly detailed and specific structured educational summary.

Video Title: "${videoTitle}"

Return ONLY a valid JSON object with exactly this structure (no markdown, no backticks, no explanation — raw JSON only):
{
  "overview": "2-3 sentence overview of what this video covers and teaches",
  "bulletPoints": [
    "Specific key point 1 about this topic",
    "Specific key point 2 about this topic",
    "Specific key point 3 about this topic",
    "Specific key point 4 about this topic",
    "Specific key point 5 about this topic"
  ],
  "keyTerms": [
    { "term": "Important term 1", "definition": "Clear one-line definition" },
    { "term": "Important term 2", "definition": "Clear one-line definition" },
    { "term": "Important term 3", "definition": "Clear one-line definition" }
  ],
  "takeaway": "The single most important concept or skill a viewer gains from this video"
}

Make all content highly specific to "${videoTitle}" — not generic filler. Bullet points must reflect real concepts from this topic.`;

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Gemini error:', JSON.stringify(errorData));
    throw new Error('Gemini API failed');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Parse error:', e, 'Raw:', text);
    throw new Error('Failed to parse response');
  }
}

export function AISummaryPanel({ video }: AISummaryPanelProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!db || !user) return;
      setSummary(null);
      setIsLoading(true);
      try {
        const q = query(
          collection(db, 'ai_summaries'),
          where('videoId', '==', video.id),
          where('uid', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setSummary({
            id: snapshot.docs[0].id,
            ...data,
            generatedAt: data.generatedAt?.toDate(),
          } as AISummary);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [video.id, user]);

  const handleGenerate = async (regenerate = false) => {
    if (!user || !db) return;
    if (!GEMINI_API_KEY) {
      toast.error('Gemini API key not set in .env file');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateSummary(video.title);

      if (regenerate && summary) {
        await updateDoc(doc(db, 'ai_summaries', summary.id), {
          ...result,
          generatedAt: Timestamp.now(),
        });
        setSummary({ ...summary, ...result, generatedAt: new Date() });
      } else {
        const newRef = doc(collection(db, 'ai_summaries'));
        const newSummary: AISummary = {
          id: newRef.id,
          videoId: video.id,
          uid: user.uid,
          ...result,
          generatedAt: new Date(),
        };
        await setDoc(newRef, { ...newSummary, generatedAt: Timestamp.now() });
        setSummary(newSummary);
      }

      toast.success('Summary generated!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate summary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[#A7A7AD] text-sm">Loading...</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF2D8D]/10 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-[#FF2D8D]" />
        </div>
        <h3 className="text-base font-semibold text-[#F4F4F5] mb-2">AI Summary</h3>
        <p className="text-sm text-[#A7A7AD] mb-6 max-w-xs">
          Gemini will generate a structured summary with key points, terms, and takeaways for this video.
        </p>
        <Button
          onClick={() => handleGenerate(false)}
          disabled={isGenerating}
          className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4" />Generate Summary</>
          )}
        </Button>
        {isGenerating && (
          <p className="text-xs text-[#555] mt-3 animate-pulse">
            This usually takes 5–10 seconds...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FF2D8D]" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">AI Summary</h3>
          <span className="text-xs text-[#555]">{summary.generatedAt?.toLocaleDateString()}</span>
        </div>
        <button
          onClick={() => handleGenerate(true)}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5] text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Overview */}
      <div className="bg-[#0B0B0D] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-[#FF2D8D]" />
          <span className="text-xs font-medium text-[#FF2D8D] uppercase tracking-wide">Overview</span>
        </div>
        <p className="text-sm text-[#D0D0D0] leading-relaxed">{summary.overview}</p>
      </div>

      {/* Key Points */}
      <div className="bg-[#0B0B0D] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-3.5 h-3.5 text-[#22c55e]" />
          <span className="text-xs font-medium text-[#22c55e] uppercase tracking-wide">Key Points</span>
        </div>
        <ul className="space-y-2">
          {summary.bulletPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#22c55e]/10 text-[#22c55e] text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                {i + 1}
              </span>
              <span className="text-sm text-[#C0C0C0] leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Terms */}
      {summary.keyTerms?.length > 0 && (
        <div className="bg-[#0B0B0D] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">Key Terms</span>
          </div>
          <div className="space-y-2.5">
            {summary.keyTerms.map((item, i) => (
              <div key={i} className="flex gap-2 flex-wrap">
                <span className="text-sm font-medium text-[#F4F4F5]">{item.term}</span>
                <span className="text-[#555]">—</span>
                <span className="text-sm text-[#A7A7AD]">{item.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Takeaway */}
      <div className="bg-[#FF2D8D]/08 border border-[#FF2D8D]/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-3.5 h-3.5 text-[#FF2D8D]" />
          <span className="text-xs font-medium text-[#FF2D8D] uppercase tracking-wide">Main Takeaway</span>
        </div>
        <p className="text-sm text-[#F4F4F5] leading-relaxed font-medium">{summary.takeaway}</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-1">
        <AlertCircle className="w-3.5 h-3.5 text-[#555] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#555]">
          Generated by Gemini 2.5 Flash based on video title. Always verify with the actual video.
        </p>
      </div>
    </div>
  );
}
