/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/lab/rolescout",
        destination: "https://www.getrolescout.com/",
        permanent: true,
      },
      {
        source: "/lab/rolescout/:path*",
        destination: "https://www.getrolescout.com/:path*",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
