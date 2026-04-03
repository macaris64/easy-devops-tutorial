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
