import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com", // Matches regional S3 URLs (e.g. bucket.s3.us-east-1.amazonaws.com)
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net", // Matches CloudFront distribution endpoints
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // Authorized for default seeded mock images
      },
    ],
  },
};

export default nextConfig;
