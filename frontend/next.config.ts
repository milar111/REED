/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  basePath: isProd ? "/REED" : "",
  assetPrefix: isProd ? "/REED/" : "",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
