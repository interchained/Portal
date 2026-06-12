import { defineApp } from "@interchained/portal-contract";

export default defineApp({
  name: "{{PROJECT_NAME}}",
  version: "1.1.0",

  description:
    "A startup landing page template for converting visitors into users, subscribers, or customers.",

  primaryAudience: [
    "Startup founders",
    "Early adopters",
    "Small teams evaluating new software",
  ],

  goals: [
    "Communicate the product value proposition in under 10 seconds",
    "Convert visitors into signed-up users or email subscribers",
    "Build trust through social proof and transparent pricing",
    "Rank for the primary keyword in organic search",
  ],

  brand: {
    voice: "confident, clear, founder-direct — no buzzwords, no fluff",
    colors: ["#0f172a", "#6366f1", "#a78bfa", "#f8fafc"],
    fonts: ["Inter", "system-ui"],
    forbiddenPhrases: [
      "world-class",
      "best-in-class",
      "game-changer",
      "synergy",
      "leverage",
      "seamless",
    ],
  },

  data: {
    pricing:      "./data/pricing.json",
    testimonials: "./data/testimonials.json",
    faq:          "./data/faq.json",
  },

  conversion: {
    primaryGoal:   "Start free trial",
    secondaryGoal: "Join email list",
    successEvents: [
      "signup_started",
      "email_subscribed",
      "pricing_plan_selected",
    ],
  },

  seo: {
    enabled:            true,
    primaryKeyword:     "{{PROJECT_NAME}}",
    titleTemplate:      "%s | {{PROJECT_NAME}}",
    defaultDescription: "Clear, founder-direct software for teams that want results without fluff.",
    sitemap:            true,
    robots:             true,
  },

  policies: {
    auth:          "optional",
    publishing:    "human_review",
    accessibility: "strict",
    forbiddenClaims: [
      "guaranteed ROI",
      "risk-free",
      "100% uptime",
    ],
  },

  compliance: {
    requireHumanReviewFor: [
      "pricing changes",
      "legal claims",
      "testimonial edits",
      "security claims",
      "performance claims",
    ],
  },

  integrations: {
    analytics:     "optional",
    emailProvider: "optional",
    payments:      "optional",
  },

  qualityGates: {
    maxBrokenLinks:         0,
    requireMetaTitle:       true,
    requireMetaDescription: true,
    requireH1:              true,
    requirePrimaryCTA:      true,
    requireAltText:         true,
    forbidPlaceholderCopy:  true,
    forbidUnreplacedTokens: true,
  },

  pages: [
    {
      route:         "/",
      purpose:       "Land visitors, communicate core value, drive sign-ups",
      audience:      "Early adopters and startup founders",
      primaryAction: "Start free trial",
      seoKeyword:    "{{PROJECT_NAME}}",
    },
    {
      route:         "/pricing",
      purpose:       "Convert interest into payment — transparent, no tricks",
      audience:      "Visitors comparing cost, value, and trust",
      primaryAction: "Choose a plan",
      seoKeyword:    "{{PROJECT_NAME}} pricing",
    },
    {
      route:         "/about",
      purpose:       "Build founder trust — who we are, why we built this",
      audience:      "Visitors looking for credibility and founder context",
      primaryAction: "Follow our journey",
      seoKeyword:    "about {{PROJECT_NAME}}",
    },
  ],
});
