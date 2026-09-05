import API from "./api";

/* =========================
   GET ALL USERS
========================= */

export const getAllUsers = async () => {
  const res = await API.get("/admin/users");

  return res.data;
};

/* =========================
   GET PENDING MANAGERS
========================= */

export const getPendingManagers = async () => {
  const res = await API.get(
    "/admin/pending-managers"
  );

  return res.data;
};

/* =========================
   APPROVE MANAGER
========================= */

export const approveManager = async (
  id
) => {
  const res = await API.put(
    `/admin/approve/${id}`,
    {}
  );

  return res.data;
};

/* =========================
   REJECT MANAGER
========================= */

export const rejectManager = async (
  id
) => {
  const res = await API.put(
    `/admin/reject/${id}`,
    {}
  );

  return res.data;
};

/* =========================
   BLOCK USER
========================= */

export const blockUser = async (
  id
) => {
  const res = await API.put(
    `/admin/block/${id}`,
    {}
  );

  return res.data;
};

/* =========================
   UNBLOCK USER
========================= */

export const unblockUser = async (
  id
) => {
  const res = await API.put(
    `/admin/unblock/${id}`,
    {}
  );

  return res.data;
};
