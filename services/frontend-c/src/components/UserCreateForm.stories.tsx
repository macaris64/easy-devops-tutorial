import type { Meta, StoryObj } from "@storybook/react";
import { UserCreateForm } from "./UserCreateForm";

const meta: Meta<typeof UserCreateForm> = {
  title: "UserPanel/UserCreateForm",
  component: UserCreateForm,
};

export default meta;

type Story = StoryObj<typeof UserCreateForm>;

export const Default: Story = {
  args: {
    onSubmit: () => undefined,
    errorMessage: null,
  },
};

export const WithError: Story = {
  args: {
    onSubmit: () => undefined,
    errorMessage: "Username already taken",
  },
};
