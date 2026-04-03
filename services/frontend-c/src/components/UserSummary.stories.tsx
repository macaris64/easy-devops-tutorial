import type { Meta, StoryObj } from "@storybook/react";
import { UserSummary } from "./UserSummary";

const meta: Meta<typeof UserSummary> = {
  title: "UserPanel/UserSummary",
  component: UserSummary,
};

export default meta;

type Story = StoryObj<typeof UserSummary>;

export const Empty: Story = {
  args: { user: null },
};

export const Filled: Story = {
  args: {
    user: {
      id: "usr_1",
      username: "alice",
      email: "alice@example.com",
    },
  },
};
