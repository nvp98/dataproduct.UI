import apiService from "./ApiService";

/** Tiền tố LSX: LenhSanXuat = "101000" + MaLenh (khớp DPV_LenhSanXuatService.TienToLSX). */
export const TIEN_TO_LSX = "101000";

export interface DPVLenhSanXuat {
  id: number;
  idPB?: number | null;
  idXuong?: number | null;
  mac: string;
  kichThuoc: string;
  mayDuc: number;
  maLenh?: string | null;
  lenhSanXuat?: string | null;
  ghiChu?: string | null;
  nguoiTao?: string | null;
  ngayTao?: string | null;
  nguoiCapNhat?: string | null;
  ngayCapNhat?: string | null;
  trungLSX: boolean;
  chuaCoMaLenh: boolean;
}

export interface DPVLenhSanXuatPayload {
  idPB?: number | null;
  idXuong?: number | null;
  mac: string;
  kichThuoc: string;
  mayDuc: number;
  maLenh?: string | null;
  ghiChu?: string | null;
}

export interface DPVLenhSanXuatSearchResponse {
  data: DPVLenhSanXuat[];
  totalRecords: number;
  soTrungLSX: number;
  soChuaCoMaLenh: number;
  page: number;
  pageSize: number;
}

export interface SinhLenhSanXuatResult {
  tongToHop: number;
  daCo: number;
  themMoi: number;
}

export const DPVLenhSanXuatApi = {
  search: async (params: {
    mac?: string;
    kichThuoc?: string;
    mayDuc?: number;
    idXuong?: number;
    searchKey?: string;
    chiCanhBao?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<DPVLenhSanXuatSearchResponse> => {
    const q: Record<string, string | number | boolean> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q[k] = v;
    });
    const res = (await apiService.get("/api/DPV_LenhSanXuat/search", { params: q })) as DPVLenhSanXuatSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      soTrungLSX: res.soTrungLSX ?? 0,
      soChuaCoMaLenh: res.soChuaCoMaLenh ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 50,
    };
  },

  create: async (payload: DPVLenhSanXuatPayload): Promise<void> => {
    await apiService.post("/api/DPV_LenhSanXuat", payload);
  },

  update: async (id: number, payload: DPVLenhSanXuatPayload): Promise<void> => {
    await apiService.put(`/api/DPV_LenhSanXuat/${id}`, payload);
  },

  // Xóa mềm
  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/DPV_LenhSanXuat/${id}`);
  },

  // tuNgay / denNgay dạng YYYY-MM-DD — khoảng ngày quét dữ liệu mẻ
  sinhTuDuLieuMe: async (params: {
    tuNgay: string;
    denNgay: string;
    idPB?: number | null;
    idXuong?: number | null;
  }): Promise<SinhLenhSanXuatResult> => {
    const q: Record<string, string | number> = { tuNgay: params.tuNgay, denNgay: params.denNgay };
    if (params.idPB != null) q.idPB = params.idPB;
    if (params.idXuong != null) q.idXuong = params.idXuong;
    return (await apiService.post("/api/DPV_LenhSanXuat/sinh-tu-du-lieu-me", null, { params: q })) as SinhLenhSanXuatResult;
  },
};
