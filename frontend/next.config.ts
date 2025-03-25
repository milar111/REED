/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  assetPrefix: isProd ? '/REED/' : '',
  images: {
    unoptimized: true, 
  },
  basePath: isProd ? '/REED' : '',
  // Add trailing slashes to ensure proper asset loading
  trailingSlash: true,
  // Ensure proper handling of CSS
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    });
    return config;
  },
};

module.exports = nextConfig;
