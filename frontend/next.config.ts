/** @type {import('next').NextConfig} */
const isProd = process.env.Node_ENV === "production";
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isProd ? "/REED" : "", 
  assetPrefix: isProd ? "/REED/" : "",
};

module.exports = nextConfig;
