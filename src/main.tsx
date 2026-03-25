import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LimitReached } from "./components/LimitReached";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";
import "@fontsource/material-symbols-outlined/400.css";

// Check if this is the limit popup window
const isLimitPopup = window.location.pathname === "/limit-popup";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isLimitPopup ? <LimitReached /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
