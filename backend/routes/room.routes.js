const express = require("express");
const router = express.Router();

const multer = require("multer");

const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  archiveRoom,
  uploadRoomImage,
  deleteRoomImage,
  addBed,
  updateBed,
  archiveBed,
} = require("../controllers/room.controller");

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, "uploads/"),

  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() + "-" + file.originalname
    ),
});

const upload = multer({ storage });

/* ================= ROOM ================= */

router.post("/", createRoom);

router.get("/", getRooms);

router.get("/:id", getRoomById);

router.put("/:id", updateRoom);

router.patch(
  "/:id/archive",
  archiveRoom
);

/* ================= IMAGES ================= */

router.post(
  "/upload",
  upload.array("images", 10),
  uploadRoomImage
);

router.delete(
  "/:id/images/:public_id",
  deleteRoomImage
);

/* ================= BEDS ================= */

router.post(
  "/:id/beds",
  addBed
);

router.put(
  "/:id/beds/:bedId",
  updateBed
);

router.patch(
  "/:id/beds/:bedId/archive",
  archiveBed
);

module.exports = router;