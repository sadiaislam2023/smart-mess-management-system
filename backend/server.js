const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const connectDB =
    require("./config/db");

const {
    startWaitlistJob,
} = require("./utils/waitlist.job");


dotenv.config();


// ===========================================================
// DATABASE
// ===========================================================

connectDB();


const app =
    express();


// ===========================================================
// MIDDLEWARE
// ===========================================================

app.use(
    cors()
);


app.use(
    express.json({
        limit:
            "15mb",
    })
);


app.use(
    express.urlencoded({
        extended:
            true,

        limit:
            "20mb",
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


// ===========================================================
// TEST
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
// SERVER
// ===========================================================

const PORT =
    process.env.PORT ||
    5000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server is running on port ${PORT}`
        );
    }
);