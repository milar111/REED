'use client';

import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PlaylistCard from '../components/PlaylistCard';
import DownloadModal from './download-modal';
import { Playlist } from '../types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';
import { Playlist as PlaylistInterface } from '@/app/interfaces/Playlist';

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

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [selectedPlaylistForDownload, setSelectedPlaylistForDownload] = useState<string>('');
  const [downloadStatus, setDownloadStatus] = useState<{ isDownloading: boolean; message: string; progress: number }>({ isDownloading: false, message: '', progress: 0 });
  const [selectedPlaylistName, setSelectedPlaylistName] = useState<string>('');

  const [selectedDirHandle, setSelectedDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveFormat, setSaveFormat] = useState<'zip' | 'folder'>('zip');
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  const openDownloadModal = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    setSelectedPlaylistForDownload(playlistId);
    setSelectedPlaylistName(playlist?.name || 'Playlist');
    setIsDownloadModalOpen(true);
  };

  const closeDownloadModal = () => {
    if (!downloadStatus.isDownloading) {
      setIsDownloadModalOpen(false);
      setSelectedPlaylistForDownload('');
    }
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
      setIsDownloadModalOpen(false);
      
      // Get the playlist URL
      const playlist = playlists.find((p) => p.id === selectedPlaylistForDownload);
      if (!playlist) {
        throw new Error('Playlist not found');
      }

      console.log('Starting direct download process...');
      console.log('Playlist URL:', playlist.external_urls.spotify);

      try {
        // Show initial download status
        setDownloadStatus({
          isDownloading: true,
          message: 'Starting download...',
          progress: 0,
        });

        // Call the backend server to start the download
        const response = await fetch('https://reed-downloader.onrender.com/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            playlist_url: playlist.external_urls.spotify,
            playlist_name: playlist.name
          })
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.download_id) {
          throw new Error('Invalid response from server: No download ID');
        }

        // Poll for download status
        const downloadId = data.download_id;
        let isCompleted = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 300; // 10 minutes (2s * 300)
        
        const pollInterval = setInterval(async () => {
          try {
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
              clearInterval(pollInterval);
              setDownloadStatus({
                isDownloading: false,
                message: 'Download timed out. Please try again later.',
                progress: 0,
              });
              return;
            }

            const statusResponse = await fetch(`https://reed-downloader.onrender.com/download/${downloadId}/status`);
            
            if (!statusResponse.ok) {
              throw new Error(`Status check failed: ${statusResponse.status}`);
            }
            
            const statusData = await statusResponse.json();
            console.log('Download status:', statusData);
            
            // Update the UI with progress
            setDownloadStatus({
              isDownloading: true,
              message: statusData.message || 'Processing...',
              progress: statusData.progress || 0,
            });

            // Check if download is completed
            if (statusData.status === 'completed' && statusData.filename) {
              clearInterval(pollInterval);
              isCompleted = true;
              
              // Show completed message
              setDownloadStatus({
                isDownloading: true,
                message: 'Download completed! Starting file download...',
                progress: 1,
              });
              
              // Trigger file download
              window.location.href = `https://reed-downloader.onrender.com/download/${downloadId}/file`;
              
              // Reset status after a delay
              setTimeout(() => {
                setDownloadStatus({
                  isDownloading: false,
                  message: '',
                  progress: 0,
                });
              }, 3000);
            }
            
            // Check for errors
            if (statusData.status === 'error') {
              clearInterval(pollInterval);
              throw new Error(`Download error: ${statusData.message}`);
            }
            
          } catch (error) {
            clearInterval(pollInterval);
            console.error('Error checking download status:', error);
            setDownloadStatus({
              isDownloading: false,
              message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              progress: 0,
            });
          }
        }, 2000); // Check every 2 seconds
        
      } catch (error) {
        console.error('Download error:', error);
        setDownloadStatus({
          isDownloading: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          progress: 0,
        });
        alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      setSelectedPlaylistForDownload('');
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
        isOpen={isDownloadModalOpen}
        onClose={closeDownloadModal}
        onConfirm={startDownload}
        playlistName={selectedPlaylistName}
        isDownloading={downloadStatus.isDownloading}
        downloadStatus={downloadStatus.message}
        downloadProgress={downloadStatus.progress}
      />
    </main>
  );
}
