import { createFileRoute } from "@tanstack/react-router";
import GameApp from "../components/GameApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MYSHA IN THE MARS — Mars Outpost Survival" },
      {
        name: "description",
        content:
          "Prepare astronaut Mysha, launch PROTOCOL B-612, survive the crossing, land on Mars and run a Mars outpost in this cinematic 3D mission game.",
      },
      { property: "og:title", content: "MYSHA IN THE MARS — Mars Outpost Survival" },
      {
        property: "og:description",
        content:
          "A four-level 3D astronaut mission: equipment preparation, launch, oxygen emergency, guided Mars landing and outpost survival.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameApp,
});
