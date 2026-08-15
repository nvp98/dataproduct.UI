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
}

export interface CreateTKVVNguyenVatLieuDto {
  maBM: string;
  tenNVL: string;
  donViTinh?: string | null;
  thuTu?: number | null;
  ghiChu?: string | null;
}

export interface UpdateTKVVNguyenVatLieuDto extends CreateTKVVNguyenVatLieuDto {
  trangThai: boolean;
}

export const tkvvNvlApi = {
  getList: (params?: { maBM?: string }): Promise<TKVVNguyenVatLieuDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-nvl", { params }),

  getById: (id: number): Promise<TKVVNguyenVatLieuDto> =>
    apiService.get(`/api/TKVV_BBSL/get-nvl/${id}`),

  create: (dto: CreateTKVVNguyenVatLieuDto): Promise<TKVVNguyenVatLieuDto> =>
    apiService.post("/api/TKVV_BBSL/create-nvl", dto),

  update: (id: number, dto: UpdateTKVVNguyenVatLieuDto): Promise<TKVVNguyenVatLieuDto> =>
    apiService.put(`/api/TKVV_BBSL/update-nvl/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-nvl/${id}`),
};

// ─── Mapping Tag PLC -> NVL -> PhanLoai -> Scope ─────────────────────────────

// PhanLoai cố định theo cột trên biểu mẫu giấy: 1=Loại 1, 2=Loại 2, 3=Loại 3, 4=Phế phẩm
export type TKVVPhanLoai = 1 | 2 | 3 | 4;

export interface TKVVMappingDto {
  id: number;
  tagID: string;
  maKey: string;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  donViTinh: string | null;
  scope: string; // mã xưởng phía PLC, vd "VV1","VV2","TK1".."TK4"
  phanLoai: TKVVPhanLoai;
  thuTu: number | null;
  tuNgay: string | null;
  denNgay: string | null;
  trangThai: boolean;
  ghiChu: string | null;
  ngayTao: string | null;
}

export interface CreateTKVVMappingDto {
  tagID: string;
  maKey: string;
  nguyenVatLieuID: number;
  scope: string;
  phanLoai: TKVVPhanLoai;
  thuTu?: number | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  ghiChu?: string | null;
}

export interface UpdateTKVVMappingDto extends CreateTKVVMappingDto {
  trangThai: boolean;
}

export const tkvvMappingApi = {
  getList: (params?: { scope?: string; tagID?: string }): Promise<TKVVMappingDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-mapping", { params }),

  getById: (id: number): Promise<TKVVMappingDto> =>
    apiService.get(`/api/TKVV_BBSL/get-mapping/${id}`),

  create: (dto: CreateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.post("/api/TKVV_BBSL/create-mapping", dto),

  update: (id: number, dto: UpdateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.put(`/api/TKVV_BBSL/update-mapping/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-mapping/${id}`),
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
