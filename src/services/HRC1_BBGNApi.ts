import apiService from "./ApiService";
import { getThongTinUser } from "../utils/constants/GetThongTinLocalStore";

const userHeaders = () => {
  const u = getThongTinUser();
  return { "X-User-Id": String(u.iD_TaiKhoan ?? 0) };
};

// ── Response types ──────────────────────────────────────────────────────────

export interface HRC1_MeThepVm {
  id: number;
  mePhanCongId?: number | null;
  thuTuTL?: number | null;
  maMe?: string | null;
  thungSo?: string | null;
  loSo?: number | null;
  thoiGian?: string | null;       // TL nhập
  kllfSauThep?: number | null;    // LT nhập
  klLan1?: number | null;         // TL nhập (disabled nếu dichChuyen=len_thang)
  klLan2?: number | null;         // TL nhập
  klLan3?: number | null;         // LT nhập
  klThepLong?: number | null;     // Auto-tính (len_thang: KLLF-klLan2; tinh_luyen: klLan1-klLan2)
  dichChuyen?: string | null;
  tlDichSo?: number | null;
  idMayDucDich?: number | null;
  tenMayDucDich?: string | null;
  isThuNghiem?: boolean | null;
  isTrungMeThoi?: boolean | null;
  isGhost?: boolean | null;
  isChot?: boolean | null;
  ghiChuLo?: string | null;
  phanLoai?: string | null;
  macThep?: string | null;
  macThepBKMIS?: string | null;
  idMacThep?: number | null;
  ghiChuTL?: string | null;
  // Trạng thái
  trangThaiLo?: number | null;
  trangThaiTL?: number | null;
  trangThaiDuc?: number | null;
  // Lò thổi: TL đã nhận (scope TL; null = chưa nhận)
  soTinhLuyenNhan?: number | null;
  // Audit
  capNhatBoi?: number | null;
  capNhatLuc?: string | null;
  xacNhanBoi?: number | null;
  xacNhanLuc?: string | null;
  tenCapNhatBoi?: string | null;
}

export interface HRC1_ChoNhanMeVm {
  meId: number;
  maMe?: string | null;
  thungSo?: string | null;
  loSo?: number | null;
  thoiGian?: string | null;
  klThepLong?: number | null;
  tlDichSo?: number | null;
  dichChuyen?: string | null;       // tinh_luyen | len_thang
  soTinhLuyenNhan?: number | null;  // scope TL đã nhận; null = chưa nhận
  trangThaiTL?: number | null;      // 0/null=chờ nhận, 1=đã nhận
  tenNguoiNhan?: string | null;
}

export interface HRC1_MeChoNhanQuery {
  tuNgay?: string | null;
  denNgay?: string | null;
  ca?: number | null;
  maMe?: string | null;
  thungSo?: string | null;
  loSo?: number | null;
  page?: number;
  pageSize?: number;
}

export interface HRC1_MayDucOptionVm {
  id: number;
  tenMayDuc: string;
}

export interface HRC1_PhieuDataVm {
  idPhieu: string;
  soPhieu?: string | null;
  maBm?: string | null;
  congDoan?: string | null;
  scope?: number | null;
  ngaySX?: string | null;
  ca?: number | null;
  kip?: string | null;
  tinhTrang?: number | null;
  danhSachMe: HRC1_MeThepVm[];
  choNhan: HRC1_ChoNhanMeVm[];
  danhSachMayDuc: HRC1_MayDucOptionVm[];
}

// ── Request types ───────────────────────────────────────────────────────────

export interface HRC1_LoThoiUpdateRequest {
  thungSo?: string | null;
  kllfSauThep?: number | null;
  klLan3?: number | null;
  dichChuyen?: string | null;
  tlDichSo?: number | null;
  idMayDucDich?: number | null;
  isThuNghiem?: boolean | null;
  isTrungMeThoi?: boolean | null;
  ghiChuLo?: string | null;
}

export interface HRC1_TinhLuyenUpdateRequest {
  thoiGian?: string | null;
  klLan1?: number | null;
  klLan2?: number | null;
  klThepLong?: number | null;   // FE tự tính, gửi kèm để persist
  idMayDucDich?: number | null;
  phanLoai?: string | null;
  macThep?: string | null;
  macThepBKMIS?: string | null;
  idMacThep?: number | null;
  ghiChuTL?: string | null;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const HRC1Api = {
  getPhieu: (idPhieu: string): Promise<HRC1_PhieuDataVm> =>
    apiService.get(`/api/hrc1/phieu/${idPhieu}`) as Promise<HRC1_PhieuDataVm>,

  // Lò thổi
  updateLoThoi: (meId: number, req: HRC1_LoThoiUpdateRequest) =>
    apiService.put(`/api/hrc1/lo-thoi/${meId}`, req, { headers: userHeaders() }),
  xacNhanLoThoi: (meId: number) =>
    apiService.post(`/api/hrc1/lo-thoi/${meId}/xac-nhan`, null, { headers: userHeaders() }),
  boXacNhanLoThoi: (meId: number) =>
    apiService.post(`/api/hrc1/lo-thoi/${meId}/bo-xac-nhan`, null, { headers: userHeaders() }),
  lamMoiLoThoi: (meId: number) =>
    apiService.post(`/api/hrc1/lo-thoi/${meId}/lam-moi`, null, { headers: userHeaders() }),

  // Tinh luyện
  getChoNhan: (): Promise<HRC1_ChoNhanMeVm[]> =>
    apiService.get("/api/hrc1/tinh-luyen/cho-nhan") as Promise<HRC1_ChoNhanMeVm[]>,
  getMeChoNhan: (q: HRC1_MeChoNhanQuery): Promise<{ items: HRC1_ChoNhanMeVm[]; total: number }> =>
    apiService.get("/api/hrc1/tinh-luyen/me-cho-nhan", { params: q }) as Promise<{ items: HRC1_ChoNhanMeVm[]; total: number }>,
  nhanMe: (meId: number, idPhieu: string) =>
    apiService.post("/api/hrc1/tinh-luyen/nhan-me", { meId, idPhieu }, { headers: userHeaders() }),
  updateTinhLuyen: (mePhanCongId: number, req: HRC1_TinhLuyenUpdateRequest) =>
    apiService.put(`/api/hrc1/tinh-luyen/${mePhanCongId}`, req, { headers: userHeaders() }),
  themDong: (meId: number, idPhieu: string) =>
    apiService.post("/api/hrc1/tinh-luyen/them-dong", { meId, idPhieu }, { headers: userHeaders() }),
  huyNhanMe: (meId: number, idPhieu: string) =>
    apiService.post("/api/hrc1/tinh-luyen/huy-nhan-me", { meId, idPhieu }, { headers: userHeaders() }),
  // Máy đúc
  xacNhanDuc: (meIds: number[]) =>
    apiService.post("/api/hrc1/duc/xac-nhan", { meIds }, { headers: userHeaders() }),
  boXacNhanDuc: (meIds: number[]) =>
    apiService.post("/api/hrc1/duc/bo-xac-nhan", { meIds }, { headers: userHeaders() }),

  // Đồng bộ mẻ thổi từ gang lỏng → trả về phiếu cập nhật
  syncLoThoi: (idPhieu: string): Promise<HRC1_PhieuDataVm> =>
    apiService.post(`/api/hrc1/phieu/${idPhieu}/sync-lo-thoi`, null) as Promise<HRC1_PhieuDataVm>,

  // Xóa cứng mẻ ghost (user chủ động xóa thủ công)
  xoaMeGhost: (meId: number) =>
    apiService.delete(`/api/hrc1/lo-thoi/me/${meId}`, { headers: userHeaders() }),
};
