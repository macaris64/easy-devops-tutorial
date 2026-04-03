import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { HomePage } from "./pages/HomePage";
import { LogsPage } from "./pages/LogsPage";
import { UsersPage } from "./pages/UsersPage";

export function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<HomePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
