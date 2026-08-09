import axios from "axios";

const API = "http://localhost:5000/api/waitlist";

// ===========================================================
// AUTH TOKEN
// ===========================================================

const getToken = () => {
    return localStorage.getItem("token");
};


// ===========================================================
// AUTH CONFIG
// ===========================================================

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${getToken()}`,
    },
});


// ===========================================================
// STUDENT - GET MY WAITLIST
// ===========================================================

export const getWaitlist = async () => {

    const res = await axios.get(
        API,
        authConfig()
    );

    return res.data;
};


// ===========================================================
// STUDENT - GET MY WAITLIST NOTIFICATIONS
// ===========================================================

export const getNotifications = async () => {

    const res = await axios.get(
        `${API}/notifications`,
        authConfig()
    );

    return res.data;
};


// ===========================================================
// STUDENT - JOIN WAITLIST
// ===========================================================
//
// data:
//
// {
//     roomId,
//     bedNumber
// }
//
// Student can join when the bed is:
//     occupied
//     OR
//     onHold
//
// ===========================================================

export const requestWaitlist = async (data) => {

    const res = await axios.post(
        API,
        data,
        authConfig()
    );

    return res.data;
};


// ===========================================================
// STUDENT - REQUEST BED WHEN IT IS THEIR TURN
// ===========================================================
//
// id = Waitlist entry ID
//
// ONLY the currently "matched" student can call this.
//
// Flow:
//
// matched
//    ↓
// claimMatchedBed()
//    ↓
// bed becomes onHold
//    ↓
// reservation becomes pending
//    ↓
// manager approves/rejects
//
// NOTE: server registers this as
//     router.patch("/:id/claim", protect, claimMatchedBed)
// so this MUST be a PATCH request, not POST — a mismatched
// verb here returns a 404 with no JSON body, which surfaces
// on the frontend as the generic fallback alert instead of
// any real server message.
// ===========================================================

export const claimMatchedBed = async (id) => {

    const res = await axios.patch(
        `${API}/${encodeURIComponent(id)}/claim`,
        {},
        authConfig()
    );

    return res.data;
};


// ===========================================================
// STUDENT - LEAVE WAITLIST
// ===========================================================
//
// If status = waiting:
//     simply leaves the queue.
//
// If status = matched:
//     current priority is cancelled
//     next student gets priority.
//
// ===========================================================

export const cancelWaitlist = async (id) => {

    const res = await axios.patch(
        `${API}/${encodeURIComponent(id)}/cancel`,
        {},
        authConfig()
    );

    return res.data;
};


// ===========================================================
// MANAGER - GET WAITLIST FOR ROOM
// ===========================================================
//
// Returns:
//     waiting
//     matched
//     allocated
//
// Sorted by original waitlist creation order.
//
// ===========================================================

export const getMatchingStudents = async (roomId) => {

    const res = await axios.get(
        `${API}/match/${encodeURIComponent(roomId)}`,
        authConfig()
    );

    return res.data;
};
