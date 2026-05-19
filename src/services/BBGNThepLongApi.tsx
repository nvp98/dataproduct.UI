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
  phanLoaiNhom?: string;
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

export interface TongHopItem {
  label: string;
  soMe: number;
}

export interface TongHopBBGNThepLongResponse {
  phanLoai: TongHopItem[];
  ca: TongHopItem[];
  kip: TongHopItem[];
  tinhLuyenLenThang: TongHopItem[];
  ducVuong: TongHopItem[];
  ducTam: TongHopItem[];
  nhomPhanLoaiMacThep: TongHopItem[];
}

export const bbgbThepLongApi = {
  fetch: (payload: FetchMeThoiRequest) => apiService.post("/api/BBGNThepLong/fetch", payload),
  searchMeThoi: (nhaMay: number, textStr?: string, idLoThois?: number[]) =>
    apiService.post("/api/BBGNThepLong/search-me-thoi", {
      nhaMay,
      textStr: textStr ?? null,
      iD_LoThois: idLoThois && idLoThois.length > 0 ? idLoThois : null,
    }),
  load: (payload: LoadBBGNRequest) => apiService.post("/api/BBGNThepLong/load", payload),
  deleteRow: (id: number) => apiService.delete(`/api/BBGNThepLong/${id}`),
  searchThongKe: <T = unknown>(payload: SearchThongKeBBGNThepLongRequest) =>
    apiService.post("/api/BBGNThepLong/search-thongke", payload) as Promise<SearchThongKeBBGNThepLongResponse<T>>,
  sumThongKe: (payload: SearchThongKeBBGNThepLongRequest) =>
    apiService.post("/api/BBGNThepLong/sum-thongke", payload) as Promise<SumThongKeBBGNThepLongResponse>,
  getPhanLoaiNhomOptions: (bieuMau: string, search?: string) => {
    const url = `/api/BBGNThepLong/phan-loai-nhom-options?bieuMau=${encodeURIComponent(bieuMau)}`;
    return apiService.get(search ? `${url}&search=${encodeURIComponent(search)}` : url) as Promise<string[]>;
  },
  exportThongKe: async (payload: SearchThongKeBBGNThepLongRequest): Promise<void> => {
    const baseUrl = import.meta.env.VITE_API_URL as string;
    const token = localStorage.getItem("token");
    const res = await fetch(`${baseUrl}api/bbgntheplong/export-thongke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || "Xuất Excel thất bại.");
    }
    const blob = await res.blob();
    let fileName = `ThongKe_BBGNThepLong.xlsx`;
    const contentDisposition = res.headers.get("Content-Disposition");
    if (contentDisposition) {
      const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (match?.[1]) fileName = decodeURIComponent(match[1].replace(/['"]/g, ""));
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  tongHop: (payload: SearchThongKeBBGNThepLongRequest) =>
    apiService.post("/api/BBGNThepLong/tong-hop", payload) as Promise<TongHopBBGNThepLongResponse>,
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

