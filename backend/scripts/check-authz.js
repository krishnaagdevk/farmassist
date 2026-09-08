process.env.JWT_SECRET = process.env.JWT_SECRET || "sih-agridirect-secret-test-2026";
const jwt = require("jsonwebtoken");
const { verifyToken, requireRole } = require("../middleware/auth");

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

function runAuthzCheck() {
  console.log("\n=======================================================");
  console.log("🧪 [CHECK 3/3] Verifying Multi-Tenant Role-Based Access Control (RBAC)");
  console.log("=======================================================");

  const adminToken = jwt.sign({ sub: "user_admin_1", role: "admin" }, process.env.JWT_SECRET);
  const farmerToken = jwt.sign({ sub: "user_farmer_1", role: "farmer" }, process.env.JWT_SECRET);
  const buyerToken = jwt.sign({ sub: "user_buyer_1", role: "buyer" }, process.env.JWT_SECRET);
  const driverToken = jwt.sign({ sub: "user_driver_1", role: "driver" }, process.env.JWT_SECRET);

  // 1. Unauthenticated Request Guard
  console.log("🔒 1. Testing Unauthenticated Request (Token missing)...");
  {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;

    verifyToken(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled || res.statusCode !== 401 || res.body?.error !== "no_token") {
      throw new Error(`Expected 401 no_token, got status ${res.statusCode}`);
    }
    console.log("✅ Missing token rejected with 401 Unauthorized");
  }

  // 2. Invalid JWT Signature Guard
  console.log("🔒 2. Testing Invalid JWT Signature (Tampered token)...");
  {
    const req = { headers: { authorization: "Bearer invalid.tampered.token" } };
    const res = mockRes();
    let nextCalled = false;

    verifyToken(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled || res.statusCode !== 403 || res.body?.error !== "invalid_token") {
      throw new Error(`Expected 403 invalid_token, got status ${res.statusCode}`);
    }
    console.log("✅ Tampered token rejected with 403 Forbidden");
  }

  // 3. Role Escalation: Farmer attempting to execute Admin Logistics Plan
  console.log("🔒 3. Testing Role Privilege Escalation (Farmer accessing Admin endpoint)...");
  {
    const req = { headers: { authorization: `Bearer ${farmerToken}` } };
    const res = mockRes();
    let nextCalled = false;

    const adminGuard = requireRole("admin");
    adminGuard(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled || res.statusCode !== 403 || res.body?.error !== "forbidden_role") {
      throw new Error(`Expected 403 forbidden_role, got status ${res.statusCode}`);
    }
    console.log("✅ Farmer blocked from Admin route with 403 Forbidden");
  }

  // 4. Role Escalation: Buyer attempting to list Produce as Farmer
  console.log("🔒 4. Testing Role Privilege Escalation (Buyer accessing Farmer endpoint)...");
  {
    const req = { headers: { authorization: `Bearer ${buyerToken}` } };
    const res = mockRes();
    let nextCalled = false;

    const farmerGuard = requireRole("farmer", "fpo");
    farmerGuard(req, res, () => {
      nextCalled = true;
    });

    if (nextCalled || res.statusCode !== 403 || res.body?.error !== "forbidden_role") {
      throw new Error(`Expected 403 forbidden_role, got status ${res.statusCode}`);
    }
    console.log("✅ Buyer blocked from Farmer listing route with 403 Forbidden");
  }

  // 5. Authorized Admin Execution
  console.log("🔓 5. Testing Authorized Access (Admin accessing Admin endpoint)...");
  {
    const req = { headers: { authorization: `Bearer ${adminToken}` } };
    const res = mockRes();
    let nextCalled = false;

    const adminGuard = requireRole("admin");
    adminGuard(req, res, () => {
      nextCalled = true;
    });

    if (!nextCalled || res.statusCode !== 200) {
      throw new Error(`Expected admin to pass role check, got status ${res.statusCode}`);
    }
    console.log("✅ Admin authorized and permitted to execute administrative commands");
  }

  // 6. Authorized Driver Execution
  console.log("🔓 6. Testing Authorized Driver Access (Driver accessing transit run sheet)...");
  {
    const req = { headers: { authorization: `Bearer ${driverToken}` } };
    const res = mockRes();
    let nextCalled = false;

    const driverGuard = requireRole("driver", "admin");
    driverGuard(req, res, () => {
      nextCalled = true;
    });

    if (!nextCalled || res.statusCode !== 200) {
      throw new Error(`Expected driver to pass role check, got status ${res.statusCode}`);
    }
    console.log("✅ Driver authorized and permitted to access dispatch transit runs");
  }

  console.log("🎉 [PASS] check-authz: All 6 RBAC authorization gates verified 100%!\n");
}

try {
  runAuthzCheck();
} catch (err) {
  console.error("❌ Authz check failed:", err);
  process.exit(1);
}
