/** @type {import('next').NextConfig} */
const apiProxyUrl = process.env.API_PROXY_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@erp/types"],
  outputFileTracing: false,
  async rewrites() {
    const apiRoutes = [
      "auth",
      "dashboard",
      "company",
      "branches",
      "departments",
      "warehouses",
      "cost-centers",
      "roles",
      "users",
      "audit-logs",
      "master-data",
      "sales",
      "purchase",
      "inventory",
      "accounting",
      "hr",
      "reports",
      "attachments"
    ];

    return apiRoutes.map((route) => ({
      source: `/${route}/:path*`,
      destination: `${apiProxyUrl}/${route}/:path*`
    }));
  }
};

export default nextConfig;
