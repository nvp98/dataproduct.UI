import apiService from "./ApiService";

// 2 bảng tra cứu của form Giao nhận Xưởng Đúc phôi vuông (KDL HRC1_DPV_GN).
// Nghiệp vụ: docs/BCSX_HRC1_DucVuong/03-GiaoNhan-Form-Dong.md §5

export interface XuongChuanHoa {
  id: number;
  idXuong?: number | null;
  xuong: string;
  idPhongBan?: number | null;
  boPhan: string;
  vietTat: string;
  thuTu: number;
  isActive: boolean;
  nguoiCapNhat?: string | null;
  ngayCapNhat?: string | null;
}

export interface NvlChuanHoa {
  id: number;
  idVatTu?: number | null;
  tenVatTu: string;
  xuongVietTat: string;
  nhom1: string;
  cauHinhPhanBo: boolean;
  thuTu: number;
  isActive: boolean;
  nguoiCapNhat?: string | null;
  ngayCapNhat?: string | null;
}

export type XuongChuanHoaPayload = Partial<Omit<XuongChuanHoa, "id" | "nguoiCapNhat" | "ngayCapNhat">>;
export type NvlChuanHoaPayload = Partial<Omit<NvlChuanHoa, "id" | "nguoiCapNhat" | "ngayCapNhat">>;

export interface XuongChuaMap {
  xuong: string;
  boPhan: string;
  idXuong?: number | null;
  idPhongBan?: number | null;
  /** "Bên nhận" | "Bên giao" | "Bên nhận, Bên giao" */
  ben: string;
  soDong: number;
}

export interface NvlChuaMap {
  tenVatTu: string;
  xuongVietTat: string;
  soDong: number;
}

export interface ChuaMap {
  xuong: XuongChuaMap[];
  nvl: NvlChuaMap[];
}

/** 1 cột của bảng tổng hợp theo nhóm. chieu: "Giao" | "Nhận" | "" (Chưa map). */
export interface CotNhom {
  ma: string;
  chieu: string;
  xuong: string;
  nhom1: string;
}

export interface DongNhom {
  ngaySX: string;
  caSX?: number | null;
  kip?: string | null;
  soDong: number;
  /** Σ Số liệu sau điều chỉnh (kg) theo CotNhom.ma */
  giaTri: Record<string, number>;
}

export interface TongHopNhom {
  cot: CotNhom[];
  dong: DongNhom[];
  tong: Record<string, number>;
  tongCong: number;
}

/** Khối NVL được phân bổ = (Nhóm 1, Xưởng viết tắt) có cờ Cấu hình phân bổ. */
export interface PhanBoKhoi {
  ma: string;
  nhom1: string;
  xuong: string;
}

export interface PhanBoO {
  tongCa: number;
  phanBo: number;
  dieuChinh?: number | null;
  lyDo?: string | null;
  phanBoCuoi: number;
  check: number;
}

export interface PhanBoDong {
  ngaySX: string;
  caSX: number;
  kip?: string | null;
  maDong: string;
  /** "" = ca chưa có LSX */
  lenhSanXuat: string;
  soLenhTrongCa: number;
  dauCa: boolean;
  soDongCa: number;
  ghiChu?: string | null;
  o: Record<string, PhanBoO>;
}

export interface PhanBoKetQua {
  khoi: PhanBoKhoi[];
  dong: PhanBoDong[];
}

export interface PhanBoDieuChinhPayload {
  ngaySX: string;
  caSX: number;
  kip?: string | null;
  lenhSanXuat: string;
  ghiChu?: string | null;
  dieuChinh: { nhom1: string; xuongVietTat: string; dieuChinh?: number | null; lyDo?: string | null }[];
}

const BASE = "/api/HRC1_BCChuanHoa";

const taiFile = (blob: Blob, tenFile: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile;
  a.click();
  URL.revokeObjectURL(url);
};

export const HRC1BCChuanHoaApi = {
  getXuong: async (): Promise<XuongChuanHoa[]> => (await apiService.get(`${BASE}/xuong`)) as XuongChuanHoa[],
  createXuong: async (p: XuongChuanHoaPayload): Promise<XuongChuanHoa> =>
    (await apiService.post(`${BASE}/xuong`, p)) as XuongChuanHoa,
  updateXuong: async (id: number, p: XuongChuanHoaPayload): Promise<XuongChuanHoa> =>
    (await apiService.put(`${BASE}/xuong/${id}`, p)) as XuongChuanHoa,

  getNvl: async (): Promise<NvlChuanHoa[]> => (await apiService.get(`${BASE}/nvl`)) as NvlChuanHoa[],
  createNvl: async (p: NvlChuanHoaPayload): Promise<NvlChuanHoa> => (await apiService.post(`${BASE}/nvl`, p)) as NvlChuanHoa,
  updateNvl: async (id: number, p: NvlChuanHoaPayload): Promise<NvlChuanHoa> =>
    (await apiService.put(`${BASE}/nvl/${id}`, p)) as NvlChuanHoa,

  getChuaMap: async (tuNgay: string, denNgay: string): Promise<ChuaMap> =>
    (await apiService.get(`${BASE}/chua-map`, { params: { tuNgay, denNgay } })) as ChuaMap,

  getTongHopNhom: async (tuNgay: string, denNgay: string): Promise<TongHopNhom> =>
    (await apiService.get(`${BASE}/tong-hop-nhom`, { params: { tuNgay, denNgay } })) as TongHopNhom,

  getPhanBo: async (tuNgay: string, denNgay: string): Promise<PhanBoKetQua> =>
    (await apiService.get(`${BASE}/phan-bo`, { params: { tuNgay, denNgay } })) as PhanBoKetQua,

  luuDieuChinhPhanBo: async (p: PhanBoDieuChinhPayload): Promise<void> => {
    await apiService.put(`${BASE}/phan-bo/dieu-chinh`, p);
  },

  exportPhanBo: async (tuNgay: string, denNgay: string): Promise<void> => {
    const blob = (await apiService.get(`${BASE}/phan-bo/export-excel`, {
      params: { tuNgay, denNgay },
      responseType: "blob",
    })) as unknown as Blob;
    taiFile(blob, `PhanBo_BBGN_DPV_${tuNgay.replace(/-/g, "")}_${denNgay.replace(/-/g, "")}.xlsx`);
  },

  exportTongHopNhom: async (tuNgay: string, denNgay: string): Promise<void> => {
    const blob = (await apiService.get(`${BASE}/tong-hop-nhom/export-excel`, {
      params: { tuNgay, denNgay },
      responseType: "blob",
    })) as unknown as Blob;
    taiFile(blob, `TongHopNhom_GiaoNhan_DPV_${tuNgay.replace(/-/g, "")}_${denNgay.replace(/-/g, "")}.xlsx`);
  },
};
