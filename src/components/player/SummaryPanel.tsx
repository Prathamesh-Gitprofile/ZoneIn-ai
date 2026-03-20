import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import { getVideoSummary, createOrUpdateSummary } from '@/lib/firebase';
import { useDebounce } from '@/hooks/useDebounce';
import { FileText, Edit3, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Video } from '@/types';

interface SummaryPanelProps {
  video: Video;
}

export function SummaryPanel({ video }: SummaryPanelProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const debouncedSummary = useDebounce(summary, 800);

  // Fetch existing summary
  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const existingSummary = await getVideoSummary(video.id, user.uid);
        if (existingSummary) {
          setSummary(existingSummary.text);
        }
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [video.id, user]);

  // Auto-save on debounce
  useEffect(() => {
    const saveSummary = async () => {
      if (!user || !hasChanges) return;

      setIsSaving(true);
      try {
        await createOrUpdateSummary(video.id, user.uid, debouncedSummary);
        setHasChanges(false);
      } catch (error) {
        console.error('Error saving summary:', error);
        toast.error('Failed to save summary');
      } finally {
        setIsSaving(false);
      }
    };

    saveSummary();
  }, [debouncedSummary, user, video.id, hasChanges]);

  const handleChange = (value: string) => {
    setSummary(value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[#A7A7AD]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#FF2D8D]" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">What I Learned</h3>
        </div>
        <div className="flex items-center gap-2">
          {isSaving ? (
            <span className="text-xs text-[#A7A7AD]">Saving...</span>
          ) : hasChanges ? (
            <span className="text-xs text-[#A7A7AD]">Unsaved changes</span>
          ) : summary ? (
            <span className="flex items-center gap-1 text-xs text-[#22c55e]">
              <Check className="w-3 h-3" />
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-[#0B0B0D] rounded-xl p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Edit3 className="w-4 h-4 text-[#A7A7AD]" />
            <span className="text-sm text-[#A7A7AD]">Write a brief summary of what you learned (2-3 lines)</span>
          </div>
          
          <Textarea
            value={summary}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="After watching this video, I learned..."
            className="flex-1 bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD] resize-none min-h-[150px]"
          />
          
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[#A7A7AD]">
              {summary.length} characters
            </span>
            <span className="text-xs text-[#A7A7AD]/60">
              Auto-saves as you type
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 p-3 bg-[#1a1a1c] rounded-xl">
          <h4 className="text-xs font-medium text-[#F4F4F5] mb-2">Tips for effective summaries:</h4>
          <ul className="text-xs text-[#A7A7AD] space-y-1">
            <li>• Focus on key concepts and takeaways</li>
            <li>• Use your own words to reinforce understanding</li>
            <li>• Include any "aha!" moments or insights</li>
            <li>• Note anything you want to explore further</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
