require("dotenv").config();
const express = require("express");
const session = require("express-session");
const msal = require("@azure/msal-node");

const app = express();

// View engine setup
app.set("view engine", "ejs");

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware - MUST be before routes
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Dynamic redirect URI based on environment
const REDIRECT_URI =
  process.env.REDIRECT_URI || "http://localhost:3000/redirect";

const POST_LOGOUT_REDIRECT_URI =
  process.env.POST_LOGOUT_REDIRECT_URI || "http://localhost:3000";

// MSAL Configuration
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Warning,
    },
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.account) {
    return next();
  }
  res.redirect("/login");
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Home page (public)
app.get("/", (req, res) => {
  res.render("home", { user: req.session.account || null });
});

// Login route
app.get("/login", async (req, res) => {
  // Generate CSRF token
  const state = Math.random().toString(36).substring(7);
  req.session.authState = state;

  const authUrlParams = {
    scopes: ["openid", "profile", "email", "User.Read"],
    redirectUri: REDIRECT_URI,
    state: state,
    prompt: "select_account", // Force account selection
  };

  try {
    const authUrl = await cca.getAuthCodeUrl(authUrlParams);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).send("Authentication error");
  }
});

// OAuth redirect callback
app.get("/redirect", async (req, res) => {
  // Validate state for CSRF protection
  if (req.query.state !== req.session.authState) {
    return res
      .status(403)
      .send("Invalid state parameter - possible CSRF attack");
  }

  // Check if code exists
  if (!req.query.code) {
    return res.status(400).send("No authorization code received");
  }

  const tokenRequest = {
    code: req.query.code,
    scopes: ["openid", "profile", "email", "User.Read"],
    redirectUri: REDIRECT_URI,
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);

    // Store user info in session
    req.session.account = response.account;
    req.session.accessToken = response.accessToken;

    // Clear auth state
    delete req.session.authState;

    console.log("User logged in:", response.account.username);

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Token acquisition error:", error);
    res.status(500).send("Login failed: " + error.message);
  }
});

// ============================================
// PROTECTED ROUTES
// ============================================

// Dashboard (protected)
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.render("dashboard", { user: req.session.account });
});

// Profile page (protected)
app.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", { user: req.session.account });
});

// Invoices page (protected)
app.get("/invoices", isAuthenticated, (req, res) => {
  // Mock data - replace with database queries in production
  const invoices = [
    {
      id: "INV-001",
      date: "2024-11-01",
      amount: 250.0,
      status: "Paid",
    },
    {
      id: "INV-002",
      date: "2024-10-01",
      amount: 250.0,
      status: "Paid",
    },
    {
      id: "INV-003",
      date: "2024-09-01",
      amount: 250.0,
      status: "Paid",
    },
    {
      id: "INV-004",
      date: "2024-08-01",
      amount: 250.0,
      status: "Paid",
    },
  ];

  res.render("invoices", {
    user: req.session.account,
    invoices: invoices,
  });
});

// Support tickets page (protected)
app.get("/support", isAuthenticated, (req, res) => {
  // Mock data - replace with database queries in production
  const tickets = [
    {
      id: "TKT-001",
      subject: "Login Issue",
      status: "Resolved",
      date: "2024-11-15",
    },
    {
      id: "TKT-002",
      subject: "Billing Question",
      status: "Open",
      date: "2024-11-20",
    },
  ];

  res.render("support", {
    user: req.session.account,
    tickets: tickets,
    query: req.query, // Pass query params for success messages
  });
});

// Create support ticket (POST)
app.post("/support/create", isAuthenticated, (req, res) => {
  const { subject, description, priority } = req.body;

  // Validation
  if (!subject || !description || !priority) {
    return res.status(400).send("All fields are required");
  }

  // In production, save to database
  console.log("New support ticket created:");
  console.log({
    user: req.session.account.username,
    subject: subject,
    description: description,
    priority: priority,
    createdAt: new Date().toISOString(),
  });

  // Redirect with success message
  res.redirect("/support?success=true");
});

// Logout route
app.get("/logout", (req, res) => {
  const account = req.session.account;

  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
    }

    // Redirect to Azure AD logout to clear SSO session
    const logoutUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_REDIRECT_URI)}`;

    console.log("User logged out:", account ? account.username : "Unknown");

    res.redirect(logoutUrl);
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f5f7fa;
          }
          h1 { color: #667eea; }
          a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Home</a>
      </body>
    </html>
  `);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send(`
    <html>
      <head>
        <title>500 - Server Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f5f7fa;
          }
          h1 { color: #e74c3c; }
          a {
            color: #667eea;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>500 - Server Error</h1>
        <p>Something went wrong. Please try again later.</p>
        <a href="/">← Back to Home</a>
      </body>
    </html>
  `);
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("===========================================");
  console.log(`🚀 Customer Portal Server Started`);
  console.log("===========================================");
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`🔐 Redirect URI: ${REDIRECT_URI}`);
  console.log("===========================================");
  console.log("Available routes:");
  console.log("  GET  /              - Home page");
  console.log("  GET  /login         - Login with Azure AD");
  console.log("  GET  /dashboard     - Dashboard (protected)");
  console.log("  GET  /profile       - User profile (protected)");
  console.log("  GET  /invoices      - Billing & invoices (protected)");
  console.log("  GET  /support       - Support tickets (protected)");
  console.log("  POST /support/create - Create ticket (protected)");
  console.log("  GET  /logout        - Logout");
  console.log("===========================================");
});