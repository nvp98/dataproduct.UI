import type { ChuyenMeThoiRequest, FilterSTD_NXTRequest } from "../models/DLMN_HRC2Model";
import apiService from "./ApiService";

export const dlnmHRC2Api = {
  search: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2/search", { params }),
  searchGrouped: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2/search-grouped", { params }),
  searchThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC2/search-thongke", payload),
  sumThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC2/sum-thongke", payload),
  getById: (id: number) => apiService.get(`/api/DLNMHRC2/${id}`),
  getByReportNo: (reportNo: number) => apiService.get(`/api/DLNMHRC2/report/${reportNo}`),
  getAll: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2", { params }),
  filter: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC2/filter", payload),
  chuyenMeThoi: (payload: ChuyenMeThoiRequest) => apiService.post("/api/DLNMHRC2/chuyen-me-thoi", payload ),
  deleteRowByKey: (rowKey: number) => apiService.delete(`/api/DLNMHRC2/${rowKey}`),
  filterSTD_NXT: (payload: FilterSTD_NXTRequest) =>
    apiService.post("/api/DLNMHRC2/filterSTD_NXT", payload),
  exportBienBan: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2/export-excel-detail", {
      params,
      responseType: "blob",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }),
  exportBienBanPDF: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2/export-pdf-detail", {
      params,
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    }),
  exportExcelTieuHaoTheoCa: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC2/export-excel-tieuhao", {
      params,
      responseType: "blob",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }),
  };

