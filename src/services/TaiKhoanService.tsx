import apiService from "./ApiService";

export const TaiKhoanApi = {
  getData: (params?: any) =>
    apiService.get("/api/TaiKhoan/nguoiky", { params }),

  postLogin: (data: any) => apiService.post("/api/TaiKhoan/login", data),

  //   getDetail: (id: string) => apiService.get(`/api/phoigionhan/${id}`),
};
