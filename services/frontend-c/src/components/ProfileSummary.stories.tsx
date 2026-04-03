import type { Meta, StoryObj } from "@storybook/react";
import { ProfileSummary } from "./ProfileSummary";

const meta: Meta<typeof ProfileSummary> = {
  title: "UserPanel/ProfileSummary",
  component: ProfileSummary,
};

export default meta;

type Story = StoryObj<typeof ProfileSummary>;

export const SignedIn: Story = {
  args: {
    user: { username: "admin", email: "admin@example.com", roles: ["admin"] },
    onLogout: () => undefined,
  },
};

export const Empty: Story = {
  args: {
    user: null,
  },
};
