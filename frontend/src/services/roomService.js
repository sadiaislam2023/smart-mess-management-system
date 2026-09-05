import API from "./api";

const roomService = {
  // ================= ROOM =================

  getRooms: () =>
    API.get("/rooms"),

  getRoom: (id) =>
    API.get(`/rooms/${id}`),

  createRoom: (data) =>
    API.post("/rooms", data),

  updateRoom: (id, data) =>
    API.put(`/rooms/${id}`, data),

  archiveRoom: (id) =>
    API.patch(`/rooms/${id}/archive`),

  // ================= BEDS =================

  addBed: (id, data) =>
    API.post(`/rooms/${id}/beds`, data),

  updateBed: (id, bedId, data) =>
    API.put(
      `/rooms/${id}/beds/${bedId}`,
      data
    ),

  deleteBed: (id, bedId) =>
    API.patch(
      `/rooms/${id}/beds/${bedId}/archive`
    ),

  // ================= IMAGES =================

  uploadImage: (formData) =>
    API.post(
      "/rooms/upload",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    ),

  deleteImage: (id, public_id) =>
    API.delete(
      `/rooms/${id}/images/${public_id}`
    ),
};

export default roomService;
