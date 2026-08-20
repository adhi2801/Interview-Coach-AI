import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: info });
    }
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#0a0a0f",
          color: "#e2e8f0",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#94a3b8", maxWidth: "28rem" }}>
            This screen hit an unexpected error. Your interview progress up to this point is saved.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "0.5rem",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#e2e8f0",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}