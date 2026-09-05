import API from "./api";

// ===============================
// Get Profile
// ===============================
export const getProfile = async () => {
  const res = await API.get("/profile");

  return res.data;
};

// ===============================
// Update Profile
// ===============================
export const updateProfile = async (profile) => {
  const formData = new FormData();

  formData.append(
    "name",
    profile.name
  );

  formData.append(
    "notificationPreference",
    profile.notificationPreference
  );

  if (
    profile.profilePhoto instanceof File
  ) {
    formData.append(
      "profilePhoto",
      profile.profilePhoto
    );
  }

  const res = await API.put(
    "/profile/update",
    formData
  );

  return res.data;
};

// ===============================
// Change Password
// ===============================
export const changePassword = async (
  passwordData
) => {
  const res = await API.put(
    "/profile/change-password",
    passwordData
  );

  return res.data;
};
