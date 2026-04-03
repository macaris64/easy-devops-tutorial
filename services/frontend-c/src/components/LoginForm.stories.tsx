import type { Meta, StoryObj } from "@storybook/react";
import { LoginForm } from "./LoginForm";

const meta: Meta<typeof LoginForm> = {
  title: "UserPanel/LoginForm",
  component: LoginForm,
};

export default meta;

type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: {
    onSubmit: () => Promise.resolve(),
  },
};

export const WithError: Story = {
  args: {
    onSubmit: () => Promise.resolve(),
    errorMessage: "Invalid credentials",
  },
};
