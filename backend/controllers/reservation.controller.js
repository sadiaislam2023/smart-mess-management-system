const mongoose = require("mongoose");

const Reservation = require("../models/BedReservation");
const Waitlist = require("../models/Waitlist");
const Room = require("../models/Room");

// ===========================================================
// CONSTANTS
// ===========================================================

// Matched waitlist student gets WAITLIST_CLAIM_HOURS hours to
// request the bed before their priority expires.
//
// FIX: this previously multiplied by (60 * 1000) instead of
// (60 * 60 * 1000), so a "24 hour" window was actually only
// 24 minutes. Also exported so other modules (e.g. the
// waitlist controller's user-facing messages) can reference
// the real value instead of hardcoding "24-hour" text that
// silently goes stale if this number ever changes.
const WAITLIST_CLAIM_HOURS = 5;

const WAITLIST_CLAIM_MS =
    WAITLIST_CLAIM_HOURS *
    60 *
    1000;

// Once a student requests a bed,
// the bed is held for the manager for 24 hours.
const RESERVATION_HOLD_HOURS = 24;

const RESERVATION_HOLD_MS =
    RESERVATION_HOLD_HOURS *
    60 *
    60 *
    1000;

// ===========================================================
// HELPER - VALIDATE OBJECT ID
// ===========================================================

const isValidId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ===========================================================
// HELPER - CHECK ACTIVE REQUEST
// ===========================================================

const hasActiveRequest = async (studentId) => {
    const activeReservation =
        await Reservation.findOne({
            student: studentId,
            status: {
                $in: ["pending", "approved"],
            },
        });

    if (activeReservation) {
        return true;
    }

    const activeWaitlist =
        await Waitlist.findOne({
            student: studentId,
            status: {
                $in: ["waiting", "matched"],
            },
        });

    return !!activeWaitlist;
};

// ===========================================================
// FIND FIRST WAITING STUDENT
// ===========================================================

const getFirstWaitingEntry = async (
    roomId,
    bedNumber
) => {
    return await Waitlist.findOne({
        room: roomId,
        bedNumber,
        status: "waiting",
    }).sort({
        createdAt: 1,
        _id: 1,
    });
};

// ===========================================================
// MATCH NEXT WAITLIST STUDENT
//
// waiting -> matched
//
// Only one student can be matched for a bed.
// ===========================================================

const notifyNextWaitlistStudent = async (
    roomId,
    bedNumber
) => {
    try {
        const room =
            await Room.findById(roomId);

        if (!room) {
            return null;
        }

        const bed =
            room.beds.find(
                (b) =>
                    b.bedNumber === bedNumber &&
                    !b.isArchived
            );

        if (!bed) {
            return null;
        }

        // Bed must actually be available.
        if (
            bed.occupied ||
            bed.onHold
        ) {
            return null;
        }

        // Do not match another student if someone
        // is already matched.
        const existingMatched =
            await Waitlist.findOne({
                room: roomId,
                bedNumber,
                status: "matched",
            });

        if (existingMatched) {
            return existingMatched;
        }

        // Find oldest waiting student.
        const nextEntry =
            await getFirstWaitingEntry(
                roomId,
                bedNumber
            );

        if (!nextEntry) {
            return null;
        }

        const now = new Date();

        nextEntry.status = "matched";
        nextEntry.notified = true;
        nextEntry.matchedAt = now;

        nextEntry.matchedUntil =
            new Date(
                now.getTime() +
                WAITLIST_CLAIM_MS
            );

        nextEntry.notificationMessage =
            `Bed ${bedNumber} in room ${room.roomNumber} is available. ` +
            `You have ${WAITLIST_CLAIM_HOURS} hours to request this bed.`;

        await nextEntry.save();

        console.log(
            `[Waitlist] Student ${nextEntry.student} ` +
            `is now matched for room ${room.roomNumber}, ` +
            `bed ${bedNumber}. ` +
            `Expires: ${nextEntry.matchedUntil}`
        );

        return nextEntry;

    } catch (error) {
        console.error(
            "[Waitlist] notifyNextWaitlistStudent:",
            error.message
        );

        return null;
    }
};

// ===========================================================
// MATCH WAITLIST
//
// Specific bed:
//     matchWaitlist(roomId, bedNumber)
//
// All available beds:
//     matchWaitlist(roomId)
// ===========================================================

const matchWaitlist = async (
    roomId,
    bedNumber = null
) => {
    try {
        const room =
            await Room.findById(roomId);

        if (!room) {
            return;
        }

        // Specific bed
        if (bedNumber) {
            await notifyNextWaitlistStudent(
                roomId,
                bedNumber
            );

            return;
        }

        // All available beds
        for (const bed of room.beds) {
            if (
                bed.isArchived ||
                bed.occupied ||
                bed.onHold
            ) {
                continue;
            }

            await notifyNextWaitlistStudent(
                roomId,
                bed.bedNumber
            );
        }

    } catch (error) {
        console.error(
            "[Waitlist] matchWaitlist:",
            error.message
        );
    }
};

// ===========================================================
// EXPIRE WAITLIST MATCHES
//
// matched -> expired
// next waiting student -> matched
// ===========================================================

const expireWaitlistMatches =
    async () => {

        try {
            const now = new Date();

            const expiredEntries =
                await Waitlist.find({
                    status: "matched",
                    matchedUntil: {
                        $lte: now,
                    },
                });

            let expiredCount = 0;

            for (
                const entry of expiredEntries
            ) {
                const expired =
                    await Waitlist.findOneAndUpdate(
                        {
                            _id: entry._id,
                            status: "matched",
                            matchedUntil: {
                                $lte: now,
                            },
                        },
                        {
                            $set: {
                                status: "expired",
                                notified: false,
                                notificationMessage:
                                    `Your ${WAITLIST_CLAIM_HOURS}-hour priority period expired. ` +
                                    "The next waitlist student will now receive priority.",
                            },
                        },
                        {
                            new: true,
                        }
                    );

                if (!expired) {
                    continue;
                }

                expiredCount++;

                console.log(
                    `[Waitlist] Student ${entry.student} ` +
                    `expired for room ${entry.room}, ` +
                    `bed ${entry.bedNumber}.`
                );

                await notifyNextWaitlistStudent(
                    entry.room,
                    entry.bedNumber
                );
            }

            return expiredCount;

        } catch (error) {
            console.error(
                "[Waitlist] expireWaitlistMatches:",
                error.message
            );

            return 0;
        }
    };

// ===========================================================
// EXPIRE PENDING RESERVATION HOLDS
//
// pending -> expired
// bed released
// next waitlist student -> matched
// ===========================================================

const expireStaleHolds =
    async () => {

        try {
            const now = new Date();

            const staleReservations =
                await Reservation.find({
                    status: "pending",
                    holdExpiresAt: {
                        $lte: now,
                    },
                });

            let expiredCount = 0;

            for (
                const reservation
                of staleReservations
            ) {
                // Release bed atomically.
                const releasedRoom =
                    await Room.findOneAndUpdate(
                        {
                            _id: reservation.room,
                            beds: {
                                $elemMatch: {
                                    bedNumber:
                                        reservation.bedNumber,

                                    onHold: true,

                                    occupied: false,

                                    isArchived: {
                                        $ne: true,
                                    },
                                },
                            },
                        },
                        {
                            $set: {
                                "beds.$.onHold": false,
                            },
                        },
                        {
                            new: true,
                        }
                    );

                // Expire reservation atomically.
                const expiredReservation =
                    await Reservation.findOneAndUpdate(
                        {
                            _id: reservation._id,
                            status: "pending",
                        },
                        {
                            $set: {
                                status: "expired",
                            },
                        },
                        {
                            new: true,
                        }
                    );

                if (!expiredReservation) {
                    continue;
                }

                expiredCount++;

                // Match next student.
                if (releasedRoom) {
                    await matchWaitlist(
                        reservation.room,
                        reservation.bedNumber
                    );
                }
            }

            return expiredCount;

        } catch (error) {
            console.error(
                "[Reservation] expireStaleHolds:",
                error.message
            );

            return 0;
        }
    };

// ===========================================================
// CLAIM BED FOR MATCHED WAITLIST STUDENT
//
// Single source of truth for the "matched student requests
// their held bed" flow. Called from two places:
//   1. waitlist.controller.js -> claimMatchedBed()
//      (POST /waitlist/:id/claim)
//   2. reservation.controller.js -> requestReservation()
//      when the requesting student is the currently matched
//      student for that bed (POST /reservations/request)
//
// Both call sites delegate here rather than duplicating the
// atomic hold + reservation-create + rollback logic, so a
// future fix only needs to be made once.
//
// matched
//    ↓
// student clicks Request This Bed
//    ↓
// pending reservation
//    ↓
// bed onHold
//    ↓
// waitlist entry -> allocated
// ===========================================================

const claimBedForMatchedStudent =
    async (matchedEntry) => {

        const studentId =
            matchedEntry.student;

        const roomId =
            matchedEntry.room;

        const bedNumber =
            matchedEntry.bedNumber;

        // ---------------------------------------------------
        // CHECK ACTIVE RESERVATION
        // ---------------------------------------------------

        const activeReservation =
            await Reservation.findOne({
                student: studentId,
                status: {
                    $in: [
                        "pending",
                        "approved",
                    ],
                },
            });

        if (activeReservation) {
            return {
                status: 400,
                body: {
                    success: false,
                    message:
                        "You already have an active reservation.",
                },
            };
        }

        // ---------------------------------------------------
        // FIND ROOM
        // ---------------------------------------------------

        const room =
            await Room.findById(roomId);

        if (!room) {
            return {
                status: 404,
                body: {
                    success: false,
                    message: "Room not found.",
                },
            };
        }

        // ---------------------------------------------------
        // FIND BED
        // ---------------------------------------------------

        const bed =
            room.beds.find(
                (b) =>
                    b.bedNumber === bedNumber &&
                    !b.isArchived
            );

        if (!bed) {
            return {
                status: 404,
                body: {
                    success: false,
                    message: "Bed not found.",
                },
            };
        }

        // ---------------------------------------------------
        // BED MUST BE AVAILABLE
        // ---------------------------------------------------

        if (
            bed.occupied ||
            bed.onHold
        ) {
            return {
                status: 409,
                body: {
                    success: false,
                    waitlistPriority: true,
                    message:
                        "This bed is currently unavailable. Please try again when it becomes available.",
                },
            };
        }

        // ---------------------------------------------------
        // ATOMIC BED HOLD
        // ---------------------------------------------------

        const claimedRoom =
            await Room.findOneAndUpdate(
                {
                    _id: roomId,
                    beds: {
                        $elemMatch: {
                            bedNumber,
                            occupied: false,
                            onHold: false,
                            isArchived: {
                                $ne: true,
                            },
                        },
                    },
                },
                {
                    $set: {
                        "beds.$.onHold": true,
                    },
                },
                {
                    new: true,
                }
            );

        if (!claimedRoom) {
            return {
                status: 409,
                body: {
                    success: false,
                    message:
                        "This bed was just requested by another student.",
                },
            };
        }

        // ---------------------------------------------------
        // CREATE PENDING RESERVATION
        //
        // This is what sends the request to the manager.
        // ---------------------------------------------------

        let reservation;

        try {
            reservation =
                await Reservation.create({
                    student: studentId,
                    room: roomId,
                    bedNumber,
                    status: "pending",
                    holdExpiresAt:
                        new Date(
                            Date.now() +
                            RESERVATION_HOLD_MS
                        ),
                });

        } catch (reservationError) {

            // Roll back bed hold.
            await Room.updateOne(
                {
                    _id: roomId,
                    "beds.bedNumber":
                        bedNumber,
                },
                {
                    $set: {
                        "beds.$.onHold": false,
                    },
                }
            );

            throw reservationError;
        }

        // ---------------------------------------------------
        // WAITLIST MATCH USED
        //
        // allocated here means:
        // "waitlist priority was used and reservation
        // request was sent to manager"
        //
        // Status must stay "allocated" — it's the only
        // status the frontend and findMatchingStudents()
        // know how to handle for a completed claim.
        // ---------------------------------------------------

        matchedEntry.status = "allocated";
        matchedEntry.notified = true;

        matchedEntry.notificationMessage =
            "You requested the bed successfully. Your reservation request has been sent to the manager.";

        matchedEntry.matchedUntil = null;

        await matchedEntry.save();

        console.log(
            `[Waitlist] Student ${studentId} ` +
            `successfully requested room ${roomId}, ` +
            `bed ${bedNumber}. Reservation is pending.`
        );

        return {
            status: 201,
            body: {
                success: true,
                waitlisted: false,
                fromWaitlist: true,
                requested: true,

                message:
                    "Your waitlist priority was used successfully. Reservation request sent to manager.",

                reservation,
            },
        };
    };

// ===========================================================
// CANCEL RESERVATION WHEN A BED IS MANUALLY FREED
//
// Called from room.controller.js (updateBed / archiveBed)
// whenever the manager directly flips a bed from
// occupied: true -> false (or archives an occupied bed)
// OUTSIDE the normal student-initiated cancelReservation()
// flow.
//
// Without this, the bed correctly becomes available/on-hold
// again (room.controller.js already handles that via
// matchWaitlist()), but the student's Reservation record is
// left stuck at status: "approved" forever, since nothing
// else ever revisits it. getMyReservations() would then show
// a permanently "approved" reservation for a bed the student
// no longer actually has.
//
// Mirrors the "APPROVED" branch of cancelReservation(): finds
// the approved reservation for this room + bed, marks it
// cancelled, and lets the next waitlist student through.
//
// IMPORTANT: this function does NOT touch bed.occupied /
// bed.onHold itself. The caller (room.controller.js) is
// responsible for the bed state change; this only reconciles
// the Reservation record so the two don't go out of sync.
// Only reservations with status "approved" are matched here,
// since "approved" is the only status that corresponds to an
// occupied bed (see approveReservation() below) — a "pending"
// reservation corresponds to onHold instead, and that case is
// already handled separately by expireStaleHolds() and the
// student's own cancelReservation().
// ===========================================================

const cancelReservationForFreedBed = async (
    roomId,
    bedNumber
) => {
    try {
        const reservation =
            await Reservation.findOne({
                room: roomId,
                bedNumber,
                status: "approved",
            });

        if (!reservation) {
            return null;
        }

        reservation.status = "cancelled";

        reservation.rejectionReason =
            "Cancelled automatically: bed was marked available by the manager.";

        await reservation.save();

        console.log(
            `[Reservation] Auto-cancelled reservation ${reservation._id} ` +
            `for room ${roomId}, bed ${bedNumber} ` +
            `(manager freed the bed).`
        );

        return reservation;

    } catch (error) {
        console.error(
            "[Reservation] cancelReservationForFreedBed:",
            error.message
        );

        return null;
    }
};

// ===========================================================
// STUDENT - REQUEST BED
// ===========================================================

const requestReservation =
    async (req, res) => {

        try {

            if (
                req.user.role !== "student"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only students can request a bed.",
                });
            }

            const {
                roomId,
                bedNumber,
            } = req.body;

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
                        "A specific bed must be selected.",
                });
            }

            // Process expired states.
            await expireStaleHolds();
            await expireWaitlistMatches();

            const room =
                await Room.findById(roomId);

            if (!room) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Room not found.",
                });
            }

            const bed =
                room.beds.find(
                    (b) =>
                        b.bedNumber === bedNumber &&
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
            // PRIORITY CHECK
            // ------------------------------------------------

            const priorityEntry = await Waitlist.findOne({
                room: room._id,
                bedNumber,
                status: "matched",
                matchedUntil: {
                    $gt: new Date(),
                },
            });

            // If another student has priority, block this request
            if (
                priorityEntry &&
                priorityEntry.student.toString() !==
                    req.user._id.toString()
            ) {
                return res.status(400).json({
                    success: false,
                    waitlistPriority: true,
                    message:
                        "This bed is currently reserved for the matched waitlist student.",
                });
            }

            // If current student is the matched student,
            // allow the request to continue.
            const isCurrentMatchedStudent =
                !!priorityEntry;

            // ------------------------------------------------
            // ACTIVE RESERVATION
            // ------------------------------------------------

            const activeReservation =
                await Reservation.findOne({
                    student:
                        req.user._id,

                    status: {
                        $in: [
                            "pending",
                            "approved",
                        ],
                    },
                });

            if (activeReservation) {
                return res.status(400).json({
                    success: false,
                    message:
                        "You already have an active reservation.",
                });
            }

            // ------------------------------------------------
            // ACTIVE WAITLIST
            //
            // Matched student is allowed.
            // ------------------------------------------------

            if (
                !isCurrentMatchedStudent
            ) {
                const activeWaitlist =
                    await Waitlist.findOne({
                        student:
                            req.user._id,

                        status: {
                            $in: [
                                "waiting",
                                "matched",
                            ],
                        },
                    });

                if (activeWaitlist) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "You already have an active waitlist request.",
                    });
                }
            }

            // ------------------------------------------------
            // BED OCCUPIED / ON HOLD
            // ------------------------------------------------

            if (
                bed.occupied ||
                bed.onHold
            ) {

                if (
                    isCurrentMatchedStudent
                ) {
                    return res.status(409).json({
                        success: false,
                        waitlistPriority: true,
                        message:
                            "This bed is currently unavailable. Please try again when it becomes available.",
                    });
                }

                // Normal student joins waitlist.
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

                const waitlistEntry =
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
                    });

                // Calculate immediate rank.
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
                                waitlistEntry.createdAt,
                        },
                    });

                return res.status(201).json({
                    success: true,
                    waitlisted: true,

                    message:
                        bed.occupied
                            ? "This bed is occupied. You have been added to the waitlist."
                            : "This bed is currently on hold. You have been added to the waitlist.",

                    waitlist: {
                        ...waitlistEntry.toObject(),
                        position,
                    },
                });
            }

            // ------------------------------------------------
            // BED AVAILABLE — CLAIM IT
            //
            // Matched student: delegate entirely to
            // claimBedForMatchedStudent() so there is exactly
            // one implementation of the atomic hold + create +
            // rollback + "allocated" flow.
            // ------------------------------------------------

            if (isCurrentMatchedStudent) {
                const result =
                    await claimBedForMatchedStudent(
                        priorityEntry
                    );

                return res
                    .status(result.status)
                    .json(result.body);
            }

            // ------------------------------------------------
            // Normal student, no waitlist entry to update.
            // ------------------------------------------------

            const claimedRoom =
                await Room.findOneAndUpdate(
                    {
                        _id: room._id,

                        beds: {
                            $elemMatch: {
                                bedNumber,

                                occupied: false,

                                onHold: false,

                                isArchived: {
                                    $ne: true,
                                },
                            },
                        },
                    },
                    {
                        $set: {
                            "beds.$.onHold":
                                true,
                        },
                    },
                    {
                        new: true,
                    }
                );

            if (!claimedRoom) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Another student just requested this bed. Please try again.",
                });
            }

            let reservation;

            try {
                reservation =
                    await Reservation.create({
                        student:
                            req.user._id,

                        room:
                            room._id,

                        bedNumber,

                        status:
                            "pending",

                        holdExpiresAt:
                            new Date(
                                Date.now() +
                                RESERVATION_HOLD_MS
                            ),
                    });

            } catch (reservationError) {

                await Room.updateOne(
                    {
                        _id: room._id,
                        "beds.bedNumber":
                            bedNumber,
                    },
                    {
                        $set: {
                            "beds.$.onHold":
                                false,
                        },
                    }
                );

                throw reservationError;
            }

            return res.status(201).json({
                success: true,

                waitlisted: false,
                fromWaitlist: false,

                message: "Reservation request sent to manager.",

                reservation,
            });

        } catch (error) {

            console.error(
                "[Reservation] requestReservation:",
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
// STUDENT - MY RESERVATIONS
// ===========================================================

const getMyReservations =
    async (req, res) => {

        try {
            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservations =
                await Reservation.find({
                    student:
                        req.user._id,
                })
                    .populate("room")
                    .sort({
                        createdAt: -1,
                    });

            return res.json({
                success: true,
                reservations,
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// MANAGER - PENDING RESERVATIONS
// ===========================================================

const getPendingReservations =
    async (req, res) => {

        try {

            if (
                req.user.role !== "manager"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Managers only.",
                });
            }

            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservations =
                await Reservation.find({
                    status: "pending",
                })
                    .populate("student")
                    .populate("room")
                    .sort({
                        createdAt: -1,
                    });

            return res.json({
                success: true,
                reservations,
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    error.message,
            });
        }
    };

// ===========================================================
// MANAGER - APPROVE RESERVATION
// ===========================================================

const approveReservation =
    async (req, res) => {

        try {

            if (
                req.user.role !== "manager"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Managers only.",
                });
            }

            if (
                !isValidId(req.params.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid reservation id.",
                });
            }

            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservation =
                await Reservation.findById(
                    req.params.id
                );

            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Reservation not found.",
                });
            }

            if (
                reservation.status !== "pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Reservation has already been processed.",
                });
            }

            if (
                reservation.holdExpiresAt &&
                reservation.holdExpiresAt <=
                    new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This reservation hold has expired.",
                });
            }

            // Occupy bed.
            const updatedRoom =
                await Room.findOneAndUpdate(
                    {
                        _id:
                            reservation.room,

                        beds: {
                            $elemMatch: {
                                bedNumber:
                                    reservation.bedNumber,

                                onHold: true,

                                occupied: false,

                                isArchived: {
                                    $ne: true,
                                },
                            },
                        },
                    },
                    {
                        $set: {
                            "beds.$.occupied":
                                true,

                            "beds.$.onHold":
                                false,
                        },

                        $inc: {
                            currentOccupancy: 1,
                        },
                    },
                    {
                        new: true,
                    }
                );

            if (!updatedRoom) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Bed is no longer available to approve.",
                });
            }

            reservation.status =
                "approved";

            reservation.approvedAt =
                new Date();

            reservation.approvedBy =
                req.user._id;

            await reservation.save();

            // Remove student's active waitlist.
            await Waitlist.deleteMany({
                student:
                    reservation.student,

                status: {
                    $in: [
                        "waiting",
                        "matched",
                    ],
                },
            });

            return res.json({
                success: true,
                message:
                    "Reservation approved successfully.",
            });

        } catch (error) {

            console.error(
                "[Reservation] approveReservation:",
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
// MANAGER - REJECT RESERVATION
// ===========================================================

const rejectReservation =
    async (req, res) => {

        try {

            if (
                req.user.role !== "manager"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Managers only.",
                });
            }

            if (
                !isValidId(req.params.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid reservation id.",
                });
            }

            const { reason } =
                req.body;

            if (
                !reason ||
                !reason.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A rejection reason is required.",
                });
            }

            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservation =
                await Reservation.findById(
                    req.params.id
                );

            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Reservation not found.",
                });
            }

            if (
                reservation.status !== "pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Reservation has already been processed.",
                });
            }

            // Release bed.
            await Room.updateOne(
                {
                    _id:
                        reservation.room,

                    "beds.bedNumber":
                        reservation.bedNumber,
                },
                {
                    $set: {
                        "beds.$.onHold":
                            false,
                    },
                }
            );

            reservation.status =
                "rejected";

            reservation.rejectionReason =
                reason.trim();

            await reservation.save();

            // Next waitlist student gets priority.
            await matchWaitlist(
                reservation.room,
                reservation.bedNumber
            );

            return res.json({
                success: true,
                message:
                    "Reservation rejected. The next waitlist student will receive priority.",
            });

        } catch (error) {

            console.error(
                "[Reservation] rejectReservation:",
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
// STUDENT - CANCEL RESERVATION
// ===========================================================

const cancelReservation =
    async (req, res) => {

        try {

            if (
                !isValidId(req.params.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid reservation id.",
                });
            }

            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservation =
                await Reservation.findById(
                    req.params.id
                );

            if (!reservation) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Reservation not found.",
                });
            }

            if (
                reservation.student.toString() !==
                req.user._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Unauthorized.",
                });
            }

            if (
                [
                    "rejected",
                    "cancelled",
                    "expired",
                ].includes(
                    reservation.status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This reservation can no longer be cancelled.",
                });
            }

            // ------------------------------------------------
            // APPROVED
            // ------------------------------------------------

            if (
                reservation.status === "approved"
            ) {

                const releasedRoom =
                    await Room.findOneAndUpdate(
                        {
                            _id:
                                reservation.room,

                            beds: {
                                $elemMatch: {
                                    bedNumber:
                                        reservation.bedNumber,

                                    occupied: true,

                                    isArchived: {
                                        $ne: true,
                                    },
                                },
                            },
                        },
                        {
                            $set: {
                                "beds.$.occupied":
                                    false,

                                "beds.$.onHold":
                                    false,
                            },

                            $inc: {
                                currentOccupancy:
                                    -1,
                            },
                        },
                        {
                            new: true,
                        }
                    );

                reservation.status =
                    "cancelled";

                await reservation.save();

                if (releasedRoom) {
                    await matchWaitlist(
                        reservation.room,
                        reservation.bedNumber
                    );
                }

                return res.json({
                    success: true,
                    message:
                        "Reservation cancelled successfully. The next waitlist student will receive priority.",
                });
            }

            // ------------------------------------------------
            // PENDING
            // ------------------------------------------------

            if (
                reservation.status === "pending"
            ) {

                const releasedRoom =
                    await Room.findOneAndUpdate(
                        {
                            _id:
                                reservation.room,

                            beds: {
                                $elemMatch: {
                                    bedNumber:
                                        reservation.bedNumber,

                                    onHold: true,

                                    occupied: false,

                                    isArchived: {
                                        $ne: true,
                                    },
                                },
                            },
                        },
                        {
                            $set: {
                                "beds.$.onHold":
                                    false,
                            },
                        },
                        {
                            new: true,
                        }
                    );

                reservation.status =
                    "cancelled";

                await reservation.save();

                if (releasedRoom) {
                    await matchWaitlist(
                        reservation.room,
                        reservation.bedNumber
                    );
                }

                return res.json({
                    success: true,
                    message:
                        "Reservation cancelled successfully. The next waitlist student will receive priority.",
                });
            }

        } catch (error) {

            console.error(
                "[Reservation] cancelReservation:",
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
// STUDENT - RESERVATION STATUS
// ===========================================================

const getReservationStatus =
    async (req, res) => {

        try {

            if (
                !isValidId(
                    req.params.roomId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid room id.",
                });
            }

            await expireStaleHolds();
            await expireWaitlistMatches();

            const reservation =
                await Reservation.findOne({
                    student:
                        req.user._id,

                    room:
                        req.params.roomId,

                    status: {
                        $in: [
                            "pending",
                            "approved",
                        ],
                    },
                }).sort({
                    createdAt: -1,
                });

            if (!reservation) {
                return res.json({
                    success: true,
                    status: null,
                });
            }

            return res.json({
                success: true,

                status:
                    reservation.status,

                reservationId:
                    reservation._id,

                bedNumber:
                    reservation.bedNumber,

                holdExpiresAt:
                    reservation.holdExpiresAt ||
                    null,
            });

        } catch (error) {

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
    requestReservation,
    getMyReservations,
    getPendingReservations,
    approveReservation,
    rejectReservation,
    cancelReservation,
    getReservationStatus,

    expireStaleHolds,
    expireWaitlistMatches,
    matchWaitlist,
    hasActiveRequest,

    claimBedForMatchedStudent,
    cancelReservationForFreedBed,

    // Exported so other controllers can reuse the same
    // validation helper and the same claim-window constant
    // instead of redefining/hardcoding them.
    isValidId,
    WAITLIST_CLAIM_HOURS,
};
