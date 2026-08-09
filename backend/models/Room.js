const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    building: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },

    floor: {
      number: {
        type: Number,
        required: true,
      },
    },

    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    messLocation: {
      type: String,
      required: true,
      trim: true,
    },

    coordinates: {
      // Sample coordinates near the default campus.
      // Keep existing rooms map-ready.
      lat: {
        type: Number,
        default: 23.7815,
      },
      lng: {
        type: Number,
        default: 90.4080,
      },
    },

    campusCoordinates: {
      lat: {
        type: Number,
        default: 23.7806,
      },
      lng: {
        type: Number,
        default: 90.4070,
      },
    },

    rent: {
      type: Number,
      required: true,
      min: 0,
    },

    // Archive flag — frontend "Delete Room" sets this to true.
    // Room stays in DB but is excluded from normal queries.
    // Its roomNumber becomes reusable by a new active room.
    isArchived: {
      type: Boolean,
      default: false,
    },

    totalArea: {
      type: Number,
      default: 0,
      min: 0,
    },

    usableArea: {
      type: Number,
      default: 0,
      min: 0,
    },

    storage: {
      type: String,
      default: "",
    },

    bathroomType: {
      type: String,
      enum: ["Shared", "Attached"],
      required: true,
    },

    amenities: {
      type: [String],
      default: [],
    },

    utilityPolicy: {
      type: String,
      default: "",
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },

        public_id: {
          type: String,
          required: true,
        },
      },
    ],

    noiseLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },

    naturalLightLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },

    ventilationNotes: {
      type: String,
      default: "",
    },

    layout: {
      roomWidth: {
        type: Number,
        default: 0,
        min: 0,
      },

      roomLength: {
        type: Number,
        default: 0,
        min: 0,
      },

      bedPositions: {
        type: [mongoose.Schema.Types.Mixed],
        default: [],
      },

      deskPositions: {
        type: [String],
        default: [],
      },

      wardrobePositions: {
        type: [String],
        default: [],
      },
    },

    beds: [
      {
        bedNumber: {
          type: String,
          required: true,
          trim: true,
        },

        position: String,

        // Reservation pending / temporarily held
        onHold: {
          type: Boolean,
          default: false,
        },

        // Permanently occupied after reservation approval
        occupied: {
          type: Boolean,
          default: false,
        },

        // Archived beds are excluded from normal operations
        isArchived: {
          type: Boolean,
          default: false,
        },
      },
    ],

    currentOccupancy: {
      type: Number,
      default: 0,
    },
  },

  {
    timestamps: true,
  }
);

/* ----------------------------------------------------------------
PRE-SAVE: occupancy recalculation + active bedNumber uniqueness.

Combined into a single hook since both operate on the same
this.beds array.
------------------------------------------------------------------- */

roomSchema.pre("save", function (next) {
  const activeBeds = this.beds.filter((b) => !b.isArchived);

  // Recalculate occupancy — only active, occupied beds count.
  this.currentOccupancy = activeBeds.filter(
    (b) => b.occupied
  ).length;

  // Enforce bedNumber uniqueness — only among active beds.
  // Archived beds are excluded, so a new bed can reuse a number
  // that an archived bed once had.
  const activeBedNumbers = activeBeds.map(
    (b) => b.bedNumber
  );

  const hasDuplicate =
    new Set(activeBedNumbers).size !== activeBedNumbers.length;

  if (hasDuplicate) {
    return next(
      new Error(
        "Duplicate bedNumber found among active (non-archived) beds."
      )
    );
  }

  next();
});

/* ----------------------------------------------------------------
ROOM NUMBER UNIQUENESS — only among ACTIVE (non-archived) rooms
within the same building.

Enforced as a partial unique index at the DB level
(race-condition safe, unlike an in-app check).

Archived rooms fall outside this index, so their roomNumber
becomes reusable by a new active room in the same building.
------------------------------------------------------------------- */

roomSchema.index(
  {
    "building.name": 1,
    roomNumber: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isArchived: false,
    },
  }
);

/* ----------------------------------------------------------------
Useful secondary indexes for common queries.
------------------------------------------------------------------- */

roomSchema.index({
  isArchived: 1,
});

module.exports = mongoose.model("Room", roomSchema);