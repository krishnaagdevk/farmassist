import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", margin: "1rem auto", maxWidth: "600px", background: "#fff1f0", border: "1px solid #ffa39e", borderRadius: "8px", textAlign: "center" }}>
          <h3 style={{ color: "#cf1322" }}>Something went wrong in this section</h3>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>{this.state.error?.message || "An unexpected error occurred"}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ padding: "8px 16px", background: "#1b5e20", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
