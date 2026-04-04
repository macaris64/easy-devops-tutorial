import type { Meta, StoryObj } from "@storybook/react";
import { CurrentUserCard } from "./CurrentUserCard";

const meta: Meta<typeof CurrentUserCard> = {
  title: "Auth/CurrentUserCard",
  component: CurrentUserCard,
};

export default meta;

type Story = StoryObj<typeof CurrentUserCard>;

export const Empty: Story = {
  args: {
    user: null,
    emptyLabel: "Sign in to see your profile.",
  },
};

export const WithUser: Story = {
  args: {
    user: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      username: "admin",
      email: "admin@example.com",
      roles: ["admin"],
    },
  },
};

export const WithRefresh: Story = {
  args: {
    ...WithUser.args,
    onRefresh: () => Promise.resolve(),
    refreshing: false,
  },
};
