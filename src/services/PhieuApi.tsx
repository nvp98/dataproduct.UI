import apiService from "./ApiService";

export const PhieuApi = {
  getData: (params?: any) => apiService.get("/api/Phieus", { params }),

  postData: (data: any) => apiService.post("/api/Phieus", data),

  getDetail: (id: string) => apiService.get(`/api/Phieus/${id}`),
  putData: (id: string, data: any) => apiService.put(`/api/Phieus/${id}`, data),

  deleteData: (id: string) => apiService.delete(`/api/Phieus/${id}`),

  clone: (id: string, data: any) =>
    apiService.post(`/api/Phieus/${id}/clone`, data),

  changeStatus_extended: (
    id: string,
    payload: { status: number; isLock: number; isDelete: number }
  ) => apiService.put(`/api/Phieus/${id}/status-extended`, payload),
};
