import type { SearchPhieuRequest } from "../models/Phieu";
import apiService from "./ApiService";

export const PhieuApi = {
  getData: (params?: Record<string, unknown>) =>
    apiService.get("/api/Phieus", { params }),

  postData: (data: Record<string, unknown>) =>
    apiService.post("/api/Phieus", data),

  getDetail: (id: string) => apiService.get(`/api/Phieus/${id}`),
  putData: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}`, data),

  deleteData: (id: string) => apiService.delete(`/api/Phieus/${id}`),

  changeStatus: (id: string, status: number) =>
    apiService.put(`/api/Phieus/${id}/status`, { status }),
  clone: (id: string, data: Record<string, unknown>) =>
    apiService.post(`/api/Phieus/${id}/clone`, data),

  changeStatus_extended: (
    id: string,
    payload: { status: number; isLock: number; isDelete: number },
  ) => apiService.put(`/api/Phieus/${id}/status-extended`, payload),

  search: (payload: SearchPhieuRequest) =>
    apiService.post("/api/Phieus/search", payload),

  initializePhieu: (id: string) =>
    apiService.post(`/api/Phieus/${id}/initialize`),
  syncNguoiTaoPhieu: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}/sync-nguoi-tao`, data),
  exportDynamicPDF: (id: string, data: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/${id}/export-pdf`, { responseType: "blob" }),
  exportDynamicExcelTH: (params?: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/export-excel-tonghop`, {
      params,
      responseType: "blob",
    }),
};
