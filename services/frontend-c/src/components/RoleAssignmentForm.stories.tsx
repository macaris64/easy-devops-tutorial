import type { Meta, StoryObj } from "@storybook/react";
import { RoleAssignmentForm } from "./RoleAssignmentForm";

const meta: Meta<typeof RoleAssignmentForm> = {
  title: "UserPanel/RoleAssignmentForm",
  component: RoleAssignmentForm,
};

export default meta;

type Story = StoryObj<typeof RoleAssignmentForm>;

export const Default: Story = {
  args: {
    roles: [
      { id: "r1", name: "admin" },
      { id: "r2", name: "user" },
    ],
    onAssign: () => Promise.resolve(),
  },
};
