addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle the request
 * @param {Request} request
 */
async function handleRequest(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get playlist URL from request
    const reqData = await request.json()
    const playlistUrl = reqData.playlist_url
    
    if (!playlistUrl) {
      return new Response(JSON.stringify({ error: 'No playlist URL provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Forward request to a public YouTube downloader API
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
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 