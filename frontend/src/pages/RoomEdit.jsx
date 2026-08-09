import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import roomService from "../services/roomService";

const RoomEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingBedId, setUpdatingBedId] = useState(null);

  const [images, setImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [newBed, setNewBed] = useState({
    bedNumber: "",
    position: "",
    occupied: false,
  });

  // =========================================================
  // LOAD ROOM
  // =========================================================

  useEffect(() => {
    loadRoom();
  }, [id]);

  const loadRoom = async () => {
    try {
      setLoading(true);

      const res = await roomService.getRoom(id);

      setRoom(res.data.room);
    } catch (err) {
      console.error("Failed to load room:", err);

      alert(
        err.response?.data?.message ||
          "Failed to load room."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // BASIC INPUT
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setRoom((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =========================================================
  // NESTED INPUT
  // =========================================================

  const updateNested = (
    section,
    field,
    value
  ) => {
    setRoom((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value,
      },
    }));
  };

  // =========================================================
  // UPLOAD IMAGES
  // =========================================================

  const uploadPhotos = async () => {
    try {
      if (images.length === 0) {
        return [];
      }

      const formData = new FormData();

      images.forEach((img) => {
        formData.append("images", img);
      });

      const res =
        await roomService.uploadImage(
          formData
        );

      return res.data.urls || [];
    } catch (err) {
      console.error(
        "Image upload failed:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to upload images."
      );

      return [];
    }
  };

  // =========================================================
  // REMOVE IMAGE
  // =========================================================

  const removeImage = async (image) => {
    if (!image?.public_id) {
      return;
    }

    try {
      await roomService.deleteImage(
        id,
        image.public_id
      );

      setRoom((prev) => ({
        ...prev,
        images: (prev.images || []).filter(
          (img) =>
            img.public_id !==
            image.public_id
        ),
      }));
    } catch (err) {
      console.error(
        "Failed to remove image:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to remove image."
      );
    }
  };

  // =========================================================
  // ADD BED
  // =========================================================

  const addBed = async () => {
    if (!newBed.bedNumber.trim()) {
      alert("Please enter a bed number.");
      return;
    }

    if (!newBed.position.trim()) {
      alert("Please enter the bed position.");
      return;
    }

    try {
      const res =
        await roomService.addBed(
          id,
          newBed
        );

      setNewBed({
        bedNumber: "",
        position: "",
        occupied: false,
      });

      /*
       * Use returned room if available.
       * Otherwise reload from backend.
       */
      if (res?.data?.room) {
        setRoom(res.data.room);
      } else {
        await loadRoom();
      }

      alert("Bed added successfully.");
    } catch (err) {
      console.error(
        "Failed to add bed:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to add bed."
      );
    }
  };

  // =========================================================
  // UPDATE BED STATUS
  //
  // IMPORTANT:
  // This immediately saves the status to MongoDB.
  //
  // Available -> Occupied
  // Occupied  -> Available
  // =========================================================

  const updateBedStatus = async (bed) => {
    if (!bed?._id) {
      return;
    }

    /*
     * Do not manually change a bed that is currently
     * on hold by a pending reservation.
     *
     * The reservation system controls onHold beds.
     */
    if (bed.onHold) {
      alert(
        "This bed is currently on hold for a reservation and cannot be changed manually."
      );

      return;
    }

    const newOccupiedStatus =
      !Boolean(bed.occupied);

    const actionText =
      newOccupiedStatus
        ? "mark this bed as occupied"
        : "make this bed available";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${actionText}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingBedId(bed._id);

      /*
       * Send the changed status directly
       * to the backend.
       */
      const res =
        await roomService.updateBed(
          id,
          bed._id,
          {
            occupied:
              newOccupiedStatus,
          }
        );

      /*
       * Update UI using backend response
       * if available.
       */
      if (res?.data?.room) {
        setRoom(res.data.room);
      } else if (res?.data?.bed) {
        setRoom((prev) => ({
          ...prev,
          beds: (prev.beds || []).map(
            (currentBed) =>
              currentBed._id ===
              bed._id
                ? {
                    ...currentBed,
                    ...res.data.bed,
                  }
                : currentBed
          ),
        }));
      } else {
        /*
         * Safest fallback:
         * reload from MongoDB.
         */
        await loadRoom();
      }

      alert(
        newOccupiedStatus
          ? "Bed marked as occupied."
          : "Bed marked as available."
      );
    } catch (err) {
      console.error(
        "Failed to update bed status:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to update bed status."
      );

      /*
       * Reload so frontend always matches
       * the actual backend state.
       */
      await loadRoom();
    } finally {
      setUpdatingBedId(null);
    }
  };

  // =========================================================
  // DELETE BED / ARCHIVE BED
  // =========================================================

  const deleteBed = async (bed) => {
    if (!bed?._id) {
      return;
    }

    /*
     * Do not archive a bed while it is occupied.
     */
    if (bed.occupied) {
      alert(
        "An occupied bed cannot be deleted."
      );

      return;
    }

    /*
     * Do not archive an on-hold bed.
     */
    if (bed.onHold) {
      alert(
        "An on-hold bed cannot be deleted until its reservation is resolved."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete Bed ${bed.bedNumber}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await roomService.deleteBed(
        id,
        bed._id
      );

      /*
       * Remove from UI immediately.
       */
      setRoom((prev) => ({
        ...prev,
        beds: (prev.beds || []).filter(
          (currentBed) =>
            currentBed._id !==
            bed._id
        ),
      }));

      alert("Bed deleted successfully.");
    } catch (err) {
      console.error(
        "Failed to delete bed:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Failed to delete bed."
      );

      await loadRoom();
    }
  };

  // =========================================================
  // SAVE ROOM
  // =========================================================

  const handleSave = async () => {
    try {
      setSaving(true);

      let uploaded = [];

      if (images.length > 0) {
        uploaded =
          await uploadPhotos();
      }

      const updatedRoom = {
        ...room,
        images: [
          ...(room.images || []),
          ...uploaded,
        ],
      };

      await roomService.updateRoom(
        id,
        updatedRoom
      );

      alert(
        "Room updated successfully."
      );

      navigate(`/rooms/${id}`);
    } catch (err) {
      console.error(
        "Room update failed:",
        err
      );

      alert(
        err.response?.data?.message ||
          "Room update failed."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div
          className="spinner-border"
          role="status"
        />

        <p className="mt-2">
          Loading room...
        </p>
      </div>
    );
  }

  // =========================================================
  // ROOM NOT FOUND
  // =========================================================

  if (!room) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          Room not found.
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="container mt-4 mb-5">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          Edit Room Space Passport
        </h2>

        <button
          className="btn btn-secondary"
          onClick={() =>
            navigate(-1)
          }
        >
          Back
        </button>
      </div>

      {/* =====================================================
          BASIC ROOM INFORMATION
      ===================================================== */}

      <div className="row">

        {/* BUILDING */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Building Name
          </label>

          <input
            className="form-control"
            value={
              room.building?.name || ""
            }
            onChange={(e) =>
              updateNested(
                "building",
                "name",
                e.target.value
              )
            }
          />
        </div>

        {/* FLOOR */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Floor Number
          </label>

          <input
            type="number"
            className="form-control"
            value={
              room.floor?.number ?? ""
            }
            onChange={(e) =>
              updateNested(
                "floor",
                "number",
                Number(e.target.value)
              )
            }
          />
        </div>

        {/* ROOM NUMBER */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Room Number
          </label>

          <input
            className="form-control"
            name="roomNumber"
            value={
              room.roomNumber || ""
            }
            onChange={handleChange}
          />
        </div>

        {/* LOCATION */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Mess Location
          </label>

          <input
            className="form-control"
            name="messLocation"
            value={
              room.messLocation || ""
            }
            onChange={handleChange}
          />
        </div>

        {/* TOTAL AREA */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Total Area (sq ft)
          </label>

          <input
            type="number"
            className="form-control"
            name="totalArea"
            value={
              room.totalArea ?? ""
            }
            onChange={handleChange}
          />
        </div>

        {/* USABLE AREA */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Usable Area (sq ft)
          </label>

          <input
            type="number"
            className="form-control"
            name="usableArea"
            value={
              room.usableArea ?? ""
            }
            onChange={handleChange}
          />
        </div>

        {/* ROOM WIDTH */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Room Width (ft)
          </label>

          <input
            type="number"
            className="form-control"
            value={
              room.layout?.roomWidth ?? ""
            }
            onChange={(e) =>
              updateNested(
                "layout",
                "roomWidth",
                Number(e.target.value)
              )
            }
          />
        </div>

        {/* ROOM LENGTH */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Room Length (ft)
          </label>

          <input
            type="number"
            className="form-control"
            value={
              room.layout?.roomLength ?? ""
            }
            onChange={(e) =>
              updateNested(
                "layout",
                "roomLength",
                Number(e.target.value)
              )
            }
          />
        </div>

        {/* RENT */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Rent (Tk)
          </label>

          <input
            type="number"
            className="form-control"
            name="rent"
            value={
              room.rent ?? ""
            }
            onChange={handleChange}
          />
        </div>

        {/* STORAGE */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Storage
          </label>

          <input
            className="form-control"
            name="storage"
            value={
              room.storage || ""
            }
            onChange={handleChange}
          />
        </div>

        {/* BATHROOM */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Bathroom Type
          </label>

          <select
            className="form-select"
            name="bathroomType"
            value={
              room.bathroomType ||
              "Shared"
            }
            onChange={handleChange}
          >
            <option value="Shared">
              Shared
            </option>

            <option value="Attached">
              Attached
            </option>
          </select>
        </div>

        {/* NATURAL LIGHT */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Natural Light
          </label>

          <select
            className="form-select"
            name="naturalLightLevel"
            value={
              room.naturalLightLevel ||
              "Medium"
            }
            onChange={handleChange}
          >
            <option value="Low">
              Low
            </option>

            <option value="Medium">
              Medium
            </option>

            <option value="High">
              High
            </option>
          </select>
        </div>

        {/* UTILITY POLICY */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Utility Policy
          </label>

          <input
            className="form-control"
            name="utilityPolicy"
            value={
              room.utilityPolicy || ""
            }
            onChange={handleChange}
          />
        </div>

        {/* VENTILATION */}

        <div className="col-md-6 mb-3">
          <label className="form-label fw-bold">
            Ventilation Notes
          </label>

          <input
            className="form-control"
            name="ventilationNotes"
            value={
              room.ventilationNotes || ""
            }
            onChange={handleChange}
          />
        </div>

        {/* AMENITIES */}

        <div className="col-12 mb-4">
          <label className="form-label fw-bold">
            Amenities
          </label>

          <input
            className="form-control"
            value={(
              room.amenities || []
            ).join(", ")}
            onChange={(e) =>
              setRoom((prev) => ({
                ...prev,
                amenities:
                  e.target.value
                    .split(",")
                    .map((item) =>
                      item.trim()
                    )
                    .filter(
                      (item) =>
                        item !== ""
                    ),
              }))
            }
            placeholder="Wifi, Fan, AC, Balcony..."
          />
        </div>
      </div>

      <hr />

      {/* =====================================================
          ROOM IMAGES
      ===================================================== */}

      <h4 className="mb-3">
        Room Images (Max 10 Files)
      </h4>

      <input
        type="file"
        multiple
        accept="image/*"
        className="form-control mb-2"
        onChange={(e) => {
          const files = [
            ...e.target.files,
          ];

          if (files.length > 10) {
            setErrorMessage(
              "Maximum 10 images allowed."
            );

            e.target.value = "";
            return;
          }

          setErrorMessage("");
          setImages(files);
        }}
      />

      {errorMessage && (
        <div className="text-danger mb-3">
          {errorMessage}
        </div>
      )}

      {/* NEW IMAGE PREVIEW */}

      {images.length > 0 && (
        <div className="row mb-4">
          {images.map(
            (img, index) => (
              <div
                className="col-md-3 col-sm-4 mb-3"
                key={index}
              >
                <img
                  src={URL.createObjectURL(
                    img
                  )}
                  alt="New room"
                  className="img-fluid rounded border"
                  style={{
                    height: "160px",
                    width: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )
          )}
        </div>
      )}

      {/* EXISTING IMAGES */}

      <div className="row">
        {(room.images || []).map(
          (img, index) => (
            <div
              className="col-md-3 mb-3"
              key={
                img.public_id ||
                index
              }
            >
              <div className="card">

                <img
                  src={img.url}
                  alt="Room"
                  className="card-img-top"
                  style={{
                    height: "180px",
                    objectFit: "cover",
                  }}
                />

                <div className="card-body p-2">

                  <button
                    className="btn btn-danger btn-sm w-100"
                    onClick={() =>
                      removeImage(img)
                    }
                  >
                    Remove
                  </button>

                </div>
              </div>
            </div>
          )
        )}
      </div>

      <hr />

      {/* =====================================================
          BED INVENTORY
      ===================================================== */}

      <h4 className="mb-3">
        Bed Inventory
      </h4>

      {/* ADD NEW BED */}

      <div className="row mb-4">

        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Bed Number"
            value={
              newBed.bedNumber
            }
            onChange={(e) =>
              setNewBed((prev) => ({
                ...prev,
                bedNumber:
                  e.target.value,
              }))
            }
          />
        </div>

        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Position"
            value={
              newBed.position
            }
            onChange={(e) =>
              setNewBed((prev) => ({
                ...prev,
                position:
                  e.target.value,
              }))
            }
          />
        </div>

        <div className="col-md-4">
          <button
            className="btn btn-primary w-100"
            onClick={addBed}
          >
            Add Bed
          </button>
        </div>

      </div>

      {/* BED TABLE */}

      {(room.beds || []).filter(
        (bed) => !bed.isArchived
      ).length === 0 ? (

        <div className="alert alert-info">
          No beds added to this room.
        </div>

      ) : (

        <div className="table-responsive">

          <table className="table table-bordered align-middle">

            <thead className="table-light">

              <tr>
                <th>
                  Bed No
                </th>

                <th>
                  Position
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>

            </thead>

            <tbody>

              {(room.beds || [])
                .filter(
                  (bed) =>
                    !bed.isArchived
                )
                .map((bed) => {

                  const updating =
                    updatingBedId ===
                    bed._id;

                  return (
                    <tr
                      key={bed._id}
                    >

                      {/* BED NUMBER */}

                      <td>
                        {bed.bedNumber}
                      </td>

                      {/* POSITION */}

                      <td>
                        {bed.position ||
                          "-"}
                      </td>

                      {/* STATUS */}

                      <td>

                        {bed.onHold ? (

                          <span className="badge bg-warning text-dark">
                            On Hold
                          </span>

                        ) : bed.occupied ? (

                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            disabled={
                              updating
                            }
                            onClick={() =>
                              updateBedStatus(
                                bed
                              )
                            }
                          >
                            {updating
                              ? "Updating..."
                              : "Occupied"}
                          </button>

                        ) : (

                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={
                              updating
                            }
                            onClick={() =>
                              updateBedStatus(
                                bed
                              )
                            }
                          >
                            {updating
                              ? "Updating..."
                              : "Available"}
                          </button>

                        )}

                      </td>

                      {/* DELETE */}

                      <td>

                        <button
                          className="btn btn-danger btn-sm"
                          disabled={
                            bed.occupied ||
                            bed.onHold
                          }
                          onClick={() =>
                            deleteBed(
                              bed
                            )
                          }
                        >
                          Delete
                        </button>

                      </td>

                    </tr>
                  );
                })}

            </tbody>

          </table>

        </div>
      )}

      {/* =====================================================
          BED STATUS INFORMATION
      ===================================================== */}

      <div className="alert alert-info mt-3">

        <strong>
          Bed status:
        </strong>

        <ul className="mb-0 mt-2">

          <li>
            <span className="badge bg-success me-2">
              Available
            </span>
            The bed can be requested by
            students.
          </li>

          <li>
            <span className="badge bg-danger me-2">
              Occupied
            </span>
            The bed is currently occupied.
          </li>

          <li>
            <span className="badge bg-warning text-dark me-2">
              On Hold
            </span>
            The bed is temporarily unavailable —
            either a reservation request is pending
            approval, or a waitlisted student
            currently has priority to claim it.
          </li>

        </ul>

      </div>

      <hr />

      {/* =====================================================
          SAVE BUTTONS
      ===================================================== */}

      <div className="d-flex justify-content-end gap-2 mt-4">

        <button
          className="btn btn-secondary"
          onClick={() =>
            navigate(
              `/rooms/${id}`
            )
          }
        >
          Cancel
        </button>

        <button
          className="btn btn-success"
          disabled={saving}
          onClick={handleSave}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>

      </div>

    </div>
  );
};

export default RoomEdit;