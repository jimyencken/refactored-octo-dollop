import type { Meta, StoryObj } from "@storybook/react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { Badge, type BadgeVariant } from "../Badge";

const meta: Meta<typeof DataTable> = {
  title: "Components/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// ---- Sample data modelling Splose invoice/document rows ----

interface InvoiceRow extends Record<string, unknown> {
  id: number;
  client: string;
  service: string;
  date: string;
  amount: number;
  status: BadgeVariant;
}

const sampleInvoices: InvoiceRow[] = [
  { id: 1, client: "Jane Cooper", service: "Initial Assessment", date: "2025-03-14", amount: 193.99, status: "final" },
  { id: 2, client: "Wade Warren", service: "Review of Report", date: "2025-03-13", amount: 193.99, status: "draft" },
  { id: 3, client: "Esther Howard", service: "Capacity Assessment", date: "2025-03-12", amount: 386.0, status: "pending" },
  { id: 4, client: "Cameron Williams", service: "Plan Management", date: "2025-03-11", amount: 65.09, status: "incomplete" },
  { id: 5, client: "Brooklyn Simmons", service: "Therapy Session", date: "2025-03-10", amount: 193.99, status: "final" },
  { id: 6, client: "Leslie Alexander", service: "Support Coordination", date: "2025-03-09", amount: 150.0, status: "final" },
  { id: 7, client: "Jenny Wilson", service: "Initial Assessment", date: "2025-03-08", amount: 193.99, status: "draft" },
  { id: 8, client: "Guy Hawkins", service: "Plan Review", date: "2025-03-07", amount: 250.0, status: "pending" },
  { id: 9, client: "Jacob Jones", service: "Therapy Session", date: "2025-03-06", amount: 193.99, status: "final" },
  { id: 10, client: "Kristin Watson", service: "Support Coordination", date: "2025-03-05", amount: 300.0, status: "incomplete" },
  { id: 11, client: "Courtney Henry", service: "Capacity Assessment", date: "2025-03-04", amount: 386.0, status: "final" },
  { id: 12, client: "Ralph Edwards", service: "Therapy Session", date: "2025-03-03", amount: 193.99, status: "draft" },
];

const invoiceColumns: DataTableColumn<InvoiceRow>[] = [
  { key: "client", label: "Client", sortable: true },
  { key: "service", label: "Service", sortable: true },
  { key: "date", label: "Date", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (value) => `$${(value as number).toFixed(2)}`,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => <Badge variant={value as BadgeVariant} />,
  },
];

export const Default: Story = {
  args: {
    columns: invoiceColumns as DataTableColumn<Record<string, unknown>>[],
    data: sampleInvoices,
    pageSize: 5,
  },
};

export const SinglePage: Story = {
  args: {
    columns: invoiceColumns as DataTableColumn<Record<string, unknown>>[],
    data: sampleInvoices.slice(0, 4),
    pageSize: 10,
  },
};

export const EmptyState: Story = {
  args: {
    columns: invoiceColumns as DataTableColumn<Record<string, unknown>>[],
    data: [],
    pageSize: 10,
  },
};

export const ClickableRows: Story = {
  args: {
    columns: invoiceColumns as DataTableColumn<Record<string, unknown>>[],
    data: sampleInvoices.slice(0, 5),
    pageSize: 10,
    onRowClick: (row: Record<string, unknown>) => {
      alert(`Clicked row: ${row.client}`);
    },
  },
};
