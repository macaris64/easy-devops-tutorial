import type { Meta, StoryObj } from "@storybook/react";
import { UserListTable } from "./UserListTable";

const meta: Meta<typeof UserListTable> = {
  title: "UserPanel/UserListTable",
  component: UserListTable,
};

export default meta;

type Story = StoryObj<typeof UserListTable>;

export const ReadOnly: Story = {
  args: {
    users: [
      { id: "1", username: "alice", email: "alice@example.com", roles: ["user"] },
      { id: "2", username: "bob", email: "bob@example.com" },
    ],
  },
};

export const WithActions: Story = {
  args: {
    users: [{ id: "1", username: "alice", email: "alice@example.com" }],
    onEditStart: () => undefined,
    onDelete: () => undefined,
  },
};
