from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import shutil
import time
import json
from fastapi.responses import FileResponse, JSONResponse
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
        timestamp = int(time.time())
        folder_name = f"downloads/{timestamp}"
        os.makedirs(folder_name, exist_ok=True)
        logger.info(f"Created folder: {folder_name}")
        
        # Install spotdl if not already installed
        logger.info("Installing spotdl...")
        subprocess.run(['pip', 'install', '--force-reinstall', 'spotdl==4.2.0'], check=True)
        
        # Verify spotdl is installed
        try:
            version_result = subprocess.run(['spotdl', '--version'], capture_output=True, text=True, check=True)
            logger.info(f"Spotdl version: {version_result.stdout.strip()}")
        except Exception as e:
            logger.error(f"Failed to check spotdl version: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Failed to verify spotdl installation: {str(e)}"}
            )
        
        # Download the playlist
        logger.info("Starting playlist download...")
        try:
            # First try to get playlist info to verify the URL works
            info_result = subprocess.run(
                ['spotdl', request.playlist_url, '--list-only'], 
                capture_output=True, 
                text=True
            )
            logger.info(f"Playlist info result: {info_result.stdout}")
            if "not found" in info_result.stdout.lower() or "error" in info_result.stdout.lower():
                return JSONResponse(
                    status_code=400,
                    content={"detail": f"Invalid playlist URL or playlist not found: {info_result.stdout}"}
                )
            
            # Download the playlist
            download_process = subprocess.run(
                ['spotdl', request.playlist_url, '--output', folder_name], 
                capture_output=True,
                text=True
            )
            logger.info(f"Download process output: {download_process.stdout}")
            logger.info(f"Download process errors: {download_process.stderr}")
            
            # Check if any files were downloaded
            files = os.listdir(folder_name)
            logger.info(f"Files in download folder: {files}")
            
            if not files:
                logger.error("No files were downloaded")
                return JSONResponse(
                    status_code=500,
                    content={
                        "detail": "No files were downloaded. This could be due to Spotify API rate limits or restrictions.",
                        "stdout": download_process.stdout,
                        "stderr": download_process.stderr
                    }
                )
        except Exception as e:
            logger.error(f"Error during download: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Error during download: {str(e)}"}
            )
        
        # Create a zip file of the downloaded songs
        zip_path = f"{folder_name}.zip"
        logger.info(f"Creating zip file: {zip_path}")
        shutil.make_archive(folder_name, 'zip', folder_name)
        
        # Check zip file size
        zip_size = os.path.getsize(zip_path)
        logger.info(f"Zip file size: {zip_size} bytes")
        
        if zip_size < 1000:  # If zip is too small, it's probably empty
            logger.error(f"Zip file is too small: {zip_size} bytes")
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Generated zip file is too small, indicating no songs were downloaded.",
                    "zipSize": zip_size,
                    "stdout": download_process.stdout,
                    "stderr": download_process.stderr
                }
            )
        
        # Return the file
        logger.info("Sending file response...")
        return FileResponse(
            zip_path,
            media_type='application/zip',
            filename=f"playlist_{timestamp}.zip"
        )
        
    except Exception as e:
        logger.error(f"Error during download: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

@app.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 