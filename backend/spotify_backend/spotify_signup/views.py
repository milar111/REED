from django.shortcuts import redirect, render
from django.http import HttpResponse, JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
import os
import time
import subprocess
import threading
import shutil
import tempfile
from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from django.views.decorators.http import require_http_methods
from django.conf import settings

# Load environment variables from .env file
load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI") #, "http://localhost:8000/callback"
FRONTEND_URL = os.getenv("FRONTEND_URL") # , "http://localhost:3000"

# Add allowed origins for CORS
ALLOWED_ORIGINS = [
    'https://milar111.github.io',
    'http://localhost:3000'
]

# Global dictionary to track download statuses
download_statuses = {}

def set_cors_headers(response, request):
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

def get_spotify_oauth(request):
    return SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope="user-library-read playlist-read-private playlist-read-collaborative",
        cache_handler=None,  # Disable file cache
        show_dialog=True
    )

def index(request):
    token_info = request.session.get("token_info")
    if token_info and token_info.get("expires_at", 0) < time.time():
        request.session.flush()
        return redirect('/login')
    
    if "spotify_token" in request.session:
        sp = spotipy.Spotify(auth=request.session["spotify_token"])
        playlists = []
        try:
            results = sp.current_user_playlists(limit=50)
        except Exception as e:
            return JsonResponse({"error": "Failed to fetch playlists: " + str(e)}, status=500)
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
    """
    Initiates a download for the given playlist using spotdl.
    The download runs in a separate thread and updates the global status.
    Includes a retry mechanism if a rate limit error is detected.
    """
    if request.method == "POST":
        try:
            temp_dir = tempfile.mkdtemp()
            print(f"Created temporary directory: {temp_dir}")
            
            download_statuses[playlist_id] = {
                'completed': False,
                'error': None,
                'temp_dir': temp_dir,
                'start_time': time.time(),
                'progress': 0,
                'total_tracks': 0,
                'downloaded_tracks': 0
            }

            def download_thread():
                playlist_url = f"https://open.spotify.com/playlist/{playlist_id}"
                attempts = 0
                max_attempts = 5
                
                print(f"Starting download for playlist: {playlist_id}")
                
                while attempts < max_attempts:
                    try:
                        print(f"Attempt {attempts + 1} of {max_attempts}")
                        
                        # Check if spotdl is installed
                        try:
                            version_result = subprocess.run(["spotdl", "--version"], capture_output=True, text=True, check=True)
                            print(f"spotdl version: {version_result.stdout.strip()}")
                        except FileNotFoundError:
                            print("spotdl not found, attempting to install...")
                            subprocess.run(["pip", "install", "spotdl"], check=True)
                            print("spotdl installed successfully")
                        
                        # First, get the playlist info to count tracks
                        try:
                            sp = spotipy.Spotify(auth=request.session.get("spotify_token"))
                            playlist = sp.playlist(playlist_id)
                            total_tracks = playlist['tracks']['total']
                            download_statuses[playlist_id]['total_tracks'] = total_tracks
                            print(f"Total tracks in playlist: {total_tracks}")
                        except Exception as e:
                            print(f"Error getting playlist info: {str(e)}")
                            total_tracks = 0
                        
                        print(f"Starting download with command: spotdl --bitrate 192k {playlist_url}")
                        
                        # Run spotdl with progress tracking
                        process = subprocess.Popen(
                            ["spotdl", "--bitrate", "192k", playlist_url],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True,
                            bufsize=1,
                            universal_newlines=True,
                            cwd=temp_dir,
                            env=dict(os.environ, PYTHONIOENCODING="utf-8")
                        )
                        
                        while True:
                            output = process.stdout.readline()
                            if output == '' and process.poll() is not None:
                                break
                            if output:
                                print(f"spotdl output: {output.strip()}")
                                # Update progress based on output
                                if "Downloaded" in output:
                                    download_statuses[playlist_id]['downloaded_tracks'] += 1
                                    if total_tracks > 0:
                                        progress = (download_statuses[playlist_id]['downloaded_tracks'] / total_tracks) * 100
                                        download_statuses[playlist_id]['progress'] = round(progress, 2)
                        
                        # Check if the process completed successfully
                        if process.returncode == 0:
                            # Verify files were downloaded
                            files = os.listdir(temp_dir)
                            if not files:
                                raise Exception("No files were downloaded")
                                
                            print(f"Downloaded files: {files}")
                            print(f"Number of files downloaded: {len(files)}")
                            download_statuses[playlist_id]['completed'] = True
                            return
                        else:
                            error_message = process.stderr.read()
                            print(f"spotdl error output: {error_message}")
                            raise subprocess.CalledProcessError(process.returncode, ["spotdl", "--bitrate", "192k", playlist_url], stderr=error_message)
                            
                    except subprocess.CalledProcessError as e:
                        error_message = f"stdout: {e.stdout}\nstderr: {e.stderr}"
                        print(f"Download attempt failed: {error_message}")
                        
                        if e.stderr and "rate/request limit" in e.stderr.lower():
                            attempts += 1
                            time.sleep(10)  # wait 10 seconds before retrying
                            continue
                        else:
                            download_statuses[playlist_id].update({
                                'completed': True,
                                'error': error_message
                            })
                            return
                            
                # If max attempts reached without success:
                download_statuses[playlist_id].update({
                    'completed': True,
                    'error': f"Failed after {max_attempts} attempts: {error_message}"
                })
                
            thread = threading.Thread(target=download_thread)
            thread.daemon = True
            thread.start()
            
            print(f"Download thread started for playlist: {playlist_id}")
            return JsonResponse({'status': 'Download started'})
            
        except Exception as e:
            print(f"Error in download_playlist: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

def check_download_status(request, playlist_id):
    if playlist_id in download_statuses:
        status = download_statuses[playlist_id]
        
        # Check for timeout (30 minutes)
        if not status.get('completed') and time.time() - status.get('start_time', 0) > 1800:
            status.update({
                'completed': True,
                'error': 'Download timed out after 30 minutes'
            })
            return JsonResponse(status)
            
        # Check if temp directory still exists
        temp_dir = status.get('temp_dir')
        if temp_dir and not os.path.exists(temp_dir):
            status.update({
                'completed': True,
                'error': 'Temporary directory was deleted'
            })
            return JsonResponse(status)
            
        # Add progress information to response
        if not status.get('completed'):
            status['status'] = 'in_progress'
            if status.get('total_tracks', 0) > 0:
                status['progress_message'] = f"Downloaded {status.get('downloaded_tracks', 0)} of {status.get('total_tracks', 0)} tracks ({status.get('progress', 0)}%)"
            else:
                status['progress_message'] = "Downloading tracks..."
        else:
            status['status'] = 'completed' if not status.get('error') else 'failed'
            
        return JsonResponse(status)
    return JsonResponse({"error": "Download not found"}, status=404)

def get_download_archive(request, playlist_id):
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
    code = request.GET.get("code")
    sp_oauth = get_spotify_oauth(request)
    try:
        token_info = sp_oauth.get_access_token(code, check_cache=False)
    except Exception as e:
        return JsonResponse({"error": "Failed to get access token: " + str(e)}, status=500)
    
    token_info["expires_in"] = 3600  
    token_info["expires_at"] = int(time.time()) + 3600
    
    # Save to session
    request.session["spotify_token"] = token_info["access_token"]
    request.session["token_info"] = token_info
    request.session.save()
    
    print("Session keys after auth:", list(request.session.keys()))
    print("Session key:", request.session.session_key)
    
    # Create the response with token in URL
    redirect_url = f"{FRONTEND_URL}/dashboard?token={token_info['access_token']}"
    response = redirect(redirect_url)
    
    # Still set the session cookie as a fallback
    response.set_cookie(
        settings.SESSION_COOKIE_NAME,
        request.session.session_key,
        max_age=settings.SESSION_COOKIE_AGE,
        expires=None,
        domain=None,
        path=settings.SESSION_COOKIE_PATH,
        secure=settings.SESSION_COOKIE_SECURE,
        httponly=settings.SESSION_COOKIE_HTTPONLY,
        samesite='None'
    )
    
    # Add CORS headers
    origin = request.headers.get('Origin', '')
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    
    return response

def logout(request):
    request.session.flush()
    return redirect(FRONTEND_URL)

@csrf_exempt
def check_auth(request):
    # Print debugging information
    print("check_auth called")
    print("Session keys:", list(request.session.keys()))
    print("Cookies:", request.headers.get('Cookie', ''))
    print("Origin:", request.headers.get('Origin', ''))
    
    response = None
    if "spotify_token" in request.session:
        token_info = request.session.get("token_info")
        if token_info and token_info.get("expires_at", 0) < time.time():
            print("Token expired")
            request.session.flush()
            response = JsonResponse({'authenticated': False})
        else:
            print("User is authenticated")
            response = JsonResponse({'authenticated': True, 'token': request.session["spotify_token"]})
    else:
        print("No spotify_token in session")
        response = JsonResponse({'authenticated': False})
    
    # Add CORS headers to the response
    origin = request.headers.get('Origin', '')
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    
    # Ensure the session cookie works cross-domain
    if not request.session.is_empty():
        print("Setting session cookie for cross-domain use")
        response.set_cookie(
            settings.SESSION_COOKIE_NAME,
            request.session.session_key,
            max_age=settings.SESSION_COOKIE_AGE,
            expires=None,
            domain=None,  # Don't restrict to a specific domain
            path=settings.SESSION_COOKIE_PATH,
            secure=settings.SESSION_COOKIE_SECURE,
            httponly=settings.SESSION_COOKIE_HTTPONLY,
            samesite='None'
        )
    
    return response

@csrf_exempt
def options_check_auth(request):
    response = HttpResponse()
    return set_cors_headers(response, request)

@csrf_exempt
def api_playlists(request):
    # Debug output
    print("api_playlists called")
    print("Session keys:", list(request.session.keys()))
    print("Cookies:", request.headers.get('Cookie', ''))
    
    token_info = request.session.get("token_info")
    if token_info and token_info.get("expires_at", 0) < time.time():
        request.session.flush()
        response = JsonResponse({'error': 'Token expired'}, status=401)
    elif "spotify_token" not in request.session:
        response = JsonResponse({'error': 'Not authenticated'}, status=401)
    else:
        try:
            sp = spotipy.Spotify(auth=request.session["spotify_token"])
            playlists = []
            results = sp.current_user_playlists(limit=50)
            playlists.extend(results.get('items', []))
            while results.get('next'):
                results = sp.next(results)
                playlists.extend(results.get('items', []))
            
            response = JsonResponse({'playlists': playlists})
        except Exception as e:
            print("Error fetching playlists:", str(e))
            response = JsonResponse({'error': str(e)}, status=500)
    
    # Add CORS headers
    origin = request.headers.get('Origin', '')
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    
    # Set session cookie
    if not request.session.is_empty():
        response.set_cookie(
            settings.SESSION_COOKIE_NAME,
            request.session.session_key,
            max_age=settings.SESSION_COOKIE_AGE,
            expires=None,
            domain=None,
            path=settings.SESSION_COOKIE_PATH,
            secure=settings.SESSION_COOKIE_SECURE,
            httponly=settings.SESSION_COOKIE_HTTPONLY,
            samesite='None'
        )
    
    return response
