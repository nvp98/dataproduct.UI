import apiService from "./ApiService";

export const PhieuApi = {
  getData: (params?: any) => apiService.get("/api/Phieus", { params }),

  postData: (data: any) => apiService.post("/api/Phieus", data),

  getDetail: (id: string) => apiService.get(`/api/Phieus/${id}`),
  putData: (id: string, data: any) => apiService.put(`/api/Phieus/${id}`, data),
};
