import type { Meta, StoryObj } from "@storybook/react";
import { DomainEventTypeList } from "./DomainEventTypeList";

const meta: Meta<typeof DomainEventTypeList> = {
  title: "LogPanel/DomainEventTypeList",
  component: DomainEventTypeList,
};

export default meta;

type Story = StoryObj<typeof DomainEventTypeList>;

export const Default: Story = {};
