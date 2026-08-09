const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum: [
        "pending",    // Temporary Hold
        "approved",   // Allocated
        "rejected",
        "cancelled",
        "expired",    // Hold timed out before manager acted
      ],
      default: "pending",
    },

    holdExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 10 minutes
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          return this.status !== "rejected" || (v && v.trim().length > 0);
        },
        message: "Rejection reason is required when a reservation is rejected.",
      },
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ student: 1, status: 1 });

reservationSchema.index(
  { room: 1, bedNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "approved"] } },
  }
);

module.exports = mongoose.model("BedReservation", reservationSchema);