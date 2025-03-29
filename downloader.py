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

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DownloadRequest(BaseModel):
    playlist_url: str

@app.post("/download")
async def download_playlist(request: DownloadRequest):
    try:
        # Create a unique folder for this download
        folder_name = f"downloads/{int(time.time())}"
        os.makedirs(folder_name, exist_ok=True)
        
        # Install spotdl if not already installed
        subprocess.run(['pip', 'install', 'spotdl'], check=True)
        
        # Download the playlist
        subprocess.run(['spotdl', request.playlist_url, '--output', folder_name], check=True)
        
        # Create a zip file of the downloaded songs
        zip_path = f"{folder_name}.zip"
        shutil.make_archive(folder_name, 'zip', folder_name)
        
        # Return the file
        return FileResponse(
            zip_path,
            media_type='application/zip',
            filename=f"playlist_{int(time.time())}.zip"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 