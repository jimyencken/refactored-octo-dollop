import React from "react";
import styles from "./Badge.module.css";

export type BadgeVariant = "final" | "draft" | "incomplete" | "pending";

export interface BadgeProps {
  /** The visual variant of the badge */
  variant: BadgeVariant;
  /** Label text to display inside the badge. Defaults to the variant name. */
  label?: string;
}

const defaultLabels: Record<BadgeVariant, string> = {
  final: "Final",
  draft: "Draft",
  incomplete: "Incomplete",
  pending: "Pending",
};

/**
 * Status badge component matching Splose design patterns.
 *
 * Variants:
 * - **final** -- green filled badge (maps to "sent" in the existing CSS)
 * - **draft** -- grey/indigo outline badge
 * - **incomplete** -- red/triggered badge
 * - **pending** -- amber/yellow badge
 */
export const Badge: React.FC<BadgeProps> = ({ variant, label }) => {
  const text = label ?? defaultLabels[variant];

  return (
    <span className={`${styles.badge} ${styles[variant]}`} data-variant={variant}>
      {text}
    </span>
  );
};

export default Badge;
