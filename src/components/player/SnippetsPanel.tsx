import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Copy, Trash2, Check, Code } from 'lucide-react';
import { getVideoSnippets, createSnippet, deleteSnippet } from '@/lib/firebase';
import { toast } from 'sonner';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import type { CodeSnippet, Video } from '@/types';

interface SnippetsPanelProps {
  video: Video;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
];

export function SnippetsPanel({ video }: SnippetsPanelProps) {
  const { user } = useAuth();
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetCode, setNewSnippetCode] = useState('');
  const [newSnippetLanguage, setNewSnippetLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const codeRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Fetch snippets
  useEffect(() => {
    const fetchSnippets = async () => {
      setIsLoading(true);
      try {
        const videoSnippets = await getVideoSnippets(video.id);
        setSnippets(videoSnippets);
      } catch (error) {
        console.error('Error fetching snippets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSnippets();
  }, [video.id]);

  // Highlight code when snippets change
  useEffect(() => {
    snippets.forEach((snippet) => {
      const element = codeRefs.current.get(snippet.id);
      if (element) {
        Prism.highlightElement(element);
      }
    });
  }, [snippets]);

  // Add snippet
  const handleAddSnippet = async () => {
    if (!user || !newSnippetCode.trim()) return;

    try {
      const snippetId = await createSnippet({
        videoId: video.id,
        uid: user.uid,
        language: newSnippetLanguage,
        title: newSnippetTitle.trim() || 'Untitled Snippet',
        code: newSnippetCode.trim(),
      });

      const newSnippet: CodeSnippet = {
        id: snippetId,
        videoId: video.id,
        uid: user.uid,
        language: newSnippetLanguage,
        title: newSnippetTitle.trim() || 'Untitled Snippet',
        code: newSnippetCode.trim(),
        createdAt: new Date(),
      };

      setSnippets([newSnippet, ...snippets]);
      setNewSnippetTitle('');
      setNewSnippetCode('');
      setNewSnippetLanguage('javascript');
      setIsAddingSnippet(false);
      toast.success('Snippet saved');
    } catch (error) {
      console.error('Error adding snippet:', error);
      toast.error('Failed to save snippet');
    }
  };

  // Delete snippet
  const handleDeleteSnippet = async (snippetId: string) => {
    try {
      await deleteSnippet(snippetId);
      setSnippets(snippets.filter(s => s.id !== snippetId));
      toast.success('Snippet deleted');
    } catch (error) {
      console.error('Error deleting snippet:', error);
      toast.error('Failed to delete snippet');
    }
  };

  // Copy to clipboard
  const handleCopy = async (snippet: CodeSnippet) => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopiedId(snippet.id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Get language label
  const getLanguageLabel = (value: string) => {
    return LANGUAGES.find(l => l.value === value)?.label || value;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[#A7A7AD]">Loading snippets...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F4F4F5]">Code Snippets</h3>
        <button
          onClick={() => setIsAddingSnippet(!isAddingSnippet)}
          className="p-2 rounded-lg bg-[#FF2D8D] text-white hover:bg-[#FF2D8D]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add snippet form */}
      {isAddingSnippet && (
        <div className="mb-4 p-3 bg-[#0B0B0D] rounded-xl space-y-3">
          <Input
            value={newSnippetTitle}
            onChange={(e) => setNewSnippetTitle(e.target.value)}
            placeholder="Snippet title..."
            className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD] text-sm"
          />
          
          <Select value={newSnippetLanguage} onValueChange={setNewSnippetLanguage}>
            <SelectTrigger className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] text-sm">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="bg-[#121214] border-[rgba(255,255,255,0.08)]">
              {LANGUAGES.map((lang) => (
                <SelectItem 
                  key={lang.value} 
                  value={lang.value}
                  className="text-[#F4F4F5] focus:bg-[#1a1a1c] focus:text-[#F4F4F5]"
                >
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Textarea
            value={newSnippetCode}
            onChange={(e) => setNewSnippetCode(e.target.value)}
            placeholder="Paste your code here..."
            className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD] text-sm min-h-[120px] font-mono"
          />
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingSnippet(false);
                setNewSnippetTitle('');
                setNewSnippetCode('');
              }}
              className="border-[rgba(255,255,255,0.15)] text-[#A7A7AD]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddSnippet}
              disabled={!newSnippetCode.trim()}
              className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white"
            >
              Save Snippet
            </Button>
          </div>
        </div>
      )}

      {/* Snippets list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
        {snippets.length === 0 ? (
          <div className="text-center py-8">
            <Code className="w-8 h-8 text-[#A7A7AD] mx-auto mb-2" />
            <p className="text-[#A7A7AD] text-sm mb-2">No snippets yet</p>
            <p className="text-[#A7A7AD]/60 text-xs">Save code examples from the video</p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="bg-[#0B0B0D] rounded-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1c]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#FF2D8D]">
                    {getLanguageLabel(snippet.language)}
                  </span>
                  <span className="text-sm text-[#F4F4F5] truncate max-w-[150px]">
                    {snippet.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(snippet)}
                    className="p-1.5 rounded-lg hover:bg-[#252528] text-[#A7A7AD] hover:text-[#F4F4F5] transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedId === snippet.id ? (
                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="p-1.5 rounded-lg hover:bg-[#252528] text-[#A7A7AD] hover:text-[#ef4444] transition-colors"
                    title="Delete snippet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Code */}
              <div className="p-3 overflow-x-auto">
                <pre className="m-0">
                  <code
                    ref={(el) => {
                      if (el) codeRefs.current.set(snippet.id, el);
                    }}
                    className={`language-${snippet.language}`}
                  >
                    {snippet.code}
                  </code>
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
