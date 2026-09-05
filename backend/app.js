const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

/* =====================================
   Middlewares
===================================== */

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (Postman, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* =====================================
   Test Route
===================================== */

app.get("/", (req, res) => {
  res.send("Smart Mess Management API is running");
});

/* =====================================
   Routes
===================================== */

const authRoutes = require("./routes/auth.routes");
const reservationRoutes = require("./routes/reservation.routes");
const waitlistRoutes = require("./routes/waitlist.routes");

// Authentication
app.use("/api/auth", authRoutes);

// Bed Reservation Module
app.use("/api/reservations", reservationRoutes);

// Waitlist Module
app.use("/api/waitlist", waitlistRoutes);

module.exports = app;