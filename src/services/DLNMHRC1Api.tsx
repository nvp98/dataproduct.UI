import apiService from "./ApiService";
import type { ChuyenMeThoiRequest } from "../models/DLMN_HRC2Model";

export const dlnmHRC1Api = {
  filter: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/filter", payload),
  forceSync: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/force-sync", payload),
  // Chuyển 1 mẻ sang ca trước/sau — dùng bởi CustomTableHRC (prop chuyenMeThoiApi).
  chuyenMeThoi: (payload: ChuyenMeThoiRequest) =>
    apiService.post("/api/DLNMHRC1/chuyen-me-thoi", payload),
  searchThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/search-thongke", payload),
  sumThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/sum-thongke", payload),
  // "Làm mới" trên trang Sổ Xuất-Nhập-Tồn HRC1 — sync BOF từ NM rồi group theo (BieuMau, Scope, PhuLieuID).
  filterSTD_NXT: (payload: {
    NgaySX: string;
    Ca: number;
    idPhieu?: string;
    PhuLieuIds?: number[];
  }) => apiService.post("/api/DLNMHRC1/filterSTD_NXT", payload),
  exportThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/export-thongke", payload, {
      responseType: "blob",
    }),
  // Dòng nhập tay (IsNM = false): xóa vĩnh viễn.
  deleteRowByKey: (rowKey: number) => apiService.delete(`/api/DLNMHRC1/${rowKey}`),
  // Dòng từ NM (IsNM = true): xóa mềm (IsDeleted = true), chỉ ẩn khỏi kết quả lọc.
  deleteRowNM: (rowKey: number) => apiService.delete(`/api/DLNMHRC1/delete-row-nm/${rowKey}`),
  // Xuất biên bản 1 phiếu cụ thể (mẫu HRC1_BB_NauLuyen_BOF.xlsx / HRC1_BB_NauLuyen.html).
  exportBienBan: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC1/export-excel-detail", {
      params,
      responseType: "blob",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    }),
  exportBienBanPDF: (params?: Record<string, unknown>) =>
    apiService.get("/api/DLNMHRC1/export-pdf-detail", {
      params,
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    }),
};
