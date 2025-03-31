from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import shutil
import time
import json
import platform
from fastapi.responses import FileResponse, JSONResponse
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import uvicorn
import logging
from pathlib import Path
import zipfile
import random
import string

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

# Create downloads directory if it doesn't exist
download_root = Path("downloads")
download_root.mkdir(exist_ok=True)

# Store active downloads
active_downloads = {}

class DownloadRequest(BaseModel):
    playlist_url: str
    playlist_name: str = None

class DownloadStatusResponse(BaseModel):
    status: str
    message: str
    progress: float = 0.0
    filename: str = None
    download_id: str = None

def generate_download_id():
    """Generate a unique download ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))

@app.get("/")
async def root():
    return {"status": "ok", "message": "REED Downloader Service is running"}

@app.post("/download", response_model=DownloadStatusResponse)
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
    try:
        logger.info(f"Received download request for URL: {request.playlist_url}")
        
        # Generate a unique ID for this download
        download_id = generate_download_id()
        
        # Create a unique folder for this download
        download_dir = download_root / download_id
        download_dir.mkdir(exist_ok=True)
        logger.info(f"Created folder: {download_dir}")
        
        # Set initial status
        active_downloads[download_id] = {
            "status": "initialized",
            "message": "Download initialized",
            "progress": 0.0,
            "filename": None,
            "playlist_url": request.playlist_url,
            "playlist_name": request.playlist_name or "Spotify Playlist",
            "start_time": time.time(),
            "total_tracks": 0,
            "downloaded_tracks": 0,
            "download_dir": str(download_dir)
        }
        
        # Start the download process in the background
        background_tasks.add_task(
            download_playlist_task, 
            download_id, 
            request.playlist_url, 
            str(download_dir),
            request.playlist_name
        )
        
        return DownloadStatusResponse(
            status="initialized",
            message="Download initialized. Check status endpoint for updates.",
            download_id=download_id
        )
        
    except Exception as e:
        logger.error(f"Error starting download: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

async def download_playlist_task(download_id, playlist_url, download_dir, playlist_name=None):
    """Background task to download a playlist"""
    try:
        # Update status
        active_downloads[download_id]["status"] = "installing"
        active_downloads[download_id]["message"] = "Installing spotdl..."
        
        # Install spotdl if not already installed
        logger.info("Installing spotdl...")
        subprocess.run(['pip', 'install', '--force-reinstall', 'spotdl==4.2.0'], check=True)
        
        # Verify spotdl is installed
        try:
            version_result = subprocess.run(['spotdl', '--version'], capture_output=True, text=True, check=True)
            logger.info(f"Spotdl version: {version_result.stdout.strip()}")
        except Exception as e:
            logger.error(f"Failed to check spotdl version: {str(e)}")
            active_downloads[download_id]["status"] = "error"
            active_downloads[download_id]["message"] = f"Failed to verify spotdl installation: {str(e)}"
            return
        
        # Get playlist information
        active_downloads[download_id]["status"] = "analyzing"
        active_downloads[download_id]["message"] = "Analyzing playlist..."
        
        try:
            # Get playlist info
            info_result = subprocess.run(
                ['spotdl', playlist_url, '--list-only'], 
                capture_output=True, 
                text=True
            )
            
            if "not found" in info_result.stdout.lower() or "error" in info_result.stdout.lower():
                active_downloads[download_id]["status"] = "error"
                active_downloads[download_id]["message"] = f"Invalid playlist URL or playlist not found"
                return
            
            # Extract track count and playlist name
            extract_name = playlist_name
            track_count = 0
            
            for line in info_result.stdout.split('\n'):
                if "Found" in line and "songs in" in line:
                    parts = line.split("Found")
                    if len(parts) > 1:
                        count_parts = parts[1].split("songs")
                        if count_parts and count_parts[0].strip().isdigit():
                            track_count = int(count_parts[0].strip())
                    
                    if not extract_name and "songs in" in line:
                        name_parts = line.split("songs in")
                        if len(name_parts) > 1:
                            extract_name = name_parts[1].strip().replace("(Playlist)", "").strip()
                    break
            
            if extract_name:
                active_downloads[download_id]["playlist_name"] = extract_name
            
            active_downloads[download_id]["total_tracks"] = track_count
            logger.info(f"Playlist has {track_count} tracks")
            
            # Start the actual download
            active_downloads[download_id]["status"] = "downloading"
            active_downloads[download_id]["message"] = f"Downloading {track_count} tracks..."
            
            # Run spotdl to download the playlist
            process = subprocess.Popen(
                ['spotdl', playlist_url, '--output', download_dir],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            downloaded_count = 0
            for line in iter(process.stdout.readline, ''):
                logger.info(line.strip())
                if "Downloaded" in line:
                    downloaded_count += 1
                    active_downloads[download_id]["downloaded_tracks"] = downloaded_count
                    if track_count > 0:
                        progress = min(0.95, downloaded_count / track_count)
                        active_downloads[download_id]["progress"] = progress
                        active_downloads[download_id]["message"] = f"Downloaded {downloaded_count}/{track_count} tracks"
            
            process.wait()
            
            if process.returncode != 0:
                active_downloads[download_id]["status"] = "error"
                active_downloads[download_id]["message"] = "Download failed"
                return
            
            # Create a zip file of the downloaded music
            active_downloads[download_id]["status"] = "packaging"
            active_downloads[download_id]["message"] = "Packaging files for download..."
            active_downloads[download_id]["progress"] = 0.95
            
            safe_name = active_downloads[download_id]["playlist_name"].replace(" ", "_")
            zip_filename = f"{safe_name}_{download_id}.zip"
            zip_path = os.path.join(os.path.dirname(download_dir), zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for root, _, files in os.walk(download_dir):
                    for file in files:
                        if file.endswith(('.mp3', '.m4a', '.flac', '.ogg', '.wav')):
                            file_path = os.path.join(root, file)
                            zipf.write(file_path, arcname=os.path.basename(file_path))
            
            # Update status
            active_downloads[download_id]["status"] = "completed"
            active_downloads[download_id]["message"] = "Download completed"
            active_downloads[download_id]["progress"] = 1.0
            active_downloads[download_id]["filename"] = zip_filename
            
        except Exception as e:
            logger.error(f"Error during download: {str(e)}")
            active_downloads[download_id]["status"] = "error"
            active_downloads[download_id]["message"] = f"Error during download: {str(e)}"
    
    except Exception as e:
        logger.error(f"Unexpected error in download task: {str(e)}")
        active_downloads[download_id]["status"] = "error"
        active_downloads[download_id]["message"] = f"Unexpected error: {str(e)}"

@app.get("/download/{download_id}/status", response_model=DownloadStatusResponse)
async def check_download_status(download_id: str):
    """Check the status of a download"""
    if download_id not in active_downloads:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Download not found"}
        )
    
    download_info = active_downloads[download_id]
    
    return DownloadStatusResponse(
        status=download_info["status"],
        message=download_info["message"],
        progress=download_info["progress"],
        filename=download_info["filename"],
        download_id=download_id
    )

@app.get("/download/{download_id}/file")
async def get_download_file(download_id: str):
    """Get the downloaded zip file"""
    if download_id not in active_downloads:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Download not found"}
        )
    
    download_info = active_downloads[download_id]
    
    if download_info["status"] != "completed":
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "Download not completed yet"}
        )
    
    if not download_info["filename"]:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "No file available for download"}
        )
    
    safe_name = download_info["playlist_name"].replace(" ", "_")
    zip_path = os.path.join(os.path.dirname(download_info["download_dir"]), download_info["filename"])
    
    if not os.path.exists(zip_path):
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "File not found on server"}
        )
    
    return FileResponse(
        zip_path,
        media_type='application/zip',
        filename=f"{safe_name}.zip"
    )

@app.get("/health")
async def health_check():
    logger.info("Health check requested")
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port) 