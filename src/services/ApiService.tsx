import axios from "axios";

const apiService = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // thay đổi url api
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptors (bắt lỗi, thêm token)
apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiService.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Ví dụ: xóa token + redirect login
      localStorage.removeItem("token");
      window.location.href = "/login";

      return Promise.reject({
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      });
    }

    const payload =
      error.response?.data && typeof error.response.data === "object"
        ? { ...error.response.data, status: error.response.status }
        : { message: String(error.response?.data ?? error.message), status: error.response?.status };
    return Promise.reject(payload);
  }
);

export default apiService;

export const apiClient = {
  async get(url: string, params?: Record<string, unknown>) {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(url + query);
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },
};
