import { useState } from "react";

import API from "../services/api";

function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] =
    useState("info");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("info");

    if (
      form.newPassword !==
      form.confirmPassword
    ) {
      setMessage(
        "New password and confirm password do not match."
      );

      setMessageType("danger");

      return;
    }

    try {
      const res = await API.post(
        "/auth/change-password",
        {
          currentPassword:
            form.currentPassword,

          newPassword:
            form.newPassword,
        }
      );

      setMessage(
        res.data.message ||
          "Password changed successfully."
      );

      setMessageType("success");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to change password."
      );

      setMessageType("danger");
    }
  };

  return (
    <div
      className="container mt-5"
      style={{
        maxWidth: "500px",
      }}
    >
      <div className="card shadow p-4">
        <h2 className="text-center mb-4">
          Change Password
        </h2>

        {message && (
          <div
            className={`alert alert-${messageType}`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* CURRENT PASSWORD */}

          <div className="mb-3">
            <label className="form-label">
              Current Password
            </label>

            <input
              type="password"
              className="form-control"
              name="currentPassword"
              value={
                form.currentPassword
              }
              onChange={handleChange}
              required
            />
          </div>

          {/* NEW PASSWORD */}

          <div className="mb-3">
            <label className="form-label">
              New Password
            </label>

            <input
              type="password"
              className="form-control"
              name="newPassword"
              value={
                form.newPassword
              }
              onChange={handleChange}
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="mb-3">
            <label className="form-label">
              Confirm New Password
            </label>

            <input
              type="password"
              className="form-control"
              name="confirmPassword"
              value={
                form.confirmPassword
              }
              onChange={handleChange}
              required
            />
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="btn btn-primary w-100"
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
