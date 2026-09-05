const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

/* =====================================
   CORS CONFIGURATION
===================================== */

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // Example: Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured production frontend
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview/deployment URLs
      if (
        /^https:\/\/smart-mess-management-system-qsjc-[a-z0-9-]+\.vercel\.app$/i.test(
          origin
        )
      ) {
        return callback(null, true);
      }

      // Reject unknown origins
      return callback(
        new Error(`Not allowed by CORS: ${origin}`)
      );
    },

    credentials: true,
  })
);

/* =====================================
   BODY PARSERS
===================================== */

app.use(express.json());
app.use(cookieParser());

/* =====================================
   TEST ROUTE
===================================== */

app.get("/", (req, res) => {
  res.status(200).send(
    "Smart Mess Management API is running"
  );
});

/* =====================================
   ROUTES
===================================== */

const authRoutes = require("./routes/auth.routes");
const reservationRoutes = require("./routes/reservation.routes");
const waitlistRoutes = require("./routes/waitlist.routes");

/* =====================================
   AUTHENTICATION
===================================== */

app.use("/api/auth", authRoutes);

/* =====================================
   BED RESERVATION MODULE
===================================== */

app.use(
  "/api/reservations",
  reservationRoutes
);

/* =====================================
   WAITLIST MODULE
===================================== */

app.use(
  "/api/waitlist",
  waitlistRoutes
);

/* =====================================
   EXPORT APP
===================================== */

module.exports = app;