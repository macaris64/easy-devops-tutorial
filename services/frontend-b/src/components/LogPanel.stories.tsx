import type { Meta, StoryObj } from "@storybook/react";
import { LogPanel } from "./LogPanel";

const meta: Meta<typeof LogPanel> = {
  title: "LogPanel/LogPanel",
  component: LogPanel,
};

export default meta;

type Story = StoryObj<typeof LogPanel>;

const entries = [
  {
    id: "1",
    path: "/users",
    method: "POST",
    createdAt: "2026-04-03T09:00:00.000Z",
    createdUserId: "abc",
  },
];

export const Default: Story = {
  args: {
    title: "Audit log",
    entries,
    toolbar: <button type="button">Refresh</button>,
  },
};
