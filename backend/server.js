require("dotenv").config();

// Polyfill for Web Crypto API (Required for Mongoose 9 on older Node versions like Railway's default Node 18)
if (!globalThis.crypto) {
  globalThis.crypto = require('crypto').webcrypto;
}

const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const jwt        = require("jsonwebtoken");
const { Server } = require("socket.io");

// ── Internal modules ──────────────────────────────────────────────────────────
const connectDB          = require("./config/db");
require("./config/cloudinary");           // configures cloudinary globally
const { setBroadcastIO } = require("./utils/broadcast");
const { SECRET }         = require("./middleware/auth");
const seedData           = require("./seedData");

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes         = require("./routes/auth");
const departmentRoutes   = require("./routes/departments");
const categoryRoutes     = require("./routes/categories");
const itemRoutes         = require("./routes/items");
const transactionRoutes  = require("./routes/transactions");
const userRoutes         = require("./routes/users");
const settingRoutes      = require("./routes/settings");
const companyRoutes      = require("./routes/company");
const statsRoutes        = require("./routes/stats");
const enterpriseRoutes   = require("./routes/enterprise");
const aiRoutes           = require("./routes/ai");
const fileRoutes         = require("./routes/files");
const adminRoutes        = require("./routes/admin");
const barcodeRoutes      = require("./routes/barcode");
const importRoutes       = require("./routes/import");
const warehouseRoutes    = require("./routes/warehouses");
const binRoutes          = require("./routes/bins");
const bomRoutes          = require("./routes/bom");
const sourceRoutes       = require("./routes/sources");
const destRoutes         = require("./routes/destinations");
const projectRoutes      = require("./routes/projects");
const reasonRoutes       = require("./routes/reasons");
const publicApiRoutes    = require("./routes/publicApi");
// ── App & HTTP server ─────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
});
setBroadcastIO(io); // make io available to all route handlers

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));
  try {
    const { companyId } = jwt.verify(token, SECRET);
    socket.companyId = companyId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  if (socket.companyId) socket.join(socket.companyId);
});

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/departments",  departmentRoutes);
app.use("/api/categories",   categoryRoutes);
app.use("/api/items",        itemRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/users",        userRoutes);
app.use("/api/settings",     settingRoutes);
app.use("/api/company",      companyRoutes);
app.use("/api/stats",        statsRoutes);
app.use("/api/enterprise",   enterpriseRoutes);
app.use("/api/ai",           aiRoutes);
app.use("/api/files",        fileRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/barcode",      barcodeRoutes);
app.use("/api/import",       importRoutes);
app.use("/api/warehouses",   warehouseRoutes);
app.use("/api/bins",         binRoutes);
app.use("/api/bom",          bomRoutes);
app.use("/api/sources",      sourceRoutes);
app.use("/api/destinations", destRoutes);
app.use("/api/projects",     projectRoutes);
app.use("/api/reasons",      reasonRoutes);
app.use("/api/public",       publicApiRoutes);

// ── Database connection & seed ────────────────────────────────────────────────
connectDB(seedData);

// ── Start server ──────────────────────────────────────────────────────────────
server.listen(PORT, () =>
  console.log(`🚀 NexERP API → http://localhost:${PORT}`)
);
