import type { Meta, StoryObj } from "@storybook/react";
import { RoleBadgeList } from "./RoleBadgeList";

const meta: Meta<typeof RoleBadgeList> = {
  title: "UserPanel/RoleBadgeList",
  component: RoleBadgeList,
};

export default meta;

type Story = StoryObj<typeof RoleBadgeList>;

export const Default: Story = {
  args: {
    roles: ["admin", "user"],
  },
};
