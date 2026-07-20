/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@erp/types"],
  outputFileTracing: false
};

export default nextConfig;
