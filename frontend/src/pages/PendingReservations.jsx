import { useEffect, useState } from "react";

import {
  getPendingReservations,
  approveReservation,
  rejectReservation,
} from "../services/reservationService";

function PendingReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const res = await getPendingReservations();
      setReservations(res.reservations || []);
    } catch (error) {
      console.error(error);
      alert("Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (
      !window.confirm(
        "Approve this reservation? The bed will be marked occupied."
      )
    ) {
      return;
    }

    setProcessingId(id);

    try {
      const res = await approveReservation(id);
      alert(res.message);
      await loadReservations();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Approval failed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt(
      "Reason for rejecting this reservation:"
    );

    if (reason === null) return;

    if (!reason.trim()) {
      alert("A rejection reason is required.");
      return;
    }

    setProcessingId(id);

    try {
      const res = await rejectReservation(
        id,
        reason.trim()
      );

      alert(res.message);
      await loadReservations();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Rejection failed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // Check whether the 24-hour hold has expired
  const isHoldExpired = (reservation) => {
    return (
      reservation.holdExpiresAt &&
      new Date(reservation.holdExpiresAt) < new Date()
    );
  };

  // Show complete date + time
  const formatHoldExpires = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString("en-BD", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="container mt-5">

      <h2 className="mb-4">
        Pending Reservations
      </h2>

      {loading ? (
        <div className="text-center">

          <div
            className="spinner-border"
            role="status"
          ></div>

          <p className="mt-2">
            Loading...
          </p>

        </div>
      ) : reservations.length === 0 ? (
        <div className="alert alert-info">
          No pending reservations.
        </div>
      ) : (
        <div className="table-responsive">

          <table className="table table-bordered table-hover align-middle">

            <thead className="table-dark">

              <tr>
                <th>Student</th>
                <th>Room</th>
                <th>Bed</th>
                <th>Status</th>
                <th>Hold Expires</th>
                <th>Action</th>
              </tr>

            </thead>

            <tbody>

              {reservations.map((r) => {

                const expired =
                  isHoldExpired(r);

                return (
                  <tr key={r._id}>

                    <td>
                      {r.student?.name || "-"}
                    </td>

                    <td>
                      {r.room?.roomNumber || "-"}
                    </td>

                    <td>
                      {r.bedNumber}
                    </td>

                    <td>
                      <span className="badge bg-warning text-dark">
                        {r.status}
                      </span>
                    </td>

                    <td
                      className={
                        expired
                          ? "text-danger fw-bold"
                          : ""
                      }
                    >
                      {formatHoldExpires(
                        r.holdExpiresAt
                      )}

                      {expired && (
                        <span className="ms-2">
                          (expired)
                        </span>
                      )}
                    </td>

                    <td>

                      <button
                        className="btn btn-success btn-sm me-2"
                        disabled={
                          processingId === r._id ||
                          expired
                        }
                        onClick={() =>
                          handleApprove(r._id)
                        }
                      >
                        {processingId === r._id
                          ? "..."
                          : "Approve"}
                      </button>

                      <button
                        className="btn btn-danger btn-sm"
                        disabled={
                          processingId === r._id ||
                          expired
                        }
                        onClick={() =>
                          handleReject(r._id)
                        }
                      >
                        {processingId === r._id
                          ? "..."
                          : "Reject"}
                      </button>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}

export default PendingReservations;