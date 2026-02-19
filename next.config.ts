import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Sharp to run server-side for image processing
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },

  images: {
    // Images are served via Supabase signed URLs, not Next.js Image Optimization
    // Unoptimized to avoid conflicts with externally signed URLs
    unoptimized: true,
  },
};

export default nextConfig;
