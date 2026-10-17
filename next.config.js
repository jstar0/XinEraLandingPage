/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Release builders may opt into a single worker; production receives a prebuilt package.
  ...(process.env.MCXIN_BUILD_CPUS === "1"
    ? { experimental: { cpus: 1 } }
    : {}),
  async headers() {
    return [
      {
        source: "/xinera/pbr/:asset([a-z0-9-]+-[a-f0-9]{12}\\.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
