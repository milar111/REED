/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  assetPrefix: isProd ? '/REED/' : '',
  images: {
    unoptimized: true, 
  },
  basePath: isProd ? '/REED' : '',
};

module.exports = nextConfig;
