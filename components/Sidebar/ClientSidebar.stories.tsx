import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ClientSidebar, type SidebarItem } from "./ClientSidebar";

const meta: Meta<typeof ClientSidebar> = {
  title: "Components/ClientSidebar",
  component: ClientSidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof ClientSidebar>;

const clientItems: SidebarItem[] = [
  { key: "overview", label: "Overview" },
  { key: "invoices", label: "Invoices", count: 12 },
  { key: "appointments", label: "Appointments", count: 5 },
  { key: "documents", label: "Documents", count: 8 },
  { key: "notes", label: "Notes", count: 3 },
  { key: "contacts", label: "Contacts", count: 2 },
];

export const Default: Story = {
  args: {
    items: clientItems,
    activeKey: "invoices",
    heading: "Client",
  },
};

export const NoHeading: Story = {
  args: {
    items: clientItems,
    activeKey: "overview",
  },
};

export const NoCounts: Story = {
  args: {
    items: [
      { key: "details", label: "Details" },
      { key: "services", label: "Services" },
      { key: "billing", label: "Billing" },
      { key: "settings", label: "Settings" },
    ],
    activeKey: "details",
    heading: "Navigation",
  },
};

/** Interactive story that lets you click items to change the active state. */
export const Interactive: Story = {
  render: () => {
    const [active, setActive] = useState("invoices");
    return (
      <ClientSidebar
        items={clientItems}
        activeKey={active}
        onSelect={setActive}
        heading="Client"
      />
    );
  },
};

export const WithIcons: Story = {
  render: () => {
    const [active, setActive] = useState("overview");
    const items: SidebarItem[] = [
      {
        key: "overview",
        label: "Overview",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        ),
      },
      {
        key: "invoices",
        label: "Invoices",
        count: 12,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        key: "appointments",
        label: "Appointments",
        count: 5,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        key: "notes",
        label: "Notes",
        count: 3,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ),
      },
    ];

    return (
      <ClientSidebar
        items={items}
        activeKey={active}
        onSelect={setActive}
        heading="Client"
      />
    );
  },
};
