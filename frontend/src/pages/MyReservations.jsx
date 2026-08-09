import { useEffect, useState } from "react";
import {
  getMyReservations,
  cancelReservation,
} from "../services/reservationService";

function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const res = await getMyReservations();

      setReservations(
        res.reservations || []
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to load reservations."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    const confirmCancel =
      window.confirm(
        "Are you sure you want to cancel this reservation?"
      );

    if (!confirmCancel) {
      return;
    }

    setProcessingId(id);

    try {
      const res =
        await cancelReservation(id);

      alert(res.message);

      await loadReservations();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to cancel reservation."
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =======================================================
  // FORMAT DATE + TIME
  // =======================================================

  const formatDateTime = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleString(
      "en-BD",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    );
  };

  // =======================================================
  // CHECK HOLD EXPIRATION
  // =======================================================

  const isHoldExpired = (
    holdExpiresAt
  ) => {
    if (!holdExpiresAt) {
      return false;
    }

    return (
      new Date(holdExpiresAt) <
      new Date()
    );
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="container mt-5">

      <h2 className="mb-4">
        My Reservations
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
          You have no reservations.
        </div>

      ) : (

        <div className="table-responsive">

          <table className="table table-bordered table-hover align-middle">

            <thead className="table-dark">

              <tr>

                <th>
                  Room
                </th>

                <th>
                  Bed
                </th>

                <th>
                  Status
                </th>

                <th>
                  Details
                </th>

                <th>
                  Requested On
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {reservations.map(
                (reservation) => {

                  const holdExpired =
                    isHoldExpired(
                      reservation.holdExpiresAt
                    );

                  return (

                    <tr
                      key={
                        reservation._id
                      }
                    >

                      {/* ROOM */}

                      <td>
                        {reservation.room
                          ?.roomNumber ||
                          "-"}
                      </td>


                      {/* BED */}

                      <td>
                        {
                          reservation.bedNumber
                        }
                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={`badge ${
                            reservation.status ===
                            "approved"
                              ? "bg-success"
                              : reservation.status ===
                                "pending"
                              ? "bg-warning text-dark"
                              : reservation.status ===
                                "rejected"
                              ? "bg-danger"
                              : reservation.status ===
                                "expired"
                              ? "bg-secondary"
                              : "bg-dark"
                          }`}
                        >

                          {
                            reservation.status
                          }

                        </span>

                      </td>


                      {/* DETAILS */}

                      <td className="small">

                        {reservation.status ===
                          "pending" &&
                          reservation.holdExpiresAt && (

                            <div
                              className={
                                holdExpired
                                  ? "text-danger fw-bold"
                                  : "text-muted"
                              }
                            >

                              <strong>
                                Hold expires:
                              </strong>{" "}

                              {formatDateTime(
                                reservation.holdExpiresAt
                              )}

                              {holdExpired && (
                                <span className="ms-1">
                                  (expired)
                                </span>
                              )}

                            </div>
                          )}


                        {reservation.status ===
                          "rejected" &&
                          reservation.rejectionReason && (

                            <div className="text-danger">

                              <strong>
                                Reason:
                              </strong>{" "}

                              {
                                reservation.rejectionReason
                              }

                            </div>
                          )}


                        {reservation.status ===
                          "approved" && (

                            <span className="text-success">
                              Reservation approved.
                            </span>
                          )}


                        {reservation.status ===
                          "cancelled" && (

                            <span className="text-muted">
                              Reservation cancelled.
                            </span>
                          )}


                        {reservation.status ===
                          "expired" && (

                            <span className="text-danger">
                              Reservation hold expired.
                            </span>
                          )}

                      </td>


                      {/* REQUESTED DATE + TIME */}

                      <td>

                        {formatDateTime(
                          reservation.createdAt
                        )}

                      </td>


                      {/* ACTION */}

                      <td>

                        {(reservation.status ===
                          "pending" ||
                          reservation.status ===
                            "approved") && (

                          <button
                            className="btn btn-danger btn-sm"
                            disabled={
                              processingId ===
                              reservation._id
                            }
                            onClick={() =>
                              handleCancel(
                                reservation._id
                              )
                            }
                          >

                            {processingId ===
                            reservation._id
                              ? "Cancelling..."
                              : "Cancel"}

                          </button>

                        )}

                        {reservation.status ===
                          "expired" && (

                          <span className="text-muted">
                            No action
                          </span>
                        )}

                        {reservation.status ===
                          "rejected" && (

                          <span className="text-muted">
                            No action
                          </span>
                        )}

                        {reservation.status ===
                          "cancelled" && (

                          <span className="text-muted">
                            Cancelled
                          </span>
                        )}

                      </td>

                    </tr>

                  );
                }
              )}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default MyReservations;