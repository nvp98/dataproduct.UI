import apiService from "./ApiService";

export const CtdPhoiNongApi = {
  getData: (params?: any) => apiService.get("/api/CtdPhoiNong", { params }),
  getByPhieu: (idphieu: string) =>
    apiService.get(`/api/CtdPhoiNong/by-phieu/${idphieu}`),
  bulk: (data: any[]) => apiService.post("/api/CtdPhoiNong/bulk", data),
  updateStatus: (
    data: Array<{ id: number; tinhTrangCTD?: number; tinhTrangQLCL?: number }>
  ) => apiService.put("/api/CtdPhoiNong/update-status", data),
  updateStatusChot: (param?: any) =>
    apiService.put("/api/CtdPhoiNong/update-chot", param),
  delete: (id: number) => apiService.delete(`/api/CtdPhoiNong/${id}`),
};
