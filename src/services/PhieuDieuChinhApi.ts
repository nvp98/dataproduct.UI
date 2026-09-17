import apiService from "./ApiService";

export interface PhieuDieuChinhBBGNDto {
  idCtBBGN: number;
  kip: string | null;
  ca: string | null;
  thoiGianXuLyBG: string | null;
  // Bên giao — tên Xưởng/Phòng ban (join sẵn trong SP_Get_BBGN)
  idXuongBG: number | null;
  tenXuongGiao: string | null;
  idPhongBanGiao: number | null;
  tenPhongBanGiao: string | null;
  tenNganPhongBanGiao: string | null;
  // Bên nhận — tên Xưởng/Phòng ban
  idXuongBN: number | null;
  tenXuongNhan: string | null;
  idPhongBanNhan: number | null;
  tenPhongBanNhan: string | null;
  tenNganPhongBanNhan: string | null;
  idVatTu: number | null;
  tenVatTu: string | null;
  maLo: string | null;
  doAm: number | null;
  khoiLuongBG: number | null;
  klQuyKhoBG: number | null;
  khoiLuongBN: number | null;
  klQuyKhoBN: number | null;
  ghiChu: string | null;
}

export interface GetBBGNParams {
  ngay: string; // yyyy-MM-dd
  ca?: number;
  kip?: string;
}

// Chi tiết Phiếu điều chỉnh — ánh xạ bảng LG_PhieuDieuChinh_ChiTiet
export interface PhieuDieuChinhChiTietDto {
  id: number;
  idPhieu: string;
  idNVL: number | null;
  tenNVL: string;
  idNVLChiTiet: number | null;
  idNhomNVL: number | null;
  dvt: string | null;
  maLo: string | null;
  thuTu: number | null;
  loaiDieuChinh: number | null;
  loaiSoDieuChinh: number | null;
  phongBanXuat: string | null;
  xuongXuat: string | null;
  khoiLuongXuat: number | null;
  khoiLuongQuyKhoXuat: number | null;
  phongBanNhap: string | null;
  xuongNhap: string | null;
  khoiLuongNhap: number | null;
  khoiLuongQuyKhoNhap: number | null;
  doAm: number | null;
  viTri: string | null;
  phanLoai: string | null;
  ghiChu: string | null;
  nguoiTao: string | null;
  thoiGianTao: string;
  nguoiSua: string | null;
  thoiGianSua: string | null;
}

export interface SavePhieuDieuChinhChiTietDto {
  idNVL?: number | null;
  tenNVL: string;
  idNVLChiTiet?: number | null;
  idNhomNVL?: number | null;
  dvt?: string | null;
  maLo?: string | null;
  thuTu?: number | null;
  loaiDieuChinh?: number | null;
  loaiSoDieuChinh?: number | null;
  phongBanXuat?: string | null;
  xuongXuat?: string | null;
  khoiLuongXuat?: number | null;
  khoiLuongQuyKhoXuat?: number | null;
  phongBanNhap?: string | null;
  xuongNhap?: string | null;
  khoiLuongNhap?: number | null;
  khoiLuongQuyKhoNhap?: number | null;
  doAm?: number | null;
  viTri?: string | null;
  phanLoai?: string | null;
  ghiChu?: string | null;
}

// Danh mục NVL cho Phiếu điều chỉnh — ánh xạ bảng LG_PhieuDieuChinh_NVL (PRODUCTDATA)
export interface LGPhieuDieuChinhNvlDto {
  id: number;
  tenNVL: string;
  isActive: boolean;
}

export const phieuDieuChinhApi = {
  getBBGN: (params: GetBBGNParams) =>
    apiService.get<PhieuDieuChinhBBGNDto[]>("/api/PhieuDieuChinh/get-bbgn", { params }),

  getChiTiet: (idPhieu: string) =>
    apiService.get<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/chi-tiet`),

  // Ghi đè toàn bộ chi tiết của phiếu (xóa cũ, ghi lại theo danh sách mới)
  saveChiTiet: (idPhieu: string, items: SavePhieuDieuChinhChiTietDto[], nguoiSua?: string | null) =>
    apiService.put<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/chi-tiet`, {
      items,
      nguoiSua: nguoiSua ?? null,
    }),

  // Danh mục NVL (LG_PhieuDieuChinh_NVL) — CRUD
  getNvlList: (onlyActive = true) =>
    apiService.get<LGPhieuDieuChinhNvlDto[]>("/api/PhieuDieuChinh/nvl", { params: { onlyActive } }),
  createNvl: (tenNVL: string) =>
    apiService.post<LGPhieuDieuChinhNvlDto>("/api/PhieuDieuChinh/nvl", { tenNVL }),
  updateNvl: (id: number, tenNVL: string, isActive: boolean) =>
    apiService.put<LGPhieuDieuChinhNvlDto>(`/api/PhieuDieuChinh/nvl/${id}`, { tenNVL, isActive }),
  deleteNvl: (id: number) => apiService.delete(`/api/PhieuDieuChinh/nvl/${id}`),
};
