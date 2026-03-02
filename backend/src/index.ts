import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth.js";
import accommodationsRouter from "./routes/accommodations.js";
import bookingsRouter from "./routes/bookings.js";
import paymentsRouter from "./routes/payments.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

// Stripe Webhook は raw body が必要
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(helmet());
app.use(express.json());

// レート制限（認証エンドポイント）
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/auth", authLimiter);

// Routes
app.use("/api/auth", authRouter);
app.use("/api/accommodations", accommodationsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/payments", paymentsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`TripLocal API server running on port ${PORT}`);
});

export default app;
