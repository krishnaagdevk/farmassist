require("dotenv").config();
const { loadEnv } = require("./config/env");

// Validate critical env variables (fails closed in production)
if (process.env.NODE_ENV === "production") {
  loadEnv();
}

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

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("CORS origin not permitted"));
      }
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
  secret: process.env.SESSION_SECRET || "agridirect-session-secret-local-dev-2026",
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

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AgriDirect API",
    time: new Date().toISOString(),
  });
});

// Terminal Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

function startServer() {
  app.listen(PORT, () =>
    console.log(`🚀 AgriDirect API running on http://localhost:${PORT}`)
  );
}

if (process.env.MONGO_URI) {
  // Prevent background connection errors from crashing the process
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB background error:", err.message);
  });

  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast — don't hang nodemon
    })
    .then(() => {
      console.log("✅ MongoDB connected");
      startServer();
    })
    .catch((err) => {
      console.warn(`⚠️  MongoDB unavailable (${err.message}). Starting without DB — auth/data routes will error until DB is reachable.`);
      startServer();
    });
} else {
  console.warn("⚠️  MONGO_URI not set. Starting without database.");
  startServer();
}

module.exports = app;
