import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900">
      <section className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-6 py-2 text-sm text-amber-300">
            Educational Project
          </div>
          
          <h1 className="bg-gradient-to-r from-emerald-300 to-cyan-400 bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
            Explore Your Music Library
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Analyze your Spotify playlists and discover hidden patterns in your listening habits. 
            <span className="mt-2 block text-rose-300">This is a technical demonstration only.</span>
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-lg"
            >
              Start Analysis
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-950/50">
        <div className="container mx-auto px-4 py-20">
          <div className="grid gap-8 md:grid-cols-2">
            

            <div className="rounded-xl border border-slate-800 p-6 transition-all hover:border-emerald-400/30">
              <div className="mb-4 text-emerald-400">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-200">Secure Access</h3>
              <p className="text-slate-400">OAuth 2.0 implementation following Spotify's security guidelines</p>
            </div>

            <div className="rounded-xl border border-slate-800 p-6 transition-all hover:border-emerald-400/30">
              <div className="mb-4 text-emerald-400">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold text-slate-200">Metadata Export</h3>
              <p className="text-slate-400">Export playlist metadata for educational analysis (JSON format)</p>
            </div>
          </div>
        </div>
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
  )
}