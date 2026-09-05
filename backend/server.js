require("dotenv").config();
const { loadEnv } = require("./config/env");

// Validate critical env variables unconditionally at boot
loadEnv();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");
const errorHandler = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const adminRoutes = require("./routes/admin");
const locationRoutes = require("./routes/location");
const weatherRoutes = require("./routes/weather");
const imageRoutes = require("./routes/image");
const cropsRoutes = require("./routes/crops");
const listingsRoutes = require("./routes/listings");
const ordersRoutes = require("./routes/orders");
const paymentsRoutes = require("./routes/payments");
const logisticsRoutes = require("./routes/logistics");
const insightsRoutes = require("./routes/insights");
const bulkRoutes = require("./routes/bulkOrders");

const app = express();

// Trust reverse proxies (nginx, Cloudflare, Render, etc.) for rate limiters
app.set("trust proxy", 1);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration — strict allowlist matching
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not permitted"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Express Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
};

if (process.env.MONGO_URI) {
  try {
    sessionConfig.store = MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      mongoOptions: { serverSelectionTimeoutMS: 5000 },
      clientPromise: mongoose.connection.asPromise().then((m) => m.connection.getClient()).catch(() => null),
    });
  } catch (err) {
    console.warn("⚠️ Failed to initialize Mongo session store:", err.message);
  }
}

app.use(session(sessionConfig));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/crops", cropsRoutes);
app.use("/api/listings", listingsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/logistics", logisticsRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/bulk", bulkRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Centralized error handler
app.use(errorHandler);

// Database Connection & Server Boot
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connection established");
    app.listen(PORT, () => {
      console.log(`🚀 AgriDirect Backend Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
