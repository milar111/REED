/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', 
  assetPrefix: './', 
  images: {
    unoptimized: true, 
  },
  basePath: '/REED', 
};

module.exports = nextConfig;
