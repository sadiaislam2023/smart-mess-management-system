import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CampusRouteMap from "../components/CampusRouteMap";
import RoomLayout from "../components/RoomLayout";
import roomService from "../services/roomService";

import { getMyReservations } from "../services/reservationService";

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

const ACTIVE_RESERVATION_STATUSES = [
  "pending",
  "approved",
];

const ACTIVE_WAITLIST_STATUSES = [
  "waiting",
  "matched",
];

const ROOM_REFRESH_INTERVAL = 10000;
const ELIGIBILITY_REFRESH_INTERVAL = 10000;

const RoomDetails = () => {
  /*
   * =========================================================
   * ALWAYS START ROOM DETAILS FROM THE TOP
   * =========================================================
   */
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStudent = user?.role === "student";

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedBedId, setSelectedBedId] =
    useState(null);

  const [hasActiveRequest, setHasActiveRequest] =
    useState(false);

  const [checkingEligibility, setCheckingEligibility] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  /* =========================================================
     LOAD ROOM
  ========================================================= */

  useEffect(() => {
    let active = true;

    const loadRoom = async () => {
      try {
        const res =
          await roomService.getRoom(id);

        if (!active) return;

        const loadedRoom =
          res.data.room;

        setRoom(loadedRoom);

        const savedBedId =
          getSelectedBedId(
            loadedRoom._id
          );

        setSelectedBedId(
          savedBedId
        );
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

  /* =========================================================
     AUTOMATIC ROOM REFRESH
  ========================================================= */

  useEffect(() => {
    let active = true;

    const refreshRoomAutomatically =
      async () => {
        try {
          const res =
            await roomService.getRoom(id);

          if (!active) return;

          const updatedRoom =
            res.data.room;

          setRoom(updatedRoom);

          const updatedActiveBeds =
            (
              updatedRoom.beds ||
              []
            ).filter(
              (bed) =>
                !bed.isArchived
            );

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

  /* =========================================================
     CHECK STUDENT ELIGIBILITY
  ========================================================= */

  const checkEligibility =
    useCallback(
      async (
        isMounted = true
      ) => {
        if (!isStudent) {
          if (isMounted) {
            setCheckingEligibility(
              false
            );
          }

          return;
        }

        try {
          const [
            reservationsRes,
            waitlistRes,
          ] =
            await Promise.all([
              getMyReservations(),
              getWaitlist(),
            ]);

          if (!isMounted) return;

          const activeReservation =
            (
              reservationsRes.reservations ||
              []
            ).some(
              (reservation) =>
                ACTIVE_RESERVATION_STATUSES.includes(
                  reservation.status
                )
            );

          const activeWaitlist =
            (
              waitlistRes.waitlist ||
              []
            ).some(
              (entry) =>
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

          if (isMounted) {
            setHasActiveRequest(
              false
            );
          }
        } finally {
          if (isMounted) {
            setCheckingEligibility(
              false
            );
          }
        }
      },
      [isStudent]
    );

  /* =========================================================
     INITIAL ELIGIBILITY CHECK
  ========================================================= */

  useEffect(() => {
    let active = true;

    checkEligibility(active);

    return () => {
      active = false;
    };
  }, [checkEligibility]);

  /* =========================================================
     AUTOMATIC ELIGIBILITY REFRESH
  ========================================================= */

  useEffect(() => {
    if (!isStudent) {
      return undefined;
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
  }, [
    isStudent,
    checkEligibility,
  ]);

  /* =========================================================
     MANUAL ROOM REFRESH
  ========================================================= */

  const refreshRoom =
    async () => {
      try {
        const res =
          await roomService.getRoom(
            id
          );

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

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className="container-fluid d-flex align-items-center justify-content-center"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #f8f6fa 0%, #f1ebf5 100%)",
        }}
      >
        <div
          className="text-center bg-white rounded-4 shadow-sm p-5"
          style={{
            maxWidth: "420px",
            width: "90%",
          }}
        >
          <div
            className="spinner-border mb-4"
            style={{
              color: "#6D597A",
              width: "2.5rem",
              height: "2.5rem",
            }}
            role="status"
          >
            <span className="visually-hidden">
              Loading...
            </span>
          </div>

          <h5
            className="fw-bold mb-2"
            style={{
              color: "#3F3547",
            }}
          >
            Loading Room Details
          </h5>

          <p className="text-muted mb-0">
            Please wait while the room
            information is loaded.
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ROOM NOT FOUND
  ========================================================= */

  if (!room) {
    return (
      <div
        className="container-fluid d-flex align-items-center justify-content-center"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #f8f6fa 0%, #f1ebf5 100%)",
        }}
      >
        <div
          className="card border-0 shadow-sm rounded-4"
          style={{
            maxWidth: "500px",
            width: "90%",
          }}
        >
          <div className="card-body text-center p-5">
            <div
              className="mx-auto mb-4"
              style={{
                width: "55px",
                height: "4px",
                borderRadius: "10px",
                background:
                  "linear-gradient(90deg, #6D597A, #B56576)",
              }}
            />

            <h3
              className="fw-bold mb-3"
              style={{
                color: "#3F3547",
              }}
            >
              Room Not Found
            </h3>

            <p className="text-muted mb-4">
              The requested room could
              not be found.
            </p>

            <button
              type="button"
              className="btn text-white rounded-pill px-4 py-2 fw-semibold"
              style={{
                background:
                  "linear-gradient(135deg, #6D597A, #8B6F9E)",
              }}
              onClick={() =>
                navigate(-1)
              }
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ACTIVE BEDS
  ========================================================= */

  const activeBeds =
    (room.beds || []).filter(
      (bed) => !bed.isArchived
    );

  /* =========================================================
     BED STATISTICS
  ========================================================= */

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

  /* =========================================================
     SELECTION LOCK
  ========================================================= */

  const selectionLocked =
    !isStudent ||
    checkingEligibility ||
    hasActiveRequest ||
    submitting;

  /* =========================================================
     SELECTED BED
  ========================================================= */

  const selectedBed =
    activeBeds.find(
      (bed) =>
        bedSelectionKey(bed) ===
        selectedBedId
    );

  /* =========================================================
     SELECT BED
  ========================================================= */

  const selectBed =
    (bed) => {
      if (selectionLocked) {
        return;
      }

      const bedId =
        bedSelectionKey(bed);

      const isSelected =
        selectedBedId === bedId;

      if (isSelected) {
        setSelectedBedId(null);

        saveSelectedBedId(
          room._id,
          null
        );

        return;
      }

      setSelectedBedId(
        bedId
      );

      saveSelectedBedId(
        room._id,
        bedId
      );
    };

  /* =========================================================
     REQUEST AVAILABLE BED / JOIN WAITLIST
  ========================================================= */

  const handleRequest =
    async () => {
      if (
        !selectedBed ||
        selectionLocked
      ) {
        return;
      }

      if (
        !selectedBed.occupied &&
        !selectedBed.onHold
      ) {
        navigate(
          `/rooms/${room._id}/request-bed`,
          {
            state: {
              bedNumber:
                selectedBed.bedNumber,
              roomNumber:
                room.roomNumber,
            },
          }
        );

        return;
      }

      setSubmitting(true);

      try {
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

        setHasActiveRequest(
          true
        );

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
          error.response?.data
            ?.message ||
            "Something went wrong."
        );

        await refreshRoom();
      } finally {
        setSubmitting(false);

        await checkEligibility();
      }
    };

  /* =========================================================
     REQUEST BUTTON LABEL
  ========================================================= */

  let requestButtonLabel =
    null;

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

  /* =========================================================
     SELECTED BED MESSAGE
  ========================================================= */

  const selectedBedMessage =
    selectedBed
      ? selectedBed.occupied
        ? `Bed ${selectedBed.bedNumber} is currently occupied. You can join the waitlist.`
        : selectedBed.onHold
        ? `Bed ${selectedBed.bedNumber} is currently on hold. You can join the waitlist.`
        : `Bed ${selectedBed.bedNumber} is available. You can request it.`
      : null;

  /* =========================================================
     STAT CARD
  ========================================================= */

  const StatCard = ({
    label,
    value,
    description,
    accent,
  }) => (
    <div className="col-6 col-lg-3">
      <div
        className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden"
        style={{
          transition:
            "transform 0.2s ease",
        }}
      >
        <div
          style={{
            height: "4px",
            background: accent,
          }}
        />

        <div className="card-body p-4">
          <small
            className="fw-bold"
            style={{
              color: accent,
              letterSpacing: "0.8px",
              fontSize: "11px",
            }}
          >
            {label}
          </small>

          <div
            className="fw-bold mt-2"
            style={{
              fontSize: "32px",
              lineHeight: "1",
              color: "#332B39",
            }}
          >
            {value}
          </div>

          <small className="text-muted d-block mt-2">
            {description}
          </small>
        </div>
      </div>
    </div>
  );

  /* =========================================================
     SECTION HEADER
  ========================================================= */

  const SectionHeader = ({
    title,
    subtitle,
  }) => (
    <div className="mb-4">
      <div
        style={{
          width: "42px",
          height: "4px",
          borderRadius: "10px",
          background:
            "linear-gradient(90deg, #6D597A, #B56576)",
          marginBottom: "12px",
        }}
      />

      <h4
        className="fw-bold mb-1"
        style={{
          color: "#332B39",
          letterSpacing: "-0.2px",
        }}
      >
        {title}
      </h4>

      <small className="text-muted">
        {subtitle}
      </small>
    </div>
  );

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <div
      className="container-fluid py-4"
      style={{
        background:
          "linear-gradient(135deg, #F8F6FA 0%, #F5F1F7 100%)",
        minHeight: "100vh",
      }}
    >
      <div className="container">

        {/* =================================================
            THIN PURPLE HEADER
        ================================================= */}

        <div
          className="rounded-4 shadow-sm mb-4 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #5D4B68 0%, #765C85 55%, #9E596A 100%)",
            color: "#fff",
          }}
        >
          <div className="py-3 px-4 px-md-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <div
                  className="text-uppercase mb-1"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "2px",
                    opacity: 0.75,
                  }}
                >
                  Room Details
                </div>

                <h2
                  className="fw-bold mb-1"
                  style={{
                    fontSize: "24px",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {room.building?.name ||
                    "Building"}

                  <span
                    style={{
                      opacity: 0.55,
                      margin: "0 8px",
                    }}
                  >
                    /
                  </span>

                  Room {room.roomNumber}
                </h2>

                <div
                  style={{
                    fontSize: "13px",
                    opacity: 0.82,
                  }}
                >
                  Floor{" "}
                  {room.floor?.number ||
                    "-"}

                  <span className="mx-2">
                    •
                  </span>

                  {room.messLocation ||
                    "Location"}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-light rounded-pill px-4 py-2 fw-semibold shadow-sm"
                onClick={() =>
                  navigate(-1)
                }
              >
                Back
              </button>
            </div>
          </div>

          <div
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.5), rgba(255,255,255,0.05))",
            }}
          />
        </div>

        {/* =================================================
            BED STATISTICS
        ================================================= */}

        <div className="row g-3 mb-4">
          <StatCard
            label="TOTAL BEDS"
            value={totalBeds}
            description="Room capacity"
            accent="#6D597A"
          />

          <StatCard
            label="AVAILABLE"
            value={availableBeds}
            description="Ready for request"
            accent="#3A8F62"
          />

          <StatCard
            label="ON HOLD"
            value={holdBeds}
            description="Temporarily reserved"
            accent="#C58A20"
          />

          <StatCard
            label="OCCUPIED"
            value={occupiedBeds}
            description="Currently occupied"
            accent="#B65A62"
          />
        </div>

        {/* =================================================
            ROOM GALLERY + BASIC INFORMATION
        ================================================= */}

        <div className="row g-4 mb-4">

          {/* ROOM GALLERY */}

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <SectionHeader
                  title="Room Gallery"
                  subtitle="Photos of this room"
                />

                {room.images?.length > 0 ? (
                  <div className="row g-3">
                    {room.images.map(
                      (
                        img,
                        index
                      ) => (
                        <div
                          className={
                            room.images
                              .length ===
                            1
                              ? "col-12"
                              : "col-12 col-md-6"
                          }
                          key={
                            img.public_id ||
                            index
                          }
                        >
                          <div
                            className="overflow-hidden rounded-4"
                            style={{
                              height:
                                room.images
                                  .length ===
                                1
                                  ? "360px"
                                  : "210px",
                              border:
                                "1px solid #EEE8F1",
                            }}
                          >
                            <img
                              src={
                                img.url
                              }
                              alt={`Room ${room.roomNumber} ${index + 1}`}
                              className="w-100 h-100"
                              style={{
                                objectFit:
                                  "cover",
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-4 d-flex align-items-center justify-content-center text-center"
                    style={{
                      height: "300px",
                      background:
                        "#F8F5FA",
                      border:
                        "1px dashed #D9CFDE",
                    }}
                  >
                    <div>
                      <div
                        className="fw-semibold mb-1"
                        style={{
                          color:
                            "#665A6B",
                        }}
                      >
                        No Room Images
                      </div>

                      <small className="text-muted">
                        No photos have
                        been added for
                        this room.
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BASIC INFORMATION */}

          <div className="col-lg-5">
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <SectionHeader
                  title="Basic Information"
                  subtitle="Room location and rent"
                />

                <div className="d-flex flex-column gap-3">
                  {[
                    [
                      "Building",
                      room.building?.name ||
                        "-",
                    ],
                    [
                      "Floor",
                      room.floor?.number ||
                        "-",
                    ],
                    [
                      "Mess Location",
                      room.messLocation ||
                        "-",
                    ],
                  ].map(
                    ([
                      label,
                      value,
                    ]) => (
                      <div
                        key={label}
                        className="rounded-4 p-3"
                        style={{
                          background:
                            "#F8F6FA",
                          border:
                            "1px solid #ECE5EF",
                        }}
                      >
                        <small
                          className="text-muted d-block mb-1"
                          style={{
                            fontSize:
                              "11px",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.8px",
                          }}
                        >
                          {label}
                        </small>

                        <div
                          className="fw-semibold"
                          style={{
                            color:
                              "#403747",
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    )
                  )}

                  <div
                    className="rounded-4 p-3"
                    style={{
                      background:
                        "linear-gradient(135deg, #F1EAF5, #F8F3FA)",
                      border:
                        "1px solid #E5D9EA",
                    }}
                  >
                    <small
                      className="text-muted d-block mb-1"
                      style={{
                        fontSize:
                          "11px",
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.8px",
                      }}
                    >
                      Monthly Rent
                    </small>

                    <div
                      className="fw-bold"
                      style={{
                        color:
                          "#5F4A6B",
                        fontSize:
                          "24px",
                      }}
                    >
                      ৳{room.rent || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            SPACE PASSPORT
        ================================================= */}

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <SectionHeader
              title="Room Space Passport"
              subtitle="Detailed room facilities and physical information"
            />

            <div className="row g-3">
              {[
                [
                  "Total Area",
                  room.totalArea || "-",
                ],
                [
                  "Usable Area",
                  room.usableArea || "-",
                ],
                [
                  "Storage",
                  room.storage || "-",
                ],
                [
                  "Bathroom",
                  room.bathroomType ||
                    "-",
                ],
                [
                  "Natural Light",
                  room.naturalLightLevel ||
                    "-",
                ],
                [
                  "Ventilation",
                  room.ventilationNotes ||
                    "-",
                ],
                [
                  "Utility Policy",
                  room.utilityPolicy ||
                    "-",
                ],
                [
                  "Amenities",
                  room.amenities?.length
                    ? room.amenities.join(
                        ", "
                      )
                    : "None",
                ],
              ].map(
                ([
                  label,
                  value,
                ]) => (
                  <div
                    className="col-12 col-sm-6 col-lg-3"
                    key={label}
                  >
                    <div
                      className="p-3 rounded-4 h-100"
                      style={{
                        background:
                          "#FBFAFC",
                        border:
                          "1px solid #EAE3ED",
                      }}
                    >
                      <small
                        className="text-muted d-block mb-2"
                        style={{
                          fontSize:
                            "11px",
                          fontWeight: 600,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.6px",
                        }}
                      >
                        {label}
                      </small>

                      <div
                        className="fw-semibold"
                        style={{
                          color:
                            "#443A48",
                          lineHeight:
                            1.5,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            VISUAL ROOM LAYOUT
        ================================================= */}

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <SectionHeader
              title="Visual Room Layout"
              subtitle="Select an available bed or join a waitlist"
            />

            {isStudent &&
              !checkingEligibility &&
              hasActiveRequest && (
                <div
                  className="rounded-4 p-4 mb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, #FFF8E8, #FFF4D8)",
                    border:
                      "1px solid #F1DFAE",
                  }}
                >
                  <div
                    className="fw-bold mb-2"
                    style={{
                      color:
                        "#7C5A17",
                    }}
                  >
                    Active Request
                  </div>

                  <div
                    style={{
                      color:
                        "#75643F",
                      fontSize:
                        "14px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    You already have an
                    active reservation
                    or waitlist
                    request. You
                    cannot request or
                    join another bed
                    until your current
                    request is resolved.
                  </div>
                </div>
              )}

            <div
              className="p-3 p-md-4 rounded-4"
              style={{
                background:
                  "linear-gradient(135deg, #FAF8FB, #F6F1F8)",
                border:
                  "1px solid #EAE2ED",
              }}
            >
              <RoomLayout
                beds={activeBeds}
                layout={room.layout}
                selectedBedId={
                  selectedBedId
                }
                onSelectBed={
                  selectBed
                }
                selectionDisabled={
                  selectionLocked
                }
              />
            </div>
          </div>
        </div>

        {/* =================================================
            SELECTED BED
        ================================================= */}

        {isStudent &&
          selectedBed &&
          !hasActiveRequest && (
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div
                  className="rounded-4 p-4"
                  style={{
                    background:
                      selectedBed.occupied ||
                      selectedBed.onHold
                        ? "linear-gradient(135deg, #FFF8E8, #FFF3D5)"
                        : "linear-gradient(135deg, #EDF8F1, #F5FBF7)",
                    border:
                      selectedBed.occupied ||
                      selectedBed.onHold
                        ? "1px solid #F0DCA7"
                        : "1px solid #CDE7D5",
                  }}
                >
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-4">
                    <div>
                      <span
                        className={`badge rounded-pill px-3 py-2 mb-3 ${
                          selectedBed.occupied ||
                          selectedBed.onHold
                            ? "bg-warning text-dark"
                            : "bg-success"
                        }`}
                      >
                        {selectedBed.occupied ||
                        selectedBed.onHold
                          ? "WAITLIST OPTION"
                          : "AVAILABLE BED"}
                      </span>

                      <h5
                        className="fw-bold mb-2"
                        style={{
                          color:
                            "#3F3547",
                        }}
                      >
                        Bed{" "}
                        {
                          selectedBed.bedNumber
                        }
                      </h5>

                      <p className="mb-0 text-muted">
                        {
                          selectedBedMessage
                        }
                      </p>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`btn rounded-pill px-4 py-2 fw-semibold ${
                          selectedBed.occupied ||
                          selectedBed.onHold
                            ? "btn-warning"
                            : "btn-success"
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
                        className="btn btn-outline-secondary rounded-pill px-4 py-2 fw-semibold"
                        disabled={
                          submitting
                        }
                        onClick={() => {
                          setSelectedBedId(
                            null
                          );

                          saveSelectedBedId(
                            room._id,
                            null
                          );
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* =================================================
            BED INVENTORY
        ================================================= */}

        <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
          <div className="card-body p-0">
            <div className="p-4">
              <SectionHeader
                title="Bed Inventory"
                subtitle="Current room occupancy"
              />

              <div className="d-flex justify-content-end">
                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    background:
                      "#F1EAF5",
                    color:
                      "#6D597A",
                  }}
                >
                  {totalBeds} Beds
                </span>
              </div>
            </div>

            {activeBeds.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead
                    style={{
                      background:
                        "linear-gradient(135deg, #F7F3F9, #F2EDF5)",
                    }}
                  >
                    <tr>
                      <th
                        className="px-4 py-3"
                        style={{
                          color:
                            "#5A4D60",
                          fontSize:
                            "12px",
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.6px",
                        }}
                      >
                        Bed Number
                      </th>

                      <th
                        className="py-3"
                        style={{
                          color:
                            "#5A4D60",
                          fontSize:
                            "12px",
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.6px",
                        }}
                      >
                        Position
                      </th>

                      <th
                        className="py-3"
                        style={{
                          color:
                            "#5A4D60",
                          fontSize:
                            "12px",
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.6px",
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeBeds.map(
                      (
                        bed,
                        index
                      ) => {
                        const isSelected =
                          selectedBedId ===
                          bedSelectionKey(
                            bed
                          );

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
                            style={{
                              cursor:
                                canSelect
                                  ? "pointer"
                                  : "default",
                            }}
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
                              selectBed(
                                bed
                              )
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
                            <td className="px-4">
                              <div
                                className="fw-bold"
                                style={{
                                  color:
                                    "#443A48",
                                }}
                              >
                                Bed{" "}
                                {
                                  bed.bedNumber
                                }
                              </div>

                              {isSelected && (
                                <small className="text-primary">
                                  Selected
                                </small>
                              )}
                            </td>

                            <td>
                              <span className="text-muted">
                                {bed.position ||
                                  "Not specified"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`badge rounded-pill px-3 py-2 ${
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
              </div>
            ) : (
              <div className="p-5 text-center">
                <div
                  className="fw-semibold mb-2"
                  style={{
                    color:
                      "#4A3F50",
                  }}
                >
                  No Beds Available
                </div>

                <p className="text-muted mb-0">
                  This room currently has
                  no active beds.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            WAITLIST INFORMATION
        ================================================= */}

        {isStudent && (
          <div
            className="card border-0 shadow-sm rounded-4 mb-4"
            style={{
              background:
                "linear-gradient(135deg, #F5EFF8, #FBF8FC)",
            }}
          >
            <div className="card-body p-4">
              <div
                style={{
                  width: "42px",
                  height: "4px",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(90deg, #6D597A, #B56576)",
                  marginBottom:
                    "18px",
                }}
              />

              <h5
                className="fw-bold mb-2"
                style={{
                  color:
                    "#403547",
                }}
              >
                How the Waitlist Works
              </h5>

              <p
                className="mb-0"
                style={{
                  color:
                    "#6E6372",
                  lineHeight:
                    1.7,
                }}
              >
                If a bed is occupied or
                on hold, you can select
                it and join its waitlist.
                When the bed becomes
                available, the first
                student in the waitlist
                will be notified first.
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            CAMPUS ROUTE MAP
        ================================================= */}

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <SectionHeader
              title="Campus Route Map"
              subtitle="Find the room location on campus"
            />

            <div
              className="rounded-4 overflow-hidden"
              style={{
                background:
                  "#F8F6FA",
                border:
                  "1px solid #EAE3ED",
              }}
            >
              <CampusRouteMap
                room={room}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoomDetails;