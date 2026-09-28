import { Component, StrictMode } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "Cheese Pilgrim could not render",
      error,
      info.componentStack,
    );
  }
  render() {
    return this.state.failed ? (
      <main className="error-page">
        <p className="eyebrow">CHEESE PILGRIM</p>
        <h1>A little detour.</h1>
        <p>The atlas couldn’t open. Your saved journal has not been changed.</p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
