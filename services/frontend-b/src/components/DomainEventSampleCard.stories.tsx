import type { Meta, StoryObj } from "@storybook/react";
import { DomainEventSampleCard } from "./DomainEventSampleCard";

const meta: Meta<typeof DomainEventSampleCard> = {
  title: "LogPanel/DomainEventSampleCard",
  component: DomainEventSampleCard,
};

export default meta;

type Story = StoryObj<typeof DomainEventSampleCard>;

export const UserCreated: Story = {
  args: {
    title: "user.created",
    description: "Admin or registration path.",
    example: {
      event: "user",
      data: "user.created",
      user_id: "abc",
      username: "sam",
      email: "sam@example.com",
      source: "registration",
      timestamp: "2026-04-04T12:00:00.000Z",
    },
  },
};
