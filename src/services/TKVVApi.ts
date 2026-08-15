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

// ─── Mapping Tag PLC (TagIDEMS) -> Scope + Ca ─────────────────────────────────
// 1 Tag = 1 BM/xưởng/ca (báo TỔNG khối lượng cả ca), không gắn với 1 sản phẩm cụ
// thể — ca ngày và ca đêm dùng 2 Tag khác nhau nên Ca là bắt buộc. KTV/KCS tự
// chọn sản phẩm và tự chia Loại 1/2/3/Phế phẩm khi nhập biên bản.

export interface TKVVMappingDto {
  id: number;
  tagID: string;
  maKey: string;
  scope: string; // mã xưởng phía PLC, vd "TK1".."TK4","VV1","VV2"
  ca: number; // 1 = ca ngày, 2 = ca đêm
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
  scope: string;
  ca: number;
  thuTu?: number | null;
  tuNgay?: string | null;
  denNgay?: string | null;
  ghiChu?: string | null;
}

export interface UpdateTKVVMappingDto extends CreateTKVVMappingDto {
  trangThai: boolean;
}

export const tkvvMappingApi = {
  getList: (params?: { scope?: string; tagID?: string; ca?: number }): Promise<TKVVMappingDto[]> =>
    apiService.get("/api/TKVV_BBSL/get-mapping", { params }),

  getById: (id: number): Promise<TKVVMappingDto> =>
    apiService.get(`/api/TKVV_BBSL/get-mapping/${id}`),

  create: (dto: CreateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.post("/api/TKVV_BBSL/create-mapping", dto),

  update: (id: number, dto: UpdateTKVVMappingDto): Promise<TKVVMappingDto> =>
    apiService.put(`/api/TKVV_BBSL/update-mapping/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/TKVV_BBSL/delete-mapping/${id}`),
};

// ─── Danh sách Tag PLC từ EMS để chọn khi tạo Mapping ─────────────────────────
// Không lọc theo Loai — dùng chung cho toàn NM.TKVV (trả cả SANLUONG, TONSILO...).
// Ca suy ra từ LoaiDuLieu bên EMS: 1=ngày, 2=đêm, null = đang tích lũy ca hiện tại
// (không dùng để Mapping vì không cố định ca).

export interface EMSMappingTagDto {
  id: number;
  xuong: string;
  loai: string | null;
  tenCan: string | null;
  tagIDEMS: string;
  tagName: string;
  ca: number | null;
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

// ─── Tổng tự động (PLC) theo Ngay/Ca/Scope — chỉ để đối chiếu ─────────────────
// 1 Tag = 1 BM/xưởng nên chỉ có 1 số tổng duy nhất (không tách theo sản phẩm).
// Cân/PLC chỉ báo TỔNG khối lượng, không tự phân theo Loại 1/2/3/Phế phẩm, nên
// số này KHÔNG tự điền vào bảng — chỉ hiển thị để KTV/KCS tự so khi nhập tay.

export interface TKVVTongTuDongDto {
  tongTuDong: number;
}

export const tkvvTongTuDongApi = {
  getTong: (params: { ngay: string; ca: number; scope: number }): Promise<TKVVTongTuDongDto> =>
    apiService.get("/api/TKVV_BBSL/get-tong-tudong", { params }),
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
