import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  getComplaintByIdForAdmin,
  submitReviewDecision,
  reviewReopenRequest,
  requestSiteInspection,
  askReviewQuestion,
  assignAuthorizedAlternative,
  updateComplaintStatus,
  uploadCompletionEvidence,
} from "../services/complaintService";

import ComplaintTimeline from "../components/ComplaintTimeline";


/* =========================================================
   FINAL DECISIONS
========================================================= */

const FINAL_DECISIONS = [
  "Valid",
  "Insufficient Evidence",
  "Duplicate",
  "Confirmed False",
];


/* =========================================================
   GET FINAL DECISION
========================================================= */

const getFinalDecision = (complaint) => {

  if (
    FINAL_DECISIONS.includes(
      complaint?.reviewDecision
    )
  ) {
    return complaint.reviewDecision;
  }

  if (
    FINAL_DECISIONS.includes(
      complaint?.status
    )
  ) {
    return complaint.status;
  }

  return null;
};


/* =========================================================
   CHECK WHETHER REVIEW HAS STARTED
========================================================= */

const hasReviewStarted = (complaint) => {

  if (!complaint) {
    return false;
  }

  /* Final decision */

  if (
    FINAL_DECISIONS.includes(
      complaint.reviewDecision
    )
  ) {
    return true;
  }

  /* Explicit Under Review */

  if (
    complaint.reviewDecision ===
    "Under Review"
  ) {
    return true;
  }

  /* Site inspection */

  if (
    complaint.inspectionRequest?.requested
  ) {
    return true;
  }

  /* Confidential questions */

  if (
    Array.isArray(
      complaint.reviewQuestions
    ) &&
    complaint.reviewQuestions.length > 0
  ) {
    return true;
  }

  /*
   * IMPORTANT:
   * concernsManager alone does NOT mean
   * that review has started.
   */

  /* Authorized alternative */

  if (
    complaint.alternativeHandler?.name
  ) {
    return true;
  }

  /* Work order */

  if (
    [
      "Assigned",
      "In Progress",
      "Repair Completed",
      "Reopened",
    ].includes(
      complaint.status
    )
  ) {
    return true;
  }

  /* Timeline */

  if (
    Array.isArray(
      complaint.timeline
    ) &&
    complaint.timeline.length > 1
  ) {
    return true;
  }

  return false;
};


/* =========================================================
   REVIEW DECISION LABEL
========================================================= */

const getReviewDecisionLabel = (
  complaint
) => {

  const finalDecision =
    getFinalDecision(
      complaint
    );

  /*
   * Final decision has priority.
   */

  if (finalDecision) {
    return finalDecision;
  }

  /*
   * Otherwise show Under Review
   * when actual review activity exists.
   */

  if (
    hasReviewStarted(
      complaint
    )
  ) {
    return "Under Review";
  }

  return "Not reviewed";
};


/* =========================================================
   FINAL DECISION NOTE
========================================================= */

const getFinalDecisionNote = (
  complaint
) => {

  const finalDecision =
    getFinalDecision(
      complaint
    );

  if (
    !finalDecision ||
    !Array.isArray(
      complaint.timeline
    )
  ) {
    return null;
  }

  const matchingEntries =
    complaint.timeline.filter(
      (entry) =>
        entry.status ===
        finalDecision
    );

  if (
    !matchingEntries.length
  ) {
    return null;
  }

  return (
    matchingEntries[
      matchingEntries.length - 1
    ].note || null
  );
};


/* =========================================================
   ACTIVE WORK ORDER
========================================================= */

const isActiveWorkOrderStatus = (
  status
) => {

  return [
    "Assigned",
    "In Progress",
    "Repair Completed",
  ].includes(status);
};


/* =========================================================
   ADMIN COMPLAINT REVIEW
========================================================= */

function AdminComplaintReview() {

  const { id } =
    useParams();


  /* =======================================================
     COMPLAINT
  ======================================================= */

  const [
    complaint,
    setComplaint,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  /* =======================================================
     CONFIDENTIAL QUESTION
  ======================================================= */

  const [
    question,
    setQuestion,
  ] = useState("");


  /* =======================================================
     FINAL DECISION NOTE
  ======================================================= */

  const [
    decisionNote,
    setDecisionNote,
  ] = useState("");

  /*
   * The setter is intentionally retained because the
   * "Set Note" action uses it to track whether a note
   * has been explicitly set.
   *
   * The state value itself is not required by the UI.
   */
  const [
    ,
    setNoteSet,
  ] = useState(false);


  /* =======================================================
     REOPEN REVIEW

     No dedicated note state here — Approve/Reject reuse
     `decisionNote` (the same note set via the "Set Note"
     button used for Final Decisions) so the admin sets the
     note once and it is shown to the resident.
  ======================================================= */


  /* =======================================================
     MANAGER CONCERN
  ======================================================= */

  const [
    concernsManager,
    setConcernsManager,
  ] = useState(false);


  /* =======================================================
     AUTHORIZED ALTERNATIVE
  ======================================================= */

  const [
    handlerName,
    setHandlerName,
  ] = useState("");

  const [
    handlerAuthority,
    setHandlerAuthority,
  ] = useState("");

  const [
    handlerContact,
    setHandlerContact,
  ] = useState("");


  /* =======================================================
     COMPLETION EVIDENCE
  ======================================================= */

  const [
    altEvidenceFiles,
    setAltEvidenceFiles,
  ] = useState([]);


  /* =========================================================
     LOAD COMPLAINT
  ========================================================= */

  const loadComplaint =
    useCallback(
      async () => {

        try {

          setLoading(true);
          setError("");

          const data =
            await getComplaintByIdForAdmin(
              id
            );

          const loadedComplaint =
            data.complaint;

          setComplaint(
            loadedComplaint
          );

          setConcernsManager(
            Boolean(
              loadedComplaint.concernsManager
            )
          );

        } catch (err) {

          setError(
            err.response?.data
              ?.message ||
            "Failed to load complaint."
          );

        } finally {

          setLoading(false);

        }
      },
      [id]
    );


  useEffect(() => {

    loadComplaint();

  }, [loadComplaint]);


  /* =========================================================
     CLOSED
  ========================================================= */

  const isClosed =
    complaint?.status ===
    "Closed";


  /* =========================================================
     MARK REVIEW STARTED LOCALLY
  ========================================================= */

  const markReviewStarted =
    (updatedComplaint = null) => {

      if (updatedComplaint) {

        setComplaint(
          updatedComplaint
        );

        return;
      }

      setComplaint(
        (prev) => {

          if (!prev) {
            return prev;
          }

          /*
           * Do not overwrite
           * an existing final decision.
           */

          if (
            getFinalDecision(
              prev
            )
          ) {
            return prev;
          }

          return {
            ...prev,
            reviewDecision:
              "Under Review",
          };
        }
      );
    };


  /* =========================================================
     SET NOTE
  ========================================================= */

  const handleSetNote =
    () => {

      if (isClosed) {

        setError(
          "This complaint is closed. No further action is allowed."
        );

        return;
      }

      if (
        !decisionNote.trim()
      ) {

        setError(
          "Please enter a note before clicking Set Note."
        );

        return;
      }

      setError("");
      setNoteSet(true);

      markReviewStarted();
    };


  /* =========================================================
     FINAL DECISION

     Clicking:
     Valid
     Insufficient Evidence
     Duplicate
     Confirmed False

     changes BOTH:

     reviewDecision = decision
     status = decision
  ========================================================= */

  const handleDecision =
    async (
      decision
    ) => {

      if (isClosed) {

        setError(
          "This complaint is closed. Final decisions are blocked."
        );

        return;
      }

      if (
        isFinalDecisionButtonLocked(
          decision
        )
      ) {

        setError(
          decision === "Valid" &&
          reopenApproved
            ? "This complaint's reopening was already approved, which counts as Valid. The Valid decision cannot be set again."
            : "This final decision is currently locked."
        );

        return;
      }

      try {

        setError("");

        setComplaint(
          (prev) => {

            if (!prev) {
              return prev;
            }

            return {
              ...prev,

              reviewDecision:
                decision,

              status:
                decision,
            };
          }
        );

        await submitReviewDecision(
          id,
          {
            decision,

            note:
              decisionNote.trim() ||
              `Reviewed by Complaint Integrity Officer as ${decision}.`,
          }
        );

        setDecisionNote("");
        setNoteSet(false);

        await loadComplaint();

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to save decision."
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     REOPEN REVIEW

     Separate from the original review decision. Until this
     is approved, the Mess Manager cannot access the
     complaint again.

     NOTE: this reuses the same "Set Note" note
     (decisionNote) that is already used for the Final
     Decision buttons, instead of a separate note field.
     The admin sets the note first (Set Note button), then
     clicks Approve/Reject directly — the resident sees
     whatever note was set before the click.
  ========================================================= */

  const handleReopenReview =
    async (
      decision
    ) => {

      try {

        setError("");

        await reviewReopenRequest(
          id,
          decision,
          decisionNote.trim() ||
            (decision === "approved"
              ? "System Administrator approved the reopening."
              : "System Administrator rejected the reopening.")
        );

        setDecisionNote("");
        setNoteSet(false);

        await loadComplaint();

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to save reopen review decision."
        );
      }
    };


  /* =========================================================
     SITE INSPECTION

     IMPORTANT:

     Review Decision -> Under Review

     Status stays unchanged.
  ========================================================= */

  const handleInspection =
    async () => {

      if (isClosed) {

        setError(
          "Site inspection cannot be requested after the complaint is closed."
        );

        return;
      }

      try {

        setError("");

        markReviewStarted();

        await requestSiteInspection(
          id,
          "Discreet inspection requested by Complaint Integrity Officer."
        );

        await loadComplaint();

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to request inspection."
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     CONFIDENTIAL QUESTION

     Review Decision -> Under Review

     Status unchanged.
  ========================================================= */

  const handleQuestion =
    async (
      e
    ) => {

      e.preventDefault();

      if (isClosed) {

        setError(
          "This complaint is closed. No further questions can be sent."
        );

        return;
      }

      if (
        !question.trim()
      ) {

        setError(
          "Please enter a question."
        );

        return;
      }

      try {

        setError("");

        markReviewStarted();

        const data =
          await askReviewQuestion(
            id,
            question.trim()
          );

        setQuestion("");

        setComplaint(
          data.complaint
        );

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to send confidential question."
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     ASSIGN AUTHORIZED ALTERNATIVE

     IMPORTANT:

     Manager concern complaints MUST be Valid
     before authority assignment is allowed.
  ========================================================= */

  const handleAssignAlternativeHandler =
    async (
      e
    ) => {

      e.preventDefault();

      if (isClosed) {

        setError(
          "This complaint is closed. An authorized alternative cannot be assigned."
        );

        return;
      }

      /*
       * IMPORTANT GATE:
       *
       * Manager concern
       * +
       * final decision must be Valid.
       */

      if (
        concernsManager &&
        getFinalDecision(
          complaint
        ) !== "Valid"
      ) {

        setError(
          "The complaint must be marked Valid before an authorized alternative can be assigned."
        );

        return;
      }

      if (
        !handlerName.trim()
      ) {

        setError(
          "The authorized alternative's name is required."
        );

        return;
      }

      try {

        setError("");

        const data =
          await assignAuthorizedAlternative(
            id,
            handlerName.trim(),
            handlerAuthority.trim(),
            handlerContact.trim()
          );

        setHandlerName("");
        setHandlerAuthority("");
        setHandlerContact("");

        setComplaint(
          data.complaint
        );

        setConcernsManager(
          Boolean(
            data.complaint
              .concernsManager
          )
        );

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to assign the authorized alternative."
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     WORK ORDER STATUS
  ========================================================= */

  const handleAlternativeStatus =
    async (
      status
    ) => {

      if (isClosed) {

        setError(
          "This complaint is closed. Work-order actions are blocked."
        );

        return;
      }

      try {

        setError("");

        if (
          status ===
            "In Progress" &&
          complaint.status !==
            "Assigned"
        ) {

          setError(
            "The complaint must be Assigned before it can be marked In Progress."
          );

          return;
        }

        if (
          status ===
            "Repair Completed" &&
          complaint.status !==
            "In Progress"
        ) {

          setError(
            "The complaint must be In Progress before it can be marked Repair Completed."
          );

          return;
        }

        const data =
          await updateComplaintStatus(
            id,
            status,
            ""
          );

        setComplaint(
          data.complaint
        );

        setConcernsManager(
          Boolean(
            data.complaint
              .concernsManager
          )
        );

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          `Failed to update status to ${status}.`
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     COMPLETION EVIDENCE
  ========================================================= */

  const handleAlternativeEvidence =
    async (
      e
    ) => {

      e.preventDefault();

      if (isClosed) {

        setError(
          "This complaint is closed. Completion evidence cannot be uploaded."
        );

        return;
      }

      if (
        !altEvidenceFiles.length
      ) {

        setError(
          "Please select at least one evidence file."
        );

        return;
      }

      if (
        complaint.status !==
        "In Progress"
      ) {

        setError(
          "Completion evidence can only be uploaded while the repair is In Progress."
        );

        return;
      }

      try {

        setError("");

        const data =
          await uploadCompletionEvidence(
            id,
            altEvidenceFiles
          );

        setAltEvidenceFiles([]);

        setComplaint(
          data.complaint
        );

      } catch (err) {

        setError(
          err.response?.data
            ?.message ||
          "Failed to upload completion evidence."
        );

        await loadComplaint();
      }
    };


  /* =========================================================
     DECISION BUTTON COLORS
  ========================================================= */

  const getDecisionButtonClass =
    (
      decision
    ) => {

      switch (
        decision
      ) {

        case "Valid":
          return "btn-success";

        case "Duplicate":
          return "btn-primary";

        case "Insufficient Evidence":
          return "btn-warning";

        case "Confirmed False":
          return "btn-danger";

        default:
          return "btn-secondary";
      }
    };


  /* =========================================================
     STATUS BADGE COLORS
  ========================================================= */

  const getStatusBadgeClass =
    (
      status
    ) => {

      switch (
        status?.toLowerCase()
      ) {

        case "valid":
        case "resolved":
        case "repair completed":
          return "bg-success";

        case "closed":
          return "bg-secondary";

        case "assigned":
          return "bg-primary";

        case "in progress":
          return "bg-info text-dark";

        case "reopened":
          return "bg-warning text-dark";

        case "duplicate":
          return "bg-primary";

        case "insufficient evidence":
        case "pending":
        case "under review":
        case "review":
          return "bg-warning text-dark";

        case "confirmed false":
        case "rejected":
          return "bg-danger";

        case "cancelled":
        case "canceled":
          return "bg-secondary";

        case "submitted":
          return "bg-primary";

        default:
          return "bg-primary";
      }
    };


  /* =========================================================
     REVIEW BADGE COLORS
  ========================================================= */

  const getReviewBadgeClass =
    (
      review
    ) => {

      switch (
        review
      ) {

        case "Valid":
          return "bg-success";

        case "Duplicate":
          return "bg-primary";

        case "Insufficient Evidence":
          return "bg-warning text-dark";

        case "Confirmed False":
          return "bg-danger";

        case "Under Review":
          return "bg-warning text-dark";

        case "Not reviewed":
          return "bg-secondary";

        default:
          return "bg-secondary";
      }
    };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {

    return (
      <p>
        Loading complaint...
      </p>
    );
  }


  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!complaint) {

    return (
      <div className="alert alert-danger">
        {error ||
          "Complaint not found."}
      </div>
    );
  }


  /* =========================================================
     STATUS LOGIC
  ========================================================= */

  const activeWorkOrder =
    isActiveWorkOrderStatus(
      complaint.status
    );

  const complaintReopened =
    complaint.status ===
    "Reopened";

  const finalDecision =
    getFinalDecision(
      complaint
    );

  const reviewDecision =
    getReviewDecisionLabel(
      complaint
    );

  /*
   * Final Decision Note appears
   * for BOTH normal and manager concern.
   */

  const finalDecisionNote =
    getFinalDecisionNote(
      complaint
    );


  /* =========================================================
     FINAL DECISION LOCK
  ========================================================= */

  const reopenReviewPending =
    Boolean(
      complaint.reopenReview
        ?.requested
    );

  /*
   * The current reopen cycle has already been approved
   * by the System Administrator (complaint.status is
   * "Reopened" and the pending flag has been cleared).
   *
   * Once this is true, approving the reopening already
   * carries the same weight as the original "Valid"
   * click, so the admin does not need (and cannot) press
   * Valid again. Every other final decision button, Set
   * Note, and the rest of the workflow (assign authorized
   * alternative for manager-concern complaints, etc.)
   * continue to work exactly as before.
   */

  const reopenApproved =
    complaint.status ===
      "Reopened" &&
    !reopenReviewPending &&
    complaint.reopenReview
      ?.decision === "approved";

  const finalDecisionLocked =
    activeWorkOrder ||
    isClosed ||
    reopenReviewPending;

  /*
   * Only the Valid button is locked once a reopening has
   * been approved (approving already counts as Valid).
   * The other final decision buttons stay governed by the
   * regular `finalDecisionLocked` rule.
   */

  const isFinalDecisionButtonLocked = (
    decision
  ) =>
    finalDecisionLocked ||
    (decision === "Valid" &&
      reopenApproved);

  /*
   * Lock for the Set Note control specifically. It
   * behaves the same as before and stays usable after an
   * approved reopening.
   */

  const noteLocked =
    activeWorkOrder ||
    isClosed ||
    reopenReviewPending;


  /* =========================================================
     AUTHORIZED ALTERNATIVE

     IMPORTANT:

     Only Valid allows assignment.
  ========================================================= */

  const canAssignAlternative =
    concernsManager &&
    finalDecision === "Valid" &&
    !activeWorkOrder &&
    !isClosed;


  /* =========================================================
     SITE INSPECTION
  ========================================================= */

  const canRequestInspection =
    !isClosed;


  /* =========================================================
     WORK ORDER BUTTONS
  ========================================================= */

  const canMarkInProgress =
    !isClosed &&
    concernsManager &&
    finalDecision === "Valid" &&
    complaint.status ===
      "Assigned" &&
    Boolean(
      complaint
        .alternativeHandler
        ?.name
    );


  const canMarkRepairCompleted =
    !isClosed &&
    concernsManager &&
    finalDecision === "Valid" &&
    complaint.status ===
      "In Progress" &&
    Boolean(
      complaint
        .alternativeHandler
        ?.name
    );


  return (

    <div className="row">

      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="col-md-8">

        <h3 className="mb-3">
          Complaint Integrity Review
        </h3>


        {/* ERROR */}

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}


        {/* CLOSED NOTICE */}

        {isClosed && (

          <div className="alert alert-secondary">

            <strong>
              Complaint Closed
            </strong>

            <br />

            This complaint has been closed.
            All review, assignment,
            inspection, communication,
            and work-order actions
            are blocked.

          </div>
        )}


        {/* REOPENED NOTICE */}

        {complaintReopened && (

          <div className="alert alert-warning">

            <strong>
              Complaint Reopened
            </strong>

            <br />

            The resident reopened this
            complaint because the issue
            was not fully resolved.
            {complaint.reopenReview
              ?.requested
              ? " It is pending your review."
              : " You have already reviewed this reopening."}

          </div>
        )}


        {/* REOPEN REVIEW - PENDING ADMIN DECISION */}

        {complaint.reopenReview
          ?.requested && (

          <div className="card mb-3 border-warning">

            <div className="card-body">

              <h5 className="card-title">
                Review Reopening
              </h5>

              <p className="text-muted">
                Resident's reason for
                reopening:{" "}
                {complaint.reopenReview
                  .reason ||
                  "No reason provided."}
              </p>

              {decisionNote.trim() && (

                <div className="mb-3">

                  <strong className="d-block mb-1">
                    Note that will be
                    shown to the resident:
                  </strong>

                  <div className="border rounded p-2 bg-light small">
                    {decisionNote}
                  </div>

                </div>

              )}

              <button
                type="button"
                className="btn btn-success me-2"
                onClick={() =>
                  handleReopenReview(
                    "approved"
                  )
                }
              >
                Approve Reopening
              </button>

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={() =>
                  handleReopenReview(
                    "rejected"
                  )
                }
              >
                Reject Reopening
              </button>

            </div>

          </div>
        )}


        {/* ===============================================
            COMPLAINT INFORMATION
        =============================================== */}

        <div className="card mb-3">

          <div className="card-body">

            <h5>
              #{complaint.ticketNumber}
            </h5>


            {/* STATUS */}

            <p>

              <strong>
                Status:
              </strong>{" "}

              <span
                className={`badge ${getStatusBadgeClass(
                  complaint.status
                )}`}
                style={{
                  padding:
                    "7px 12px",
                  borderRadius:
                    "20px",
                }}
              >
                {complaint.status}
              </span>

            </p>


            {/* REVIEW DECISION */}

            <p>

              <strong>
                Review Decision:
              </strong>{" "}

              <span
                className={`badge ${getReviewBadgeClass(
                  reviewDecision
                )}`}
                style={{
                  padding:
                    "7px 12px",
                  borderRadius:
                    "20px",
                }}
              >
                {reviewDecision}
              </span>

            </p>


            {/* =========================================
                FINAL DECISION NOTE
            ========================================= */}

            {finalDecisionNote && (

              <div className="mb-3">

                <strong>
                  Final Decision Note:
                </strong>

                <div
                  className="border rounded p-3 mt-2 bg-light"
                >
                  {finalDecisionNote}
                </div>

              </div>

            )}


            {/* LOCATION */}

            <p>

              <strong>
                Location:
              </strong>{" "}

              {complaint.location}

            </p>


            {/* CATEGORY */}

            <p>

              <strong>
                Category:
              </strong>{" "}

              {complaint.category}

            </p>


            {/* URGENCY */}

            <p>

              <strong>
                Urgency:
              </strong>{" "}

              {complaint.urgency}

            </p>


            {/* DESCRIPTION */}

            <p>

              <strong>
                Description:
              </strong>

            </p>

            <div className="border rounded p-3">

              {complaint.description}

            </div>

          </div>
        </div>


        {/* ===============================================
            EVIDENCE
        =============================================== */}

        <div className="card mb-3">

          <div className="card-header">
            Evidence
          </div>

          <div className="card-body">

            {complaint.evidence?.length ? (

              <div className="row">

                {complaint.evidence.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      key={
                        item.public_id ||
                        index
                      }
                      className="col-md-6 mb-3"
                    >

                      {item.type ===
                      "video" ? (

                        <video
                          src={
                            item.url
                          }
                          controls
                          className="w-100 rounded"
                        />

                      ) : (

                        <img
                          src={
                            item.url
                          }
                          alt="Complaint evidence"
                          className="img-fluid rounded"
                        />

                      )}

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="text-muted mb-0">
                No evidence uploaded.
              </p>

            )}

          </div>
        </div>


        {/* ===============================================
            COMPLETION EVIDENCE
        =============================================== */}

        {complaint.completionEvidence
          ?.length > 0 && (

          <div className="card mb-3">

            <div className="card-header">
              Repair Completion Evidence
            </div>

            <div className="card-body">

              <div className="row">

                {complaint.completionEvidence.map(
                  (
                    item,
                    index
                  ) => (

                    <div
                      key={
                        item.public_id ||
                        index
                      }
                      className="col-md-6 mb-3"
                    >

                      {item.type ===
                      "video" ? (

                        <video
                          src={
                            item.url
                          }
                          controls
                          className="w-100 rounded"
                        />

                      ) : (

                        <img
                          src={
                            item.url
                          }
                          alt="Repair completion evidence"
                          className="img-fluid rounded"
                        />

                      )}

                    </div>

                  )
                )}

              </div>

            </div>
          </div>
        )}


        {/* ===============================================
            CONFIDENTIAL RESIDENT FOLLOW-UP
        =============================================== */}

        {complaint.additionalNotes
          ?.length > 0 && (

          <div className="card mb-3">

            <div className="card-header">
              Confidential Resident Follow-Up
            </div>

            <div className="card-body">

              {complaint.additionalNotes.map(
                (
                  item
                ) => (

                  <div
                    key={
                      item._id
                    }
                    className="border rounded p-3 mb-2"
                  >

                    <p className="mb-1">
                      {item.note}
                    </p>

                    <small className="text-muted">
                      {item.addedAt
                        ? new Date(
                            item.addedAt
                          ).toLocaleString()
                        : ""}
                    </small>

                  </div>

                )
              )}

            </div>
          </div>
        )}


        {/* ===============================================
            CONFIDENTIAL COMMUNICATION
        =============================================== */}

        <div className="card mb-3 border-primary">

          <div className="card-body">

            <h5>
              Confidential Admin ↔ Resident
              Communication
            </h5>

            <p className="text-muted">

              The resident communicates with
              the administrator using the
              private token. The Mess Manager
              has no access to this
              communication.

            </p>


            {isClosed ? (

              <div className="alert alert-secondary mb-0">

                This complaint is closed.
                Confidential communication is
                no longer available.

              </div>

            ) : complaint.status ===
              "Confirmed False" ? (

              <div className="alert alert-danger mb-0">

                This complaint was confirmed
                as false. No further questions
                can be sent.

              </div>

            ) : (

              <form
                onSubmit={
                  handleQuestion
                }
              >

                <textarea
                  className="form-control mb-2"
                  rows={3}
                  placeholder="Ask the resident a confidential review question..."
                  value={
                    question
                  }
                  onChange={(e) =>
                    setQuestion(
                      e.target.value
                    )
                  }
                  disabled={
                    isClosed
                  }
                />

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={
                    isClosed
                  }
                >
                  Send Confidential Question
                </button>

              </form>

            )}


            {complaint.reviewQuestions
              ?.length > 0 && (

              <div className="mt-4">

                <h6>
                  Questions and Answers
                </h6>

                {complaint.reviewQuestions.map(
                  (
                    item
                  ) => (

                    <div
                      key={
                        item._id
                      }
                      className="border rounded p-3 mb-2"
                    >

                      <strong>
                        Question:
                      </strong>{" "}

                      {item.question}


                      <div className="mt-2">

                        <strong>
                          Answer:
                        </strong>{" "}

                        {item.answer ? (

                          item.answer

                        ) : (

                          <span className="text-muted">
                            Waiting for resident
                            response.
                          </span>

                        )}

                      </div>

                    </div>

                  )
                )}

              </div>
            )}

          </div>
        </div>


        {/* ===============================================
            COMPLAINT TIMELINE
        =============================================== */}

        <ComplaintTimeline
          complaint={
            complaint
          }
        />

      </div>


      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="col-md-4">


        {/* ===============================================
            FINAL DECISION
        =============================================== */}

        <div className="card mb-3 border-primary">

          <div className="card-body">

            <h6>
              Final Review Decision
            </h6>

            <p className="text-muted small">

              Select the final decision for
              this complaint.

            </p>


            {finalDecision && (

              <div className="alert alert-light border">

                <strong>
                  Current Decision:
                </strong>{" "}

                {finalDecision}

              </div>

            )}


            {/* DECISION NOTE INPUT */}

            <div className="mb-3">

              <label className="form-label">

                Decision Note

              </label>

              <textarea
                className="form-control"
                rows={3}
                placeholder="Enter a note for the final decision..."
                value={
                  decisionNote
                }
                onChange={(e) =>
                  setDecisionNote(
                    e.target.value
                  )
                }
                disabled={
                  noteLocked
                }
              />

            </div>


            {/* SET NOTE */}

            <button
              type="button"
              className="btn btn-outline-secondary w-100 mb-3"
              onClick={
                handleSetNote
              }
              disabled={
                noteLocked
              }
            >
              Set Note
            </button>


            {/* FINAL DECISION BUTTONS */}

            <div className="d-grid gap-2">

              {FINAL_DECISIONS.map(
                (
                  decision
                ) => (

                  <button
                    key={
                      decision
                    }
                    type="button"
                    className={`btn ${getDecisionButtonClass(
                      decision
                    )}`}
                    disabled={isFinalDecisionButtonLocked(
                      decision
                    )}
                    onClick={() =>
                      handleDecision(
                        decision
                      )
                    }
                  >
                    {decision}
                  </button>

                )
              )}

            </div>


            {isClosed && (

              <div className="alert alert-secondary mt-3 mb-0">

                This complaint is closed.
                Final decision buttons are
                disabled.

              </div>

            )}


            {!isClosed &&
              reopenApproved && (

              <div className="alert alert-warning mt-3 mb-0">

                This complaint's reopening was
                already approved, which counts
                as the Valid decision. The
                <strong> Valid </strong>
                button is locked, but Insufficient
                Evidence, Duplicate, Confirmed
                False, and Set Note still work.

              </div>

            )}


            {activeWorkOrder &&
              !isClosed && (

              <div className="alert alert-warning mt-3 mb-0">

                Final decisions are locked
                while an active repair cycle
                is running.

              </div>

            )}

          </div>
        </div>


        {/* ===============================================
            MANAGER ROUTING
        =============================================== */}

        <div className="card mb-3">

          <div className="card-body">

            <h6>
              Manager Routing
            </h6>

            {concernsManager ? (

              <div className="alert alert-warning mb-0">

                <strong>
                  Complaint Concerns Mess Manager
                </strong>

                <br />

                This complaint cannot be handled
                by the Mess Manager.

                <br />

                The complaint must first be
                marked <strong>Valid</strong>
                before an authorized alternative
                can be assigned.

              </div>

            ) : (

              <div className="text-muted small">

                This complaint does not concern
                the Mess Manager.

              </div>

            )}

          </div>
        </div>


        {/* ===============================================
            AUTHORIZED ALTERNATIVE
        =============================================== */}

        {concernsManager && (

          <div className="card mb-3">

            <div className="card-body">

              <h6>
                Authorized Alternative
              </h6>


              {/* CLOSED */}

              {isClosed ? (

                <div className="alert alert-secondary mb-0">

                  This complaint is closed.
                  An authorized alternative
                  cannot be assigned.

                </div>

              ) : finalDecision !==
                "Valid" ? (

                <div className="alert alert-warning mb-0">

                  <strong>
                    Valid decision required
                  </strong>

                  <br />

                  The administrator must select
                  <strong> Valid </strong>
                  before an authorized alternative
                  can be assigned.

                </div>

              ) : complaint.alternativeHandler
                ?.name &&
                !reopenApproved ? (

                <div className="alert alert-info mb-0">

                  <strong>
                    Currently Assigned
                  </strong>

                  <br />

                  Name:{" "}

                  {
                    complaint
                      .alternativeHandler
                      .name
                  }

                  {complaint
                    .alternativeHandler
                    .authority && (
                    <>
                      <br />

                      Authority:{" "}

                      {
                        complaint
                          .alternativeHandler
                          .authority
                      }
                    </>
                  )}

                  {complaint
                    .alternativeHandler
                    .contact && (
                    <>
                      <br />

                      Contact:{" "}

                      {
                        complaint
                          .alternativeHandler
                          .contact
                      }
                    </>
                  )}

                  <br />

                  <strong>
                    Status:
                  </strong>{" "}

                  {complaint.status}

                </div>

              ) : (

                <form
                  onSubmit={
                    handleAssignAlternativeHandler
                  }
                >

                  <p className="text-muted small">

                    {reopenApproved
                      ? "The resident reopened this complaint and the reopening has been approved. You may assign an authorized alternative again, same as when the complaint was first marked Valid."
                      : "The complaint has been marked Valid. You may now assign an authorized alternative."}

                  </p>


                  <div className="mb-2">

                    <label className="form-label">

                      Authorized Alternative Name

                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ayesha Rahman"
                      value={
                        handlerName
                      }
                      onChange={(e) =>
                        setHandlerName(
                          e.target.value
                        )
                      }
                      disabled={
                        isClosed
                      }
                    />

                  </div>


                  <div className="mb-2">

                    <label className="form-label">

                      Authority

                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Maintenance Authority"
                      value={
                        handlerAuthority
                      }
                      onChange={(e) =>
                        setHandlerAuthority(
                          e.target.value
                        )
                      }
                      disabled={
                        isClosed
                      }
                    />

                  </div>


                  <div className="mb-3">

                    <label className="form-label">

                      Contact

                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Phone or email"
                      value={
                        handlerContact
                      }
                      onChange={(e) =>
                        setHandlerContact(
                          e.target.value
                        )
                      }
                      disabled={
                        isClosed
                      }
                    />

                  </div>


                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={
                      !canAssignAlternative
                    }
                  >
                    Assign Authorized Alternative
                  </button>

                </form>

              )}

            </div>
          </div>
        )}


        {/* ===============================================
            WORK ORDER
        =============================================== */}

        {concernsManager &&
          finalDecision === "Valid" && (

          <div className="card mb-3 border-warning">

            <div className="card-body">

              <h6>
                Authorized Alternative -
                Work Order
              </h6>

              <p className="text-muted small">

                The System Administrator manages
                the repair process directly.

              </p>


              {/* CLOSED */}

              {isClosed && (

                <div className="alert alert-secondary mb-0">

                  <strong>
                    Complaint Closed
                  </strong>

                  <br />

                  All work-order actions are blocked.

                </div>

              )}


              {/* ASSIGNED */}

              {!isClosed &&
                complaint.status ===
                  "Assigned" && (

                <>

                  <div className="alert alert-primary py-2">

                    <strong>
                      Assigned
                    </strong>

                    <br />

                    The authorized alternative
                    has been assigned.

                  </div>


                  <button
                    type="button"
                    className="btn btn-warning w-100"
                    disabled={
                      !canMarkInProgress
                    }
                    onClick={() =>
                      handleAlternativeStatus(
                        "In Progress"
                      )
                    }
                  >
                    Mark In Progress
                  </button>

                </>
              )}


              {/* IN PROGRESS */}

              {!isClosed &&
                complaint.status ===
                  "In Progress" && (

                <>

                  <div className="alert alert-info py-2">

                    <strong>
                      Repair In Progress
                    </strong>

                    <br />

                    The authorized alternative
                    is currently working on
                    this complaint.

                  </div>


                  <form
                    onSubmit={
                      handleAlternativeEvidence
                    }
                    className="mb-2"
                  >

                    <label className="form-label">

                      Completion Evidence

                    </label>


                    <input
                      type="file"
                      multiple
                      className="form-control mb-2"
                      onChange={(e) =>
                        setAltEvidenceFiles(
                          Array.from(
                            e.target.files
                          )
                        )
                      }
                    />


                    <button
                      type="submit"
                      className="btn btn-outline-secondary w-100"
                      disabled={
                        isClosed
                      }
                    >
                      Upload Completion Evidence
                    </button>

                  </form>


                  <button
                    type="button"
                    className="btn btn-warning w-100"
                    disabled={
                      !canMarkRepairCompleted
                    }
                    onClick={() =>
                      handleAlternativeStatus(
                        "Repair Completed"
                      )
                    }
                  >
                    Mark Repair Completed
                  </button>

                </>
              )}


              {/* REPAIR COMPLETED */}

              {!isClosed &&
                complaint.status ===
                  "Repair Completed" && (

                <div className="alert alert-success mb-0">

                  <strong>
                    Repair Completed
                  </strong>

                  <br />

                  The authorized alternative
                  has completed the repair.

                  <br />

                  Completion evidence has
                  been uploaded.

                </div>
              )}


              {/* REOPENED */}

              {!isClosed &&
                complaint.status ===
                  "Reopened" && (

                <div className="alert alert-warning mb-0">

                  <strong>
                    Complaint Reopened
                  </strong>

                  <br />

                  The previous repair cycle was
                  reopened by the resident.

                </div>
              )}

            </div>
          </div>
        )}


        {/* ===============================================
            SITE INSPECTION
        =============================================== */}

        <div
          className={`card ${
            complaint.inspectionRequest
              ?.requested
              ? "border-primary"
              : ""
          }`}
        >

          <div className="card-body">

            <div className="d-flex justify-content-between align-items-center mb-2">

              <h6 className="mb-0">
                Discreet Site Inspection
              </h6>


              {complaint
                .inspectionRequest
                ?.requested && (

                <span className="badge bg-primary">
                  Requested
                </span>

              )}

            </div>


            <p className="text-muted small">

              Request an independent site
              inspection without exposing the
              resident identity.

            </p>


            {isClosed ? (

              <div className="alert alert-secondary mb-0">

                This complaint is closed.
                Site inspection can no longer
                be requested.

              </div>

            ) : complaint
              .inspectionRequest
              ?.requested ? (

              <>

                {complaint
                  .inspectionRequest
                  ?.note && (

                  <p className="mb-1">

                    <strong>
                      Note:
                    </strong>{" "}

                    {
                      complaint
                        .inspectionRequest
                        .note
                    }

                  </p>
                )}


                {complaint
                  .inspectionRequest
                  ?.requestedAt && (

                  <p className="text-muted small mb-2">

                    Requested on{" "}

                    {new Date(
                      complaint
                        .inspectionRequest
                        .requestedAt
                    ).toLocaleString()}

                  </p>

                )}


                {complaint
                  .inspectionRequest
                  ?.accepted ? (

                  <div className="alert alert-success py-2 mb-0">

                    Resident accepted the
                    site inspection.

                  </div>

                ) : (

                  <div className="alert alert-warning py-2 mb-0">

                    Waiting for the resident
                    to accept the site
                    inspection.

                  </div>

                )}

              </>

            ) : canRequestInspection ? (

              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={
                  handleInspection
                }
                disabled={
                  isClosed
                }
              >
                Request Site Inspection
              </button>

            ) : (

              <div className="alert alert-secondary mb-0">

                This complaint is closed.

              </div>

            )}

          </div>
        </div>

      </div>
    </div>
  );
}


export default AdminComplaintReview;