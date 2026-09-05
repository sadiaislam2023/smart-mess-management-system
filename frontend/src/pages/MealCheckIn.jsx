import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getMealMenus,
  getMyMealTokens,
} from "../services/mealPlannerService";

import {
  getMealStatusGrid,
  manualCheckIn,
  markSkippedMeals,
  updateMealStatus,
} from "../services/mealRecordService";

import MyQrToken from "../components/MyQrToken";
import QrScanner from "../components/QrScanner";
import MealHistoryList from "../components/MealHistoryList";
import ManagerMealHistoryBrowser from "../components/ManagerMealHistoryBrowser";

/* =========================================================
   DATE HELPERS
   ========================================================= */

const isToday = (dateValue) => {
  const date = new Date(dateValue);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const isFutureDate = (dateValue) => {
  const date = new Date(dateValue);
  const today = new Date();

  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return date > today;
};

/* =========================================================
   CONSTANTS
   ========================================================= */

const mealTypeLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const statusChoices = [
  {
    value: "collected",
    label: "Collected",
  },
  {
    value: "late",
    label: "Late",
  },
  {
    value: "skipped",
    label: "Skipped",
  },
];

const statusLabel = {
  collected: "Collected",
  late: "Late",
  skipped: "Skipped",
  not_checked_in: "Not checked-in",
};

const statusBadgeClass = {
  collected: "bg-success",
  late: "bg-warning text-dark",
  skipped: "bg-danger",
  not_checked_in: "bg-secondary",
};

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

/* =========================================================
   RESIDENT LABEL
   ========================================================= */

const formatResidentLabel = (resident) => {
  if (!resident) {
    return "resident";
  }

  const building = resident.building
    ? `Building ${resident.building}`
    : "";

  const room = resident.room
    ? `Room ${resident.room}`
    : "";

  const bed = resident.bed
    ? `Bed ${resident.bed}`
    : "";

  const location = [building, room, bed]
    .filter(Boolean)
    .join(", ");

  return `${resident.name || "resident"}${
    location ? ` (${location})` : ""
  }`;
};

/* =========================================================
   MANUAL CHECK-IN PANEL
   ========================================================= */

const ManualCheckInPanel = ({
  mealTypeOptions,
  selectedMealType,
  onMealTypeChange,
  pendingResidents,
  pendingLoading,
  onConfirm,
  onSelectResident,
}) => {
  const [searchText, setSearchText] = useState("");
  const [selectedMatch, setSelectedMatch] =
    useState(null);
  const [status, setStatus] =
    useState("collected");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelectedMatch(null);
    setSearchText("");
    setError("");
    setMessage("");

    if (onSelectResident) {
      onSelectResident(null);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMealType]);

  const matches = useMemo(() => {
    if (!searchText.trim()) {
      return [];
    }

    const query =
      searchText.trim().toLowerCase();

    return pendingResidents.filter((item) => {
      const name =
        item.resident?.name?.toLowerCase() ||
        "";

      const building = String(
        item.resident?.building || ""
      ).toLowerCase();

      const room = String(
        item.resident?.room || ""
      ).toLowerCase();

      const bed = String(
        item.resident?.bed || ""
      ).toLowerCase();

      return (
        name.includes(query) ||
        building.includes(query) ||
        room.includes(query) ||
        bed.includes(query)
      );
    });
  }, [searchText, pendingResidents]);

  const handleSelectMatch = (item) => {
    setSelectedMatch(item);
    setSearchText(
      item.resident?.name || ""
    );

    if (onSelectResident) {
      onSelectResident(item.resident);
    }
  };

  const handleConfirm = async () => {
    if (!selectedMatch) {
      setError(
        "Search and select a resident first"
      );
      return;
    }

    const stillPending =
      pendingResidents.some(
        (item) =>
          item.mealToken ===
          selectedMatch.mealToken
      );

    if (!stillPending) {
      setError(
        "That selection is out of date for the currently selected meal — please search again."
      );

      setSelectedMatch(null);
      setSearchText("");

      if (onSelectResident) {
        onSelectResident(null);
      }

      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await onConfirm(
        selectedMatch.mealToken,
        status
      );

      setMessage(
        `${formatResidentLabel(
          selectedMatch.resident
        )} marked ${status}`
      );

      setSelectedMatch(null);
      setSearchText("");
      setStatus("collected");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not confirm check-in"
      );
    } finally {
      setBusy(false);
    }
  };

  const searchDisabled =
    busy || pendingLoading;

  return (
    <div
      className="card h-100 shadow-sm"
      style={{
        border: "2px solid #8b5cf6",
        borderRadius: "16px",
        background:
          "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
      }}
    >
      <div className="card-body p-3">
        <div className="d-flex align-items-center mb-3">
          <div
            className="d-flex align-items-center justify-content-center me-2"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#ede9fe",
              fontSize: "20px",
            }}
          >
            ✍️
          </div>

          <div>
            <h5
              className="card-title mb-0 fw-bold"
              style={{ color: "#6d28d9" }}
            >
              Manual Check-in
            </h5>

            <small className="text-muted">
              Search and confirm resident
            </small>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success py-2 small">
            ✅ {message}
          </div>
        )}

        {/* SEARCH */}
        <div className="mb-3">
          <label className="form-label fw-semibold small">
            🔎 Search Resident
          </label>

          <input
            type="text"
            className="form-control form-control-sm"
            placeholder={
              pendingLoading
                ? "Loading residents..."
                : "Name, building, room, or bed"
            }
            value={searchText}
            disabled={searchDisabled}
            onChange={(e) => {
              setSearchText(e.target.value);
              setSelectedMatch(null);
            }}
            style={{
              borderRadius: "9px",
              border: "1px solid #c4b5fd",
            }}
          />

          {pendingLoading && (
            <div className="form-text small">
              ⏳ Refreshing pending residents...
            </div>
          )}

          {!pendingLoading &&
            searchText &&
            !selectedMatch && (
              <div
                className="list-group mt-1"
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                }}
              >
                {matches.length === 0 ? (
                  <div className="list-group-item text-muted small">
                    ❌ No match found
                  </div>
                ) : (
                  matches.map((item) => (
                    <button
                      type="button"
                      key={item.mealToken}
                      className="list-group-item list-group-item-action small"
                      onClick={() =>
                        handleSelectMatch(
                          item
                        )
                      }
                    >
                      <strong>
                        👤{" "}
                        {item.resident?.name ||
                          "Unknown"}
                      </strong>

                      <div className="text-muted mt-1">
                        🏢 Building:{" "}
                        {item.resident?.building ||
                          "—"}
                        {"  "}
                        🚪 Room:{" "}
                        {item.resident?.room ||
                          "—"}
                        {"  "}
                        🛏️ Bed:{" "}
                        {item.resident?.bed ||
                          "—"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
        </div>

        {/* MEAL + STATUS */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <label className="form-label fw-semibold small">
              🍽️ Meal
            </label>

            <select
              className="form-select form-select-sm"
              value={selectedMealType}
              disabled={busy}
              onChange={(e) =>
                onMealTypeChange(
                  e.target.value
                )
              }
              style={{
                borderRadius: "9px",
                border: "1px solid #c4b5fd",
              }}
            >
              {mealTypeOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="col-6">
            <label className="form-label fw-semibold small">
              📌 Status
            </label>

            <select
              className="form-select form-select-sm"
              value={status}
              disabled={busy}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
              style={{
                borderRadius: "9px",
                border: "1px solid #c4b5fd",
              }}
            >
              {statusChoices.map(
                (choice) => (
                  <option
                    key={choice.value}
                    value={choice.value}
                  >
                    {choice.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <button
          className="btn w-100 btn-sm fw-semibold"
          style={{
            background: "#7c3aed",
            color: "white",
            borderRadius: "9px",
            border: "none",
          }}
          disabled={
            !selectedMatch ||
            busy ||
            pendingLoading
          }
          onClick={handleConfirm}
        >
          {busy
            ? "⏳ Confirming..."
            : "✓ Confirm Check-in"}
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   TODAY'S MEAL COUNTS
   ========================================================= */

const MealCountsSummary = ({
  records,
  pending,
}) => {
  const counts = useMemo(() => {
    const base = {
      collected: 0,
      late: 0,
      skipped: 0,
    };

    records.forEach((record) => {
      if (
        base[record.status] !==
        undefined
      ) {
        base[record.status] += 1;
      }
    });

    return {
      ...base,
      not_checked_in:
        pending.length,
      total:
        records.length +
        pending.length,
    };
  }, [records, pending]);

  const items = [
    {
      key: "collected",
      label: "Collected",
      icon: "✅",
    },
    {
      key: "late",
      label: "Late",
      icon: "⏰",
    },
    {
      key: "skipped",
      label: "Skipped",
      icon: "❌",
    },
    {
      key: "not_checked_in",
      label: "Not checked-in",
      icon: "⏳",
    },
  ];

  return (
    <div className="row g-2 mb-3">
      {items.map((item) => (
        <div
          className="col-6 col-md-3"
          key={item.key}
        >
          <div
            className="card shadow-sm h-100"
            style={{
              borderRadius: "12px",
              border: "1px solid #dee2e6",
            }}
          >
            <div className="card-body text-center py-2">
              <div
                className={`badge ${
                  statusBadgeClass[
                    item.key
                  ]
                } mb-1`}
                style={{
                  fontSize: "0.65rem",
                }}
              >
                {item.icon} {item.label}
              </div>

              <div className="fs-5 fw-bold">
                {counts[item.key]}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="col-12">
        <div className="text-muted small text-end">
          📊 {counts.total} meal
          {counts.total === 1
            ? ""
            : "s"}{" "}
          for this slot
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   TODAY'S STATUS CARDS
   ========================================================= */

const TodayStatusCards = ({
  records,
  pending,
  selectedResidentId,
  onSelectCard,
  onEditRecord,
}) => {
  const [editingId, setEditingId] =
    useState(null);

  const [editStatus, setEditStatus] =
    useState("collected");

  const [savingId, setSavingId] =
    useState(null);

  const [editError, setEditError] =
    useState("");

  const cards = [
    ...records.map((record) => ({
      key: record._id,
      recordId: record._id,
      resident: record.resident,
      status: record.status,
      time: formatTime(
        record.checkInTime
      ),
    })),

    ...pending.map((item) => ({
      key: item.mealToken,
      recordId: null,
      resident: item.resident,
      status: "not_checked_in",
      time: null,
    })),
  ];

  if (cards.length === 0) {
    return (
      <div className="alert alert-info py-2">
        ℹ️ No confirmed meals for this
        slot yet.
      </div>
    );
  }

  const startEditing = (card, e) => {
    e.stopPropagation();

    setEditingId(card.recordId);
    setEditStatus(card.status);
    setEditError("");
  };

  const cancelEditing = (e) => {
    e.stopPropagation();

    setEditingId(null);
    setEditError("");
  };

  const saveEditing = async (card, e) => {
    e.stopPropagation();

    setSavingId(card.recordId);
    setEditError("");

    try {
      await onEditRecord(
        card.recordId,
        editStatus
      );

      setEditingId(null);
    } catch (err) {
      setEditError(
        err.response?.data?.message ||
          "Could not update status"
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="row g-2">
      {cards.map((card) => {
        const isSelected =
          card.resident?._id ===
          selectedResidentId;

        const isEditing =
          editingId === card.recordId &&
          card.recordId;

        return (
          <div
            className="col-md-6 col-lg-4"
            key={card.key}
          >
            <div
              role="button"
              tabIndex={0}
              className={`card h-100 ${
                isSelected
                  ? "border-primary"
                  : ""
              }`}
              style={{
                cursor: "pointer",
                border:
                  card.status ===
                  "collected"
                    ? "2px solid #86efac"
                    : card.status ===
                      "late"
                    ? "2px solid #facc15"
                    : card.status ===
                      "skipped"
                    ? "2px solid #fca5a5"
                    : "2px solid #cbd5e1",
                borderRadius: "12px",
                background:
                  card.status ===
                  "collected"
                    ? "#f0fdf4"
                    : card.status ===
                      "late"
                    ? "#fefce8"
                    : card.status ===
                      "skipped"
                    ? "#fff1f2"
                    : "#f8fafc",
              }}
              onClick={() =>
                onSelectCard &&
                onSelectCard(
                  card.resident
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  onSelectCard
                ) {
                  onSelectCard(
                    card.resident
                  );
                }
              }}
            >
              <div className="card-body py-2 px-3">
                {/* Resident name */}
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="fw-bold">
                    👤{" "}
                    {card.resident?.name ||
                      "Unknown"}
                  </div>

                  <span
                    className={`badge ${
                      statusBadgeClass[
                        card.status
                      ] ||
                      "bg-secondary"
                    }`}
                    style={{
                      fontSize: "0.65rem",
                    }}
                  >
                    {card.status ===
                    "collected"
                      ? "✓ "
                      : card.status ===
                        "late"
                      ? "⏰ "
                      : card.status ===
                        "skipped"
                      ? "✕ "
                      : "• "}

                    {statusLabel[
                      card.status
                    ] || card.status}
                  </span>
                </div>

                {/* Location */}
                <div className="d-flex flex-wrap gap-2 text-muted small mb-1">
                  <span>
                    🏢{" "}
                    {card.resident
                      ?.building ||
                      "—"}
                  </span>

                  <span>
                    🚪{" "}
                    {card.resident?.room ||
                      "—"}
                  </span>

                  <span>
                    🛏️{" "}
                    {card.resident?.bed ||
                      "—"}
                  </span>

                  {card.time && (
                    <span>
                      🕐 {card.time}
                    </span>
                  )}
                </div>

                {/* Edit */}
                {card.recordId && (
                  <div
                    className="mt-1"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >
                    {isEditing ? (
                      <>
                        {editError && (
                          <div className="alert alert-danger py-1 px-2 small mb-1">
                            ⚠️ {editError}
                          </div>
                        )}

                        <div className="d-flex gap-1">
                          <select
                            className="form-select form-select-sm"
                            value={editStatus}
                            disabled={
                              savingId ===
                              card.recordId
                            }
                            onChange={(e) =>
                              setEditStatus(
                                e.target.value
                              )
                            }
                          >
                            {statusChoices.map(
                              (choice) => (
                                <option
                                  key={
                                    choice.value
                                  }
                                  value={
                                    choice.value
                                  }
                                >
                                  {
                                    choice.label
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={
                              savingId ===
                              card.recordId
                            }
                            onClick={(e) =>
                              saveEditing(
                                card,
                                e
                              )
                            }
                          >
                            {savingId ===
                            card.recordId
                              ? "..."
                              : "✓"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={
                              savingId ===
                              card.recordId
                            }
                            onClick={
                              cancelEditing
                            }
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0 text-decoration-none"
                        onClick={(e) =>
                          startEditing(
                            card,
                            e
                          )
                        }
                      >
                        ✏️ Edit status
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* =========================================================
   MAIN PAGE
   ========================================================= */

const MealCheckIn = () => {
  const [todaysMenus, setTodaysMenus] =
    useState([]);

  const [myTokens, setMyTokens] =
    useState([]);

  /* Manual check-in meal */
  const [
    manualMealType,
    setManualMealType,
  ] = useState("");

  /* Today's Status meal */
  const [
    statusMealType,
    setStatusMealType,
  ] = useState("");

  const [gridRecords, setGridRecords] =
    useState([]);

  const [gridPending, setGridPending] =
    useState([]);

  const [gridLoading, setGridLoading] =
    useState(false);

  const [
    selectedResident,
    setSelectedResident,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    sweepMessage,
    setSweepMessage,
  ] = useState("");

  const loadInitialDataRef =
    useRef(() => {});

  const [
    refreshSignal,
    setRefreshSignal,
  ] = useState(0);

  const isMountedRef =
    useRef(true);

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("user")
    );
  } catch (err) {
    user = null;
  }

  const role = user?.role;

  /* =====================================================
     STATUS MENU
     ===================================================== */

  const statusMenu = todaysMenus.find(
    (m) =>
      m.mealType === statusMealType
  );

  /* =====================================================
     MANUAL MENU
     ===================================================== */

  const manualMenu = todaysMenus.find(
    (m) =>
      m.mealType === manualMealType
  );

  /* =====================================================
     LOAD GRID
     ===================================================== */

  const loadGrid = useCallback(
    async (mealMenuId) => {
      if (!mealMenuId) {
        setGridRecords([]);
        setGridPending([]);
        setGridLoading(false);
        return;
      }

      setGridLoading(true);

      try {
        const data =
          await getMealStatusGrid(
            mealMenuId
          );

        if (!isMountedRef.current) {
          return;
        }

        setGridRecords(
          data.records || []
        );

        setGridPending(
          data.pending || []
        );
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }

        setError(
          err.response?.data?.message ||
            "Could not load today's meal status"
        );
      } finally {
        if (isMountedRef.current) {
          setGridLoading(false);
        }
      }
    },
    []
  );

  /* =====================================================
     INITIAL DATA
     ===================================================== */

  useEffect(() => {
    isMountedRef.current = true;

    const loadInitialData = async (
      showLoading = true
    ) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        const menuData =
          await getMealMenus();

        if (!isMountedRef.current) {
          return;
        }

        const todays =
          menuData.filter((m) =>
            isToday(m.date)
          );

        setTodaysMenus(todays);

        if (todays.length > 0) {
          const defaultMeal =
            todays.find(
              (m) =>
                m.mealType === "lunch"
            ) || todays[0];

          setManualMealType(
            defaultMeal.mealType
          );

          setStatusMealType(
            defaultMeal.mealType
          );
        }

        if (role === "student") {
          const tokenData =
            await getMyMealTokens();

          if (!isMountedRef.current) {
            return;
          }

          const confirmed =
            tokenData.filter(
              (t) =>
                t.status ===
                  "confirmed" &&
                t.mealMenu
            );

          setMyTokens(confirmed);
        }
      } catch (err) {
        if (!isMountedRef.current) {
          return;
        }

        setError(
          err.response?.data?.message ||
            "Could not load check-in data"
        );
      } finally {
        if (
          showLoading &&
          isMountedRef.current
        ) {
          setLoading(false);
        }
      }
    };

    loadInitialDataRef.current =
      loadInitialData;

    loadInitialData(true);

    const handleVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadInitialData(false);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisible
    );

    window.addEventListener(
      "focus",
      handleVisible
    );

    return () => {
      isMountedRef.current = false;

      document.removeEventListener(
        "visibilitychange",
        handleVisible
      );

      window.removeEventListener(
        "focus",
        handleVisible
      );
    };
  }, [role]);

  /* =====================================================
     LOAD TODAY'S STATUS
     ===================================================== */

  useEffect(() => {
    if (
      role === "manager" &&
      statusMenu
    ) {
      loadGrid(statusMenu._id);
    }
  }, [
    role,
    statusMenu,
    loadGrid,
  ]);

  /* =====================================================
     MANUAL CONFIRM
     ===================================================== */

  const handleManualConfirm = async (
    mealTokenId,
    status
  ) => {
    await manualCheckIn(
      mealTokenId,
      status
    );

    await loadGrid(
      statusMenu?._id
    );

    bumpRefreshSignal();
  };

  /* =====================================================
     EDIT RECORD
     ===================================================== */

  const handleEditRecord = async (
    recordId,
    status
  ) => {
    await updateMealStatus(
      recordId,
      status
    );

    await loadGrid(
      statusMenu?._id
    );

    bumpRefreshSignal();
  };

  /* =====================================================
     SWEEP SKIPPED
     ===================================================== */

  const handleSweepSkipped = async () => {
    setSweepMessage("");
    setError("");

    try {
      const result =
        await markSkippedMeals();

      if (result.marked === 0) {
        setSweepMessage(
          "No meals were eligible to sweep yet — this runs only after a meal's service window has closed."
        );
      } else {
        setSweepMessage(
          `Marked ${result.marked} meal(s) as skipped.`
        );
      }

      await loadGrid(
        statusMenu?._id
      );

      bumpRefreshSignal();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not run the skipped-meal sweep"
      );
    }
  };

  /* =====================================================
     QR CHECK-IN
     ===================================================== */

  const handleQrCheckedIn = () => {
    loadGrid(
      statusMenu?._id
    );

    bumpRefreshSignal();
  };

  const bumpRefreshSignal = () =>
    setRefreshSignal((v) => v + 1);

  /* =====================================================
     LOADING
     ===================================================== */

  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div
          className="spinner-border"
          role="status"
        >
          <span className="visually-hidden">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="container py-4">
      {/* =================================================
          HEADER
          ================================================= */}

      <div
        className="mb-4 p-3"
        style={{
          borderRadius: "16px",
          background:
            "linear-gradient(135deg, #eef2ff, #f8fafc)",
          border: "1px solid #c7d2fe",
        }}
      >
        <div className="d-flex align-items-center">
          <div
            className="me-3 d-flex align-items-center justify-content-center"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "#e0e7ff",
              fontSize: "25px",
            }}
          >
            🍽️
          </div>

          <div>
            <h2
              className="mb-1 fw-bold"
              style={{ color: "#3730a3" }}
            >
              Meal Check-in
            </h2>

            <p className="text-muted mb-0">
              {role === "manager"
                ? "▦ QR meal check-in and consumption record"
                : "📱 Show your QR code at the counter and track your meal history"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          ⚠️ {error}
        </div>
      )}

      {/* =================================================
          STUDENT
          ================================================= */}

      {role === "student" && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold">
              Your Confirmed Meals
            </h5>

            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() =>
                loadInitialDataRef.current(
                  false
                )
              }
            >
              🔄 Refresh
            </button>
          </div>

          {myTokens.length === 0 ? (
            <div className="alert alert-info">
              ℹ️ No confirmed meals yet.
              Confirm a meal on the Meal
              Planner page and it will
              appear here.
            </div>
          ) : (
            <>
              {(() => {
                const todaysTokens =
                  myTokens.filter((t) =>
                    isToday(
                      t.mealMenu.date
                    )
                  );

                const upcomingTokens =
                  myTokens.filter((t) =>
                    isFutureDate(
                      t.mealMenu.date
                    )
                  );

                return (
                  <>
                    <h6 className="text-muted mb-2">
                      Today
                    </h6>

                    {todaysTokens.length ===
                    0 ? (
                      <div className="alert alert-secondary py-2">
                        No confirmed meals
                        for today.
                      </div>
                    ) : (
                      <div className="row g-4 mb-4">
                        {todaysTokens.map(
                          (token) => (
                            <div
                              className="col-md-6 col-lg-4"
                              key={token._id}
                            >
                              <MyQrToken
                                mealToken={
                                  token
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {upcomingTokens.length >
                      0 && (
                      <>
                        <h6 className="text-muted mb-2">
                          📅 Upcoming
                        </h6>

                        <div className="row g-4 mb-4">
                          {upcomingTokens.map(
                            (token) => (
                              <div
                                className="col-md-6 col-lg-4"
                                key={token._id}
                              >
                                <MyQrToken
                                  mealToken={
                                    token
                                  }
                                />
                              </div>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </>
          )}

          <MealHistoryList
            refreshSignal={
              refreshSignal
            }
          />
        </>
      )}

      {/* =================================================
          MANAGER
          ================================================= */}

      {role === "manager" && (
        <>
          {/* =================================================
              QR + MANUAL BOXES
              ================================================= */}

          <div className="row g-3 mb-4">
            {/* QR SCANNER */}
            <div className="col-md-6">
              <div
                className="h-100"
                style={{
                  border: "2px solid #0ea5e9",
                  borderRadius: "16px",
                  padding: "3px",
                  background:
                    "linear-gradient(135deg, #e0f2fe, #ffffff)",
                }}
              >
                <QrScanner
                  onCheckedIn={
                    handleQrCheckedIn
                  }
                />
              </div>
            </div>

            {/* MANUAL CHECK-IN */}
            <div className="col-md-6">
              <ManualCheckInPanel
                mealTypeOptions={todaysMenus.map(
                  (m) => ({
                    value:
                      m.mealType,
                    label:
                      mealTypeLabels[
                        m.mealType
                      ] ||
                      m.mealType,
                  })
                )}
                selectedMealType={
                  manualMealType
                }
                onMealTypeChange={
                  setManualMealType
                }
                pendingResidents={
                  manualMenu &&
                  manualMenu._id ===
                    statusMenu?._id
                    ? gridPending
                    : []
                }
                pendingLoading={
                  manualMenu &&
                  manualMenu._id ===
                    statusMenu?._id
                    ? gridLoading
                    : false
                }
                onConfirm={
                  handleManualConfirm
                }
                onSelectResident={
                  setSelectedResident
                }
              />
            </div>
          </div>

          {/* =================================================
              TODAY'S STATUS HEADER
              ================================================= */}

          <div
            className="p-3 mb-3"
            style={{
              borderRadius: "14px",
              border: "2px solid #14b8a6",
              background:
                "linear-gradient(135deg, #f0fdfa, #ffffff)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h5 className="mb-1 fw-bold">
                  📊 Today's Meal Status
                </h5>

                <div className="small text-muted">
                  Currently viewing:{" "}
                  <strong>
                    {mealTypeLabels[
                      statusMealType
                    ] || "—"}
                  </strong>
                </div>
              </div>

              {/* STATUS CATEGORY BUTTONS */}
              <div className="d-flex gap-2 flex-wrap">
                {todaysMenus.map((menu) => (
                  <button
                    key={menu._id}
                    type="button"
                    className={`btn btn-sm ${
                      statusMealType ===
                      menu.mealType
                        ? "btn-success"
                        : "btn-outline-success"
                    }`}
                    onClick={() =>
                      setStatusMealType(
                        menu.mealType
                      )
                    }
                    style={{
                      borderRadius: "9px",
                      fontWeight: 600,
                    }}
                  >
                    {mealTypeLabels[
                      menu.mealType
                    ] ||
                      menu.mealType}
                  </button>
                ))}

                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={
                    handleSweepSkipped
                  }
                  style={{
                    borderRadius: "9px",
                  }}
                >
                  🧹 Sweep Skipped
                </button>
              </div>
            </div>
          </div>

          {sweepMessage && (
            <div className="alert alert-success py-2">
              ✅ {sweepMessage}
            </div>
          )}

          {/* =================================================
              COUNTS
              ================================================= */}

          <MealCountsSummary
            records={gridRecords}
            pending={gridPending}
          />

          {/* =================================================
              RESIDENT STATUS
              ================================================= */}

          <div
            className="mb-4 p-2"
            style={{
              borderRadius: "14px",
              border: "2px solid #f59e0b",
              background:
                "linear-gradient(135deg, #fffbeb, #ffffff)",
            }}
          >
            <div className="d-flex align-items-center mb-2 px-2">
              <span
                className="me-2"
                style={{ fontSize: "20px" }}
              >
                👥
              </span>

              <h6
                className="mb-0 fw-bold"
                style={{ color: "#92400e" }}
              >
                Resident Meal Status
              </h6>

              {gridLoading && (
                <span className="ms-2 small text-muted">
                  ⏳ Loading...
                </span>
              )}
            </div>

            <TodayStatusCards
              records={gridRecords}
              pending={gridPending}
              selectedResidentId={
                selectedResident?._id
              }
              onSelectCard={
                setSelectedResident
              }
              onEditRecord={
                handleEditRecord
              }
            />
          </div>

          {/* =================================================
              SELECTED RESIDENT HISTORY
              ================================================= */}

          {selectedResident && (
            <div
              className="mb-4 p-3"
              style={{
                borderRadius: "14px",
                border: "2px solid #6366f1",
                background:
                  "linear-gradient(135deg, #eef2ff, #ffffff)",
              }}
            >
              <h6 className="fw-bold mb-3">
                📜 Meal History —{" "}
                {selectedResident.name}
              </h6>

              <MealHistoryList
                residentId={
                  selectedResident._id
                }
                residentName={
                  selectedResident.name
                }
                refreshSignal={
                  refreshSignal
                }
              />
            </div>
          )}

          <hr className="my-4" />

          {/* =================================================
              ALL MEAL HISTORY
              ================================================= */}

          <div
            className="p-3"
            style={{
              borderRadius: "14px",
              border: "2px solid #64748b",
              background:
                "linear-gradient(135deg, #f8fafc, #ffffff)",
            }}
          >
            <h5 className="fw-bold mb-3">
              📚 Manager Meal History
            </h5>

            <ManagerMealHistoryBrowser
              refreshSignal={
                refreshSignal
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MealCheckIn;
