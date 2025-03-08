import base64
import requests
from django.shortcuts import redirect, HttpResponse
from django.http import HttpResponseBadRequest

# Replace these with your actual Spotify credentials
CLIENT_ID = '51709ad6693e45bea08876a55941dd14'
CLIENT_SECRET = '4d1ff2b4b1ca4ec8b460f56358c75b42'
# Updated redirect URI for production
REDIRECT_URI = 'https://spotify-oaut-htest.vercel.app/spotify/callback/'
SCOPE = 'user-read-email'
STATE = 'random_state_string'  # In production, generate and verify a secure random state

def home(request):
    return HttpResponse("Home Page. <a href='/spotify/login/'>Login with Spotify</a>")

def spotify_login(request):
    auth_url = "https://accounts.spotify.com/authorize"
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "state": STATE,
    }
    url = requests.Request('GET', auth_url, params=params).prepare().url
    return redirect(url)

def spotify_callback(request):
    error = request.GET.get('error')
    if error:
        return HttpResponseBadRequest("Error: " + error)
    
    code = request.GET.get('code')
    received_state = request.GET.get('state')
    if received_state != STATE:
        return HttpResponseBadRequest("State mismatch")
    
    token_url = "https://accounts.spotify.com/api/token"
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }
    client_creds = f"{CLIENT_ID}:{CLIENT_SECRET}"
    client_creds_b64 = base64.b64encode(client_creds.encode()).decode()
    headers = {
        "Authorization": f"Basic {client_creds_b64}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    response = requests.post(token_url, data=data, headers=headers)
    if response.status_code != 200:
        return HttpResponse("Failed to get token", status=response.status_code)
    
    token_info = response.json()
    request.session['token_info'] = token_info
    return HttpResponse("Logged in successfully with Spotify!")
