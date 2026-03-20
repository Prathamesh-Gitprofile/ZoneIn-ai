// User types
export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Date;
  streak: number;
  lastWatchedDate: Date | null;
  defaultPlaybackSpeed: number;
}

// Playlist types
export interface Playlist {
  id: string;
  uid: string;
  youtubePlaylistId: string;
  title: string;
  thumbnail: string;
  totalVideos: number;
  completedVideos: number;
  addedAt: Date;
  lastWatchedAt: Date | null;
  playbackSpeed: number;
}

// Video types
export interface Video {
  id: string;
  playlistId: string;
  youtubeVideoId: string;
  title: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  isCompleted: boolean;
  isRewatchFlagged: boolean;
  tags: string[];
  watchedAt: Date | null;
  position: number;
}

// Note types
export interface Note {
  id: string;
  videoId: string;
  uid: string;
  timestamp: number;
  text: string;
  createdAt: Date;
}

// Code Snippet types
export interface CodeSnippet {
  id: string;
  videoId: string;
  uid: string;
  language: string;
  title: string;
  code: string;
  createdAt: Date;
}

// Summary types
export interface Summary {
  id: string;
  videoId: string;
  uid: string;
  text: string;
  updatedAt: Date;
}

// Quiz Result types
export interface QuizResult {
  id: string;
  videoId: string;
  uid: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

// Quiz Question types
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

// Activity types
export interface Activity {
  id: string;
  uid: string;
  date: Date;
  videosWatched: number;
  minutesWatched: number;
}

// YouTube API types
export interface YouTubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
    resourceId: {
      videoId: string;
    };
    position: number;
  };
  contentDetails?: {
    duration: string;
  };
}

export interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails: {
    itemCount: number;
  };
}

// Component prop types
export interface PlayerTabProps {
  video: Video;
  currentTime: number;
  onSeek: (time: number) => void;
}
