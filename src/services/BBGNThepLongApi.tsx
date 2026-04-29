import type { FetchMeThoiRequest, LoadBBGNRequest } from "../models/BBGNThepLongModel";
import apiService from "./ApiService";

export interface SearchThongKeBBGNThepLongRequest {
  bieuMau?: string;
  tuNgay?: string;
  denNgay?: string;
  ca?: number;
  kip?: string;
  mayDuc?: number;
  scope?: number;
  searchString?: string;
  thungSo?: string;
  tinhLuyenLenThang?: string;
  phanLoai?: string;
  isTrungMeThoi?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SumThongKeBBGNThepLongResponse {
  totalRows: number;
  totalKlThepLong: number | null;
}

export interface SearchThongKeBBGNThepLongResponse<T> {
  data: T[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const bbgbThepLongApi = {
  fetch: (payload: FetchMeThoiRequest) => apiService.post("/api/BBGNThepLong/fetch", payload),
  load: (payload: LoadBBGNRequest) => apiService.post("/api/BBGNThepLong/load", payload),
  deleteRow: (id: number) => apiService.delete(`/api/BBGNThepLong/${id}`),
  searchThongKe: <T = unknown>(payload: SearchThongKeBBGNThepLongRequest) =>
    apiService.post("/api/BBGNThepLong/search-thongke", payload) as Promise<SearchThongKeBBGNThepLongResponse<T>>,
  sumThongKe: (payload: SearchThongKeBBGNThepLongRequest) =>
    apiService.post("/api/BBGNThepLong/sum-thongke", payload) as Promise<SumThongKeBBGNThepLongResponse>,
  exportDetailExcel: (idPhieu: string) =>
    apiService.get(`/api/BBGNThepLong/export-excel?idPhieu=${idPhieu}`, { responseType: "blob" }),
  exportDetailPDF: (idPhieu: string) =>
    apiService.get(`/api/BBGNThepLong/export-pdf?idPhieu=${idPhieu}`, { responseType: "blob" }),
  // exportBienBan: (params?: Record<string, unknown>) =>
  //   apiService.get("/api/DLNMHRC2/export-excel-detail", {
  //     params,
  //     responseType: "blob",
  //     headers: {
  //       Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //     },
  //   }),
  // exportBienBanPDF: (params?: Record<string, unknown>) =>
  //   apiService.get("/api/DLNMHRC2/export-pdf-detail", {
  //     params,
  //     responseType: "blob",
  //     headers: { Accept: "application/pdf" },
  //   }),
};

