'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Image {
  url: string;
  height: number | null;
  width: number | null;
}

interface Owner {
  id: string;
  display_name: string;
}

interface Tracks {
  total: number;
}

interface Playlist {
  id: string;
  name: string;
  images: Image[];
  owner: Owner;
  tracks: Tracks;
}

export default function Dashboard() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        // Check
        const authResponse = await fetch('http://localhost:8000/check_auth', {
          credentials: 'include',
        });
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
          window.location.href = '/login';
          return;
        }
        
        const playlistsResponse = await fetch('http://localhost:8000/api/playlists', {
          credentials: 'include',
        });
        
        if (!playlistsResponse.ok) {
          // If unauthorized (token expired), redirect to login
          if (playlistsResponse.status === 401) {
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to load playlists');
        }
        
        const data = await playlistsResponse.json();
        setPlaylists(data.playlists);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPlaylists();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-emerald-400 animate-pulse">Loading your playlists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="text-rose-400 mb-4">{error}</div>
        <Link 
          href="/"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold text-slate-100 cursor-default">REED</span>
          </div>
          <form action="http://localhost:8000/logout" method="get">
            <button
              type="submit"
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Logout
            </button>
          </form>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Your Playlists</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <div 
              key={playlist.id} 
              className="bg-slate-800 rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-emerald-400/10 hover:scale-[1.02]"
            >
              <div className="h-48 bg-slate-700 relative">
                {playlist.images && playlist.images[0] ? (
                  <img 
                    src={playlist.images[0].url} 
                    alt={`${playlist.name} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-700">
                    <svg className="w-16 h-16 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-semibold text-white truncate">{playlist.name}</h3>
                <p className="text-slate-400 mt-2 mb-4">
                  {playlist.tracks.total} tracks • By {playlist.owner.display_name}
                </p>
                
                <a 
                  href={`http://localhost:8000/download/${playlist.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  Download Playlist
                </a>
              </div>
            </div>
          ))}
        </div>
        
        {playlists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">You don't have any playlists yet.</p>
          </div>
        )}
      </section>
      
      <footer className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-slate-500">
            This project is not affiliated with Spotify AB. All music rights belong to their respective owners.
            <br />Purely educational demonstration of API integration concepts.
          </p>
        </div>
      </footer>
    </main>
  );
}