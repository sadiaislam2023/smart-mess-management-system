import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import {
  getComplaintByIdForManager,
  assignComplaint,
  updateComplaintStatus,
  uploadCompletionEvidence,
} from "../services/complaintService";

import ComplaintTimeline from "../components/ComplaintTimeline";

const WORKER_TYPES = [
  "Plumber",
  "Technician",
  "Mechanic",
  "Other",
];

const STATUS_OPTIONS = [
  "In Progress",
  "Repair Completed",
];

const formatDateForInput = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

function ManagerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [workerType, setWorkerType] =
    useState("");

  const [workerName, setWorkerName] =
    useState("");

  const [targetDate, setTargetDate] =
    useState("");

  const [statusChoice, setStatusChoice] =
    useState("");

  const [assigning, setAssigning] =
    useState(false);

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  /*
    Load complaint details.

    useCallback is used so the function can safely
    be included in the useEffect dependency array.

    This still loads only when the complaint ID changes.
    There is NO 10-second polling because polling was
    overwriting the assignment form while the manager
    was typing.
  */
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data =
        await getComplaintByIdForManager(
          id
        );

      const loadedComplaint =
        data.complaint;

      setComplaint(
        loadedComplaint
      );

      setStatusChoice(
        loadedComplaint.status || ""
      );

      if (
        loadedComplaint.assignedTo
      ) {
        setWorkerType(
          loadedComplaint.assignedTo
            ?.type || ""
        );

        setWorkerName(
          loadedComplaint.assignedTo
            ?.name || ""
        );
      } else {
        setWorkerType("");
        setWorkerName("");
      }

      if (
        loadedComplaint.targetCompletionDate
      ) {
        setTargetDate(
          formatDateForInput(
            loadedComplaint
              .targetCompletionDate
          )
        );
      } else {
        setTargetDate("");
      }

      setError("");
    } catch (err) {
      setError(
        err.response?.data
          ?.message ||
        "Could not load work order."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async (event) => {
    event.preventDefault();

    if (!workerType) {
      setError(
        "Please select a worker type."
      );
      return;
    }

    if (!workerName.trim()) {
      setError(
        "Please enter the worker name."
      );
      return;
    }

    if (!targetDate) {
      setError(
        "Please select a target completion date."
      );
      return;
    }

    try {
      setAssigning(true);
      setError("");

      const data =
        await assignComplaint(
          id,
          {
            workerType,
            workerName:
              workerName.trim(),
            targetCompletionDate:
              targetDate,
          }
        );

      const updatedComplaint =
        data.complaint;

      setComplaint(
        updatedComplaint
      );

      setWorkerType(
        updatedComplaint.assignedTo
          ?.type || workerType
      );

      setWorkerName(
        updatedComplaint.assignedTo
          ?.name || workerName
      );

      setTargetDate(
        updatedComplaint.targetCompletionDate
          ? formatDateForInput(
              updatedComplaint
                .targetCompletionDate
            )
          : targetDate
      );
    } catch (err) {
      setError(
        err.response?.data
          ?.message ||
        "Failed to assign work order."
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleStatus = async () => {
    if (!statusChoice) {
      setError(
        "Please select a status."
      );
      return;
    }

    try {
      setUpdatingStatus(true);
      setError("");

      const data =
        await updateComplaintStatus(
          id,
          statusChoice
        );

      setComplaint(
        data.complaint
      );

      setStatusChoice(
        data.complaint.status ||
          statusChoice
      );
    } catch (err) {
      setError(
        err.response?.data
          ?.message ||
        "Failed to update status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCompletionUpload =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        setUploading(true);
        setError("");

        const formData =
          new FormData();

        formData.append(
          "completionEvidence",
          file
        );

        const data =
          await uploadCompletionEvidence(
            id,
            formData
          );

        setComplaint(
          data.complaint
        );
      } catch (err) {
        setError(
          err.response?.data
            ?.message ||
          "Failed to upload completion evidence."
        );
      } finally {
        setUploading(false);

        event.target.value = "";
      }
    };

  if (loading) {
    return (
      <div className="container py-4">
        <p>
          Loading work order...
        </p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">
          {error ||
            "Work order not found."}
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            navigate(
              "/manager/complaints"
            )
          }
        >
          Back to Complaints
        </button>
      </div>
    );
  }

  const isCompleted =
    complaint.status ===
    "Repair Completed";

  const isClosed =
    complaint.status ===
    "Closed";

  const actionBlocked =
    isCompleted || isClosed;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            Work Order
          </h2>

          <p className="text-muted mb-0">
            Ticket:{" "}
            {complaint.ticketNumber ||
              complaint._id}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() =>
            navigate(
              "/manager/complaints"
            )
          }
        >
          Back
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card mb-4 shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">
            Complaint Information
          </h5>
        </div>

        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>
                Ticket Number
              </strong>

              <div>
                {complaint.ticketNumber ||
                  "N/A"}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Status
              </strong>

              <div>
                <span className="badge bg-primary">
                  {complaint.status ||
                    "N/A"}
                </span>
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Category
              </strong>

              <div>
                {complaint.category ||
                  "N/A"}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Location
              </strong>

              <div>
                {complaint.location ||
                  "N/A"}
              </div>
            </div>
          </div>

          <hr />

          <div>
            <strong>
              Complaint Description
            </strong>

            <p className="mt-2 mb-0">
              {complaint.description ||
                "No description provided."}
            </p>
          </div>
        </div>
      </div>

      {complaint.evidence &&
        complaint.evidence.length >
          0 && (
          <div className="card mb-4 shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">
                Complaint Evidence
              </h5>
            </div>

            <div className="card-body">
              <div className="row">
                {complaint.evidence.map(
                  (item, index) => (
                    <div
                      className="col-md-4 mb-3"
                      key={
                        item.public_id ||
                        item.url ||
                        index
                      }
                    >
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={item.url}
                            alt={`Evidence ${
                              index + 1
                            }`}
                            className="img-fluid rounded border"
                          />
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

      <div className="card mb-4 shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">
            Work Order Assignment
          </h5>
        </div>

        <div className="card-body">
          {actionBlocked && (
            <div className="alert alert-warning">
              This work order can no longer
              be modified because it is{" "}
              <strong>
                {complaint.status}
              </strong>
              .
            </div>
          )}

          <form
            onSubmit={handleAssign}
          >
            <div className="row">
              <div className="col-md-4 mb-3">
                <label
                  htmlFor="workerType"
                  className="form-label"
                >
                  Worker Type
                </label>

                <select
                  id="workerType"
                  className="form-select"
                  value={workerType}
                  onChange={(event) =>
                    setWorkerType(
                      event.target.value
                    )
                  }
                  disabled={
                    assigning ||
                    actionBlocked
                  }
                >
                  <option value="">
                    Select worker type
                  </option>

                  {WORKER_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label
                  htmlFor="workerName"
                  className="form-label"
                >
                  Worker Name
                </label>

                <input
                  id="workerName"
                  type="text"
                  className="form-control"
                  value={workerName}
                  onChange={(event) =>
                    setWorkerName(
                      event.target.value
                    )
                  }
                  placeholder="Enter worker name"
                  disabled={
                    assigning ||
                    actionBlocked
                  }
                />
              </div>

              <div className="col-md-4 mb-3">
                <label
                  htmlFor="targetDate"
                  className="form-label"
                >
                  Target Completion Date
                </label>

                <input
                  id="targetDate"
                  type="date"
                  className="form-control"
                  value={targetDate}
                  onChange={(event) =>
                    setTargetDate(
                      event.target.value
                    )
                  }
                  disabled={
                    assigning ||
                    actionBlocked
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                assigning ||
                actionBlocked
              }
            >
              {assigning
                ? "Assigning..."
                : "Assign / Update Work Order"}
            </button>
          </form>
        </div>
      </div>

      <div className="card mb-4 shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">
            Update Status
          </h5>
        </div>

        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-6 mb-3">
              <label
                htmlFor="statusChoice"
                className="form-label"
              >
                Status
              </label>

              <select
                id="statusChoice"
                className="form-select"
                value={statusChoice}
                onChange={(event) =>
                  setStatusChoice(
                    event.target.value
                  )
                }
                disabled={
                  updatingStatus ||
                  actionBlocked
                }
              >
                <option value="">
                  Select status
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="col-md-6 mb-3">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleStatus}
                disabled={
                  updatingStatus ||
                  actionBlocked ||
                  !statusChoice
                }
              >
                {updatingStatus
                  ? "Updating..."
                  : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4 shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">
            Completion Evidence
          </h5>
        </div>

        <div className="card-body">
          {complaint.completionEvidence &&
            complaint.completionEvidence
              .length > 0 && (
              <div className="row mb-3">
                {complaint.completionEvidence.map(
                  (item, index) => (
                    <div
                      className="col-md-4 mb-3"
                      key={
                        item.public_id ||
                        item.url ||
                        index
                      }
                    >
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={item.url}
                            alt={`Completion evidence ${
                              index + 1
                            }`}
                            className="img-fluid rounded border"
                          />
                        </a>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

          <label
            htmlFor="completionEvidence"
            className="form-label"
          >
            Upload Completion Evidence
          </label>

          <input
            id="completionEvidence"
            type="file"
            className="form-control"
            accept="image/*"
            onChange={
              handleCompletionUpload
            }
            disabled={
              uploading ||
              actionBlocked
            }
          />

          {uploading && (
            <div className="mt-2 text-muted">
              Uploading completion
              evidence...
            </div>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="alert alert-success mb-4">
          <strong>
            Repair Completed
          </strong>

          <div className="mt-1">
            The manager has marked this
            work order as completed.
          </div>
        </div>
      )}

      {isClosed && (
        <div className="alert alert-secondary mb-4">
          <strong>
            Work Order Closed
          </strong>

          <div className="mt-1">
            This work order has been
            closed and can no longer be
            modified.
          </div>
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            Work Order Information
          </h5>
        </div>

        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <strong>
                Assigned Worker
              </strong>

              <div>
                {complaint.assignedTo
                  ?.name ||
                  "Not assigned"}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Worker Type
              </strong>

              <div>
                {complaint.assignedTo
                  ?.type ||
                  "Not assigned"}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Target Completion Date
              </strong>

              <div>
                {complaint.targetCompletionDate
                  ? new Date(
                      complaint.targetCompletionDate
                    ).toLocaleDateString()
                  : "Not set"}
              </div>
            </div>

            <div className="col-md-6 mb-3">
              <strong>
                Current Status
              </strong>

              <div>
                {complaint.status ||
                  "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">
          <h5 className="mb-0">
            Complaint Timeline
          </h5>
        </div>

        <div className="card-body">
          <ComplaintTimeline
            timeline={
              complaint.timeline || []
            }
          />
        </div>
      </div>
    </div>
  );
}

export default ManagerComplaintDetail;
