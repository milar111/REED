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

    // If it's a Spotify URL, directly convert it to a Y2Mate URL
    if (playlistUrl.includes('spotify.com')) {
      // Extract playlist ID and name if available
      let playlistId = ""
      let playlistName = "Spotify Playlist"
      
      if (playlistUrl.includes('playlist/')) {
        playlistId = playlistUrl.split('playlist/')[1].split('?')[0]
        
        // Try to extract name from URL if present
        if (reqData.playlist_name) {
          playlistName = reqData.playlist_name
        }
      }
      
      // Create Y2Mate URL - use URL with the playlist name for better search results
      const y2mateUrl = `https://www.y2mate.com/youtube/${encodeURIComponent(playlistName)}`
      
      return new Response(JSON.stringify({ 
        downloadUrl: y2mateUrl,
        playlistId: playlistId,
        playlistName: playlistName
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders()
        }
      })
    }

    // For any other URL, just forward to Y2Mate
    const y2mateUrl = `https://www.y2mate.com/youtube/${encodeURIComponent(playlistUrl)}`
    return new Response(JSON.stringify({ downloadUrl: y2mateUrl }), {
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400' // 24 hours
  }
}

// Handle CORS preflight requests
function handleCORS(request) {
  return new Response(null, {
    headers: corsHeaders()
  })
} 