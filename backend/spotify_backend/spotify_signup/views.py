from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse, FileResponse
import time, os, subprocess, threading, shutil, tempfile, json
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import traceback

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")  
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://milar111.github.io/REED")

download_statuses = {}

def get_spotify_oauth(request):
    return SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
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
            playlists_html += f'''
                <li>{playlist_name} - 
                    <form action="{download_url}" method="post" style="display: inline;">
                        <input type="hidden" name="csrfmiddlewaretoken" value="{{{{ csrf_token }}}}">
                        <input type="text" name="download_dir" id="download_dir_{playlist_id}" 
                               placeholder="Download location" style="display: none;">
                        <input type="hidden" name="playlist_name" value="{playlist_name}">
                        <button type="button" onclick="selectDirectory('{playlist_id}')">Download</button>
                    </form>
                </li>
            '''

        return HttpResponse(f'''
            <html>
                <head>
                    <script>
                        async function selectDirectory(playlistId) {{
                            try {{
                                const dirHandle = await window.showDirectoryPicker();
                                const input = document.getElementById('download_dir_' + playlistId);
                                input.value = dirHandle.name;
                                input.form.submit();
                            }} catch (err) {{
                                console.error(err);
                            }}
                        }}
                    </script>
                </head>
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
    if request.method == "POST":
        # Create temporary directory for downloads
        temp_dir = tempfile.mkdtemp()
        download_statuses[playlist_id] = {
            'completed': False,
            'error': None,
            'temp_dir': temp_dir 
        }

        def download_thread():
            try:
                playlist_url = f"https://open.spotify.com/playlist/{playlist_id}"
                # Run spotdl to download the playlist into temp_dir
                subprocess.run([
                    "spotdl",
                    playlist_url,
                    "--output", temp_dir,
                    "--format", "mp3"
                ], capture_output=True, text=True, check=True)
                download_statuses[playlist_id]['completed'] = True
            except Exception as e:
                download_statuses[playlist_id].update({
                    'completed': True,
                    'error': str(e)
                })

        thread = threading.Thread(target=download_thread)
        thread.daemon = True
        thread.start()

        return JsonResponse({'status': 'Download started'})
    return JsonResponse({'error': 'Invalid request method'}, status=405)

def check_download_status(request, playlist_id):
    if playlist_id in download_statuses:
        return JsonResponse(download_statuses[playlist_id])
    return JsonResponse({"error": "Download not found"}, status=404)

def get_download_archive(request, playlist_id):
    """
    Once the download is complete, create a zip archive and serve it.
    """
    if playlist_id in download_statuses:
        status = download_statuses[playlist_id]
        if not status.get('completed'):
            return JsonResponse({'error': 'Download still in progress'}, status=400)
        if status.get('error'):
            return JsonResponse({'error': status['error']}, status=500)
        
        temp_dir = status.get('temp_dir')
        archive_path = os.path.join(tempfile.gettempdir(), f"{playlist_id}.zip")
        shutil.make_archive(base_name=archive_path.replace('.zip',''), format='zip', root_dir=temp_dir)
        
        return FileResponse(open(archive_path, 'rb'), as_attachment=True, filename=f"{playlist_id}.zip")
    return JsonResponse({'error': 'Download not found'}, status=404)

def login(request):
    sp_oauth = get_spotify_oauth(request)
    auth_url = sp_oauth.get_authorize_url()
    return redirect(auth_url)

def callback(request):
    try:
        code = request.GET.get("code")
        if not code:
            return HttpResponse("No code provided", status=400)
        
        sp_oauth = get_spotify_oauth(request)
        token_info = sp_oauth.get_access_token(code)
        if not token_info or "access_token" not in token_info:
            return HttpResponse("Failed to obtain token", status=400)
        
        token_info["expires_in"] = 3600  
        token_info["expires_at"] = int(time.time()) + 3600
        
        request.session["spotify_token"] = token_info["access_token"]
        request.session["token_info"] = token_info
        
        return redirect(f'{FRONTEND_URL}/dashboard')
    except Exception as e:
        error_details = traceback.format_exc()
        return HttpResponse(f"Error in callback: {str(e)}\n{error_details}", status=500)

def logout(request):
    request.session.flush()
    return redirect(FRONTEND_URL)

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
