import type { Survey } from "@/domain/survey/survey";

export const demoSurveys: Survey[] = [
  {
    id: "workplace-pulse",
    title: "A better way to work, together",
    description:
      "What makes a good working week? Share what is working, what is not, and one thing you would change about your everyday work experience.",
    eligibility:
      "Current members of the Northstar team. In this demo, you choose the eligibility outcome yourself; no membership is actually checked.",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2030-01-01T00:00:00.000Z",
    responseCount: 0,
  },
  {
    id: "community-spaces",
    title: "Make room for your community",
    description:
      "Help shape the spaces we share. Tell us what would make your local community a little more connected.",
    eligibility:
      "Members of the Common Ground community. Membership verification is simulated in this development prototype.",
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2030-02-01T00:00:00.000Z",
    responseCount: 0,
  },
  {
    id: "campus-experience",
    title: "Your campus, your perspective",
    description:
      "From study spaces to student support, help us understand what matters most to your campus experience.",
    eligibility:
      "Currently enrolled students. Real student credentials are not collected or verified in this demo.",
    startsAt: "2030-04-01T00:00:00.000Z",
    endsAt: "2030-05-01T00:00:00.000Z",
    responseCount: 0,
  },
  {
    id: "product-listening",
    title: "Small changes, better everyday tools",
    description:
      "A listening session about the tools you use every day. This example is closed; individual responses and results are not published.",
    eligibility: "Members of the product research group.",
    startsAt: "2025-01-01T00:00:00.000Z",
    endsAt: "2025-02-01T00:00:00.000Z",
    responseCount: 0,
  },
];
