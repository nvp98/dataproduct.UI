import apiService from "./ApiService";

export const CtdPhoiNongApi = {
  getData: (params?: any) => apiService.get("/api/CtdPhoiNong", { params }),
  getByPhieu: (idphieu: string) =>
    apiService.get(`/api/CtdPhoiNong/by-phieu/${idphieu}`),
  bulk: (data: any[]) => apiService.post("/api/CtdPhoiNong/bulk", data),
  updateStatus: (
    data: Array<{ id: number; tinhTrangCTD?: number; tinhTrangQLCL?: number }>
  ) => apiService.put("/api/CtdPhoiNong/update-status", data),
  updateStatusChot: (params?: any) =>
    apiService.put("/api/CtdPhoiNong/update-chot", null, { params }),
  delete: (id: number) => apiService.delete(`/api/CtdPhoiNong/${id}`),
  exportExcel: (params?: any) =>
    apiService.get(`/api/CtdPhoiNong/export-excel`, {
      params,
      responseType: "blob", // Quan trọng: nhận file nhị phân
    }),
  exportExcelPKH: (params?: any) =>
    apiService.get(`/api/CtdPhoiNong/export-excel-tonghop`, {
      params,
      responseType: "blob", // Quan trọng: nhận file nhị phân
    }),
  exportPdf: (params?: any) =>
    apiService.get<Blob>("/api/CtdPhoiNong/export-pdf", {
      params,
      responseType: "blob",
    }),
};
