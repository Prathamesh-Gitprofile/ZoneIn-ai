import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, Edit2, Trash2, Download } from 'lucide-react';
import { getVideoNotes, createNote, updateNote, deleteNote } from '@/lib/firebase';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';
import type { Note, Video } from '@/types';

interface NotesPanelProps {
  video: Video;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function NotesPanel({ video, currentTime, onSeek }: NotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const videoNotes = await getVideoNotes(video.id);
        setNotes(videoNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [video.id]);

  // Add note
  const handleAddNote = async () => {
    if (!user || !newNoteText.trim()) return;

    try {
      const noteId = await createNote({
        videoId: video.id,
        uid: user.uid,
        timestamp: currentTime,
        text: newNoteText.trim(),
      });

      const newNote: Note = {
        id: noteId,
        videoId: video.id,
        uid: user.uid,
        timestamp: currentTime,
        text: newNoteText.trim(),
        createdAt: new Date(),
      };

      setNotes([...notes, newNote]);
      setNewNoteText('');
      setIsAddingNote(false);
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  // Update note with debounce
  const debouncedEditText = useDebounce(editText, 800);

  useEffect(() => {
    const saveEdit = async () => {
      if (!editingNoteId || !debouncedEditText.trim()) return;

      setSavingNoteId(editingNoteId);
      try {
        await updateNote(editingNoteId, debouncedEditText.trim());
        setNotes(notes.map(n => 
          n.id === editingNoteId ? { ...n, text: debouncedEditText.trim() } : n
        ));
      } catch (error) {
        console.error('Error updating note:', error);
      } finally {
        setSavingNoteId(null);
      }
    };

    saveEdit();
  }, [debouncedEditText, editingNoteId]);

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  // Format timestamp
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Export notes as markdown
  const handleExport = () => {
    const markdown = `# Notes: ${video.title}\n\n${notes
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(note => `## [${formatTimestamp(note.timestamp)}](https://youtube.com/watch?v=${video.youtubeVideoId}&t=${Math.floor(note.timestamp)})\n\n${note.text}\n`)
      .join('\n---\n\n')}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${video.title.slice(0, 30).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Notes exported');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[#A7A7AD]">Loading notes...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#F4F4F5]">Notes</h3>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5] transition-colors"
              title="Export as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="p-2 rounded-lg bg-[#FF2D8D] text-white hover:bg-[#FF2D8D]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add note form */}
      {isAddingNote && (
        <div className="mb-4 p-3 bg-[#0B0B0D] rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3 h-3 text-[#FF2D8D]" />
            <span className="text-xs text-[#FF2D8D] font-medium">
              At {formatTimestamp(currentTime)}
            </span>
          </div>
          <Textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add a note..."
            className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] placeholder:text-[#A7A7AD] text-sm min-h-[80px] mb-2"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingNote(false);
                setNewNoteText('');
              }}
              className="border-[rgba(255,255,255,0.15)] text-[#A7A7AD]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNoteText.trim()}
              className="bg-[#FF2D8D] hover:bg-[#FF2D8D]/90 text-white"
            >
              Add Note
            </Button>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#A7A7AD] text-sm mb-2">No notes yet</p>
            <p className="text-[#A7A7AD]/60 text-xs">Click + to add a note at the current timestamp</p>
          </div>
        ) : (
          notes
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((note) => (
              <div
                key={note.id}
                className="p-3 bg-[#0B0B0D] rounded-xl group"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => onSeek(note.timestamp)}
                    className="flex items-center gap-2 text-xs text-[#FF2D8D] hover:underline"
                  >
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(note.timestamp)}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditText(note.text);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#F4F4F5]"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg hover:bg-[#1a1a1c] text-[#A7A7AD] hover:text-[#ef4444]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {editingNoteId === note.id ? (
                  <div>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-[#121214] border-[rgba(255,255,255,0.08)] text-[#F4F4F5] text-sm min-h-[60px]"
                      autoFocus
                      onBlur={() => setEditingNoteId(null)}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[#A7A7AD]">
                        {savingNoteId === note.id ? 'Saving...' : 'Auto-saved'}
                      </span>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="text-xs text-[#FF2D8D] hover:underline"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#F4F4F5] whitespace-pre-wrap">{note.text}</p>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
