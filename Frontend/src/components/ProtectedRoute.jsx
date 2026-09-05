import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <h2>Access Restricted</h2>
        <p>Your current role ({user.role}) does not have permission to access this portal.</p>
      </div>
    );
  }

  return children;
}
