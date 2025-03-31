'use client';

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PlaylistCard from '../components/PlaylistCard';
import DownloadModal from '../components/DownloadModal';
import { Playlist } from '../types';

export {};

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPlaylists, setDownloadingPlaylists] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForDownload, setSelectedPlaylistForDownload] = useState<string | null>(null);
  const [selectedDirHandle, setSelectedDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveFormat, setSaveFormat] = useState<'zip' | 'folder'>('zip');
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const openDownloadModal = (playlistId: string) => {
    setSelectedPlaylistForDownload(playlistId);
    const selectedPlaylist = playlists.find(p => p.id === playlistId);
    if (selectedPlaylist && selectedPlaylist.external_urls && selectedPlaylist.external_urls.spotify) {
      setPlaylistUrl(selectedPlaylist.external_urls.spotify);
    } else {
      setPlaylistUrl(`https://open.spotify.com/playlist/${playlistId}`);
    }
    setModalOpen(true);
  };

  //select dir
  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      setSelectedDirHandle(dirHandle);
    } catch (e) {
      console.error('Folder selection cancelled or failed:', e);
    }
  };

  // download process when the user confirms
  const startDownload = async () => {
    if (!selectedPlaylistForDownload) {
      alert('Please select a playlist first');
      return;
    }

    try {
      setDownloadingPlaylists((prev) => new Set(prev).add(selectedPlaylistForDownload));
      setModalOpen(false);
      
      // Get the playlist URL
      const playlist = playlists.find((p) => p.id === selectedPlaylistForDownload);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      console.log('Starting direct download process...');
      console.log('Playlist URL:', playlist.external_urls.spotify);

      // Direct YouTube Music approach
      // Check if playlist has tracks and handle different track structures
      let trackCount = 0;
      if (playlist.tracks) {
        if ('items' in playlist.tracks && Array.isArray(playlist.tracks.items)) {
          trackCount = playlist.tracks.items.length;
        } else if ('total' in playlist.tracks) {
          trackCount = playlist.tracks.total;
        }
      }
      
      if (trackCount === 0) {
        throw new Error('No tracks found in this playlist');
      }

      alert(`Preparing to download ${trackCount} tracks from ${playlist.name}. This will open in a new tab.`);

      // Use Cloudflare Worker to handle the download
      try {
        // Replace this URL with your Cloudflare Worker URL after deployment
        const workerUrl = "YOUR_WORKER_URL_HERE"; // You'll update this after deployment
        
        // Call the Cloudflare Worker
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playlist_url: playlist.external_urls.spotify
          })
        });
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(`Worker error: ${data.error}`);
        }
        
        // If successful, open the download URL or conversion page
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
          alert('A new tab has been opened. Your download should start automatically.');
        } else {
          // Fallback to Y2Mate if the worker doesn't return a download URL
          window.open(`https://www.y2mate.com/youtube-playlist/${playlist.external_urls.spotify}`, '_blank');
          alert('A new tab has been opened. Follow the instructions on that page to download your music.');
        }
      } catch (error) {
        console.error('Worker error:', error);
        // Fallback to Y2Mate if there's an error with the worker
        window.open(`https://www.y2mate.com/youtube-playlist/${playlist.external_urls.spotify}`, '_blank');
        alert('A new tab has been opened. Follow the instructions on that page to download your music.');
      }
      
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to prepare download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingPlaylists((prev) => {
        const newSet = new Set(prev);
        newSet.delete(selectedPlaylistForDownload);
        return newSet;
      });
      setSelectedPlaylistForDownload(null);
    }
  };

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        console.log('Checking authentication status...');
        
        // Check for token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
          console.log('Token found in URL, using it directly');
          // Use the token to fetch playlists directly from Spotify API
          
          const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!playlistsResponse.ok) {
            console.error('Failed to fetch playlists with token from URL:', playlistsResponse.status);
            throw new Error('Failed to fetch playlists');
          }
          
          const data = await playlistsResponse.json();
          console.log('Playlists fetched directly from Spotify API');
          setPlaylists(data.items);
          
          // Clear token from URL for security
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsLoading(false);
          return;
        }
        
        // Fallback to normal authentication check
        console.log('No token in URL, checking session auth');
        const authResponse = await fetch('https://reed-gilt.vercel.app/check_auth', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        console.log('Auth response status:', authResponse.status);
        console.log('Auth response headers:', Object.fromEntries([...authResponse.headers]));
        
        if (!authResponse.ok) {
          console.error('Auth check failed with status:', authResponse.status);
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }
        
        const authData = await authResponse.json();
        console.log('Auth data received:', authData);
        
        if (!authData.authenticated) {
          console.error('Not authenticated according to response data');
          const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
          window.location.href = `${basePath}/login`;
          return;
        }

        console.log('Authentication successful, fetching playlists...');
        const playlistsResponse = await fetch('https://reed-gilt.vercel.app/api/playlists', {
          credentials: 'include',
        });
        
        if (!playlistsResponse.ok) {
          if (playlistsResponse.status === 401) {
            console.error('Playlists fetch returned 401 unauthorized');
            const basePath = process.env.NODE_ENV === 'production' ? '/REED' : '';
            window.location.href = `${basePath}/login`;
            return;
          }
          throw new Error('Failed to load playlists');
        }
        
        const data = await playlistsResponse.json();
        console.log('Playlists received:', data);
        setPlaylists(data.playlists);
      } catch (err) {
        console.error('Error in fetchPlaylists:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    // Check for cookies first
    const cookies = document.cookie;
    console.log('Current cookies:', cookies);
    
    fetchPlaylists();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-emerald-400 animate-pulse text-lg">Loading your playlists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        <div className="text-rose-400 mb-4 text-center">{error}</div>
        <a
          href="/"
          className="px-4 py-2 bg-emerald-600/80 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Return Home
        </a>
      </div>
    );
  }

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistForDownload);

  return (
    <main className="min-h-screen bg-slate-900">
      <Header />
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-[320px] sm:max-w-md md:max-w-none mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Your Playlists</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playlists.map((playlist) => (
              <PlaylistCard 
                key={playlist.id}
                playlist={playlist}
                isDownloading={downloadingPlaylists.has(playlist.id)}
                onDownload={openDownloadModal}
              />
            ))}
          </div>
        </div>
      </section>
      <Footer />
      <DownloadModal
        isOpen={modalOpen}
        playlist={currentPlaylist}
        selectedDirHandle={selectedDirHandle}
        saveFormat={saveFormat}
        playlistUrl={playlistUrl}
        onClose={() => setModalOpen(false)}
        onSelectFolder={handleSelectFolder}
        onConfirm={startDownload}
        onChangeFormat={setSaveFormat}
      />
    </main>
  );
}
