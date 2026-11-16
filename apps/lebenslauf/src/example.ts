import type { Section } from "./schema.ts";

/**
 * Example sections of an invented person, so that a new user sees the design at once.
 * `id` gives each section and entry a new ID.
 */
export function exampleSections(id: () => string): Section[] {
  return [
    {
      id: id(),
      title: "Projects",
      kind: "projects",
      entries: [
        {
          id: id(),
          title: "Order Analytics Platform",
          description:
            "Designing and developing a platform that analyzes the orders of an online shop.",
          tasks: [
            "Developing REST APIs with FastAPI",
            "Designing PostgreSQL data models",
            "Automating the delivery with CI/CD pipelines",
          ],
          tools: ["Python", "FastAPI", "PostgreSQL", "Docker", "GitHub Actions"],
        },
        {
          id: id(),
          title: "Cloud Migration",
          description: "Moving the data processing of a customer into the cloud.",
          tasks: ["Provisioning the infrastructure as code", "Monitoring and alerting"],
          tools: ["Terraform", "Azure", "Grafana"],
        },
      ],
    },
    {
      id: id(),
      title: "Work History",
      kind: "stations",
      entries: [
        {
          id: id(),
          from: "2024-01",
          to: null,
          title: "Freelancer",
          subtitle: "Software | Data | Cloud",
          bullets: [],
        },
        {
          id: id(),
          from: "2021-03",
          to: "2023-12",
          title: "Data Engineer",
          subtitle: "Beispiel GmbH, Köln",
          bullets: ["Building data pipelines", "Training machine learning models"],
        },
      ],
    },
    {
      id: id(),
      title: "Education",
      kind: "stations",
      entries: [
        {
          id: id(),
          from: "2018-10",
          to: "2021-02",
          title: "MSc Computer Science",
          subtitle: "University of Cologne",
          bullets: ["Master thesis: Image segmentation with neural networks"],
        },
      ],
    },
    {
      id: id(),
      title: "Skills",
      kind: "list",
      entries: [
        { id: id(), label: "Languages", items: ["German (native)", "English (fluent)"] },
        { id: id(), label: "Certifications", items: ["Cloud Fundamentals", "Data Fundamentals"] },
      ],
    },
  ];
}
