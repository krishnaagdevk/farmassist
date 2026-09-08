import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FloatingNav from "./components/FloatingNav/FloatingNav";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Landing from "./Pages/Landing/Landing";
import Home from "./Pages/Home/Home";
import LoginModal from "./Pages/Home/LoginModal";
import Dashboard from "./Pages/Home/Dashboard";
import Chatbox from "./Pages/Home/Chatbox";
import Storefront from "./Pages/Market/Storefront";
import ListingDetail from "./Pages/Market/ListingDetail";
import Cart from "./Pages/Market/Cart";
import Checkout from "./Pages/Market/Checkout";
import OrderList from "./Pages/Orders/OrderList";
import OrderTrack from "./Pages/Orders/OrderTrack";
import FarmerDashboard from "./Pages/Farmer/FarmerDashboard";
import DispatchBoard from "./Pages/Dispatch/DispatchBoard";
import DriverRun from "./Pages/Driver/DriverRun";
import BulkMarket from "./Pages/Bulk/BulkMarket";
import FPODashboard from "./Pages/FPO/FPODashboard";

function App() {
  return (
    <div className="app-container">
      <FloatingNav />
      <main className="main-content">
        <Routes>
          {/* Public Landing & Market */}
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginModal />} />
          <Route path="/market" element={<Storefront />} />
          <Route path="/market/:id" element={<ListingDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route path="/bulk" element={<BulkMarket />} />
          <Route path="/chat" element={<Chatbox />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/advisory" element={<Dashboard />} />

          {/* Customer Orders */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderTrack />
              </ProtectedRoute>
            }
          />

          {/* Farmer & FPO Command Center */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute allowedRoles={["farmer", "fpo", "admin"]}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          {/* FPO Federation & Collective Pooling Hub */}
          <Route
            path="/fpo"
            element={
              <ProtectedRoute allowedRoles={["fpo", "farmer", "admin"]}>
                <FPODashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Dispatch Optimization Console */}
          <Route
            path="/dispatch"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <DispatchBoard />
              </ProtectedRoute>
            }
          />

          {/* Driver Execution Run Sheet */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={["driver", "admin"]}>
                <DriverRun />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
