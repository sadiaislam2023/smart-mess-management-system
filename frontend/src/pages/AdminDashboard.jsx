import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import {
  getAllUsers,
  getPendingManagers,
  approveManager,
  rejectManager,
  blockUser,
  unblockUser,
} from "../services/adminService";


function AdminDashboard() {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const [users, setUsers] = useState([]);

  const [pendingManagers, setPendingManagers] =
    useState([]);


  // =========================================================
  // LOAD DATA
  // =========================================================

  const loadData = async () => {
    try {
      const allUsers =
        await getAllUsers();

      const pending =
        await getPendingManagers();

      setUsers(allUsers);
      setPendingManagers(pending);
    } catch (error) {
      console.log(
        "Admin dashboard loading error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to load data"
      );
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  // =========================================================
  // APPROVE MANAGER
  // =========================================================

  const handleApprove = async (id) => {
    try {
      await approveManager(id);
      await loadData();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to approve manager"
      );
    }
  };


  // =========================================================
  // REJECT MANAGER
  // =========================================================

  const handleReject = async (id) => {
    try {
      await rejectManager(id);
      await loadData();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to reject manager"
      );
    }
  };


  // =========================================================
  // BLOCK USER
  // =========================================================

  const handleBlock = async (id) => {
    try {
      await blockUser(id);
      await loadData();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to block user"
      );
    }
  };


  // =========================================================
  // UNBLOCK USER
  // =========================================================

  const handleUnblock = async (id) => {
    try {
      await unblockUser(id);
      await loadData();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Failed to unblock user"
      );
    }
  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    logout();
    navigate("/");
  };


  // =========================================================
  // CAPITALIZE FIRST LETTER
  // =========================================================

  const capitalizeFirstLetter = (value) => {
    if (!value) {
      return "";
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  };


  // =========================================================
  // COMMON ADMIN BUTTON STYLE
  // =========================================================

  const adminButtonStyle = {
    fontWeight: "500",
    borderRadius: "50px",
    padding: "10px 20px",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  };


  // =========================================================
  // STATUS STYLE
  // =========================================================

  const getStatusStyle = (status) => {
    const normalized =
      String(status || "").toLowerCase();


    if (
      normalized === "active" ||
      normalized === "approved"
    ) {
      return {
        background: "#D1FAE5",
        color: "#047857",
      };
    }


    if (
      normalized === "blocked" ||
      normalized === "rejected"
    ) {
      return {
        background: "#FEE2E2",
        color: "#B91C1C",
      };
    }


    if (
      normalized === "pending"
    ) {
      return {
        background: "#FEF3C7",
        color: "#B45309",
      };
    }


    return {
      background: "#E5E7EB",
      color: "#374151",
    };
  };


  return (
    <div
      className="container-fluid py-4"
      style={{
        minHeight: "100vh",

        background:
          "linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 48%, #F8FAFC 100%)",
      }}
    >

      <div className="container">

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div
          className="card border-0"
          style={{
            borderRadius: "20px",
            overflow: "hidden",

            boxShadow:
              "0 12px 35px rgba(49, 46, 129, 0.16)",
          }}
        >

          <div className="card-body p-4 p-md-5">


            {/* =================================================
                HEADER
            ================================================= */}

            <div
              className="text-center mb-4"
              style={{
                background:
                  "linear-gradient(135deg, #312E81, #4338CA)",

                borderRadius: "12px",

                padding: "9px 20px",

                boxShadow:
                  "0 5px 14px rgba(49, 46, 129, 0.25)",
              }}
            >

              <h2
                className="fw-bold mb-1"
                style={{
                  color: "#ffffff",

                  fontSize: "21px",

                  lineHeight: "1.2",
                }}
              >
                Admin Dashboard
              </h2>


              <p
                className="mb-0"
                style={{
                  color: "#E0E7FF",

                  fontSize: "12px",
                }}
              >
                Smart Student Mess & SpaceFit
                Room Allocation system
              </p>

            </div>


            <hr
              style={{
                borderColor: "#DDD6FE",
              }}
            />


            {/* =================================================
                ADMIN INFORMATION
            ================================================= */}

            <div
              className="mb-4"
              style={{
                background:
                  "linear-gradient(135deg, #EEF2FF, #F5F3FF)",

                border:
                  "1px solid #C7D2FE",

                borderLeft:
                  "5px solid #4F46E5",

                borderRadius: "14px",

                padding: "18px 20px",

                boxShadow:
                  "0 5px 14px rgba(79, 70, 229, 0.08)",
              }}
            >

              <h5
                className="fw-bold mb-3"
                style={{
                  color: "#312E81",
                }}
              >
                Welcome, {user?.name} 👋
              </h5>


              <p className="mb-2">
                <strong>Email:</strong>{" "}
                {user?.email}
              </p>


              <p className="mb-2">
                <strong>Status:</strong>{" "}

                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    ...getStatusStyle(
                      user?.approvalStatus
                    ),

                    fontWeight: "500",
                  }}
                >
                  {capitalizeFirstLetter(
                    user?.approvalStatus
                  )}
                </span>
              </p>


              <p className="mb-0">
                <strong>Role:</strong>{" "}

                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    background: "#EDE9FE",

                    color: "#6D28D9",

                    fontWeight: "500",
                  }}
                >
                  {capitalizeFirstLetter(
                    user?.role
                  )}
                </span>
              </p>

            </div>


            {/* =================================================
                MANAGEMENT ACTIONS
            ================================================= */}

            <div className="mb-4">

              <h5
                className="fw-bold mb-3"
                style={{
                  color: "#312E3A",
                }}
              >
                Management Actions
              </h5>


              <div
                className="d-flex flex-wrap"
                style={{
                  gap: "12px",
                }}
              >

                {/* PROFILE ONLY */}

                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigate("/profile")
                  }
                  style={{
                    ...adminButtonStyle,

                    backgroundColor:
                      "#4F46E5",

                    borderColor:
                      "#4F46E5",

                    color: "#ffffff",

                    boxShadow:
                      "0 3px 8px rgba(79, 70, 229, 0.22)",
                  }}
                >
                  👤 My Profile
                </button>

              </div>

            </div>


            <hr
              style={{
                borderColor: "#DDD6FE",
              }}
            />


            {/* =================================================
                PENDING MANAGER REQUESTS
            ================================================= */}

            <div className="mb-4">

              <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3"
              >

                <div>

                  <h4
                    className="mb-1 fw-bold"
                    style={{
                      color: "#312E3A",
                    }}
                  >
                    Pending Manager Requests
                  </h4>


                  <small
                    style={{
                      color: "#6B7280",
                    }}
                  >
                    Review and manage manager
                    account approval requests
                  </small>

                </div>


                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #4F46E5, #7C3AED)",

                    color: "#ffffff",

                    fontSize: "13px",

                    fontWeight: "500",

                    boxShadow:
                      "0 3px 8px rgba(79, 70, 229, 0.18)",
                  }}
                >
                  {pendingManagers.length}{" "}
                  {pendingManagers.length === 1
                    ? "Request"
                    : "Requests"}
                </span>

              </div>


              <div
                style={{
                  background:
                    "linear-gradient(135deg, #F5F3FF, #FAF9FF)",

                  border:
                    "1px solid #DDD6FE",

                  borderLeft:
                    "5px solid #7C3AED",

                  borderRadius: "14px",

                  padding: "18px",

                  boxShadow:
                    "0 5px 15px rgba(124, 58, 237, 0.08)",
                }}
              >

                {pendingManagers.length ===
                0 ? (

                  <div
                    className="text-center py-4"
                  >

                    <div
                      style={{
                        fontSize: "30px",

                        marginBottom: "8px",

                        color: "#7C3AED",
                      }}
                    >
                      ✓
                    </div>


                    <h5
                      className="fw-bold"
                      style={{
                        color: "#5B21B6",
                      }}
                    >
                      No Pending Requests
                    </h5>


                    <p
                      className="text-muted mb-0"
                    >
                      There are currently no
                      manager accounts waiting
                      for approval.
                    </p>

                  </div>

                ) : (

                  <div
                    className="table-responsive"
                  >

                    <table
                      className="table align-middle mb-0"
                    >

                      <thead>

                        <tr>

                          <th
                            style={{
                              color: "#4338CA",

                              borderBottom:
                                "1px solid #DDD6FE",
                            }}
                          >
                            Name
                          </th>


                          <th
                            style={{
                              color: "#4338CA",

                              borderBottom:
                                "1px solid #DDD6FE",
                            }}
                          >
                            Email
                          </th>


                          <th
                            style={{
                              color: "#4338CA",

                              borderBottom:
                                "1px solid #DDD6FE",
                            }}
                          >
                            Action
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {pendingManagers.map(
                          (manager) => (

                            <tr
                              key={
                                manager._id
                              }
                            >

                              <td
                                style={{
                                  fontWeight:
                                    "500",
                                }}
                              >
                                {manager.name}
                              </td>


                              <td>
                                {manager.email}
                              </td>


                              <td>

                                <div
                                  className="d-flex flex-wrap"
                                  style={{
                                    gap: "8px",
                                  }}
                                >

                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      handleApprove(
                                        manager._id
                                      )
                                    }
                                    style={{
                                      background:
                                        "#0F766E",

                                      borderColor:
                                        "#0F766E",

                                      color:
                                        "#ffffff",

                                      borderRadius:
                                        "50px",

                                      padding:
                                        "7px 16px",

                                      fontWeight:
                                        "500",

                                      fontSize:
                                        "13px",

                                      boxShadow:
                                        "0 3px 7px rgba(15, 118, 110, 0.16)",
                                    }}
                                  >
                                    ✓ Approve
                                  </button>


                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      handleReject(
                                        manager._id
                                      )
                                    }
                                    style={{
                                      background:
                                        "#DC2626",

                                      borderColor:
                                        "#DC2626",

                                      color:
                                        "#ffffff",

                                      borderRadius:
                                        "50px",

                                      padding:
                                        "7px 16px",

                                      fontWeight:
                                        "500",

                                      fontSize:
                                        "13px",

                                      boxShadow:
                                        "0 3px 7px rgba(220, 38, 38, 0.16)",
                                    }}
                                  >
                                    ✕ Reject
                                  </button>

                                </div>

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>


            <hr
              style={{
                borderColor: "#DDD6FE",
              }}
            />


            {/* =================================================
                COMPLAINT INTEGRITY REVIEW
            ================================================= */}

            <div className="mb-4">

              <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3"
              >

                <div>

                  <h4
                    className="mb-1 fw-bold"
                    style={{
                      color: "#312E3A",
                    }}
                  >
                    Complaint Integrity Review
                  </h4>


                  <small
                    style={{
                      color: "#6B7280",
                    }}
                  >
                    Review complaints for credibility,
                    duplicate detection, evidence,
                    and final decisions
                  </small>

                </div>


                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    background: "#FEE2E2",

                    color: "#B91C1C",

                    fontSize: "13px",

                    fontWeight: "500",
                  }}
                >
                  Admin Review
                </span>

              </div>


              <div
                style={{
                  background:
                    "linear-gradient(135deg, #FFF1F2, #FFF8F8)",

                  border:
                    "1px solid #FECACA",

                  borderLeft:
                    "5px solid #DC2626",

                  borderRadius: "14px",

                  padding: "18px 20px",

                  boxShadow:
                    "0 5px 15px rgba(220, 38, 38, 0.08)",
                }}
              >

                <p
                  className="mb-3"
                  style={{
                    color: "#6B3740",
                  }}
                >
                  Review complaints for credibility
                  screening, duplicate detection,
                  evidence assessment, and final
                  administrative decisions.
                </p>


                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigate(
                      "/admin/complaints"
                    )
                  }
                  style={{
                    ...adminButtonStyle,

                    backgroundColor:
                      "#DC2626",

                    borderColor:
                      "#DC2626",

                    color: "#ffffff",

                    boxShadow:
                      "0 3px 8px rgba(220, 38, 38, 0.20)",
                  }}
                >
                  🛠️ View Complaints For Review
                </button>

              </div>

            </div>


            <hr
              style={{
                borderColor: "#DDD6FE",
              }}
            />


            {/* =================================================
                ALL USERS
            ================================================= */}

            <div className="mb-4">

              <div
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3"
              >

                <div>

                  <h4
                    className="mb-1 fw-bold"
                    style={{
                      color: "#312E3A",
                    }}
                  >
                    All Users
                  </h4>


                  <small
                    style={{
                      color: "#6B7280",
                    }}
                  >
                    View and manage all registered
                    users and their account status
                  </small>

                </div>


                <span
                  className="badge rounded-pill px-3 py-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #312E81, #4F46E5)",

                    color: "#ffffff",

                    fontSize: "13px",

                    fontWeight: "500",

                    boxShadow:
                      "0 3px 8px rgba(49, 46, 129, 0.18)",
                  }}
                >
                  {users.length}{" "}
                  {users.length === 1
                    ? "User"
                    : "Users"}
                </span>

              </div>


              <div
                style={{
                  background:
                    "linear-gradient(135deg, #EEF2FF, #F8FAFF)",

                  border:
                    "1px solid #C7D2FE",

                  borderLeft:
                    "5px solid #4F46E5",

                  borderRadius: "14px",

                  padding: "18px",

                  boxShadow:
                    "0 5px 15px rgba(79, 70, 229, 0.08)",
                }}
              >

                {users.length === 0 ? (

                  <div
                    className="text-center py-4"
                  >

                    <div
                      style={{
                        fontSize: "30px",

                        marginBottom: "8px",
                      }}
                    >
                      👥
                    </div>


                    <h5
                      className="fw-bold"
                      style={{
                        color: "#4338CA",
                      }}
                    >
                      No Users Found
                    </h5>


                    <p
                      className="text-muted mb-0"
                    >
                      There are currently no
                      registered users.
                    </p>

                  </div>

                ) : (

                  <div
                    className="table-responsive"
                  >

                    <table
                      className="table align-middle mb-0"
                    >

                      <thead>

                        <tr>

                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Name
                          </th>


                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Email
                          </th>


                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Role
                          </th>


                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Approval
                          </th>


                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Status
                          </th>


                          <th
                            style={{
                              color:
                                "#3730A3",

                              borderBottom:
                                "1px solid #C7D2FE",
                            }}
                          >
                            Action
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {users.map(
                          (u) => (

                            <tr
                              key={u._id}
                            >

                              <td
                                style={{
                                  fontWeight:
                                    "500",
                                }}
                              >
                                {u.name}
                              </td>


                              <td>
                                {u.email}
                              </td>


                              <td>

                                <span
                                  className="badge rounded-pill px-3 py-2"
                                  style={{
                                    background:
                                      "#EDE9FE",

                                    color:
                                      "#6D28D9",

                                    fontWeight:
                                      "500",
                                  }}
                                >
                                  {capitalizeFirstLetter(
                                    u.role
                                  )}
                                </span>

                              </td>


                              <td>

                                <span
                                  className="badge rounded-pill px-3 py-2"
                                  style={{
                                    ...getStatusStyle(
                                      u.approvalStatus
                                    ),

                                    fontWeight:
                                      "500",
                                  }}
                                >
                                  {capitalizeFirstLetter(
                                    u.approvalStatus
                                  )}
                                </span>

                              </td>


                              <td>

                                <span
                                  className="badge rounded-pill px-3 py-2"
                                  style={{
                                    ...getStatusStyle(
                                      u.accountStatus
                                    ),

                                    fontWeight:
                                      "500",
                                  }}
                                >
                                  {capitalizeFirstLetter(
                                    u.accountStatus
                                  )}
                                </span>

                              </td>


                              <td>

                                {u.accountStatus ===
                                "active" ? (

                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      handleBlock(
                                        u._id
                                      )
                                    }
                                    style={{
                                      background:
                                        "#D97706",

                                      borderColor:
                                        "#D97706",

                                      color:
                                        "#ffffff",

                                      borderRadius:
                                        "50px",

                                      padding:
                                        "7px 16px",

                                      fontWeight:
                                        "500",

                                      fontSize:
                                        "13px",

                                      boxShadow:
                                        "0 3px 8px rgba(217, 119, 6, 0.18)",
                                    }}
                                  >
                                    Block
                                  </button>

                                ) : (

                                  <button
                                    type="button"
                                    className="btn"
                                    onClick={() =>
                                      handleUnblock(
                                        u._id
                                      )
                                    }
                                    style={{
                                      background:
                                        "#0F766E",

                                      borderColor:
                                        "#0F766E",

                                      color:
                                        "#ffffff",

                                      borderRadius:
                                        "50px",

                                      padding:
                                        "7px 16px",

                                      fontWeight:
                                        "500",

                                      fontSize:
                                        "13px",

                                      boxShadow:
                                        "0 3px 8px rgba(15, 118, 110, 0.18)",
                                    }}
                                  >
                                    Unblock
                                  </button>

                                )}

                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

            </div>


            {/* =================================================
                LOGOUT
            ================================================= */}

            <div
              className="mt-4 pt-3 border-top"
              style={{
                borderColor:
                  "#DDD6FE",
              }}
            >

              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleLogout}
                style={{
                  fontWeight: "400",

                  borderRadius: "8px",

                  padding:
                    "9px 18px",

                  boxShadow:
                    "0 3px 8px rgba(220, 38, 38, 0.10)",
                }}
              >
                🚪 Logout
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;
