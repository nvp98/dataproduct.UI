import apiService from "./ApiService";

export const TaiKhoanApi = {
  getData: (params?: any) =>
    apiService.get("/api/TaiKhoan/nguoiky", { params }),

  postLogin: (data: any) => apiService.post("/api/TaiKhoan/login", data),
  getSession: (params?: any) =>
    apiService.get("/api/TaiKhoan/me", { withCredentials: true }),
  getDetail: (tenTaiKhoan: string) =>
    apiService.get(`/api/TaiKhoan/info/${tenTaiKhoan}`),
};
