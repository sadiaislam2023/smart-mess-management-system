const Waitlist = require("../models/Waitlist");
const Room = require("../models/Room");

const {
    hasActiveRequest,
    matchWaitlist,
    expireWaitlistMatches,
    claimBedForMatchedStudent,
    isValidId,
    WAITLIST_CLAIM_HOURS,
} = require("./reservation.controller");

// ===========================================================
// STUDENT - VIEW OWN WAITLIST
// ===========================================================

const getWaitlist = async (req, res) => {
    try {

        // Process expired matched students first.
        await expireWaitlistMatches();

        const waitlist =
            await Waitlist.find({
                student:
                    req.user._id,
            })
                .populate("room")
                .sort({
                    createdAt: -1,
                });

        // Calculate current position.
        const waitlistWithPosition =
            await Promise.all(
                waitlist.map(
                    async (entry) => {

                        const plain =
                            entry.toObject();

                        // ------------------------------------------------
                        // MATCHED = RANK #1
                        // ------------------------------------------------

                        if (
                            entry.status ===
                            "matched"
                        ) {
                            plain.position = 1;

                            return plain;
                        }

                        // ------------------------------------------------
                        // WAITING
                        // ------------------------------------------------

                        if (
                            entry.status !==
                            "waiting"
                        ) {
                            plain.position = null;

                            return plain;
                        }

                        const roomId =
                            entry.room?._id ||
                            entry.room;

                        const aheadCount =
                            await Waitlist.countDocuments({
                                room: roomId,

                                bedNumber:
                                    entry.bedNumber,

                                status: {
                                    $in: [
                                        "waiting",
                                        "matched",
                                    ],
                                },

                                createdAt: {
                                    $lt:
                                        entry.createdAt,
                                },
                            });

                        plain.position =
                            aheadCount + 1;

                        return plain;
                    }
                )
            );

        return res.json({
            success: true,
            waitlist:
                waitlistWithPosition,
        });

    } catch (error) {

        console.error(
            "[Waitlist] getWaitlist:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message,
        });
    }
};

// ===========================================================
// STUDENT - NOTIFICATIONS
// ===========================================================

const getNotifications = async (
    req,
    res
) => {
    try {

        await expireWaitlistMatches();

        const notifications =
            await Waitlist.find({
                student:
                    req.user._id,

                notified:
                    true,

                status:
                    "matched",
            })
                .populate("room")
                .sort({
                    updatedAt: -1,
                });

        return res.json({
            success: true,
            notifications,
        });

    } catch (error) {

        console.error(
            "[Waitlist] getNotifications:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message,
        });
    }
};

// ===========================================================
// STUDENT - JOIN WAITLIST
// ===========================================================

const requestWaitlist =
    async (req, res) => {

        try {

            // ------------------------------------------------
            // STUDENT ONLY
            // ------------------------------------------------

            if (
                req.user.role !==
                "student"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only students can join a waitlist.",
                });
            }

            const {
                roomId,
                bedNumber,
            } = req.body;

            // ------------------------------------------------
            // VALIDATE INPUT
            // ------------------------------------------------

            if (
                !roomId ||
                !isValidId(roomId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A valid room is required.",
                });
            }

            if (!bedNumber) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Room and bed are required.",
                });
            }

            await expireWaitlistMatches();

            // ------------------------------------------------
            // ONE ACTIVE REQUEST PER STUDENT
            // ------------------------------------------------

            if (
                await hasActiveRequest(
                    req.user._id
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "You already have an active reservation or waitlist request.",
                });
            }

            // ------------------------------------------------
            // FIND ROOM
            // ------------------------------------------------

            const room =
                await Room.findById(
                    roomId
                );

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Room not found.",
                });
            }

            // ------------------------------------------------
            // FIND BED
            // ------------------------------------------------

            const bed =
                room.beds.find(
                    (b) =>
                        b.bedNumber ===
                            bedNumber &&
                        !b.isArchived
                );

            if (!bed) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Bed not found.",
                });
            }

            // ------------------------------------------------
            // AVAILABLE BED
            // ------------------------------------------------

            if (
                !bed.occupied &&
                !bed.onHold
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This bed is available. Please request the bed directly.",
                });
            }

            // ------------------------------------------------
            // DUPLICATE WAITLIST
            // ------------------------------------------------

            const existing =
                await Waitlist.findOne({
                    student:
                        req.user._id,

                    room:
                        room._id,

                    bedNumber,

                    status: {
                        $in: [
                            "waiting",
                            "matched",
                        ],
                    },
                });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message:
                        "You are already on the waitlist for this bed.",
                });
            }

            // ------------------------------------------------
            // CREATE WAITLIST
            // ------------------------------------------------

            const entry =
                await Waitlist.create({
                    student:
                        req.user._id,

                    room:
                        room._id,

                    bedNumber,

                    budget:
                        req.user.budget ||
                        room.rent,

                    roommatePreference:
                        req.user.roommatePreference ||
                        "",

                    spacePreference:
                        req.user.spacePreference ||
                        null,

                    status:
                        "waiting",

                    notified:
                        false,

                    notificationMessage:
                        "",

                    matchedAt:
                        null,

                    matchedUntil:
                        null,
                });

            // ------------------------------------------------
            // CALCULATE IMMEDIATE SERIAL
            // ------------------------------------------------

            const position =
                await Waitlist.countDocuments({
                    room:
                        room._id,

                    bedNumber,

                    status: {
                        $in: [
                            "waiting",
                            "matched",
                        ],
                    },

                    createdAt: {
                        $lte:
                            entry.createdAt,
                    },
                });

            return res.status(201).json({
                success: true,

                waitlisted:
                    true,

                message:
                    "You have been added to the waitlist.",

                waitlist: {
                    ...entry.toObject(),
                    position,
                },
            });

        } catch (error) {

            console.error(
                "[Waitlist] requestWaitlist:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// STUDENT - CLAIM MATCHED BED
//
// ONLY matched student can request.
// ===========================================================

const claimMatchedBed =
    async (req, res) => {

        try {

            if (
                !isValidId(req.params.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid waitlist entry id.",
                });
            }

            await expireWaitlistMatches();

            const entry =
                await Waitlist.findById(
                    req.params.id
                );

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Waitlist entry not found.",
                });
            }

            // ------------------------------------------------
            // OWNER CHECK
            // ------------------------------------------------

            if (
                entry.student.toString() !==
                req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Unauthorized.",
                });
            }

            // ------------------------------------------------
            // ONLY MATCHED CAN REQUEST
            // ------------------------------------------------

            if (
                entry.status !==
                "matched"
            ) {
                return res.status(400).json({
                    success: false,

                    waitlistPriority:
                        false,

                    message:
                        "You are not currently the selected waitlist student for this bed.",
                });
            }

            // ------------------------------------------------
            // CHECK EXPIRATION
            // ------------------------------------------------

            const now =
                new Date();

            if (
                !entry.matchedUntil ||
                entry.matchedUntil <= now
            ) {

                entry.status =
                    "expired";

                entry.notified =
                    false;

                entry.notificationMessage =
                    `Your ${WAITLIST_CLAIM_HOURS}-hour waitlist priority period has expired. ` +
                    "The next waitlisted student will now get the opportunity.";

                entry.matchedUntil =
                    null;

                await entry.save();

                await matchWaitlist(
                    entry.room,
                    entry.bedNumber
                );

                return res.status(400).json({
                    success: false,
                    expired: true,

                    message:
                        `Your ${WAITLIST_CLAIM_HOURS}-hour waitlist priority period has expired. ` +
                        "The next student has been given priority.",
                });
            }

            // ------------------------------------------------
            // CREATE PENDING RESERVATION
            // ------------------------------------------------

            const result =
                await claimBedForMatchedStudent(
                    entry
                );

            return res
                .status(result.status)
                .json(result.body);

        } catch (error) {

            console.error(
                "[Waitlist] claimMatchedBed:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// MANAGER - FIND WAITLIST STUDENTS
// ===========================================================

const findMatchingStudents =
    async (req, res) => {

        try {

            if (
                req.user.role !==
                "manager"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Managers only.",
                });
            }

            if (
                !isValidId(req.params.roomId)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid room id.",
                });
            }

            await expireWaitlistMatches();

            const entries =
                await Waitlist.find({
                    room:
                        req.params.roomId,

                    status: {
                        $in: [
                            "waiting",
                            "matched",
                            "allocated",
                        ],
                    },
                })
                    .populate("student")
                    .sort({
                        createdAt: 1,
                    });

            const rankedEntries =
                entries.map(
                    (entry, index) => {

                        const plain =
                            entry.toObject();

                        plain.rank =
                            index + 1;

                        return plain;
                    }
                );

            return res.json({
                success: true,
                entries:
                    rankedEntries,
            });

        } catch (error) {

            console.error(
                "[Waitlist] findMatchingStudents:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// STUDENT - CANCEL / LEAVE WAITLIST
// ===========================================================

const cancelWaitlist =
    async (req, res) => {

        try {

            if (
                !isValidId(req.params.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid waitlist entry id.",
                });
            }

            // Kept consistent with every other handler in this
            // file / reservation.controller.js, which all sweep
            // expired matches before acting. Not strictly load
            // bearing here (matchWaitlist()'s own "already
            // matched" check makes a double-match harmless), but
            // it keeps the entry's status accurate if it read
            // "matched" past its matchedUntil at the moment of
            // cancellation.
            await expireWaitlistMatches();

            const entry =
                await Waitlist.findById(
                    req.params.id
                );

            if (!entry) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Waitlist entry not found.",
                });
            }

            // ------------------------------------------------
            // OWNER CHECK
            // ------------------------------------------------

            if (
                entry.student.toString() !==
                req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Unauthorized.",
                });
            }

            // ------------------------------------------------
            // ONLY WAITING / MATCHED
            // ------------------------------------------------

            if (
                ![
                    "waiting",
                    "matched",
                ].includes(
                    entry.status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This waitlist entry cannot be cancelled.",
                });
            }

            const wasMatched =
                entry.status ===
                "matched";

            entry.status =
                "cancelled";

            entry.notified =
                false;

            entry.matchedUntil =
                null;

            entry.notificationMessage =
                "You left the waitlist.";

            await entry.save();

            // ------------------------------------------------
            // NEXT STUDENT
            // ------------------------------------------------

            if (wasMatched) {
                await matchWaitlist(
                    entry.room,
                    entry.bedNumber
                );
            }

            return res.json({
                success: true,

                message:
                    wasMatched
                        ? "You left the waitlist. The next student has been given priority."
                        : "You have been removed from the waitlist.",
            });

        } catch (error) {

            console.error(
                "[Waitlist] cancelWaitlist:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// EXPORTS
// ===========================================================

module.exports = {
    getWaitlist,
    getNotifications,
    requestWaitlist,
    claimMatchedBed,
    findMatchingStudents,
    cancelWaitlist,
};
