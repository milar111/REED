from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import shutil
import time
from fastapi.responses import FileResponse
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up Spotify client with environment variables
client_id = os.getenv('CLIENT_ID', '')
client_secret = os.getenv('CLIENT_SECRET', '')

logger.info(f"Client ID available: {'Yes' if client_id else 'No'}")
logger.info(f"Client Secret available: {'Yes' if client_secret else 'No'}")

os.environ['SPOTIFY_CLIENT_ID'] = client_id
os.environ['SPOTIFY_CLIENT_SECRET'] = client_secret

class DownloadRequest(BaseModel):
    playlist_url: str

@app.get("/")
async def root():
    return {"status": "ok", "message": "REED Downloader Service is running"}

@app.post("/download")
async def download_playlist(request: DownloadRequest):
    try:
        logger.info(f"Received download request for URL: {request.playlist_url}")
        
        # Create a unique folder for this download
        folder_name = f"downloads/{int(time.time())}"
        os.makedirs(folder_name, exist_ok=True)
        logger.info(f"Created folder: {folder_name}")
        
        # Install spotdl if not already installed
        logger.info("Installing spotdl...")
        subprocess.run(['pip', 'install', 'spotdl'], check=True)
        
        # Download the playlist
        logger.info("Starting playlist download...")
        subprocess.run(['spotdl', request.playlist_url, '--output', folder_name], check=True)
        
        # Create a zip file of the downloaded songs
        zip_path = f"{folder_name}.zip"
        logger.info(f"Creating zip file: {zip_path}")
        shutil.make_archive(folder_name, 'zip', folder_name)
        
        # Return the file
        logger.info("Sending file response...")
        return FileResponse(
            zip_path,
            media_type='application/zip',
            filename=f"playlist_{int(time.time())}.zip"
        )
        
    except Exception as e:
        logger.error(f"Error during download: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 