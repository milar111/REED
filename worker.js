addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle the request
 * @param {Request} request
 */
async function handleRequest(request) {
  // Enable CORS
  if (request.method === 'OPTIONS') {
    return handleCORS(request)
  }
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders()
    })
  }

  try {
    // Get playlist URL from request
    const reqData = await request.json()
    const playlistUrl = reqData.playlist_url
    
    if (!playlistUrl) {
      return new Response(JSON.stringify({ error: 'No playlist URL provided' }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      })
    }

    // If it's a Spotify URL, convert it to a YouTube search
    if (playlistUrl.includes('spotify.com')) {
      // Extract playlist ID from URL
      let playlistId = playlistUrl
      if (playlistUrl.includes('playlist/')) {
        playlistId = playlistUrl.split('playlist/')[1].split('?')[0]
      }
      
      // Try to get playlist info from Spotify API
      try {
        const spotifyResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
          headers: {
            'Authorization': 'Bearer ' + reqData.token // Use token if provided
          }
        })
        
        if (spotifyResponse.ok) {
          const spotifyData = await spotifyResponse.json()
          if (spotifyData.name) {
            // Create a direct Y2Mate URL with the playlist name for better results
            const y2mateUrl = `https://www.y2mate.com/youtube/${encodeURIComponent(spotifyData.name + ' playlist')}`
            return new Response(JSON.stringify({ 
              downloadUrl: y2mateUrl,
              playlistName: spotifyData.name
            }), {
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders()
              }
            })
          }
        }
      } catch (e) {
        console.error('Spotify API error:', e)
      }
      
      // Default fallback if we couldn't get Spotify data
      const y2mateUrl = `https://www.y2mate.com/youtube-playlist/${playlistUrl}`
      return new Response(JSON.stringify({ downloadUrl: y2mateUrl }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      })
    }

    // For any other URL, try the conversion API
    const apiUrl = 'https://onlinevideoconverter.pro/api/convert'
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify({
        url: playlistUrl,
        format: 'mp3',
        quality: 'high'
      })
    })

    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders()
      }
    })
  }
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

// Handle CORS preflight requests
function handleCORS(request) {
  return new Response(null, {
    headers: corsHeaders()
  })
} 