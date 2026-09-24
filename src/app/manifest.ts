import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "falar – Portugiesisch lernen",
    short_name: "falar",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#1f4e8c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
