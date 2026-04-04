import type { Meta, StoryObj } from "@storybook/react";
import { RoleManagementPanel } from "./RoleManagementPanel";

const meta: Meta<typeof RoleManagementPanel> = {
  title: "UserPanel/RoleManagementPanel",
  component: RoleManagementPanel,
};

export default meta;

type Story = StoryObj<typeof RoleManagementPanel>;

export const Default: Story = {
  args: {
    listRoles: () =>
      Promise.resolve([
        { id: "r1", name: "admin" },
        { id: "r2", name: "user" },
      ]),
    createRole: (name) => Promise.resolve({ id: "new", name }),
    updateRole: (id, name) => Promise.resolve({ id, name }),
    deleteRole: (id) => Promise.resolve({ id, name: "deleted" }),
  },
};
