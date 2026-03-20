import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ExternalLink, Link, BookOpen, Youtube, FileText, Globe } from 'lucide-react';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import type { Video } from '@/types';

interface Resource {
  id: string;
  videoId: string;
  uid: string;
  title: string;
  url: string;
  type: 'article' | 'video' | 'docs' | 'other';
  createdAt: Date;
}

interface ResourcesPanelProps {
  video: Video;
}

function detectType(url: string): Resource['type'] {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
  if (url.includes('docs.') || url.includes('/docs') || url.includes('documentation')) return 'docs';
  if (url.includes('medium.com') || url.includes('dev.to') || url.includes('hashnode') || url.includes('blog')) return 'article';
  return 'other';
}

function getTypeIcon(type: Resource['type']) {
  switch (type) {
    case 'video': return <Youtube className="w-3.5 h-3.5" />;
    case 'docs': return <FileText className="w-3.5 h-3.5" />;
    case 'article': return <BookOpen className="w-3.5 h-3.5" />;
    default: return <Globe className="w-3.5 h-3.5" />;
  }
}

function getTypeColor(type: Resource['type']) {
  switch (type) {
    case 'video': return 'text-red-400 bg-red-400/10';
    case 'docs': return 'text-blue-400 bg-blue-400/10';
    case 'article': return 'text-amber-400 bg-amber-400/10';
    default: return 'text-[#A7A7AD] bg-[#1a1a1c]';
  }
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function ResourcesPanel({ video }: ResourcesPanelProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      if (!db || !user) return;
      setIsLoading(true);
      try {
        const resourcesRef = collection(db, 'resources');
        const q = query(
          resourcesRef,
          where('videoId', '==', video.id),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })) as Resource[];
        setResources(data);
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [video.id, user]);

  const handleAdd = async () => {
    if (!user || !newUrl.trim()) return;

    // basic URL validation
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsSaving(true);
    try {
      if (!db) throw new Error('Firebase not configured');
      const resourcesRef = collection(db, 'resources');
      const newRef = doc(resourcesRef);
      const resource: Omit<Resource, 'id'> = {
        videoId: video.id,
        uid: user.uid,
        title: newTitle.trim() || getDomain(url),
        url,
        type: detectType(url),
        createdAt: new Date(),
      };

      await setDoc(newRef, {
        ...resource,
        createdAt: Timestamp.now(),
      });

      setResources([{ id: newRef.id, ...resource }, ...resources]);
      setNewTitle('');
      setNewUrl('');
      setIsAdding(false);
      toast.success('Resource saved');
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'resources', id));
      setResources(resources.filter(r => r.id !== id));
      toast.success('Resource removed');
    } catch (error) {
      toast.error('Failed to remove resource');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[#A7A7AD] text-sm">Loading resources...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F4F4F5]">Resources</h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 rounded-lg bg-[#FF2D8D] text-white hover:bg-[#FF2D8D]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add form */}
      {isAdding && (
        <div className="p-3 bg-[#0B0B0D] rounded-xl space-y-2.5">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Paste URL (article, docs, video...)"
            className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#555] text-sm"
            autoFocus
          />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Title (optional — auto-detected)"
            className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#555] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsAdding(false); setNewUrl(''); setNewTitle(''); }}
              className="border-[rgba(255,255,255,0.15)] text-[#A7A7AD] hover:text-[#F4F4F5]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!newUrl.trim() || isSaving}
              className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Resources list */}
      {resources.length === 0 ? (
        <div className="text-center py-10">
          <Link className="w-8 h-8 text-[#333] mx-auto mb-3" />
          <p className="text-[#A7A7AD] text-sm mb-1">No resources yet</p>
          <p className="text-[#555] text-xs">Save articles, docs, and links related to this video</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="group flex items-center gap-3 p-3 bg-[#0B0B0D] rounded-xl hover:bg-[#111] transition-colors"
            >
              {/* Type icon */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(resource.type)}`}>
                {getTypeIcon(resource.type)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F4F4F5] truncate font-medium">{resource.title}</p>
                <p className="text-xs text-[#555] truncate mt-0.5">{getDomain(resource.url)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5] transition-colors"
                  title="Open link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="p-1.5 rounded-lg hover:bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#ef4444] transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
