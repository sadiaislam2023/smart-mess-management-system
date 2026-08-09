const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Room",
            required: true,
        },

        bedNumber: {
            type: String,
            required: true,
        },

        budget: {
            type: Number,
            required: true,
        },

        roommatePreference: {
            type: String,
            default: "",
        },

        spacePreference: {
            type: Number,
            default: null,
        },

        status: {
            type: String,
            enum: [
                "waiting",
                "matched",
                "allocated",
                "cancelled",
                "expired",
            ],
            default: "waiting",
        },

        notified: {
            type: Boolean,
            default: false,
        },

        notificationMessage: {
            type: String,
            default: "",
        },

        // When the student received the 24-hour priority
        matchedAt: {
            type: Date,
            default: null,
        },

        // Exact time when the student's 24-hour priority expires
        matchedUntil: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);


// ===========================================================
// INDEXES
// ===========================================================

waitlistSchema.index({
    room: 1,
    bedNumber: 1,
    status: 1,
});

waitlistSchema.index({
    student: 1,
    status: 1,
});

waitlistSchema.index({
    room: 1,
    bedNumber: 1,
    createdAt: 1,
});

waitlistSchema.index({
    status: 1,
    matchedUntil: 1,
});


module.exports =
    mongoose.model(
        "Waitlist",
        waitlistSchema
    );