import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CampusRouteMap from "../components/CampusRouteMap";
import RoomLayout from "../components/RoomLayout";
import roomService from "../services/roomService";

import {
  requestReservation,
  getMyReservations,
} from "../services/reservationService";

import {
  getWaitlist,
  requestWaitlist,
} from "../services/waitlistService";

import {
  bedSelectionKey,
  getSelectedBedId,
  saveSelectedBedId,
} from "../utils/bedSelection";

import { useAuth } from "../context/AuthContext";

/* =========================================================
   ACTIVE REQUEST STATUSES
========================================================= */

const ACTIVE_RESERVATION_STATUSES = [
  "pending",
  "approved",
];

const ACTIVE_WAITLIST_STATUSES = [
  "waiting",
  "matched",
];

/* =========================================================
   REFRESH INTERVALS
========================================================= */

const ROOM_REFRESH_INTERVAL = 10000; // 10 seconds
const ELIGIBILITY_REFRESH_INTERVAL = 10000; // 10 seconds

/* =========================================================
   COMPONENT
========================================================= */

const RoomDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStudent = user?.role === "student";

  /* =======================================================
     STATE
  ======================================================= */

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedBedId, setSelectedBedId] = useState(null);

  const [hasActiveRequest, setHasActiveRequest] =
    useState(false);

  const [checkingEligibility, setCheckingEligibility] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  /* =======================================================
     LOAD ROOM
  ======================================================= */

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      try {
        const res = await roomService.getRoom(id);

        if (!active) return;

        const loadedRoom = res.data.room;

        setRoom(loadedRoom);

        const savedBedId =
          getSelectedBedId(loadedRoom._id);

        setSelectedBedId(savedBedId);
      } catch (error) {
        console.error(
          "Failed to load room:",
          error
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRoom();

    return () => {
      active = false;
    };
  }, [id]);

  /* =======================================================
     AUTOMATIC ROOM REFRESH
  ======================================================= */

  useEffect(() => {
    let active = true;

    const refreshRoomAutomatically = async () => {
      try {
        const res =
          await roomService.getRoom(id);

        if (!active) return;

        const updatedRoom =
          res.data.room;

        setRoom(updatedRoom);

        const updatedActiveBeds =
          (updatedRoom.beds || []).filter(
            (bed) => !bed.isArchived
          );

        /*
         * Keep selected bed only if it still exists.
         *
         * We intentionally DO NOT clear selection
         * just because a bed becomes occupied/onHold.
         *
         * This is important because students must be
         * able to see the Join Waitlist option.
         */

        const selectedBedStillExists =
          updatedActiveBeds.some(
            (bed) =>
              bedSelectionKey(bed) ===
              selectedBedId
          );

        if (
          selectedBedId &&
          !selectedBedStillExists
        ) {
          setSelectedBedId(null);

          saveSelectedBedId(
            updatedRoom._id,
            null
          );
        }
      } catch (error) {
        console.error(
          "Automatic room refresh failed:",
          error
        );
      }
    };

    const interval =
      setInterval(
        refreshRoomAutomatically,
        ROOM_REFRESH_INTERVAL
      );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, selectedBedId]);

  /* =======================================================
     CHECK STUDENT ELIGIBILITY
  ======================================================= */

  const checkEligibility = async (
    isMounted = true
  ) => {
    if (!isStudent) {
      if (isMounted) {
        setCheckingEligibility(false);
      }

      return;
    }

    try {
      const [
        reservationsRes,
        waitlistRes,
      ] = await Promise.all([
        getMyReservations(),
        getWaitlist(),
      ]);

      if (!isMounted) return;

      /*
       * Check active reservation.
       */

      const activeReservation =
        (
          reservationsRes.reservations ||
          []
        ).some((reservation) =>
          ACTIVE_RESERVATION_STATUSES.includes(
            reservation.status
          )
        );

      /*
       * Check active waitlist.
       */

      const activeWaitlist =
        (
          waitlistRes.waitlist ||
          []
        ).some((entry) =>
          ACTIVE_WAITLIST_STATUSES.includes(
            entry.status
          )
        );

      setHasActiveRequest(
        activeReservation ||
        activeWaitlist
      );
    } catch (error) {
      console.error(
        "Eligibility check failed:",
        error
      );

      /*
       * Backend still performs the real
       * validation, so frontend can fail open
       * when there is a temporary network issue.
       */

      if (isMounted) {
        setHasActiveRequest(false);
      }
    } finally {
      if (isMounted) {
        setCheckingEligibility(false);
      }
    }
  };

  /* =======================================================
     INITIAL ELIGIBILITY CHECK
  ======================================================= */

  useEffect(() => {
    let active = true;

    checkEligibility(active);

    return () => {
      active = false;
    };
  }, [user, isStudent]);

  /* =======================================================
     AUTOMATIC ELIGIBILITY REFRESH
  ======================================================= */

  useEffect(() => {
    if (!isStudent) {
      return;
    }

    let active = true;

    const interval =
      setInterval(() => {
        checkEligibility(active);
      }, ELIGIBILITY_REFRESH_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isStudent, user]);

  /* =======================================================
     MANUAL ROOM REFRESH
  ======================================================= */

  const refreshRoom = async () => {
    try {
      const res =
        await roomService.getRoom(id);

      const updatedRoom =
        res.data.room;

      setRoom(updatedRoom);

      return updatedRoom;
    } catch (error) {
      console.error(
        "Failed to refresh room:",
        error
      );

      return null;
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div
            className="spinner-border"
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <p className="mt-2">
            Loading Room...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ROOM NOT FOUND
  ======================================================= */

  if (!room) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          Room not found.
        </div>
      </div>
    );
  }

  /* =======================================================
     ACTIVE BEDS
  ======================================================= */

  const activeBeds =
    (room.beds || []).filter(
      (bed) => !bed.isArchived
    );

  /* =======================================================
     BED STATISTICS
  ======================================================= */

  const totalBeds =
    activeBeds.length;

  const occupiedBeds =
    activeBeds.filter(
      (bed) => bed.occupied
    ).length;

  const holdBeds =
    activeBeds.filter(
      (bed) =>
        bed.onHold &&
        !bed.occupied
    ).length;

  const availableBeds =
    activeBeds.filter(
      (bed) =>
        !bed.occupied &&
        !bed.onHold
    ).length;

  /* =======================================================
     SELECTION LOCK
     
     IMPORTANT:
     We DO NOT lock because a bed is occupied/onHold.
     Those beds must remain clickable so the student
     can join the waitlist.
  ======================================================= */

  const selectionLocked =
    !isStudent ||
    checkingEligibility ||
    hasActiveRequest ||
    submitting;

  /* =======================================================
     SELECTED BED
  ======================================================= */

  const selectedBed =
    activeBeds.find(
      (bed) =>
        bedSelectionKey(bed) ===
        selectedBedId
    );

  /* =======================================================
     SELECT BED
  ======================================================= */

  const selectBed = (bed) => {
    /*
     * Only block when the student already has
     * an active reservation/waitlist or while
     * submitting.
     */

    if (selectionLocked) {
      return;
    }

    const bedId =
      bedSelectionKey(bed);

    const isSelected =
      selectedBedId === bedId;

    /*
     * Clicking the same selected bed again
     * unselects it.
     */

    if (isSelected) {
      setSelectedBedId(null);

      saveSelectedBedId(
        room._id,
        null
      );

      return;
    }

    /*
     * Select ANY non-archived bed:
     *
     * Available
     * Occupied
     * On Hold
     *
     * Occupied/onHold are intentionally NOT
     * blocked here because they can be waitlisted.
     */

    setSelectedBedId(bedId);

    saveSelectedBedId(
      room._id,
      bedId
    );
  };

  /* =======================================================
     REQUEST AVAILABLE BED / JOIN WAITLIST
  ======================================================= */

  const handleRequest = async () => {
    if (
      !selectedBed ||
      selectionLocked
    ) {
      return;
    }

    setSubmitting(true);

    try {
      /*
       * AVAILABLE BED
       *
       * Send normal reservation request.
       *
       * Backend will atomically put it on hold.
       */

      if (
        !selectedBed.occupied &&
        !selectedBed.onHold
      ) {
        const res =
          await requestReservation({
            roomId: room._id,
            bedNumber:
              selectedBed.bedNumber,
          });

        alert(
          res.message ||
            "Request sent to the manager."
        );

        setHasActiveRequest(true);

        setSelectedBedId(null);

        saveSelectedBedId(
          room._id,
          null
        );

        await refreshRoom();

        return;
      }

      /*
       * OCCUPIED OR ON-HOLD BED
       *
       * Add student to waitlist.
       */

      const res =
        await requestWaitlist({
          roomId: room._id,
          bedNumber:
            selectedBed.bedNumber,
        });

      alert(
        res.message ||
          "You have been added to the waitlist."
      );

      setHasActiveRequest(true);

      setSelectedBedId(null);

      saveSelectedBedId(
        room._id,
        null
      );

      await refreshRoom();
    } catch (error) {
      console.error(
        "Bed request failed:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Something went wrong."
      );

      /*
       * Refresh after failure because
       * another student may have claimed
       * or changed the bed state.
       */

      await refreshRoom();
    } finally {
      setSubmitting(false);

      /*
       * Re-check eligibility after
       * request/waitlist operation.
       */

      await checkEligibility();
    }
  };

  /* =======================================================
     REQUEST BUTTON LABEL
  ======================================================= */

  let requestButtonLabel = null;

  if (selectedBed) {
    if (
      selectedBed.occupied ||
      selectedBed.onHold
    ) {
      requestButtonLabel =
        "Join Waitlist";
    } else {
      requestButtonLabel =
        "Request This Bed";
    }
  }

  /* =======================================================
     SELECTED BED STATUS MESSAGE
  ======================================================= */

  const selectedBedMessage =
    selectedBed
      ? selectedBed.occupied
        ? `Bed ${selectedBed.bedNumber} is currently occupied. You can join the waitlist.`
        : selectedBed.onHold
        ? `Bed ${selectedBed.bedNumber} is currently on hold. You can join the waitlist.`
        : `Bed ${selectedBed.bedNumber} is available. You can request it.`
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="container py-4">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="d-flex justify-content-between align-items-center">
        <h2 className="fw-bold">
          Room {room.roomNumber}
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

      <hr />

      {/* =================================================
          ROOM IMAGES
      ================================================= */}

      <h4 className="mb-3">
        Room Images
      </h4>

      {room.images?.length > 0 ? (
        <div className="row">
          {room.images.map(
            (img, index) => (
              <div
                className="col-md-4 mb-3"
                key={
                  img.public_id ||
                  index
                }
              >
                <img
                  src={img.url}
                  alt={`Room ${room.roomNumber}`}
                  className="img-fluid rounded"
                  style={{
                    height: "250px",
                    width: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
            )
          )}
        </div>
      ) : (
        <p>
          No images available.
        </p>
      )}

      <hr />

      {/* =================================================
          BASIC INFORMATION
      ================================================= */}

      <h4>
        Basic Information
      </h4>

      <div className="row">
        <div className="col-md-6 mb-2">
          <strong>
            Building:
          </strong>{" "}
          {room.building?.name ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Floor:
          </strong>{" "}
          {room.floor?.number ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Location:
          </strong>{" "}
          {room.messLocation ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Rent:
          </strong>{" "}
          ৳{room.rent || 0}
        </div>
      </div>

      <hr />

      {/* =================================================
          ROOM SPACE PASSPORT
      ================================================= */}

      <h4>
        Room Space Passport
      </h4>

      <div className="row">
        <div className="col-md-6 mb-2">
          <strong>
            Total Area:
          </strong>{" "}
          {room.totalArea ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Usable Area:
          </strong>{" "}
          {room.usableArea ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Storage:
          </strong>{" "}
          {room.storage || "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Bathroom:
          </strong>{" "}
          {room.bathroomType ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Natural Light:
          </strong>{" "}
          {room.naturalLightLevel ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Ventilation:
          </strong>{" "}
          {room.ventilationNotes ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Utility Policy:
          </strong>{" "}
          {room.utilityPolicy ||
            "-"}
        </div>

        <div className="col-md-6 mb-2">
          <strong>
            Amenities:
          </strong>{" "}
          {room.amenities?.length
            ? room.amenities.join(
                ", "
              )
            : "None"}
        </div>
      </div>

      <hr />

      {/* =================================================
          VISUAL ROOM LAYOUT
      ================================================= */}

      <h4 className="mb-3">
        Visual Room Layout
      </h4>

      {isStudent &&
        !checkingEligibility &&
        hasActiveRequest && (
          <div className="alert alert-warning">
            You already have an active
            reservation or waitlist
            request. You cannot request
            or join another bed until
            your current request is
            resolved.
          </div>
        )}

      <RoomLayout
        beds={activeBeds}
        layout={room.layout}
        selectedBedId={selectedBedId}
        onSelectBed={selectBed}
        selectionDisabled={
          selectionLocked
        }
      />

      {/* =================================================
          SELECTED BED INFORMATION
      ================================================= */}

      {isStudent &&
        selectedBed &&
        !hasActiveRequest && (
          <div className="mt-3">
            <div
              className={`alert ${
                selectedBed.occupied ||
                selectedBed.onHold
                  ? "alert-warning"
                  : "alert-success"
              }`}
            >
              {selectedBedMessage}
            </div>

            <button
              className={`btn ${
                selectedBed.occupied ||
                selectedBed.onHold
                  ? "btn-warning"
                  : "btn-primary"
              }`}
              disabled={
                submitting ||
                checkingEligibility
              }
              onClick={
                handleRequest
              }
            >
              {submitting
                ? "Processing..."
                : requestButtonLabel}
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary ms-2"
              disabled={submitting}
              onClick={() => {
                setSelectedBedId(null);

                saveSelectedBedId(
                  room._id,
                  null
                );
              }}
            >
              Cancel Selection
            </button>
          </div>
        )}

      <hr />

      {/* =================================================
          BED INVENTORY
      ================================================= */}

      <h4>
        Bed Inventory
      </h4>

      <div className="row mb-3">
        <div className="col-md-3">
          <strong>
            Total Beds:
          </strong>{" "}
          {totalBeds}
        </div>

        <div className="col-md-3">
          <strong className="text-success">
            Available:
          </strong>{" "}
          {availableBeds}
        </div>

        <div className="col-md-3">
          <strong className="text-warning">
            On Hold:
          </strong>{" "}
          {holdBeds}
        </div>

        <div className="col-md-3">
          <strong className="text-danger">
            Occupied:
          </strong>{" "}
          {occupiedBeds}
        </div>
      </div>

      {/* =================================================
          BED TABLE
          
          NO ACTION COLUMN
      ================================================= */}

      {activeBeds.length > 0 ? (
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>
                Bed Number
              </th>

              <th>
                Position
              </th>

              <th>
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {activeBeds.map(
              (bed, index) => {
                const isSelected =
                  selectedBedId ===
                  bedSelectionKey(
                    bed
                  );

                /*
                 * All beds are clickable for students:
                 *
                 * Available → select for reservation
                 * Occupied → select for waitlist
                 * On Hold → select for waitlist
                 */

                const canSelect =
                  isStudent &&
                  !checkingEligibility &&
                  !hasActiveRequest &&
                  !submitting;

                return (
                  <tr
                    key={
                      bed._id ||
                      index
                    }
                    className={
                      isSelected
                        ? "table-primary"
                        : ""
                    }
                    style={
                      canSelect
                        ? {
                            cursor:
                              "pointer",
                          }
                        : undefined
                    }
                    tabIndex={
                      canSelect
                        ? 0
                        : undefined
                    }
                    role={
                      canSelect
                        ? "button"
                        : undefined
                    }
                    onClick={() =>
                      selectBed(bed)
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        canSelect &&
                        (
                          e.key ===
                            "Enter" ||
                          e.key ===
                            " "
                        )
                      ) {
                        e.preventDefault();

                        selectBed(
                          bed
                        );
                      }
                    }}
                  >
                    <td>
                      {bed.bedNumber}
                    </td>

                    <td>
                      {bed.position ||
                        "-"}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          bed.occupied
                            ? "bg-danger"
                            : bed.onHold
                            ? "bg-warning text-dark"
                            : isSelected
                            ? "bg-primary"
                            : "bg-success"
                        }`}
                      >
                        {bed.occupied
                          ? "Occupied"
                          : bed.onHold
                          ? "On Hold"
                          : isSelected
                          ? "Selected"
                          : "Available"}
                      </span>
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      ) : (
        <div className="alert alert-info">
          No beds available.
        </div>
      )}

      <hr />

      {/* =================================================
          WAITLIST INFORMATION
      ================================================= */}

      {isStudent && (
        <div className="alert alert-info">
          <strong>
            Waitlist:
          </strong>{" "}
          If a bed is occupied or on
          hold, you can select it and
          join its waitlist. When the bed
          becomes available, the first
          student in the waitlist will be
          notified first.
        </div>
      )}

      {/* =================================================
          CAMPUS ROUTE MAP
      ================================================= */}

      <h4 className="mb-3">
        Campus Route Map
      </h4>

      <CampusRouteMap
        room={room}
      />
    </div>
  );
};

export default RoomDetails;
