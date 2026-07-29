/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  outputFileTracingIncludes: {
    "/api/generate-pdf": [
      "./node_modules/playwright-core/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
