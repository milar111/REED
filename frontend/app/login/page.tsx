'use client';

import { useEffect } from 'react';
import Footer from '../components/Footer'; 

export default function Login() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      console.error('Login error:', error);
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Connect with Spotify</h1>
            <p className="text-slate-400">
              Login with your Spotify account to access your playlists
            </p>
          </div>
          
          <div className="space-y-4">
            <a 
              // href="http://localhost:8000/login"
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/login`}
              className="w-full flex items-center justify-center gap-3 bg-[#1DB954] text-white py-3 rounded-lg font-medium hover:bg-[#1ed760] transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Continue with Spotify
            </a>
            
            <div className="text-center text-sm text-slate-500">
              <p>
                By continuing, you agree to Spotify's Terms of Service
                and acknowledge their Privacy Policy.
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-700 text-center text-sm text-slate-400">
            <p>This is a demo project for educational purposes only.</p>
            <p>Not affiliated with Spotify AB.</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}