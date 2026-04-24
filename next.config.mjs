/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  generateEtags: true,
  compress: true,
};

export default nextConfig;
