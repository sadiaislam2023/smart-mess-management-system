import { useEffect, useState } from "react";

import {
    getWaitlist,
    claimMatchedBed,
    cancelWaitlist,
} from "../services/waitlistService";

function Waitlist() {
    const [waitlist, setWaitlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState(null);
    const [currentTime, setCurrentTime] = useState(
        Date.now()
    );

    // =======================================================
    // LOAD WAITLIST
    // =======================================================

    const loadWaitlist = async (
        showLoading = false
    ) => {
        try {
            if (showLoading) {
                setLoading(true);
            }

            const data =
                await getWaitlist();

            setWaitlist(
                data.waitlist || []
            );

        } catch (error) {
            console.error(
                "Failed to load waitlist:",
                error
            );

            if (showLoading) {
                alert(
                    error.response?.data?.message ||
                    "Failed to load waitlist."
                );
            }

        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    };

    // =======================================================
    // INITIAL LOAD + AUTO REFRESH
    // =======================================================

    useEffect(() => {
        loadWaitlist(true);

        const refreshInterval =
            setInterval(() => {
                loadWaitlist(false);
            }, 5000);

        return () => {
            clearInterval(
                refreshInterval
            );
        };
    }, []);

    // =======================================================
    // LIVE CLOCK
    // =======================================================

    useEffect(() => {
        const timer =
            setInterval(() => {
                setCurrentTime(
                    Date.now()
                );
            }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    // =======================================================
    // GET POSITION
    // =======================================================

    const getPosition = (item) => {
        if (
            item.position !== null &&
            item.position !== undefined
        ) {
            return item.position;
        }

        return null;
    };

    // =======================================================
    // ONLY MATCHED STUDENT CAN REQUEST
    // =======================================================

    const canRequest = (item) => {
        return item.status === "matched";
    };

    // =======================================================
    // CLAIM BED
    // =======================================================

    const handleClaim = async (item) => {
        if (!canRequest(item)) {
            return;
        }

        setActingId(
            item._id
        );

        try {
            const res =
                await claimMatchedBed(
                    item._id
                );

            alert(
                res.message ||
                "Reservation request sent to manager."
            );

            await loadWaitlist(false);

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "You cannot request this bed yet."
            );

            await loadWaitlist(false);

        } finally {
            setActingId(null);
        }
    };

    // =======================================================
    // LEAVE WAITLIST
    // =======================================================

    const handleLeave = async (id) => {
        const confirmLeave =
            window.confirm(
                "Are you sure you want to leave this waitlist?"
            );

        if (!confirmLeave) {
            return;
        }

        setActingId(id);

        try {
            const res =
                await cancelWaitlist(id);

            alert(
                res.message ||
                "You have left the waitlist."
            );

            await loadWaitlist(false);

        } catch (error) {
            alert(
                error.response?.data?.message ||
                "Failed to leave waitlist."
            );

            await loadWaitlist(false);

        } finally {
            setActingId(null);
        }
    };

    // =======================================================
    // FORMAT DATE
    // =======================================================

    const formatJoinedDateTime = (
        createdAt
    ) => {
        if (!createdAt) {
            return "-";
        }

        const date =
            new Date(createdAt);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "-";
        }

        return date.toLocaleString(
            "en-BD",
            {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            }
        );
    };

    // =======================================================
    // COUNTDOWN
    // =======================================================

    const getRemainingTime = (
        matchedUntil
    ) => {
        if (!matchedUntil) {
            return null;
        }

        const difference =
            new Date(
                matchedUntil
            ).getTime() -
            currentTime;

        if (difference <= 0) {
            return "Expired";
        }

        const hours =
            Math.floor(
                difference /
                (1000 * 60 * 60)
            );

        const minutes =
            Math.floor(
                (
                    difference %
                    (1000 * 60 * 60)
                ) /
                (1000 * 60)
            );

        const seconds =
            Math.floor(
                (
                    difference %
                    (1000 * 60)
                ) /
                1000
            );

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    // =======================================================
    // STATUS BADGE
    // =======================================================

    const getStatusClass = (
        status
    ) => {
        switch (status) {
            case "matched":
                return "bg-success";

            case "allocated":
                return "bg-primary";

            case "waiting":
                return "bg-warning text-dark";

            case "expired":
                return "bg-secondary";

            case "cancelled":
                return "bg-danger";

            default:
                return "bg-secondary";
        }
    };

    // =======================================================
    // PRIORITY TEXT
    // =======================================================

    const getPriorityText = (
        item
    ) => {

        // ---------------------------------------------------
        // MATCHED
        // ---------------------------------------------------

        if (
            item.status === "matched"
        ) {
            const remaining =
                getRemainingTime(
                    item.matchedUntil
                );

            if (
                remaining === "Expired"
            ) {
                return (
                    <span className="text-danger fw-bold">
                        Priority expired
                    </span>
                );
            }

            return (
                <div>
                    <div className="text-success fw-bold">
                        Your turn
                    </div>

                    <small className="text-muted">
                        {remaining} remaining
                    </small>
                </div>
            );
        }

        // ---------------------------------------------------
        // WAITING
        // ---------------------------------------------------

        if (
            item.status === "waiting"
        ) {
            const position =
                getPosition(item);

            if (position) {
                return (
                    <span className="text-warning fw-semibold">
                        Waiting — Rank #{position}
                    </span>
                );
            }

            return (
                <span className="text-muted">
                    Waiting for turn
                </span>
            );
        }

        // ---------------------------------------------------
        // ALLOCATED
        // ---------------------------------------------------

        if (
            item.status === "allocated"
        ) {
            return (
                <span className="text-primary fw-semibold">
                    Request sent to manager
                </span>
            );
        }

        // ---------------------------------------------------
        // EXPIRED
        // ---------------------------------------------------

        if (
            item.status === "expired"
        ) {
            return (
                <span className="text-muted">
                    Priority expired
                </span>
            );
        }

        // ---------------------------------------------------
        // CANCELLED
        // ---------------------------------------------------

        if (
            item.status === "cancelled"
        ) {
            return (
                <span className="text-muted">
                    Waitlist cancelled
                </span>
            );
        }

        return (
            <span className="text-muted">
                -
            </span>
        );
    };

    // =======================================================
    // ACTION
    // =======================================================

    const renderAction = (
        item
    ) => {

        const isActing =
            actingId === item._id;

        // ---------------------------------------------------
        // MATCHED
        // ---------------------------------------------------

        if (
            item.status === "matched"
        ) {

            const remaining =
                getRemainingTime(
                    item.matchedUntil
                );

            const expired =
                remaining === "Expired";

            return (
                <>
                    <button
                        type="button"
                        className="btn btn-success btn-sm me-2"
                        disabled={
                            isActing ||
                            expired
                        }
                        onClick={() =>
                            handleClaim(item)
                        }
                    >
                        {isActing
                            ? "Sending..."
                            : "Request This Bed"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={
                            isActing
                        }
                        onClick={() =>
                            handleLeave(
                                item._id
                            )
                        }
                    >
                        {isActing
                            ? "Please wait..."
                            : "Leave"}
                    </button>
                </>
            );
        }

        // ---------------------------------------------------
        // WAITING
        // ---------------------------------------------------

        if (
            item.status === "waiting"
        ) {

            const position =
                getPosition(item);

            return (
                <>
                    <span className="text-muted me-2">
                        {position
                            ? `Waiting for Rank #${position}`
                            : "Waiting for your turn"}
                    </span>

                    <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        disabled={
                            isActing
                        }
                        onClick={() =>
                            handleLeave(
                                item._id
                            )
                        }
                    >
                        {isActing
                            ? "Please wait..."
                            : "Leave"}
                    </button>
                </>
            );
        }

        // ---------------------------------------------------
        // ALLOCATED
        // ---------------------------------------------------

        if (
            item.status === "allocated"
        ) {
            return (
                <span className="text-primary fw-bold">
                    Request sent to manager
                </span>
            );
        }

        // ---------------------------------------------------
        // EXPIRED
        // ---------------------------------------------------

        if (
            item.status === "expired"
        ) {
            return (
                <span className="text-muted">
                    Priority expired
                </span>
            );
        }

        // ---------------------------------------------------
        // CANCELLED
        // ---------------------------------------------------

        if (
            item.status === "cancelled"
        ) {
            return (
                <span className="text-muted">
                    Waitlist cancelled
                </span>
            );
        }

        return null;
    };

    // =======================================================
    // LOADING
    // =======================================================

    if (loading) {
        return (
            <div className="container mt-4 text-center">

                <div
                    className="spinner-border"
                    role="status"
                />

                <p className="mt-2">
                    Loading waitlist...
                </p>

            </div>
        );
    }

    // =======================================================
    // RENDER
    // =======================================================

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="mb-1">
                        My Waitlist
                    </h2>

                    <p className="text-muted mb-0">
                        Your rank determines when
                        you can request the bed.
                    </p>
                </div>

            </div>

            {waitlist.length === 0 ? (

                <div className="alert alert-info">
                    You are not on any waitlist.
                </div>

            ) : (

                <div className="table-responsive">

                    <table className="table table-bordered table-hover align-middle">

                        <thead className="table-dark">

                            <tr>
                                <th>Rank</th>
                                <th>Room</th>
                                <th>Bed</th>
                                <th>Budget</th>
                                <th>Joined Date & Time</th>
                                <th>Status</th>
                                <th>Priority Time</th>
                                <th>Notification</th>
                                <th>Action</th>
                            </tr>

                        </thead>

                        <tbody>

                            {waitlist.map(
                                (item) => {

                                    const position =
                                        getPosition(
                                            item
                                        );

                                    return (
                                        <tr
                                            key={
                                                item._id
                                            }
                                        >

                                            {/* RANK */}

                                            <td>

                                                {position ? (

                                                    <span
                                                        className={
                                                            item.status ===
                                                            "matched"
                                                                ? "badge bg-success"
                                                                : "badge bg-dark"
                                                        }
                                                    >
                                                        #{position}
                                                    </span>

                                                ) : (

                                                    <span className="text-muted">
                                                        -
                                                    </span>

                                                )}

                                            </td>

                                            {/* ROOM */}

                                            <td>
                                                {item.room?.roomNumber ||
                                                    "Any"}
                                            </td>

                                            {/* BED */}

                                            <td>
                                                {item.bedNumber}
                                            </td>

                                            {/* BUDGET */}

                                            <td>
                                                ৳
                                                {item.budget ??
                                                    "-"}
                                            </td>

                                            {/* JOINED */}

                                            <td>
                                                <span className="fw-semibold">
                                                    {formatJoinedDateTime(
                                                        item.createdAt
                                                    )}
                                                </span>
                                            </td>

                                            {/* STATUS */}

                                            <td>

                                                <span
                                                    className={`badge ${getStatusClass(
                                                        item.status
                                                    )}`}
                                                >
                                                    {item.status}
                                                </span>

                                            </td>

                                            {/* PRIORITY */}

                                            <td>
                                                {getPriorityText(
                                                    item
                                                )}
                                            </td>

                                            {/* NOTIFICATION */}

                                            <td>

                                                {item.notified ? (

                                                    <span className="text-success">

                                                        🔔{" "}

                                                        {item.notificationMessage ||
                                                            "Bed is now available."}

                                                    </span>

                                                ) : (

                                                    <span className="text-muted">
                                                        No notification yet
                                                    </span>

                                                )}

                                            </td>

                                            {/* ACTION */}

                                            <td>
                                                {renderAction(
                                                    item
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

export default Waitlist;