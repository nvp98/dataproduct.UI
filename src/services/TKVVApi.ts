import apiService from "./ApiService";

// ─── Danh mục NVL (sản phẩm theo biểu mẫu) ───────────────────────────────────

export interface TKVVNguyenVatLieuDto {
  id: number;
  maBM: string;
  tenNVL: string;
  donViTinh: string | null;
  thuTu: number | null;
  trangThai: boolean;
  ghiChu: string | null;
  scope: string | null;
  tenScope: string | null;
}

export interface CreateTKVVNguyenVatLieuDto {
  maBM: string;
  tenNVL: string;
  donViTinh?: string | null;
  thuTu?: number | null;
  ghiChu?: string | null;
  scope?: string | null;
  tenScope?: string | null;
}

export interface UpdateTKVVNguyenVatLieuDto extends CreateTKVVNguyenVatLieuDto {
  trangThai: boolean;
}

export const tkvvNvlApi = {
  getList: (params?: { maBM?: string; scope?: string }): Promise<TKVVNguyenVatLieuDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-nvl", { params }),

  getById: (id: number): Promise<TKVVNguyenVatLieuDto> =>
    apiService.get(`/api/TKVV_BBSL/get-nvl/${id}`),

  create: (dto: CreateTKVVNguyenVatLieuDto): Promise<TKVVNguyenVatLieuDto> =>
    apiService.post("/api/TKVV_BBSL/create-nvl", dto),

  update: (id: number, dto: UpdateTKVVNguyenVatLieuDto): Promise<TKVVNguyenVatLieuDto> =>
    apiService.put(`/api/TKVV_BBSL/update-nvl/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-nvl/${id}`),
};

// ─── Mapping NVL ↔ Tag EMS + Ca (TKVV_NVL_TagMapping) ───────────────────────
// Scope không lưu ở mapping — kế thừa từ NVL qua NguyenVatLieuID.

// PhanLoai cố định theo cột trên biểu mẫu giấy: 1=Loại 1, 2=Loại 2, 3=Loại 3, 4=Phế phẩm
export type TKVVPhanLoai = 1 | 2 | 3 | 4;

export interface TKVVMappingDto {
  id: number;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  scopeNVL: string | null;
  tagIDEMS: string;
  ca: number;
  trangThai: boolean;
  ghiChu: string | null;
  ngayCapNhat: string;
}

export interface CreateTKVVMappingDto {
  nguyenVatLieuID: number;
  tagIDEMS: string;
  ca: number;
  ghiChu?: string | null;
}

export interface UpdateTKVVMappingDto extends CreateTKVVMappingDto {
  trangThai: boolean;
}

export const tkvvMappingApi = {
  getList: (): Promise<TKVVMappingDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-mapping"),

  getById: (id: number): Promise<TKVVMappingDto> =>
    apiService.get(`/api/TKVV_BBSL/get-mapping/${id}`),

  create: (dto: CreateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.post("/api/TKVV_BBSL/create-mapping", dto),

  update: (id: number, dto: UpdateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.put(`/api/TKVV_BBSL/update-mapping/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-mapping/${id}`),
};

// ─── Danh mục cân từ EMS (dbo.EMS_GetMappingTag) ──────────────────────────────

export interface EMSMappingTagDto {
  id: number;
  xuong: string;
  loai: string | null;
  maCan: string | null;
  tenCan: string | null;
  tagIDEMS: string;
  tagName: string;
  ca: number | null; // 1=ca ngày, 2=ca đêm, null=đang tích lũy ca hiện tại (LoaiDuLieu="0")
  ghiChu: string | null;
}

export const tkvvEmsTagApi = {
  getList: (params?: { xuong?: string; tagName?: string }): Promise<EMSMappingTagDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-ems-tags", { params }),
};

// ─── Mapping Cân (EMS) → Xưởng theo Ngày/Ca/Kíp (TKVV_SanLuongMapping) ──────
// Xác định Tag của cân nào (trong "Danh mục Cân") tính vào Xưởng nào, hiệu lực
// trong khoảng (TuNgay, DenNgay) — dùng bởi GetTongTuDongAsync (Tổng tự động PLC).
// Kíp chỉ để ghi chú/lọc hiển thị, KHÔNG được lọc khi tính tổng tự động hiện tại.

export interface TKVVSanLuongMappingDto {
  id: number;
  tagID: string;
  scope: string;
  ca: number;
  kip: string | null;
  tuNgay: string | null;
  denNgay: string | null;
  trangThai: boolean;
  ghiChu: string | null;
  ngayTao: string;
  nguoiTaoID: number | null;
  tenCan: string | null; // join hiển thị từ danh mục Cân EMS theo tagID, có thể null nếu không khớp
}

export interface CreateTKVVSanLuongMappingDto {
  tagID: string;
  scope: string;
  ca: number;
  kip?: string | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  ghiChu?: string | null;
  nguoiTaoID?: number | null;
}

export interface UpdateTKVVSanLuongMappingDto extends CreateTKVVSanLuongMappingDto {
  trangThai: boolean;
}

export const tkvvSanLuongMappingApi = {
  getList: (params?: { scope?: string }): Promise<TKVVSanLuongMappingDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-sanluong-mapping", { params }),

  getById: (id: number): Promise<TKVVSanLuongMappingDto> =>
    apiService.get(`/api/TKVV_BBSL/get-sanluong-mapping/${id}`),

  create: (dto: CreateTKVVSanLuongMappingDto): Promise<TKVVSanLuongMappingDto> =>
    apiService.post("/api/TKVV_BBSL/create-sanluong-mapping", dto),

  update: (id: number, dto: UpdateTKVVSanLuongMappingDto): Promise<TKVVSanLuongMappingDto> =>
    apiService.put(`/api/TKVV_BBSL/update-sanluong-mapping/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-sanluong-mapping/${id}`),
};

// ─── Dữ liệu PLC thô ──────────────────────────────────────────────────────────

export interface TKVVDuLieuRawDto {
  id: number;
  tagID: string;
  giaTriTuDong: number | null; // giá trị PLC gốc, ghi đè mỗi lần "Tải dữ liệu"
  giaTriDieuChinh: number | null; // KTV/KCS chỉnh tay khi nghi ngờ PLC báo sai; null nếu chưa chỉnh
  ngay: string;
  ca: number;
  scope: string;
  thoiGian: string | null;
}

export const tkvvDuLieuApi = {
  getByFilter: (params: {
    scope?: string;
    ngayBatDau?: string;
    ngayKetThuc?: string;
  }): Promise<TKVVDuLieuRawDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-datasanluong-filter", { params }),

  updateGiaTriDieuChinh: (id: number, giaTriDieuChinh: number | null): Promise<{ message: string }> =>
    apiService.put(`/api/TKVV_BBSL/dulieu-tho/${id}/dieu-chinh`, { giaTriDieuChinh }),
};

// ─── Đồng bộ dữ liệu cân/PLC thô (SP_TKVV_GetDuLieuCan_TuMapping) → TKVV_SanLuongDuLieu ─
// Nút "Tải dữ liệu": SP join TKVV_SanLuongMapping với EMS_DATA_CAN (theo Ngày/Ca/Xưởng),
// backend ghi các dòng mới (bỏ qua dòng đã có sẵn theo TagID+ThoiGian) vào TKVV_SanLuongDuLieu.
// Chỉ đồng bộ dữ liệu thô — KHÔNG ghi/tự điền bất cứ gì vào bảng chi tiết của phiếu.

export const tkvvSyncDuLieuApi = {
  syncTuEms: (dto: { ngay: string; ca: number; scope: number }): Promise<{ message: string; soDongMoi: number }> =>
    apiService.post("/api/TKVV_BBSL/sync-dulieu-ems", dto),
};

// ─── Tổng tự động (PLC) theo Ngay/Ca/Scope — chỉ 1 số tổng/ca (ưu tiên GiaTriDieuChinh,
// fallback GiaTriTuDong per-tag), hiển thị ở dòng "TỔNG CỘNG" của bảng phiếu để xem/đối
// chiếu với số người dùng tự nhập, KHÔNG tự điền vào Loại 1/2/3/Phế phẩm.

export interface TKVVTongTuDongDto {
  tongTuDong: number;
}

export const tkvvTongTuDongApi = {
  get: (params: { ngay: string; ca: number; scope: number }): Promise<TKVVTongTuDongDto> =>
    apiService.get("/api/TKVV_BBSL/get-tong-tudong", { params }),
};

// ─── Giá trị NVL tự động từ EMS (SP_TKVV_GetGiaTriNVL_Auto) ─────────────────
// Dùng khi nhấn "Làm mới dữ liệu" — trả danh sách NVL + GiaTri (tổng từ cân
// băng tải EMS) cho maBM + scope (1-6) + ngay + ca. FE map vào bảng phiếu.

export interface TKVVGiaTriNVLAutoDto {
  nguyenVatLieuID: number;
  maBM: string;
  tenNVL: string;
  donViTinh: string | null;
  thuTu: number | null;
  scope: string | null;      // mã xưởng dạng "TK1" / "VV2"
  tenScope: string | null;
  giaTri: number;            // tổng GiaTri từ EMS (khối lượng ẩm từ cân)
  soLuongTag: number;
  thoiGianTu: string | null;
  thoiGianDen: string | null;
}

export const tkvvGiaTriNVLAutoApi = {
  getList: (params: {
    ngay: string;   // "YYYY-MM-DD"
    ca: number;     // 1=ca ngày, 2=ca đêm
    scope: number;  // 1-6 (TK1..TK4, VV1, VV2)
    maBM: string;
  }): Promise<TKVVGiaTriNVLAutoDto[]> =>
    apiService.get("/api/TKVV_BCSL_ChiPhi/get-giatri-nvl-auto", { params }),
};

// ─── Chi tiết sản lượng theo phiếu ────────────────────────────────────────────

// Wide-format: 1 dòng chi tiết = 1 dòng trên bảng UI, 4 cột Loại 1/2/3/Phế phẩm nằm
// ngang trên cùng dòng (không nổ thành nhiều dòng theo phanLoai như thiết kế cũ).
export interface TKVVChiTietDto {
  id: number;
  idPhieu: string;
  scope: number | null;
  ngay: string | null;
  ca: number | null;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  thuTuDong: number | null;
  thoiGian: string | null;
  loai1: number | null;
  loai2: number | null;
  loai3: number | null;
  phePham: number | null;
  isEdited: boolean;
  nguoiSuaID: number | null;
  ngaySua: string | null;
  lyDoSua: string | null;
  ghiChu: string | null;
}

export const tkvvChiTietApi = {
  getByPhieu: (idPhieu: string): Promise<TKVVChiTietDto[]> =>
    apiService.get(`/api/TKVV_BBSL/get-chitiet/${idPhieu}`),
};
