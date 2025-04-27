/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy specific API endpoints to the backend
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/login',
        destination: 'http://localhost:8000/login',
      },
      {
        source: '/user/:path*',
        destination: 'http://localhost:8000/user/:path*',
      },
      {
        source: '/pregnancy/:path*',
        destination: 'http://localhost:8000/pregnancy/:path*',
      },
      {
        source: '/periodcare/:path*',
        destination: 'http://localhost:8000/periodcare/:path*',
      },
      {
        source: '/appointment/:path*',
        destination: 'http://localhost:8000/appointment/:path*',
      }
    ];
  },
};

module.exports = nextConfig; 