import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kairos — study space for ADHD brains",
    short_name: "Kairos",
    description:
      "A calm, shame-free study and productivity space designed around ADHD: visual timers, a distraction parking lot, task chunking, and study tools.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#84a59d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
