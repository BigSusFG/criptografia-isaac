import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const owner = process.env.GITHUB_REPOSITORY_OWNER;
const isGitHubPages = process.env.GITHUB_ACTIONS === "true" && repository && owner;
const isUserSite = repository === `${owner}.github.io`;

export default defineConfig({
  site: isGitHubPages ? `https://${owner}.github.io` : undefined,
  base: isGitHubPages && !isUserSite ? `/${repository}` : "/",
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
