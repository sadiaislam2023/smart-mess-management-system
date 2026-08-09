const fs = require("fs");
const Room = require("../models/Room");
const cloudinary = require("../utils/cloudinary");
const { withFallbackLayout } = require("../utils/roomLayout");
const geocodeAddress = require("../utils/geocode");

const {
  matchWaitlist,
  cancelReservationForFreedBed,
} = require("./reservation.controller");

/* ================= SAFE ROOM FIELDS ================= */

const UPDATABLE_ROOM_FIELDS = [
  "building",
  "floor",
  "roomNumber",
  "messLocation",
  "coordinates",
  "campusCoordinates",
  "rent",
  "totalArea",
  "usableArea",
  "storage",
  "noiseLevel",
  "bathroomType",
  "amenities",
  "utilityPolicy",
  "naturalLightLevel",
  "ventilationNotes",
  "layout",
  "images",
];

function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

/* ================= CREATE ROOM ================= */

exports.createRoom = async (req, res) => {
  try {
    const roomData = { ...req.body };

    // Automatically convert the address into coordinates
    if (roomData.messLocation) {
      const location = await geocodeAddress(roomData.messLocation);

      if (location) {
        roomData.coordinates = {
          lat: location.lat,
          lng: location.lng,
        };
      }
    }

    const room = await Room.create(roomData);

    res.status(201).json({
      success: true,
      room: withFallbackLayout(room.toObject()),
    });

  } catch (err) {

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An active room with this number already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET ALL ROOMS ================= */

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      isArchived: false,
    }).sort("-createdAt").lean();

    res.json({
      success: true,
      rooms: rooms.map(withFallbackLayout),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= GET ROOM ================= */

exports.getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room || room.isArchived) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const responseRoom = withFallbackLayout({
      ...room.toObject(),
      beds: room.beds.filter((bed) => !bed.isArchived),
    });

    res.json({
      success: true,
      room: responseRoom,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= UPDATE ROOM ================= */

exports.updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const updates = pick(
      req.body,
      UPDATABLE_ROOM_FIELDS
    );

    // Automatically update coordinates if the address changes
    if (
      updates.messLocation &&
      updates.messLocation !== room.messLocation
    ) {
      const location = await geocodeAddress(updates.messLocation);

      if (location) {
        updates.coordinates = {
          lat: location.lat,
          lng: location.lng,
        };
      }
    }

    Object.assign(room, updates);

    await room.save();

    res.json({
      success: true,
      room,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= ARCHIVE ROOM ================= */

exports.archiveRoom = async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      {
        isArchived: true,
      },
      {
        new: true,
      }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.json({
      success: true,
      message: "Room deleted",
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= IMAGE UPLOAD ================= */

exports.uploadRoomImage = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.json({
        success: true,
        urls: [],
      });
    }

    const uploaded = [];

    for (const file of req.files) {
      const result =
        await cloudinary.uploader.upload(
          file.path
        );

      uploaded.push({
        url: result.secure_url,
        public_id: result.public_id,
      });

      fs.unlink(file.path, () => {});
    }

    res.json({
      success: true,
      urls: uploaded,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= DELETE IMAGE ================= */

exports.deleteRoomImage = async (req, res) => {
  try {
    const { id, public_id } = req.params;

    const room = await Room.findById(id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await cloudinary.uploader.destroy(
      public_id
    );

    room.images = room.images.filter(
      (img) =>
        img.public_id !== public_id
    );

    await room.save();

    res.json({
      success: true,
      room,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= ADD BED ================= */

exports.addBed = async (req, res) => {
  try {
    const room = await Room.findById(
      req.params.id
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // ignore archived beds
    const exists = room.beds.find(
      (bed) =>
        bed.bedNumber ===
          req.body.bedNumber &&
        !bed.isArchived
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message:
          "Bed number already exists",
      });
    }

    room.beds.push({
      ...req.body,
      isArchived: false,
    });

    await room.save();

    res.status(201).json({
      success: true,
      room,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= UPDATE BED ================= */
//
// IMPORTANT — BED RELEASE HANDLING
//
// This endpoint is used for general bed edits (rent info,
// bed number, etc.) AND for checkout/manager release
// (setting occupied: false).
//
// Three rules keep this safe for the reservation + waitlist
// system:
//
// 1. "onHold" is NEVER accepted as a manually editable
//    field here. onHold is fully owned by matchWaitlist();
//    letting a generic update silently set it would let it
//    go stale (which is what was happening before — a bed
//    could end up stuck at occupied:false, onHold:true
//    forever, since nothing ever re-evaluated the queue).
//
// 2. If this update causes occupied to transition from
//    true -> false, that means a bed just got freed. Before
//    doing anything else we call cancelReservationForFreedBed()
//    so the student's "approved" Reservation record doesn't
//    go stale — without this, MyReservations.jsx would keep
//    showing "approved" forever for a bed the manager just
//    manually freed (e.g. checkout) instead of the student
//    cancelling it themselves.
//
// 3. We then call matchWaitlist() so the queue decides the
//    correct onHold value:
//      - waiting student exists -> onHold becomes true
//        (bed protected for their priority window)
//      - nobody waiting -> onHold becomes false
//        (bed is genuinely available)
//
/* ===================================================== */

exports.updateBed = async (req, res) => {
  try {
    const room = await Room.findById(
      req.params.id
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const bed = room.beds.id(
      req.params.bedId
    );

    if (!bed || bed.isArchived) {
      return res.status(404).json({
        success: false,
        message: "Bed not found",
      });
    }

    // -------------------------------------------------
    // TRACK WHETHER THIS BED WAS OCCUPIED BEFORE THE
    // UPDATE, SO WE CAN DETECT AN OCCUPIED -> FREE
    // TRANSITION BELOW.
    // -------------------------------------------------

    const wasOccupied = bed.occupied;

    // -------------------------------------------------
    // STRIP onHold FROM THE INCOMING UPDATE.
    //
    // onHold must only ever be set by matchWaitlist().
    // Accepting it here is what caused beds to get stuck
    // showing "on hold" instead of "available" after
    // checkout — a stale onHold value from before this
    // update would simply never get cleared.
    // -------------------------------------------------

    const { onHold, ...safeUpdates } = req.body;

    Object.assign(bed, safeUpdates);

    await room.save();

    // -------------------------------------------------
    // BED JUST BECAME FREE.
    //
    // 1. Cancel the now-stale "approved" reservation for
    //    this bed, if one exists.
    // 2. Let the waitlist decide what onHold should be
    //    now.
    // -------------------------------------------------

    if (
      wasOccupied &&
      bed.occupied === false
    ) {

      await cancelReservationForFreedBed(
        room._id,
        bed.bedNumber
      );

      await matchWaitlist(
        room._id,
        bed.bedNumber
      );

      const updatedRoom =
        await Room.findById(
          room._id
        );

      return res.json({
        success: true,
        room: updatedRoom,
      });
    }

    res.json({
      success: true,
      room,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ================= ARCHIVE BED ================= */

exports.archiveBed = async (req, res) => {
  try {
    const room = await Room.findById(
      req.params.id
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const bed = room.beds.id(
      req.params.bedId
    );

    if (!bed) {
      return res.status(404).json({
        success: false,
        message: "Bed not found",
      });
    }

    const wasOccupied = bed.occupied;

    bed.isArchived = true;
    bed.occupied = false;

    await room.save();

    // -------------------------------------------------
    // If an occupied bed gets archived (e.g. removed from
    // service), the student's "approved" reservation for
    // it is now stale (same as updateBed's occupied -> free
    // transition), and anyone still on its waitlist should
    // be released too rather than left hanging forever on a
    // bed that no longer exists. matchWaitlist() will find
    // no bed to match against in future calls once archived,
    // so we resolve the reservation and the queue here at
    // archive time instead.
    // -------------------------------------------------

    if (wasOccupied) {
      await cancelReservationForFreedBed(
        room._id,
        bed.bedNumber
      );

      await matchWaitlist(
        room._id,
        bed.bedNumber
      );
    }

    res.json({
      success: true,
      message: "Bed deleted",
      room,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
