import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["final", "draft", "incomplete", "pending"],
    },
    label: {
      control: { type: "text" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Final: Story = {
  args: {
    variant: "final",
  },
};

export const Draft: Story = {
  args: {
    variant: "draft",
  },
};

export const Incomplete: Story = {
  args: {
    variant: "incomplete",
  },
};

export const Pending: Story = {
  args: {
    variant: "pending",
  },
};

export const CustomLabel: Story = {
  args: {
    variant: "final",
    label: "Approved",
  },
};

/** All badge variants displayed together for visual comparison. */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <Badge variant="final" />
      <Badge variant="draft" />
      <Badge variant="incomplete" />
      <Badge variant="pending" />
    </div>
  ),
};
