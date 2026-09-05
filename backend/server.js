require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const complaintRoutes = require("./routes/complaint.routes.js");
const billingRoutes = require("./routes/billing.routes");
const forecastRoutes = require("./routes/forecast.routes");
const wasteRoutes = require("./routes/waste.routes");

const connectDB = require("./config/db");

const {
    startWaitlistJob,
} = require("./utils/waitlist.job");

const {
    startBillingReminderJob,
} = require("./utils/billing.job");

// ===========================================================
// DATABASE
// ===========================================================

connectDB();


// ===========================================================
// APP
// ===========================================================

const app = express();


// ===========================================================
// TEST FORECAST ROUTE
// ===========================================================

app.get(
    "/api/forecast-test",
    (req, res) => {
        console.log("FORECAST TEST ROUTE HIT");

        res.json({
            success: true,
            message: "Forecast route is working",
        });
    }
);


// ===========================================================
// CORS
// ===========================================================

const allowedOrigins = [
    "http://localhost:3000",
    "https://smart-mess-management-system-qsjc-beryl.vercel.app",
];

app.use(
    cors({
        origin: function (origin, callback) {

            // Allow requests without an Origin header.
            // This is useful for Postman and server-to-server requests.
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


// ===========================================================
// BODY PARSERS
// ===========================================================

app.use(
    express.json({
        limit: "15mb",
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb",
    })
);


// ===========================================================
// STATIC UPLOADS
// ===========================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);


// ===========================================================
// ROUTES
// ===========================================================

const authRoutes =
    require("./routes/auth.routes");

const adminRoutes =
    require("./routes/admin.routes");

const profileRoutes =
    require("./routes/profile.routes");

const roomRoutes =
    require("./routes/room.routes");

const onboardingRoutes =
    require("./routes/onboarding.routes");

const spaceFitRoutes =
    require("./routes/spaceFit.routes");

const reservationRoutes =
    require("./routes/reservation.routes");

const analyticsRoutes =
    require("./routes/analytics.routes");

const waitlistRoutes =
    require("./routes/waitlist.routes");

const mealPlannerRoutes =
    require("./routes/mealPlanner.routes");


// ===========================================================
// MEAL RECORD / QR CHECK-IN ROUTES
// ===========================================================

const mealRecordRoutes =
    require("./routes/meal.routes");


// ===========================================================
// API ROUTES
// ===========================================================

app.use(
    "/api/analytics",
    analyticsRoutes
);

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/profile",
    profileRoutes
);

app.use(
    "/api/rooms",
    roomRoutes
);

app.use(
    "/api/onboarding",
    onboardingRoutes
);

app.use(
    "/api/spacefit",
    spaceFitRoutes
);

app.use(
    "/api/reservations",
    reservationRoutes
);

app.use(
    "/api/waitlist",
    waitlistRoutes
);

app.use(
    "/api/meal-planner",
    mealPlannerRoutes
);

app.use(
    "/api/billing",
    billingRoutes
);

app.use(
    "/api/forecast",
    forecastRoutes
);

app.use(
    "/api/waste",
    wasteRoutes
);


// ===========================================================
// MEAL RECORD ROUTES
// ===========================================================

app.use(
    "/api/meal-records",
    mealRecordRoutes
);


// ===========================================================
// COMPLAINT ROUTES
// ===========================================================

app.use(
    "/api/complaints",
    complaintRoutes
);


// ===========================================================
// ROOT TEST ROUTE
// ===========================================================

app.get(
    "/",
    (req, res) => {
        res.send(
            "Smart Mess Management API is running..."
        );
    }
);


// ===========================================================
// START WAITLIST JOB
// ===========================================================

startWaitlistJob();


// ===========================================================
// START BILLING REMINDER JOB
// ===========================================================

startBillingReminderJob();


// ===========================================================
// SERVER
// ===========================================================

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Server is running on port ${PORT}`
        );
    }
);