import Link from "next/link";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <section className="container mx-auto px-4 h-screen flex items-center justify-center relative">
        <div className="max-w-4xl w-full">
          <div className="text-center space-y-8">

            <h1 className="bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-4xl sm:text-5xl md:text-6xl font-bold text-transparent leading-tight">
              Explore Your Music Library
            </h1>
            
            <div className="space-y-6">
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Analyze your Spotify playlists and discover hidden patterns in your listening habits.
              </p>
              
              <div className="flex justify-center gap-8 text-slate-300/90 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                  </svg>
                  <span>Export Playlists</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <span>Secure OAuth</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span>Quick Download</span>
                </div>
              </div>

              <p className="text-rose-300/90 text-base">
                This is a technical demonstration only, with edcation purposes.
              </p>
            </div>

            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/90 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-600/20">
                Start Analysis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </Link>
            </div>

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <svg 
                className="w-6 h-6 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex justify-center pt-8">
          <div className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-6 py-2 text-sm text-amber-300 backdrop-blur-sm">
            Educational Project
          </div>
        </div>
        <div className="container mx-auto px-4 py-24">
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-8 transition-all hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-400/5">
              <div className="mb-6 text-emerald-400">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-slate-100">Secure Access</h3>
              <p className="text-slate-400 leading-relaxed">
                OAuth 2.0 implementation following Spotify's security guidelines
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-8 transition-all hover:border-emerald-400/30 hover:shadow-lg hover:shadow-emerald-400/5">
              <div className="mb-6 text-emerald-400">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-slate-100">Metadata Export</h3>
              <p className="text-slate-400 leading-relaxed">
                Export playlist metadata for educational analysis (JSON format)
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
