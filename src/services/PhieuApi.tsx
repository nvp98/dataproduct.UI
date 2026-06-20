import type {
  SearchPhieuByUserRequest,
  SearchPhieuRequest,
} from "../models/Phieu";
import apiService from "./ApiService";

export const PhieuApi = {
  getData: (params?: Record<string, unknown>) =>
    apiService.get("/api/Phieus", { params }),

  postData: (data: Record<string, unknown>) =>
    apiService.post("/api/Phieus", data),

  getDetail: (id: string) => apiService.get(`/api/Phieus/${id}`),
  putData: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}`, data),

  /// Update only table data without form status constraints (for users with chốt permission)
  putTableDataOnly: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}/update-table-data`, data),

  deleteData: (id: string) => apiService.delete(`/api/Phieus/${id}`),

  changeStatus: (id: string, status: number, idUser?: number | null) =>
    apiService.put(`/api/Phieus/${id}/status`, { status, idUser }),
  clone: (id: string, data: Record<string, unknown>) =>
    apiService.post(`/api/Phieus/${id}/clone`, data),

  changeStatus_extended: (
    id: string,
    payload: { status: number; isLock: number; isDelete: number },
  ) => apiService.put(`/api/Phieus/${id}/status-extended`, payload),

  // [API cũ] Tìm kiếm phiếu với nguoiTaoId / nguoiDuyetId riêng biệt
  search: (payload: SearchPhieuRequest) =>
    apiService.post("/api/Phieus/search", payload),

  // [API mới] Tìm kiếm phiếu theo quyền user - backend tự tra BM_QuyenXL để lọc
  searchByUser: (payload: SearchPhieuByUserRequest) =>
    apiService.post("/api/Phieus/search-by-user", payload),
  syncNguoiTaoPhieu: (id: string, data: Record<string, unknown>) =>
    apiService.put(`/api/Phieus/${id}/sync-nguoi-tao`, data),
  exportDynamicPDF: (id: string, data: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/${id}/export-pdf`, { responseType: "blob" }),
  exportPdf: (id: string, filters?: string[]) => {
    const params = new URLSearchParams();
    if (filters && filters.length > 0) {
      filters.forEach((f) => params.append("filters", f));
    }
    const queryString = params.toString();
    const url = `/api/Phieus/${id}/export-pdf${queryString ? `?${queryString}` : ""}`;
    return apiService.get(url, { responseType: "blob" });
  },
  exportDetailExcel: (id: string) =>
    apiService.get(`/api/Phieus/${id}/export-excel-detail`, {
      responseType: "blob",
    }),
  exportDynamicExcelPhieu: (id: string) =>
    apiService.get(`/api/Phieus/${id}/export-excel`, {
      responseType: "blob",
    }),
  exportDynamicExcelTH: (params?: Record<string, unknown>) =>
    apiService.get(`/api/Phieus/export-excel-tonghop`, {
      params,
      responseType: "blob",
    }),
  getDsLoCao: () => apiService.get("/api/Phieus/DsLoCao"),

  chotNhieuPhieu: (idPhieus: string[], status: number) =>
    apiService.post("/api/Phieus/chot-nhieu-phieu", { idPhieus, status }),
  checkNhieuPhieu: (idPhieus: string[], isCheck: number) =>
    apiService.post("/api/Phieus/check-nhieu-phieu", { idPhieus, isCheck }),
  checkChotPhieuTieuHao: (ngaySX: string, ca: number) =>
    apiService.get(`/api/Phieus/hrc2-std-nxt/status?ngaySX=${ngaySX}&ca=${ca}`),

  getSoPhieu: (maBm: string, ngaySX?: string, ca?: number) => {
    const params: Record<string, unknown> = { maBm };
    if (ngaySX) params.ngaySX = ngaySX;
    if (ca) params.ca = ca;
    return apiService.get("/api/Phieus/so-phieu", { params });
  },

  getKipByDateCa: (ngayLamViec: string, ca: number) =>
    apiService.get("/api/Kip/by-date-ca", {
      params: { ngayLamViec, ca },
    }),

  resetPhieu: (id: string) => apiService.put(`/api/Phieus/${id}/reset`, {}),
};
