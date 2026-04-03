import type { Meta, StoryObj } from "@storybook/react";
import { LogTable } from "./LogTable";

const meta: Meta<typeof LogTable> = {
  title: "LogPanel/LogTable",
  component: LogTable,
};

export default meta;

type Story = StoryObj<typeof LogTable>;

const sampleEntries = [
  {
    id: "a",
    path: "/users",
    method: "POST",
    createdAt: "2026-04-03T10:00:00.000Z",
    createdUserId: "u1",
  },
  {
    id: "b",
    path: "/health",
    method: "GET",
    createdAt: "2026-04-03T10:01:00.000Z",
  },
];

export const WithRows: Story = {
  args: { entries: sampleEntries },
};

export const Empty: Story = {
  args: { entries: [] },
};
