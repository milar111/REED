/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  assetPrefix: isProd ? '/REED/' : '',
  images: {
    unoptimized: true, 
  },
  basePath: isProd ? '/REED' : '',
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' https://www.google-analytics.com https://ssl.google-analytics.com https://www.google.com https://www.gstatic.com/recaptcha/ https://www.google.com/recaptcha/ https://*.googletagmanager.com https://accounts.scdn.co; img-src 'self' data: https://*; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://reed-gilt.vercel.app https://api.spotify.com https://*.ingest.sentry.io;`
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://reed-gilt.vercel.app'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
