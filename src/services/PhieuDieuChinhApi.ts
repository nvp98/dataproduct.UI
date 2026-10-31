import apiService from "./ApiService";

// Nguồn Nạp liệu lò cao ("Nội bộ - Xuất SX"), chia sẵn theo lò cao
export interface PhieuDieuChinhBBGNDto {
  // 2 = từ Nạp liệu lò cao (Nội bộ - Xuất SX)
  loaiDieuChinh: number;
  idCtBBGN: number;
  // ID lò cao (Tbl_LoCao) tra từ xưởng nhận
  idLoCao: number | null;
  // Ca của dòng nguồn (1/2)
  idCa: number | null;
  thoiGianXuLyBG: string | null;
  idXuongBG: number | null;
  tenXuongGiao: string | null;
  idPhongBanGiao: number | null;
  tenPhongBanGiao: string | null;
  tenNganPhongBanGiao: string | null;
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

export interface GetNguonParams {
  ngay: string; // yyyy-MM-dd
  // Phòng ban của phiếu (từ file cấu hình biểu mẫu) — giới hạn lò cao/xưởng theo LG_PDC_Scope_PhongBan
  idPhongBan?: number;
  // Phiếu đã lưu: đọc các dòng phiếu đang giữ trong database (bản chụp ghi lúc "Tải dữ liệu nguồn").
  // Bỏ trống (phiếu mới chưa lưu): xem trước thẳng từ nguồn BBGN, chưa ghi gì.
  idPhieu?: string;
}

// Kết quả "Tải dữ liệu nguồn" của phiếu đã lưu: số dòng Nhập/Xuất đã ghi vào database cho phiếu
export interface DongBoBBGNResult {
  soDongNhap: number;
  soDongXuat: number;
  /** Dòng bỏ qua vì đang do phiếu khác (còn hiệu lực) của cùng bên giữ */
  soDongBoQua: number;
}

// Ca của dòng: 1 = ca ngày, 2 = ca đêm
export const tenCa = (idCa: number | string | null | undefined): string =>
  String(idCa) === "1" ? "Ca ngày" : String(idCa) === "2" ? "Ca đêm" : "—";

// Loại điều chỉnh của phần Nhập / Xuất, cùng giá trị LoaiDieuChinh ở backend (2 = Nội bộ):
// 1 = Nhập (xưởng nhận thuộc phòng ban), 3 = Xuất (xưởng giao thuộc phòng ban)
export const LOAI_BBGN_NHAP = 1;
export const LOAI_BBGN_XUAT = 3;
export type LoaiBBGN = typeof LOAI_BBGN_NHAP | typeof LOAI_BBGN_XUAT;

// 1 dòng BBGN ở phần Nhập/Xuất — kèm số điều chỉnh của CẢ 2 bên (số của bên kia đọc từ dòng của bên kia, theo idCtBBGN).
// Độ ẩm lấy từ BBGN, không nhập tay.
export interface PhieuDieuChinhBBGNLineDto {
  idCtBBGN: number;
  idVatTu: number | null;
  tenVatTu: string | null;
  maLo: string | null;
  idCa: number | null;
  thoiGianXuLyBG: string | null;
  idXuongGiao: number | null;
  tenXuongGiao: string | null;
  tenPhongBanGiao: string | null;
  idXuongNhan: number | null;
  tenXuongNhan: string | null;
  tenPhongBanNhan: string | null;
  // Id tab chứa dòng = xưởng của bên đang xem (Nhập: xưởng nhận, Xuất: xưởng giao)
  idTab: number | null;
  doAm: number | null;
  loaiSoDieuChinh: number | null;
  khoiLuongXuat: number | null;
  klQuyKhoXuat: number | null;
  ghiChuXuat: string | null;
  nguoiXuat: number | null;
  thoiGianXuat: string | null;
  khoiLuongNhap: number | null;
  klQuyKhoNhap: number | null;
  ghiChuNhap: string | null;
  nguoiNhap: number | null;
  thoiGianNhap: string | null;
}

export interface GetBBGNParams {
  ngay: string; // yyyy-MM-dd
  // Phòng ban của phiếu (từ file cấu hình biểu mẫu) — giới hạn phạm vi xưởng theo LG_PDC_Scope_PhongBan
  idPhongBan?: number;
}

// Số điều chỉnh của 1 bên cho 1 dòng BBGN. KL quy khô do BE tự tính từ khối lượng + loại số + độ ẩm.
// Mỗi phiếu có dòng riêng trong LG_PhieuDieuChinh_ChiTiet (Nhập = loại 1, Xuất = loại 3) nên kèm thông tin mô tả dòng BBGN.
export interface SavePhieuDieuChinhBBGNDto {
  idCtBBGN: number;
  idVatTu?: number | null;
  tenVatTu?: string | null;
  maLo?: string | null;
  tenXuongGiao?: string | null;
  tenPhongBanGiao?: string | null;
  tenXuongNhan?: string | null;
  tenPhongBanNhan?: string | null;
  loaiSoDieuChinh?: number | null;
  khoiLuong?: number | null;
  doAm?: number | null;
  ghiChu?: string | null;
  // Chỉ để ghi vào thông báo lỗi cho dễ nhận ra dòng
  moTa?: string | null;
}

// Chi tiết Phiếu điều chỉnh (phần Nội bộ - Xuất SX) — ánh xạ bảng LG_PhieuDieuChinh_ChiTiet
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
  nguoiDieuChinhNhan: number | null;
  thoiGianDieuChinhNhan: string | null;
  nguoiTao: string | null;
  thoiGianTao: string;
  nguoiSua: string | null;
  thoiGianSua: string | null;
  // Khóa liên kết ngược tới dòng nguồn — dùng để khớp lại dòng cũ khi bấm "Tải dữ liệu" lần sau,
  // tránh mất số liệu điều chỉnh tay đã nhập cho dòng này (null nếu dòng nhập tay).
  idCtBBGN: number | null;
  // ID lò cao của dòng — dùng chia dòng vào các tab lò cao
  idLoCao: number | null;
  // Ca của dòng (1/2)
  idCa: number | null;
  // Phòng ban của phiếu (từ file cấu hình biểu mẫu)
  idPhongBan: number | null;
}

export interface SavePhieuDieuChinhChiTietDto {
  // Có id = dòng đã lưu (cập nhật tại chỗ); không có = dòng mới
  id?: number | null;
  // thoiGianSua lúc tải — BE dùng để phát hiện người khác đã sửa dòng này (409)
  thoiGianSua?: string | null;
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
  nguoiDieuChinhNhan?: number | null;
  thoiGianDieuChinhNhan?: string | null;
  idCtBBGN?: number | null;
  idLoCao?: number | null;
  idCa?: number | null;
  // Phòng ban của phiếu (từ file cấu hình biểu mẫu)
  idPhongBan?: number | null;
}

// Lò cao hiển thị thành tab — chỉ lò còn trong cả Tbl_LoCao lẫn LG_PB_Map_Xuong_LoCao

// Xưởng của 1 phòng ban — mỗi xưởng 1 tab trong phiếu theo phòng ban
export interface PhieuDieuChinhXuongDto {
  id: number;
  ten: string;
}

export const phieuDieuChinhApi = {
  // ─── Danh mục ───────────────────────────────────────────────────────────
  getDanhMucXuong: (idPhongBan: number) =>
    apiService.get<PhieuDieuChinhXuongDto[]>("/api/PhieuDieuChinh/danh-muc-xuong", { params: { idPhongBan } }),

  // ─── Nhập / Xuất từ BBGN ────────────────────────────────────────────────
  // Các dòng BBGN của các xưởng lò cao theo Ngày/Ca/Kíp (loai = 1 Nhập | 3 Xuất), kèm số điều chỉnh của cả 2 bên.
  getBBGN: (loai: LoaiBBGN, params: GetBBGNParams) =>
    apiService.get<PhieuDieuChinhBBGNLineDto[]>(`/api/PhieuDieuChinh/bbgn/${loai}`, { params }),

  // "Tải dữ liệu nguồn" của phiếu ĐÃ LƯU: ghi các dòng BBGN Nhập/Xuất vào database cho phiếu. Chạy lại thì thêm dòng mới,
  // làm mới mô tả và giữ nguyên số đã điều chỉnh.
  dongBoBBGN: (idPhieu: string, body: { idPhongBan: number; ngay?: string; idNguoiThucHien?: number | null }) =>
    apiService.post<DongBoBBGNResult>(`/api/PhieuDieuChinh/bbgn/dong-bo/${idPhieu}`, body),

  // Lưu số điều chỉnh của 1 bên vào phiếu. Bên kia đã nhập mà khối lượng khác → BE trả 400 (kèm message), không lưu.
  // Bên `loai` xóa số điều chỉnh của bên kia cho 1 dòng BBGN — bắt buộc ghi chú (lý do)
  resetBenKiaBBGN: (
    loai: LoaiBBGN,
    idPhieu: string,
    idCtBBGN: number,
    ghiChu: string,
    idNguoiThucHien?: number | null,
  ) =>
    apiService.post<{ success: boolean }>(`/api/PhieuDieuChinh/bbgn/${loai}/${idPhieu}/reset`, {
      idCtBBGN,
      ghiChu,
      idNguoiThucHien: idNguoiThucHien ?? null,
    }),

  saveBBGN: (
    loai: LoaiBBGN,
    idPhieu: string,
    items: SavePhieuDieuChinhBBGNDto[],
    idNguoiThucHien?: number | null,
    idPhongBan?: number | null,
  ) =>
    apiService.put<{ success: boolean }>(`/api/PhieuDieuChinh/bbgn/${loai}/${idPhieu}`, {
      items,
      idNguoiThucHien: idNguoiThucHien ?? null,
      idPhongBan: idPhongBan ?? null,
    }),

  // ─── Nội bộ - Xuất vào sản xuất (Nạp liệu lò cao) ───────────────────────
  // Nguồn Nạp liệu lò cao theo Ngày/Ca/Kíp, chia theo lò cao — dùng cho phiếu mới chưa lưu.
  getNapLieuLoCao: (params: GetNguonParams) =>
    apiService.get<PhieuDieuChinhBBGNDto[]>("/api/PhieuDieuChinh/nguondulieu/nap-lieu-lo-cao", { params }),

  // idLoCao: chỉ lấy dòng của lò cao đó (BE lọc); bỏ trống = lấy tất cả
  // Toàn bộ dòng Nội bộ của phiếu; dòng thuộc xưởng nào do idLoCao (= ID xưởng nhận)
  getChiTiet: (idPhieu: string) =>
    apiService.get<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/chi-tiet/${idPhieu}`),

  // Tải dữ liệu nguồn Nạp liệu lò cao và insert thẳng vào DB cho phiếu đã lưu, chia theo lò cao —
  // chỉ ghi đè các dòng gắn LoaiDieuChinh = 2.
  syncTuNapLieuLoCao: (idPhieu: string, nguoiThucHien?: string | null, idPhongBan?: number) =>
    apiService.post<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/dong-bo/nap-lieu-lo-cao/${idPhieu}`, {
      nguoiThucHien: nguoiThucHien ?? null,
      idPhongBan: idPhongBan ?? null,
    }),

  // Lưu chi tiết theo từng dòng (upsert theo id) + xóa mềm các dòng trong deletedIds.
  saveChiTiet: (
    idPhieu: string,
    items: SavePhieuDieuChinhChiTietDto[],
    nguoiSua?: string | null,
    deletedIds: number[] = [],
  ) =>
    apiService.put<PhieuDieuChinhChiTietDto[]>(`/api/PhieuDieuChinh/chi-tiet/${idPhieu}`, {
      items,
      deletedIds,
      nguoiSua: nguoiSua ?? null,
    }),

};
