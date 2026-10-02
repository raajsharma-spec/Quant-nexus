import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Friendly aliases for addresses people are likely to type. */
  async redirects() {
    return [
      { source: "/circuit", destination: "/lab", permanent: false },
      { source: "/circuit-lab", destination: "/lab", permanent: false },
      { source: "/tutor", destination: "/ai-tutor", permanent: false },
      { source: "/assess", destination: "/assessment", permanent: false },
      { source: "/analytics", destination: "/progress", permanent: false },
      { source: "/learning", destination: "/learn", permanent: false },
    ];
  },
};

export default nextConfig;
