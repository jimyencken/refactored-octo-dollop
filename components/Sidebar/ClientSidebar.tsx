"use client";

import React from "react";
import styles from "./ClientSidebar.module.css";

export interface SidebarItem {
  /** Unique identifier for the item */
  key: string;
  /** Display label */
  label: string;
  /** Optional count badge shown to the right */
  count?: number;
  /** Optional icon element rendered before the label */
  icon?: React.ReactNode;
}

export interface ClientSidebarProps {
  /** The list of navigation items */
  items: SidebarItem[];
  /** Key of the currently active item */
  activeKey: string;
  /** Called when an item is clicked */
  onSelect?: (key: string) => void;
  /** Optional heading displayed above the item list */
  heading?: string;
}

/**
 * Client-page sidebar navigation matching Splose design patterns.
 *
 * Features:
 * - Purple active-state indicator (left border + background highlight)
 * - Item counts rendered as muted badges
 * - Compact vertical layout suitable for client detail pages
 */
export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  items,
  activeKey,
  onSelect,
  heading,
}) => {
  return (
    <nav className={styles.sidebar} aria-label={heading ?? "Sidebar navigation"}>
      {heading && <div className={styles.heading}>{heading}</div>}
      <ul className={styles.list}>
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <li key={item.key}>
              <button
                className={`${styles.item} ${isActive ? styles.active : ""}`}
                onClick={() => onSelect?.(item.key)}
                aria-current={isActive ? "page" : undefined}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
                {item.count != null && (
                  <span className={styles.count}>{item.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ClientSidebar;
