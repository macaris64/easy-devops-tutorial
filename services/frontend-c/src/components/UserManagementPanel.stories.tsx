import type { Meta, StoryObj } from "@storybook/react";
import { UserManagementPanel } from "./UserManagementPanel";

const meta: Meta<typeof UserManagementPanel> = {
  title: "UserPanel/UserManagementPanel",
  component: UserManagementPanel,
};

export default meta;

type Story = StoryObj<typeof UserManagementPanel>;

export const MockSuccess: Story = {
  args: {
    createUser: (username, email) =>
      Promise.resolve({
        id: "mock-id",
        username,
        email,
      }),
  },
};

export const WithDirectory: Story = {
  args: {
    createUser: (username, email) =>
      Promise.resolve({
        id: "new",
        username,
        email,
      }),
    listUsers: () =>
      Promise.resolve([
        { id: "1", username: "alice", email: "alice@example.com", roles: ["user"] },
      ]),
    updateUser: (id, patch) =>
      Promise.resolve({
        id,
        username: patch.username ?? "alice",
        email: "alice@example.com",
      }),
    deleteUser: () => Promise.resolve(undefined),
  },
};
