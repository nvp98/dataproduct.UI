import apiService from "./ApiService";

export interface PhieuDieuChinhBBGNDto {
  // 1 = từ SP_Get_BBGN (Nhập - Xuất), 2 = từ Sp_GetNVLNapLieuLoCao (Nội bộ - Xuất SX)
  loaiDieuChinh: number;
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
  nguoiDieuChinhGiao: number | null;
  thoiGianDieuChinhGiao: string | null;
  nguoiDieuChinhNhan: number | null;
  thoiGianDieuChinhNhan: string | null;
  // 0 = chưa xác nhận (còn sửa được), 1 = đã xác nhận (khóa dòng)
  trangThai: number;
  nguoiTao: string | null;
  thoiGianTao: string;
  nguoiSua: string | null;
  thoiGianSua: string | null;
  // Khóa liên kết ngược tới dòng BBGN nguồn — dùng để khớp lại dòng cũ khi bấm "Tải dữ liệu"
  // lần sau, tránh mất số liệu điều chỉnh tay đã nhập cho dòng này (null nếu dòng nhập tay).
  idCtBBGN: number | null;
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
  nguoiDieuChinhGiao?: number | null;
  thoiGianDieuChinhGiao?: string | null;
  nguoiDieuChinhNhan?: number | null;
  thoiGianDieuChinhNhan?: string | null;
  trangThai?: number | null;
  idCtBBGN?: number | null;
}

// Danh mục NVL cho Phiếu điều chỉnh — ánh xạ bảng LG_PhieuDieuChinh_NVL (PRODUCT_FORM)
export interface LGPhieuDieuChinhNvlDto {
  id: number;
  tenNVL: string;
  isActive: boolean;
}

export const phieuDieuChinhApi = {
  getBBGN: (params: GetBBGNParams) =>
    apiService.get<PhieuDieuChinhBBGNDto[]>("/api/PhieuDieuChinh/get-bbgn", { params }),

  // Nguồn "Nội bộ - Xuất SX" — dữ liệu Nạp liệu lò cao (dbo.Sp_GetNVLNapLieuLoCao), cùng hình
  // dạng trả về với getBBGN (dùng chung PhieuDieuChinhBBGNDto).
  getNapLieuLoCao: (params: GetBBGNParams) =>
    apiService.get<PhieuDieuChinhBBGNDto[]>("/api/PhieuDieuChinh/get-naplieulocao", { params }),

  // Gộp cả 2 nguồn (BBGN + Nạp liệu lò cao) trong 1 lần gọi — mỗi dòng tự mang theo
  // loaiDieuChinh để FE phân vào đúng Tab.
  getNguon: (params: GetBBGNParams) =>
    apiService.get<PhieuDieuChinhBBGNDto[]>("/api/PhieuDieuChinh/get-nguon", { params }),

  getChiTiet: (idPhieu: string) =>
    apiService.get<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/chi-tiet`),

  // Tải dữ liệu nguồn từ BBGN và insert thẳng vào DB cho phiếu đã lưu (giống luồng
  // "Tải dữ liệu" của Nạp liệu lò cao) — ghi đè toàn bộ chi tiết cũ của phiếu.
  syncTuBBGN: (idPhieu: string, nguoiThucHien?: string | null) =>
    apiService.post<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/sync-tu-bbgn`, {
      nguoiThucHien: nguoiThucHien ?? null,
    }),

  // Tải dữ liệu nguồn "Nội bộ - Xuất SX" từ Nạp liệu lò cao và insert thẳng vào DB cho phiếu
  // đã lưu — song song với syncTuBBGN, chỉ ghi đè các dòng gắn LoaiDieuChinh = 2.
  syncTuNapLieuLoCao: (idPhieu: string, nguoiThucHien?: string | null) =>
    apiService.post<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/sync-tu-naplieulocao`, {
      nguoiThucHien: nguoiThucHien ?? null,
    }),

  // Gộp cả 2 nguồn cho phiếu đã lưu — 1 lần gọi đồng bộ cả BBGN lẫn Nạp liệu lò cao.
  syncTuNguon: (idPhieu: string, nguoiThucHien?: string | null) =>
    apiService.post<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/sync-tu-nguon`, {
      nguoiThucHien: nguoiThucHien ?? null,
    }),

  // Ghi đè toàn bộ chi tiết của phiếu (xóa cũ, ghi lại theo danh sách mới)
  saveChiTiet: (idPhieu: string, items: SavePhieuDieuChinhChiTietDto[], nguoiSua?: string | null) =>
    apiService.put<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/${idPhieu}/chi-tiet`, {
      items,
      nguoiSua: nguoiSua ?? null,
    }),

  // Tích/hủy tích xác nhận "Người điều chỉnh giao" cho 1 dòng chi tiết — lưu ngay xuống DB,
  // không cần chờ Lưu cả phiếu. Chỉ gọi với dòng đã có id thật (đã Lưu/đã sync BBGN).
  xacNhanGiao: (id: number, confirmed: boolean, idNguoiThucHien?: number | null) =>
    apiService.put<PhieuDieuChinhChiTietDto>(`/api/PhieuDieuChinh/chi-tiet/xac-nhan-giao/${id}`, {
      confirmed,
      idNguoiThucHien: idNguoiThucHien ?? null,
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
