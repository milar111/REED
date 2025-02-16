from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
import time, os, subprocess
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth

load_dotenv()

def get_spotify_oauth(request):
    return SpotifyOAuth(
        client_id=os.getenv("CLIENT_ID"),
        client_secret=os.getenv("CLIENT_SECRET"),
        redirect_uri="http://localhost:8000/callback",
        scope="user-library-read playlist-read-private playlist-read-collaborative"
    )

def index(request):
    token_info = request.session.get("token_info")
    if token_info and token_info.get("expires_at", 0) < time.time():
        request.session.flush()
        return redirect('/login')
    
    if "spotify_token" in request.session:
        sp = spotipy.Spotify(auth=request.session["spotify_token"])
        playlists = []
        results = sp.current_user_playlists(limit=50)
        playlists.extend(results.get('items', []))
        while results.get('next'):
            results = sp.next(results)
            playlists.extend(results.get('items', []))
        
        playlists_html = ""
        for playlist in playlists:
            playlist_id = playlist.get('id')
            playlist_name = playlist.get('name')
            download_url = f"/download/{playlist_id}"
            playlists_html += (
                f"<li>{playlist_name} - "
                f"<a href='{download_url}'><button type='button'>Download</button></a></li>"
            )
        
        return HttpResponse(f'''
            <html>
                <body>
                    <p>Logged in as {request.session["spotify_token"]}</p>
                    <h2>Your Library Playlists:</h2>
                    <ul>
                        {playlists_html}
                    </ul>
                    <a href="/logout"><button type="button">Logout</button></a>
                </body>
            </html>
        ''')
    return redirect('/login')

def download_playlist(request, playlist_id):
    token_info = request.session.get("token_info")
    if token_info and token_info.get("expires_at", 0) < time.time():
        request.session.flush()
        return redirect('/login')
    
    if "spotify_token" in request.session:
        playlist_url = f"https://open.spotify.com/playlist/{playlist_id}?si=e9a4d49b9f3c48aa"
        
        # Get custom download directory from POST data, or use default
        if request.method == "POST" and request.POST.get("download_dir"):
            base_download_dir = request.POST.get("download_dir")
        else:
            base_download_dir = os.path.join(os.getcwd(), "downloads")
        
        download_dir = os.path.join(base_download_dir, playlist_id)
        os.makedirs(download_dir, exist_ok=True)
        
        try:
            result = subprocess.run(
                ["spotdl", "download", playlist_url, "--output", download_dir, "--log-level", "INFO"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=True
            )
            output = result.stdout
        except subprocess.CalledProcessError as e:
            output = e.stderr
        
        return HttpResponse(f'''
            <html>
                <body>
                    <p>Download process initiated for playlist: {playlist_url}</p>
                    <p>Files will be downloaded to: {download_dir}</p>
                    <pre>{output}</pre>
                    <a href="/"><button type="button">Go Back</button></a>
                </body>
            </html>
        ''')
    return redirect('/login')

def login(request):
    sp_oauth = get_spotify_oauth(request)
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

def callback(request):
    code = request.GET.get("code")
    sp_oauth = get_spotify_oauth(request)
    token_info = sp_oauth.get_access_token(code)
    token_info["expires_in"] = 3600  
    token_info["expires_at"] = int(time.time()) + 3600
    request.session["spotify_token"] = token_info["access_token"]
    request.session["token_info"] = token_info
    return redirect('http://localhost:3000/dashboard')

def logout(request):
    request.session.flush()
    return redirect('http://localhost:3000')

def check_auth(request):
    if "spotify_token" in request.session:
        token_info = request.session.get("token_info")
        if token_info and token_info.get("expires_at", 0) < time.time():
            request.session.flush()
            return JsonResponse({'authenticated': False})
        return JsonResponse({'authenticated': True, 'token': request.session["spotify_token"]})
    return JsonResponse({'authenticated': False})

def api_playlists(request):
    token_info = request.session.get("token_info")
    if token_info and token_info.get("expires_at", 0) < time.time():
        request.session.flush()
        return JsonResponse({'error': 'Token expired'}, status=401)
    
    if "spotify_token" not in request.session:
        return JsonResponse({'error': 'Not authenticated'}, status=401)
    
    try:
        sp = spotipy.Spotify(auth=request.session["spotify_token"])
        playlists = []
        results = sp.current_user_playlists(limit=50)
        playlists.extend(results.get('items', []))
        while results.get('next'):
            results = sp.next(results)
            playlists.extend(results.get('items', []))
        
        return JsonResponse({'playlists': playlists})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


