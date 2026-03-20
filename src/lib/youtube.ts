import type { YouTubePlaylist, YouTubePlaylistItem } from '@/types';

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export function extractPlaylistId(url: string): string | null {
  // Handle various YouTube playlist URL formats
  const patterns = [
    /[?&]list=([^&]+)/,
    /playlist\?list=([^&]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /embed\/([^?&]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export async function fetchPlaylist(playlistId: string): Promise<YouTubePlaylist | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/playlists?part=snippet,contentDetails&id=${playlistId}&key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlist');
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0] as YouTubePlaylist;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching playlist:', error);
    throw error;
  }
}

export async function fetchPlaylistItems(playlistId: string): Promise<YouTubePlaylistItem[]> {
  try {
    const items: YouTubePlaylistItem[] = [];
    let nextPageToken: string | undefined;
    
    do {
      const url = new URL(`${BASE_URL}/playlistItems`);
      url.searchParams.append('part', 'snippet,contentDetails');
      url.searchParams.append('playlistId', playlistId);
      url.searchParams.append('maxResults', '50');
      url.searchParams.append('key', API_KEY);
      
      if (nextPageToken) {
        url.searchParams.append('pageToken', nextPageToken);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch playlist items');
      }
      
      const data = await response.json();
      items.push(...(data.items || []));
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);
    
    return items;
  } catch (error) {
    console.error('Error fetching playlist items:', error);
    throw error;
  }
}

export async function fetchVideoDurations(videoIds: string[]): Promise<Map<string, string>> {
  try {
    const durationMap = new Map<string, string>();
    
    // Process in batches of 50 (API limit)
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const response = await fetch(
        `${BASE_URL}/videos?part=contentDetails&id=${batch.join(',')}&key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch video durations');
      }
      
      const data = await response.json();
      
      data.items?.forEach((item: any) => {
        durationMap.set(item.id, item.contentDetails?.duration || 'PT0S');
      });
    }
    
    return durationMap;
  } catch (error) {
    console.error('Error fetching video durations:', error);
    throw error;
  }
}

export function parseDuration(isoDuration: string): { formatted: string; seconds: number } {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) {
    return { formatted: '0:00', seconds: 0 };
  }
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return { formatted, seconds: totalSeconds };
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export async function getPlaylistWithVideos(playlistId: string) {
  try {
    const [playlist, items] = await Promise.all([
      fetchPlaylist(playlistId),
      fetchPlaylistItems(playlistId),
    ]);
    
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    
    // Fetch video durations
    const videoIds = items.map(item => item.snippet.resourceId.videoId);
    const durationMap = await fetchVideoDurations(videoIds);
    
    // Enrich items with duration
    const enrichedItems = items.map(item => ({
      ...item,
      contentDetails: {
        duration: durationMap.get(item.snippet.resourceId.videoId) || 'PT0S',
      },
    }));
    
    return {
      playlist,
      items: enrichedItems,
    };
  } catch (error) {
    console.error('Error getting playlist with videos:', error);
    throw error;
  }
}
