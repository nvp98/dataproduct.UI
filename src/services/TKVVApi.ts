import apiService from "./ApiService";
import type {
  AutocompleteSearchParams,
  AutocompleteSearchResult,
} from "../components/CommonAutocomplete";

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
    apiService.get("/api/TKVV_NVL", { params }),

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

// ─── Dữ liệu cân từ SP_TKVV_GetDuLieuCan — đổ bảng khi tạo phiếu BC SLCP ────

export interface TKVVDuLieuCanDto {
  ngay: string;
  ca: number;
  maBM: string | null;
  scope: string | null;
  xuong: string | null;
  siloID: number | null;
  maSilo: string | null;
  nguyenVatLieuID: number;
  tenNVL: string;
  donViTinh: string | null;
  giaTri: number;
  soLuongSilo: number;
}

export const tkvvDuLieuCanApi = {
  getList: (params: {
    ngay: string;
    ca: number;
    maBM: string;
    loaiDuLieu?: string;
    scope: number;
  }): Promise<TKVVDuLieuCanDto[]> =>
    apiService.get("/api/TKVV_BCSL_ChiPhi/get-dulieu-can", { params }),
};

export const tkvvGiaTriNVLAutoApi = {
  getList: (params: {
    ngay: string;   // "YYYY-MM-DD"
    ca: number;     // 1=ca ngày, 2=ca đêm
    scope: number;  // 1-6 (TK1..TK4, VV1, VV2)
    maBM: string;
  }): Promise<TKVVGiaTriNVLAutoDto[]> =>
    apiService.get("/api/TKVV_BCSL_ChiPhi/get-giatri-nvl-auto", { params }),
};

// ─── TKVV_Silo ──────────────────────────────────────────────────────────────

export interface TKVVSiloDto {
  id: number;
  maXuong: string | null;
  scope: string | null;
  tenScope: string | null;
  maSilo: string | null;
  tenSilo: string;
  ghiChu: string | null;
  trangThai: boolean;
  ngayCapNhat: string;
}

export interface CreateTKVVSiloDto {
  maXuong?: string | null;
  scope?: string | null;
  tenScope?: string | null;
  maSilo?: string | null;
  tenSilo: string;
  ghiChu?: string | null;
}

export interface UpdateTKVVSiloDto extends CreateTKVVSiloDto {
  trangThai: boolean;
}

export const tkvvSiloApi = {
  getList: (params?: { scope?: string }): Promise<TKVVSiloDto[]> =>
    apiService.get("/api/TKVV_Silo/silo", { params }),
  getById: (id: number): Promise<TKVVSiloDto> =>
    apiService.get(`/api/TKVV_Silo/silo/${id}`),
  create: (dto: CreateTKVVSiloDto): Promise<TKVVSiloDto> =>
    apiService.post("/api/TKVV_Silo/silo", dto),
  update: (id: number, dto: UpdateTKVVSiloDto): Promise<TKVVSiloDto> =>
    apiService.put(`/api/TKVV_Silo/silo/${id}`, dto),
  delete: (id: number) => apiService.delete(`/api/TKVV_Silo/silo/${id}`),
};

// ─── TKVV_NVL_SiloMapping ────────────────────────────────────────────────────

export interface TKVVNvlSiloMappingDto {
  id: number;
  maBM: string | null;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  scopeNVL: string | null;
  scope: string | null;
  siloID: number | null;
  tenSilo: string | null;
  maSilo: string | null;
  ca: number;
  ngaySX: string;
  thuTu: number | null;
  ghiChu: string | null;
  trangThai: boolean;
  ngayCapNhat: string;
}

export interface CreateTKVVNvlSiloMappingDto {
  maBM?: string | null;
  nguyenVatLieuID: number;
  scope?: string | null;
  siloID?: number | null;
  ca: number;
  ngaySX: string;
  thuTu?: number | null;
  ghiChu?: string | null;
}

export interface UpdateTKVVNvlSiloMappingDto extends CreateTKVVNvlSiloMappingDto {
  trangThai: boolean;
}

export const tkvvNvlSiloMappingApi = {
  getList: (params?: { id?: number; maBM?: string; scope?: string; nvlId?: number; siloId?: number; ngaySX?: string; ca?: number }): Promise<TKVVNvlSiloMappingDto[]> =>
    apiService.get("/api/TKVV_Silo/nvl-silo-mapping", { params }),

  getNearest: (params: { maBM?: string; scope: string; beforeDate: string }): Promise<TKVVNvlSiloMappingDto[]> =>
    apiService.get("/api/TKVV_Silo/nvl-silo-mapping/nearest", { params }),

  batchCreate: (dto: {
    maBM: string; scope: string; ngaySX: string;
    rows: {id: number, nguyenVatLieuID: number; siloID: number | null; ca: number; thuTu: number | null }[];
  }): Promise<{ count: number }> =>
    apiService.post("/api/TKVV_Silo/nvl-silo-mapping/batch", dto),
  getById: (id: number): Promise<TKVVNvlSiloMappingDto> =>
    apiService.get(`/api/TKVV_Silo/nvl-silo-mapping/${id}`),
  create: (dto: CreateTKVVNvlSiloMappingDto): Promise<TKVVNvlSiloMappingDto> =>
    apiService.post("/api/TKVV_Silo/nvl-silo-mapping", dto),
  update: (id: number, dto: UpdateTKVVNvlSiloMappingDto): Promise<TKVVNvlSiloMappingDto> =>
    apiService.put(`/api/TKVV_Silo/nvl-silo-mapping/${id}`, dto),
  delete: (id: number) => apiService.delete(`/api/TKVV_Silo/nvl-silo-mapping/${id}`),
};

// ─── TKVV_Silo_TagMapping ────────────────────────────────────────────────────

export interface TKVVSiloTagMappingDto {
  id: number;
  siloID: number;
  tenSilo: string | null;
  scopeNVL: string | null;
  maBM: string;
  loaiDuLieu: string;
  tagIDEMS: string | null;
  tagName: string | null;
  tagIDEMS_Ngay: string | null;
  tagName_Ngay: string | null;
  tagIDEMS_Dem: string | null;
  tagName_Dem: string | null;
  ghiChu: string | null;
  trangThai: boolean;
  ngayCapNhat: string;
}

export interface CreateTKVVSiloTagMappingDto {
  siloID: number;
  maBM: string;
  loaiDuLieu: string;
  tagIDEMS?: string | null;
  tagName?: string | null;
  tagIDEMS_Ngay?: string | null;
  tagName_Ngay?: string | null;
  tagIDEMS_Dem?: string | null;
  tagName_Dem?: string | null;
  ghiChu?: string | null;
}

export interface UpdateTKVVSiloTagMappingDto extends CreateTKVVSiloTagMappingDto {
  trangThai: boolean;
}

export const tkvvSiloTagMappingApi = {
  getList: (params?: { siloId?: number; maBM?: string }): Promise<TKVVSiloTagMappingDto[]> =>
    apiService.get("/api/TKVV_Silo/silo-tag-mapping", { params }),
  getById: (id: number): Promise<TKVVSiloTagMappingDto> =>
    apiService.get(`/api/TKVV_Silo/silo-tag-mapping/${id}`),
  create: (dto: CreateTKVVSiloTagMappingDto): Promise<TKVVSiloTagMappingDto> =>
    apiService.post("/api/TKVV_Silo/silo-tag-mapping", dto),
  update: (id: number, dto: UpdateTKVVSiloTagMappingDto): Promise<TKVVSiloTagMappingDto> =>
    apiService.put(`/api/TKVV_Silo/silo-tag-mapping/${id}`, dto),
  delete: (id: number) => apiService.delete(`/api/TKVV_Silo/silo-tag-mapping/${id}`),
};

// ─── TKVV_BaoCaoSanLuongChiPhi — load + save dữ liệu cân với IsAdjusted ──────

export interface TKVVBaoCaoSanLuongChiPhiDto {
  id: number;
  phieuID: string | null;
  ngaySX: string;
  ca: number;
  kip: string | null;
  scope: number | null;        // INT 1-6
  thuTu: number | null;
  nguyenVatLieuID: number;
  tenNVL: string | null;
  klAm: number | null;
  klAmAuto: number | null;
  doAm: number | null;
  quyKho: number | null;
  thanhPhamL1: number | null;
  thanhPhamL2: number | null;
  thanhPham_Note: string | null;
  ghiChu: string | null;
  isAdjusted: boolean;
  adjustedBy: number | null;
  adjustedDate: string | null;
}

export interface LoadDuLieuCanResultDto {
  table1: TKVVBaoCaoSanLuongChiPhiDto[]; // Ca ngày
  table2: TKVVBaoCaoSanLuongChiPhiDto[]; // Ca đêm
}

export interface SaveBcSlRowDto {
  id?: number | null;
  ngaySX: string;
  ca: number;
  scope: number | null;        // INT 1-6
  nguyenVatLieuID: number;
  kip?: string | null;
  thuTu: number;
  klAm?: number | null;
  klAmAuto?: number | null;
  doAm?: number | null;
  quyKho?: number | null;
  thanhPhamL1?: number | null;
  thanhPhamL2?: number | null;
  ghiChu?: string | null;
}

export const tkvvBcSlChiPhiApi = {
  loadDuLieu: (request: {
    ngaySX: string;
    maBM: string;
    loaiDuLieu?: string;
    scope: number;
    createdBy?: number | null;
  }): Promise<LoadDuLieuCanResultDto> =>
    apiService.post("/api/TKVV_BCSL_ChiPhi/load-dulieu", {
      ...request,
      loaiDuLieu: request.loaiDuLieu ?? "SANLUONG",
    }),

  getBaoCaoData: (params: {
    ngaySX: string;
    maBM: string;
    scope: number;
  }): Promise<LoadDuLieuCanResultDto> =>
    apiService.get("/api/TKVV_BCSL_ChiPhi/get-baocao-data", { params }),

  savePhieuRows: (request: {
    maBM: string;
    phieuID?: string | null;
    currentUserId: number;
    rows: SaveBcSlRowDto[];
  }): Promise<void> =>
    apiService.post("/api/TKVV_BCSL_ChiPhi/save-phieu-rows", request),
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

// ─── TKVV_TonSilo — Sổ theo dõi Xuất Nhập Tồn Silo ───────────────────────────
// 1 phiếu = 1 Kíp. 1 dòng bảng = 1 Silo (không gộp theo NVL).

export interface TKVVTonSiloRowDto {
  id: number;
  phieuID: string | null;
  ngaySX: string;
  ca: number;
  kip: string | null;
  scope: number | null;
  thuTu: number | null;
  siloID: number;
  maSilo: string | null;
  tenSilo: string | null;
  nguyenVatLieuID: number | null;
  tenNVL: string | null;
  doAm: number | null;
  doAmText: string | null;
  tonDau: number | null;
  nhap: number | null;
  nhapAuto: number | null;
  xuat: number | null;
  xuatAuto: number | null;
  tonCuoi: number | null;
  tonCuoiAuto: number | null;
  ghiChu: string | null;
  isAdjusted: boolean;
  adjustedBy: number | null;
  adjustedDate: string | null;
}

export interface SaveTonSiloRowDto {
  id?: number | null;
  ngaySX: string;
  ca: number;
  scope: number;
  siloID: number;
  nguyenVatLieuID?: number | null;
  kip?: string | null;
  thuTu?: number | null;
  doAm?: number | null;
  doAmText?: string | null;
  tonDau?: number | null;
  nhap?: number | null;
  nhapAuto?: number | null;
  xuat?: number | null;
  xuatAuto?: number | null;
  tonCuoi?: number | null;
  tonCuoiAuto?: number | null;
  ghiChu?: string | null;
}

export const tkvvTonSiloApi = {
  initRows: (request: {
    ngaySX: string;
    ca: number;
    scope: number;
    currentUserId?: number | null;
    phieuID?: string | null;
  }): Promise<TKVVTonSiloRowDto[]> =>
    apiService.post("/api/TKVV_TonSilo/init-rows", request),

  getRowsByPhieu: (phieuId: string): Promise<TKVVTonSiloRowDto[]> =>
    apiService.get(`/api/TKVV_TonSilo/rows-by-phieu/${phieuId}`),

  saveRows: (request: {
    maBM: string;
    phieuID?: string | null;
    currentUserId: number;
    rows: SaveTonSiloRowDto[];
  }): Promise<void> =>
    apiService.post("/api/TKVV_TonSilo/save-phieu-rows", request),
};

// ─── Tra cứu Vật tư SAP (PRODUCTDATA.Tbl_VatTu) ──────────────────────────────

export interface VatTuLookupDto {
  idVatTu: number;
  tenVatTu: string | null;
  maVatTuSap: string | null;
  tenVatTuSap: string | null;
  donViTinh: string | null;
  idNhomVatTu: number | null;
  phongBan: string | null;
  idTrangThai: number | null;
}

// Khớp shape AutocompleteSearchApi<T> — dùng trực tiếp làm searchApi cho CommonAutocomplete.
export const tkvvVatTuApi = {
  search: (
    params: AutocompleteSearchParams,
  ): Promise<AutocompleteSearchResult<VatTuLookupDto>> =>
    apiService.get("/api/TKVV_Silo/vattu-search", {
      params: {
        searchKey: params.searchKey,
        page: params.page,
        pageSize: params.pageSize,
      },
    }),
};

// ─── TKVV_NVL_BBGN_Mapping — NVL (TKVV_NguyenVatLieu) ↔ Vật tư BBGN ──────────

export interface TKVVNvlBbgnMappingDto {
  id: number;
  tkvvNvlId: number;
  tenNVL: string | null;
  idVatTuBBGN: number;
  tenVatTu: string | null;
  maVatTuSap: string | null;
  tenVatTuSap: string | null;
  donViTinh: string | null;
  trangThai: boolean;
  ghiChu: string | null;
  ngayTao: string;
}

export interface CreateTKVVNvlBbgnMappingDto {
  tkvvNvlId: number;
  idVatTuBBGN: number;
  ghiChu?: string | null;
}

export interface UpdateTKVVNvlBbgnMappingDto {
  trangThai: boolean;
  ghiChu?: string | null;
}

export const tkvvNvlBbgnMappingApi = {
  getList: (tkvvNvlId?: number): Promise<TKVVNvlBbgnMappingDto[]> =>
    apiService.get("/api/TKVV_Silo/nvl-vattu-mapping", {
      params: tkvvNvlId ? { tkvvNvlId } : undefined,
    }),

  create: (dto: CreateTKVVNvlBbgnMappingDto): Promise<TKVVNvlBbgnMappingDto> =>
    apiService.post("/api/TKVV_Silo/nvl-vattu-mapping", dto),

  update: (id: number, dto: UpdateTKVVNvlBbgnMappingDto): Promise<TKVVNvlBbgnMappingDto> =>
    apiService.put(`/api/TKVV_Silo/nvl-vattu-mapping/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_Silo/nvl-vattu-mapping/${id}`),
};
