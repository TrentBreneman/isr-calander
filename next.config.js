/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/israutomizer",
  assetPrefix: "/israutomizer",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
