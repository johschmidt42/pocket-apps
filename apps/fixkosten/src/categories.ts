import type { Category, IconName } from "./schema.ts";

export type CategoryInfo = {
  label: string;
  /** The default icon of a cost in this category. */
  icon: IconName;
  /** The chart color as a CSS value, for SVG attributes. */
  color: string;
  /** The chart color as Tailwind classes. Full class names, so that Tailwind finds them. */
  swatchClass: string;
  iconClass: string;
};

/** German labels, icons and colors of the categories. The colors follow the palette order. */
export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  housing: {
    label: "Wohnen",
    icon: "house",
    color: "var(--chart-1)",
    swatchClass: "bg-chart-1",
    iconClass: "bg-chart-1/15 text-chart-1",
  },
  energy: {
    label: "Energie & Wasser",
    icon: "zap",
    color: "var(--chart-2)",
    swatchClass: "bg-chart-2",
    iconClass: "bg-chart-2/15 text-chart-2",
  },
  communication: {
    label: "Internet & Medien",
    icon: "wifi",
    color: "var(--chart-3)",
    swatchClass: "bg-chart-3",
    iconClass: "bg-chart-3/15 text-chart-3",
  },
  mobility: {
    label: "Mobilität",
    icon: "car",
    color: "var(--chart-4)",
    swatchClass: "bg-chart-4",
    iconClass: "bg-chart-4/15 text-chart-4",
  },
  insurance: {
    label: "Versicherungen",
    icon: "shield",
    color: "var(--chart-5)",
    swatchClass: "bg-chart-5",
    iconClass: "bg-chart-5/15 text-chart-5",
  },
  health: {
    label: "Gesundheit & Sport",
    icon: "heart-pulse",
    color: "var(--chart-6)",
    swatchClass: "bg-chart-6",
    iconClass: "bg-chart-6/15 text-chart-6",
  },
  savings: {
    label: "Sparen & Vorsorge",
    icon: "piggy-bank",
    color: "var(--chart-7)",
    swatchClass: "bg-chart-7",
    iconClass: "bg-chart-7/15 text-chart-7",
  },
  household: {
    label: "Haushalt & Familie",
    icon: "users",
    color: "var(--chart-8)",
    swatchClass: "bg-chart-8",
    iconClass: "bg-chart-8/15 text-chart-8",
  },
  other: {
    label: "Sonstiges",
    icon: "receipt",
    color: "var(--chart-other)",
    swatchClass: "bg-chart-other",
    iconClass: "bg-chart-other/15 text-muted-foreground",
  },
};
