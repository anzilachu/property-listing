import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPage } from "./pages/AdminPage";
import { ClientShell } from "./pages/ClientShell";
import { ListingsPage } from "./pages/ListingsPage";
import { AgentsPage } from "./pages/AgentsPage";
import { OwnersPage } from "./pages/OwnersPage";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin/login" replace />,
  },
  { path: "/admin/login", element: <AdminLoginPage /> },
  { path: "/admin", element: <AdminPage /> },
  {
    path: "/:clientId",
    element: <ClientShell />,
    children: [
      { index: true, element: <ListingsPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "owners", element: <OwnersPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/admin/login" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
