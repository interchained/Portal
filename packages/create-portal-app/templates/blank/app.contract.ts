import { defineApp } from "@interchained/portal-contract";

export default defineApp({
  name: "{{PROJECT_NAME}}",

  goals: [
    "Deliver value to visitors quickly",
    "Communicate clearly and honestly",
  ],

  brand: {
    voice: "clear, professional, helpful",
    colors: ["#0f172a", "#6366f1", "#f8fafc"],
    forbiddenPhrases: [],
  },

  policies: {
    auth: "none",
    publishing: "human_review",
    seo: true,
    accessibility: "basic",
    forbiddenClaims: [],
  },

  pages: [
    {
      route: "/",
      purpose: "Welcome visitors and communicate the core value proposition",
      primaryAction: "Learn more",
    },
  ],
});
