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

  changeStatus: (
    id: string,
    status: number,
    idUser?: number | null
  ) => apiService.put(`/api/Phieus/${id}/status`, { status, idUser }),
  clone: (id: string, data: Record<string, unknown>) =>
    apiService.post(`/api/Phieus/${id}/clone`, data),

  changeStatus_extended: (
    id: string,
    payload: { status: number; isLock: number; isDelete: number },
  ) => apiService.put(`/api/Phieus/${id}/status-extended`, payload),

  search: (payload: SearchPhieuRequest) =>
    apiService.post("/api/Phieus/search", payload),
  syncNguoiTaoPhieu: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}/sync-nguoi-tao`, data),
  exportDynamicPDF: (id: string, data: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/${id}/export-pdf`, { responseType: "blob" }),
  exportDetailExcel: (id: string) =>
    apiService.get(`/api/Phieus/${id}/export-excel-detail`, { responseType: "blob" }),
  exportDynamicExcelTH: (params?: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/export-excel-tonghop`, {
      params,
      responseType: "blob",
    }),

  chotNhieuPhieu: (idPhieus: string[], status: number) =>
    apiService.post("/api/Phieus/chot-nhieu-phieu", { idPhieus, status }),
  checkChotPhieuTieuHao: (ngaySX: string, ca: number) => apiService.get(`/api/Phieus/hrc2-std-nxt/status?ngaySX=${ngaySX}&ca=${ca}`),
};
