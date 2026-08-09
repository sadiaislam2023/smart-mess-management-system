import axios from "axios";

const API = `${
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000"
}/api/waitlist`;
// ===========================================================
// AUTH TOKEN
// ===========================================================

const getToken = () => {
    return localStorage.getItem("token");
};


// ===========================================================
// AUTH HEADERS
// ===========================================================

const authHeaders = () => ({
    headers: {
        Authorization: `Bearer ${getToken()}`,
    },
});


// ===========================================================
// STUDENT - REQUEST RESERVATION
// ===========================================================
//
// Used when a bed is directly available.
//
// Example:
//
// {
//     roomId,
//     bedNumber
// }
//
// If the bed is occupied/onHold, the backend may put the
// student on the waitlist depending on your reservation
// controller logic.
// ===========================================================

export const requestReservation = async (data) => {

    const res = await axios.post(
        API,
        data,
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// STUDENT - MY RESERVATIONS
// ===========================================================

export const getMyReservations = async () => {

    const res = await axios.get(
        `${API}/my`,
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// STUDENT - CANCEL RESERVATION
// ===========================================================

export const cancelReservation = async (id) => {

    const res = await axios.patch(
        `${API}/${id}/cancel`,
        {},
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// MANAGER - PENDING RESERVATIONS
// ===========================================================

export const getPendingReservations = async () => {

    const res = await axios.get(
        `${API}/pending`,
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// MANAGER - APPROVE RESERVATION
// ===========================================================

export const approveReservation = async (id) => {

    const res = await axios.patch(
        `${API}/${id}/approve`,
        {},
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// MANAGER - REJECT RESERVATION
// ===========================================================
//
// reason is required by backend.
//
// Example:
//
// rejectReservation(id, "Documents are incomplete")
// ===========================================================

export const rejectReservation = async (
    id,
    reason
) => {

    const res = await axios.patch(
        `${API}/${id}/reject`,
        {
            reason,
        },
        authHeaders()
    );

    return res.data;
};


// ===========================================================
// STUDENT - RESERVATION STATUS
// ===========================================================
//
// roomId = Room ObjectId
//
// Returns:
//
// {
//     status: "pending"
// }
//
// OR
//
// {
//     status: "approved"
// }
//
// OR
//
// {
//     status: null
// }
// ===========================================================

export const getReservationStatus = async (
    roomId
) => {

    const res = await axios.get(
        `${API}/status/${roomId}`,
        authHeaders()
    );

    return res.data;
};