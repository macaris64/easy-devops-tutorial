import type { Meta, StoryObj } from "@storybook/react";
import { LogEntryRow } from "./LogEntryRow";

const meta: Meta<typeof LogEntryRow> = {
  title: "LogPanel/LogEntryRow",
  component: LogEntryRow,
};

export default meta;

type Story = StoryObj<typeof LogEntryRow>;

export const Default: Story = {
  args: {
    entry: {
      id: "1",
      path: "/users",
      method: "POST",
      createdAt: "2026-04-03T12:00:00.000Z",
      createdUserId: "usr_1",
      payload: { username: "alice" },
    },
  },
};
