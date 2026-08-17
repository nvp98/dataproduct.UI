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

// ─── Dữ liệu PLC thô ──────────────────────────────────────────────────────────

export interface TKVVDuLieuRawDto {
  id: number;
  tagID: string;
  maKey: string | null;
  value: number | null;
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
};

// ─── Pivot dữ liệu PLC theo Ngay/Ca/Scope — đổ vào bảng khi tạo phiếu ─────────

export interface TKVVSanPhamDto {
  nguyenVatLieuID: number;
  tenNVL: string | null;
  donViTinh: string | null;
}

export interface TKVVDuLieuPivotResult {
  sanPham: TKVVSanPhamDto[];
  rows: Record<string, unknown>[];
  ngayHieuLuc: string | null;
}

export const tkvvDuLieuPivotApi = {
  getPivot: (params: { ngay: string; ca: number; scope: number }): Promise<TKVVDuLieuPivotResult> =>
    apiService.get("/api/TKVV_BBSL/get-dulieu-pivot", { params }),

  syncChiTiet: (idPhieu: string): Promise<TKVVDuLieuPivotResult> =>
    apiService.post(`/api/TKVV_BBSL/sync-chitiet/${idPhieu}`, null),
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

export interface TKVVChiTietDto {
  id: number;
  idPhieu: string;
  scope: number | null;
  ngay: string | null;
  ca: number | null;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  mappingID: number | null;
  tagID: string | null;
  maKey: string | null;
  phanLoai: TKVVPhanLoai;
  thuTuDong: number | null;
  thoiGian: string | null;
  giaTriTuDong: number | null;
  giaTriHienTai: number | null;
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
