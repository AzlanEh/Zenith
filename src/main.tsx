import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "@fontsource/newsreader";
import "@fontsource/inter";
import "@fontsource/geist-mono";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const windowLabel = getCurrentWindow().label;

if (windowLabel === "limit-popup") {
  // Lightweight render for the limit popup — no query client or heavy providers
  import("./pages/LimitPopupPage").then(({ LimitPopupPage }) => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <LimitPopupPage />
      </React.StrictMode>,
    );
  });
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
      },
    },
  });

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary><App /></ErrorBoundary>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
