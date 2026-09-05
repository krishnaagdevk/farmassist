const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "SESSION_SECRET",
  "ADMIN_INVITE_CODE",
];

function loadEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    console.error("Please configure these in backend/.env before running the server.");
    process.exit(1);
  }
}

module.exports = { loadEnv };
