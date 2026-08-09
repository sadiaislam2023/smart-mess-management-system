import React from "react";

const createFallbackPositions = (beds) =>
  beds.map((bed, index) => ({
    bedNumber: bed.bedNumber,
    x: 3 + (index % 2) * 9,
    y: 3 + Math.floor(index / 2) * 6,
  }));

const RoomLayout = ({
  beds = [],
  layout = {},
  selectedBedId,
  onSelectBed,
  selectionDisabled = false,
}) => {
  // =========================================================
  // ONLY DISPLAY NON-ARCHIVED BEDS
  // =========================================================

  const activeBeds = beds.filter((bed) => !bed.isArchived);

  // =========================================================
  // ROOM DIMENSIONS
  // =========================================================

  const roomWidth = Number(layout.roomWidth) || 20;
  const roomLength = Number(layout.roomLength) || 15;

  // =========================================================
  // BED POSITIONS
  // =========================================================

  const positions =
    Array.isArray(layout.bedPositions) &&
    layout.bedPositions.length > 0
      ? layout.bedPositions
      : createFallbackPositions(activeBeds);

  const fallbackPositions = createFallbackPositions(activeBeds);

  // =========================================================
  // BED STATISTICS
  // =========================================================

  const totalBeds = activeBeds.length;

  const occupiedBeds = activeBeds.filter(
    (bed) => bed.occupied
  ).length;

  const holdBeds = activeBeds.filter(
    (bed) => bed.onHold && !bed.occupied
  ).length;

  const availableBeds = activeBeds.filter(
    (bed) => !bed.occupied && !bed.onHold
  ).length;

  // =========================================================
  // NO BEDS
  // =========================================================

  if (!activeBeds.length) {
    return (
      <div className="alert alert-info">
        No beds are available to display in this layout.
      </div>
    );
  }

  // =========================================================
  // FIND BED POSITION
  // =========================================================

  const positionForBed = (bed, index) => {
    const found = positions.find(
      (position) =>
        position?.bedNumber === bed.bedNumber
    );

    if (
      found &&
      Number.isFinite(Number(found.x)) &&
      Number.isFinite(Number(found.y))
    ) {
      return found;
    }

    return fallbackPositions[index];
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <section>
      {/* =====================================================
          BED STATUS LEGEND
      ===================================================== */}

      <div className="d-flex flex-wrap gap-3 mb-3">
        {/* Available */}
        <span>
          <i
            className="d-inline-block bg-success rounded-circle me-1"
            style={{
              width: 10,
              height: 10,
            }}
          />
          Available
        </span>

        {/* Selected */}
        <span>
          <i
            className="d-inline-block bg-primary rounded-circle me-1"
            style={{
              width: 10,
              height: 10,
            }}
          />
          Selected
        </span>

        {/* Occupied */}
        <span>
          <i
            className="d-inline-block bg-danger rounded-circle me-1"
            style={{
              width: 10,
              height: 10,
            }}
          />
          Occupied
        </span>

        {/* On Hold */}
        <span>
          <i
            className="d-inline-block bg-warning rounded-circle me-1"
            style={{
              width: 10,
              height: 10,
            }}
          />
          On Hold
        </span>
      </div>

      {/* =====================================================
          BED OCCUPANCY SUMMARY
      ===================================================== */}

      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <strong>Bed occupancy</strong>

        <span className="text-muted">
          {totalBeds} total ·{" "}
          <span className="text-danger fw-semibold">
            {occupiedBeds} occupied
          </span>{" "}
          ·{" "}
          <span className="text-warning fw-semibold">
            {holdBeds} on hold
          </span>{" "}
          ·{" "}
          <span className="text-success fw-semibold">
            {availableBeds} available
          </span>
        </span>
      </div>

      {/* =====================================================
          INFORMATION FOR STUDENT
      ===================================================== */}

      {!selectionDisabled && (
        <div className="alert alert-info py-2">
          <small>
            Click an available bed to request it. You can also
            click an occupied or on-hold bed to join its waitlist.
          </small>
        </div>
      )}

      {/* =====================================================
          ROOM LAYOUT
      ===================================================== */}

      <div
        className="bg-white border rounded position-relative"
        style={{
          minHeight: 280,
          overflow: "hidden",
        }}
      >
        {activeBeds.map((bed, index) => {
          const position = positionForBed(bed, index);

          // ===================================================
          // UNIQUE BED ID
          // ===================================================

          const bedId = bed._id || bed.bedNumber;

          // ===================================================
          // SELECTED
          // ===================================================

          const isSelected =
            String(selectedBedId ?? "") ===
            String(bedId ?? "");

          // ===================================================
          // BED STATUS
          // ===================================================

          let statusClass = "btn-outline-success";
          let statusText = "Available";

          if (bed.occupied) {
            statusClass = isSelected
              ? "btn-danger"
              : "btn-outline-danger";

            statusText = "Occupied";
          } else if (bed.onHold) {
            statusClass = isSelected
              ? "btn-warning text-dark"
              : "btn-outline-warning";

            statusText = "On Hold";
          } else if (isSelected) {
            statusClass = "btn-primary";
            statusText = "Selected";
          } else {
            statusClass = "btn-outline-success";
            statusText = "Available";
          }

          // ===================================================
          // IMPORTANT:
          //
          // Occupied and onHold are NOT disabled.
          //
          // Student can click them and then RoomDetails
          // displays "Join Waitlist".
          // ===================================================

          const disabled = selectionDisabled;

          return (
            <button
              key={
                bed._id ||
                `${bed.bedNumber}-${index}`
              }
              type="button"
              className={`btn ${statusClass} position-absolute p-2 ${
                isSelected ? "shadow border-3" : ""
              }`}
              style={{
                width: 100,

                left: `${Math.min(
                  Math.max(
                    (Number(position.x) / roomWidth) * 100,
                    2
                  ),
                  75
                )}%`,

                top: `${Math.min(
                  Math.max(
                    (Number(position.y) / roomLength) * 100,
                    2
                  ),
                  80
                )}%`,

                cursor: disabled
                  ? "not-allowed"
                  : "pointer",
              }}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onSelectBed?.(bed);
                }
              }}
              aria-pressed={isSelected}
              aria-label={`Bed ${
                bed.bedNumber || index + 1
              }: ${statusText}`}
            >
              <strong>
                Bed {bed.bedNumber || index + 1}
              </strong>

              <small className="d-block fw-bold">
                {statusText}
              </small>

              {/* Show waitlist hint */}
              {!disabled &&
                (bed.occupied || bed.onHold) && (
                  <small className="d-block mt-1">
                    Join Waitlist
                  </small>
                )}
            </button>
          );
        })}
      </div>

      {/* =====================================================
          HELP TEXT
      ===================================================== */}

      <p className="small text-muted mt-3 mb-0">
        Available beds can be requested directly. Occupied and
        on-hold beds can be selected to join their waitlist.
        Click the selected bed again to unselect it.
        <br />
        Room size: {roomWidth} × {roomLength}.
      </p>
    </section>
  );
};

export default RoomLayout;