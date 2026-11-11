import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Giftlaya — Online Gift, Cake & Flower Delivery",
    short_name: "Giftlaya",
    description:
      "Send cakes, flowers, personalised gifts & balloon decoration anywhere in India. Same-day and midnight delivery in 100+ cities.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#9b1b45",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

