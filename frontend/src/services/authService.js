import axios from "axios";

const API = axios.create({
  baseURL:
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000/api",
});

// =========================================================
// AUTOMATICALLY ATTACH JWT TOKEN
// =========================================================

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =========================================================
// REGISTER
// =========================================================

export const register = async (data) => {
  const res = await API.post(
    "/auth/register",
    data
  );

  return res.data;
};

// =========================================================
// LOGIN
// =========================================================

export const login = async (data) => {
  const res = await API.post(
    "/auth/login",
    data
  );

  localStorage.setItem(
    "token",
    res.data.token
  );

  localStorage.setItem(
    "user",
    JSON.stringify(res.data)
  );

  return res.data;
};

// =========================================================
// PROFILE
// =========================================================

export const getProfile = async () => {
  const res = await API.get(
    "/auth/profile"
  );

  return res.data;
};

// =========================================================
// LOGOUT
// =========================================================

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
