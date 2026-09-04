import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google profile photos. Without this, next/image refuses the external URL
    // that Auth.js stores on User.image.
    remotePatterns: [new URL("https://lh3.googleusercontent.com/**")],
  },
};

export default nextConfig;
