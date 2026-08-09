const express =
    require("express");

const router =
    express.Router();


const {
    getWaitlist,
    getNotifications,
    requestWaitlist,
    claimMatchedBed,
    findMatchingStudents,
    cancelWaitlist,
} =
    require("../controllers/waitlist.controller");


const {
    protect,
} =
    require("../middleware/auth.middleware");


// ===========================================================
// STUDENT
// ===========================================================

// My waitlist
router.get(
    "/",
    protect,
    getWaitlist
);


// Notifications
router.get(
    "/notifications",
    protect,
    getNotifications
);


// Join waitlist
router.post(
    "/",
    protect,
    requestWaitlist
);


// Claim a matched bed while priority is still active.
// Window length is WAITLIST_CLAIM_HOURS in
// reservation.controller.js — not hardcoded here so this
// comment can't go stale if that value changes.
router.patch(
    "/:id/claim",
    protect,
    claimMatchedBed
);


// Leave waitlist
router.patch(
    "/:id/cancel",
    protect,
    cancelWaitlist
);


// ===========================================================
// MANAGER
// ===========================================================

router.get(
    "/match/:roomId",
    protect,
    findMatchingStudents
);


module.exports =
    router;
