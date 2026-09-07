import { useState } from "react";
import { useNavigate } from "react-router-dom";
import roomService from "../services/roomService";

const RoomForm = () => {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [room, setRoom] = useState({
    buildingName: "",
    floorNumber: "",
    roomNumber: "",
    messLocation: "",

    totalArea: "",
    usableArea: "",

    roomWidth: "",
    roomLength: "",

    storage: "",

    bathroomType: "Shared",

    rent: "",

    utilityPolicy: "",

    naturalLightLevel: "Medium",

    ventilationNotes: "",

    amenities: "",
  });

  // ==========================
  // HANDLE CHANGE
  // ==========================
  const handleChange = (e) => {
    setRoom({
      ...room,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================
  // UPLOAD IMAGES
  // ==========================
  const uploadPhotos = async () => {
    try {
      if (images.length === 0) return [];

      const formData = new FormData();

      images.forEach((img) => {
        formData.append("images", img);
      });

      const res = await roomService.uploadImage(formData);

      return res.data.urls || [];
    } catch (err) {
      console.log(err);
      return [];
    }
  };

  // ==========================
  // SAVE ROOM
  // ==========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length > 10) {
      setErrorMessage("Maximum 10 images allowed.");
      return;
    }

    try {
      let uploadedImages = [];

      if (images.length > 0) {
        uploadedImages = await uploadPhotos();
      }

      const roomData = {
        building: {
          name: room.buildingName,
        },

        floor: {
          number: Number(room.floorNumber),
        },

        roomNumber: room.roomNumber,

        messLocation: room.messLocation,

        totalArea: Number(room.totalArea),

        usableArea: Number(room.usableArea),

        storage: room.storage,

        bathroomType: room.bathroomType,

        rent: Number(room.rent),

        utilityPolicy: room.utilityPolicy,

        naturalLightLevel: room.naturalLightLevel,

        ventilationNotes: room.ventilationNotes,

        amenities:
          room.amenities.length > 0
            ? room.amenities
                .split(",")
                .map((item) => item.trim())
            : [],

        images: uploadedImages,

        layout: {
          roomWidth: Number(room.roomWidth),

          roomLength: Number(room.roomLength),

          bedPositions: [],

          deskPositions: [],

          wardrobePositions: [],
        },

        beds: [],
      };

      await roomService.createRoom(roomData);

      setSuccessMessage("Room created successfully!");

      setErrorMessage("");

      setRoom({
        buildingName: "",
        floorNumber: "",
        roomNumber: "",
        messLocation: "",

        totalArea: "",
        usableArea: "",

        roomWidth: "",
        roomLength: "",

        storage: "",

        bathroomType: "Shared",

        rent: "",

        utilityPolicy: "",

        naturalLightLevel: "Medium",

        ventilationNotes: "",

        amenities: "",
      });

      setImages([]);

      setTimeout(() => {
        navigate("/manager");
      }, 1500);
    } catch (err) {
      console.log(err);

      alert(
        err.response?.data?.message || "Failed to create room."
      );
    }
  };

  return (
    <div className="card shadow p-4">
      <h3 className="text-center mb-4">Create Room Space Passport</h3>

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      {errorMessage && (
        <div className="alert alert-danger">{errorMessage}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* BUILDING */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Building Name</label>
            <input
              type="text"
              className="form-control"
              name="buildingName"
              value={room.buildingName}
              onChange={handleChange}
              required
            />
          </div>

          {/* FLOOR */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Floor Number</label>
            <input
              type="number"
              className="form-control"
              name="floorNumber"
              value={room.floorNumber}
              onChange={handleChange}
              required
            />
          </div>

          {/* ROOM NUMBER */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Room Number</label>
            <input
              type="text"
              className="form-control"
              name="roomNumber"
              value={room.roomNumber}
              onChange={handleChange}
              required
            />
          </div>

          {/* LOCATION */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Mess Location</label>
            <input
              type="text"
              className="form-control"
              name="messLocation"
              value={room.messLocation}
              onChange={handleChange}
              required
            />
          </div>

          {/* TOTAL AREA */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Total Area (sq ft)</label>
            <input
              type="number"
              className="form-control"
              name="totalArea"
              value={room.totalArea}
              onChange={handleChange}
              required
            />
          </div>

          {/* USABLE AREA */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Usable Area (sq ft)</label>
            <input
              type="number"
              className="form-control"
              name="usableArea"
              value={room.usableArea}
              onChange={handleChange}
              required
            />
          </div>

          {/* ROOM WIDTH */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Room Width (ft)</label>
            <input
              type="number"
              className="form-control"
              name="roomWidth"
              value={room.roomWidth}
              onChange={handleChange}
            />
          </div>

          {/* ROOM LENGTH */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Room Length (ft)</label>
            <input
              type="number"
              className="form-control"
              name="roomLength"
              value={room.roomLength}
              onChange={handleChange}
            />
          </div>

          {/* RENT */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Rent (Tk)</label>
            <input
              type="number"
              className="form-control"
              name="rent"
              value={room.rent}
              onChange={handleChange}
              required
            />
          </div>

          {/* STORAGE */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Storage</label>
            <input
              type="text"
              className="form-control"
              name="storage"
              value={room.storage}
              onChange={handleChange}
            />
          </div>

          {/* BATHROOM */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Bathroom Type</label>
            <select
              className="form-select"
              name="bathroomType"
              value={room.bathroomType}
              onChange={handleChange}
            >
              <option value="Shared">Shared</option>
              <option value="Attached">Attached</option>
            </select>
          </div>

          {/* NATURAL LIGHT */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Natural Light</label>
            <select
              className="form-select"
              name="naturalLightLevel"
              value={room.naturalLightLevel}
              onChange={handleChange}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* UTILITY POLICY */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Utility Policy</label>
            <input
              className="form-control"
              name="utilityPolicy"
              value={room.utilityPolicy}
              onChange={handleChange}
            />
          </div>

          {/* VENTILATION */}
          <div className="col-md-6 mb-3">
            <label className="fw-bold">Ventilation Notes</label>
            <input
              className="form-control"
              name="ventilationNotes"
              value={room.ventilationNotes}
              onChange={handleChange}
            />
          </div>

          {/* AMENITIES */}
          <div className="col-12 mb-3">
            <label className="fw-bold">Amenities (comma separated)</label>
            <input
              className="form-control"
              name="amenities"
              placeholder="WiFi, Fan, AC, Balcony ..."
              value={room.amenities}
              onChange={handleChange}
            />
          </div>

          {/* IMAGE UPLOAD */}
          <div className="col-12 mb-3">
            <label className="fw-bold">Room Images (Max 10 Files)</label>

            <input
              type="file"
              multiple
              className="form-control"
              onChange={(e) => {
                const files = [...e.target.files];

                if (files.length > 10) {
                  setErrorMessage("Maximum 10 images allowed.");
                  return;
                }

                setErrorMessage("");
                setImages(files);
              }}
            />
          </div>

          {/* IMAGE PREVIEW */}
          {images.length > 0 && (
            <div className="col-12 mb-4">
              <div className="row">
                {images.map((img, index) => (
                  <div className="col-md-3 col-sm-4 mb-3" key={index}>
                    <img
                      src={URL.createObjectURL(img)}
                      alt=""
                      className="img-fluid rounded border"
                      style={{
                        height: "160px",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary w-100">
          Save Room
        </button>
      </form>
    </div>
  );
};

export default RoomForm;