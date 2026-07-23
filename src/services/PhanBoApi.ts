import apiService from "./ApiService";

// ─── Nhóm phân bổ (LG_NhomPhanBo / LG_NVL_NhomPhanBo) ───────────────────────

export interface NhomPhanBoDto {
  id: number;
  tenNhom: string;
  loaiPhanBo: number; // 1=QHLC, 2=CVH, 3=Than cốc <10mm
  phuongThucPhanBo: number; // 1=tỷ trọng+dòng dư, 2=tỷ lệ nhập tay
  thuTu: number | null;
}

export interface CreateNhomPhanBoDto {
  tenNhom: string;
  loaiPhanBo: number;
  phuongThucPhanBo: number;
  thuTu?: number | null;
}

export interface UpdateNhomPhanBoDto extends CreateNhomPhanBoDto {}

export interface NvlNhomPhanBoDto {
  id: number;
  idNvl: number;
  tenNvl: string | null;
  idNhomPhanBo: number;
}

export interface AddNvlNhomPhanBoDto {
  idNvl: number;
}

export const nhomPhanBoApi = {
  getList: (loaiPhanBo?: number): Promise<NhomPhanBoDto[]> =>
    apiService.get("/api/NhomPhanBo/get-list", { params: { loaiPhanBo } }),

  create: (dto: CreateNhomPhanBoDto): Promise<NhomPhanBoDto> =>
    apiService.post("/api/NhomPhanBo/create", dto),

  update: (id: number, dto: UpdateNhomPhanBoDto): Promise<NhomPhanBoDto> =>
    apiService.put(`/api/NhomPhanBo/update/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/NhomPhanBo/delete/${id}`),

  getNvl: (idNhomPhanBo: number): Promise<NvlNhomPhanBoDto[]> =>
    apiService.get(`/api/NhomPhanBo/${idNhomPhanBo}/get-nvl`),

  addNvl: (idNhomPhanBo: number, dto: AddNvlNhomPhanBoDto): Promise<NvlNhomPhanBoDto> =>
    apiService.post(`/api/NhomPhanBo/${idNhomPhanBo}/add-nvl`, dto),

  removeNvl: (idNhomPhanBo: number, idNvl: number) =>
    apiService.delete(`/api/NhomPhanBo/${idNhomPhanBo}/remove-nvl/${idNvl}`),
};

// ─── Tỷ lệ phân bổ (LG_TyLePhanBo — PP2, nhập tay) ──────────────────────────

export interface TyLePhanBoDto {
  id: number;
  idNvl: number;
  tenNvl: string | null;
  ngay: string; // "YYYY-MM-DD"
  ca: number | null;
  tyLe: number;
  ghiChu: string | null;
  idNguoiNhap: number;
  ngayNhap: string;
}

export interface CreateTyLePhanBoDto {
  idNvl: number;
  ngay: string;
  ca?: number | null;
  tyLe: number;
  ghiChu?: string | null;
  idNguoiNhap: number;
}

export const tyLePhanBoApi = {
  getHistory: (params: { idNvl: number; tuNgay?: string; denNgay?: string }): Promise<TyLePhanBoDto[]> =>
    apiService.get("/api/TyLePhanBo/get-history", { params }),

  create: (dto: CreateTyLePhanBoDto): Promise<TyLePhanBoDto> =>
    apiService.post("/api/TyLePhanBo/create", dto),
};

// ─── Tính / chốt / xem kết quả phân bổ (LG_KetQuaPhanBo) ────────────────────

export interface KetQuaPhanBoDto {
  id: number;
  ngay: string;
  ca: number | null;
  idLoCao: number;
  loaiPhanBo: number;
  idNvl: number;
  tenNvl: string | null;
  idNhomPhanBo: number;
  tenNhomPhanBo: string | null;
  phuongThucPhanBo: number;
  khoiLuongNapLieu: number; // E
  khoiLuongNapLieuNhom: number; // Tổng E của cả nhóm
  tyLePhanBo: number; // F
  khoiLuongNhanVe: number; // G — lấy từ biên bản giao nhận, dùng chung cho cả bảng
  khoiLuongPhanBo: number; // H
  khoiLuongChotCuoi: number; // I = E + H
  laDongConLai: boolean;
  trangThai: number; // 0=nháp, 1=đã chốt
}

export interface ValidatePhanBoResultDto {
  isMatched: boolean;
  tongNhanVe: number;
  tongPhanBo: number;
  chenhLech: number;
}

export interface KetQuaPhanBoQueryResultDto {
  ketQua: KetQuaPhanBoDto[];
  validate: ValidatePhanBoResultDto;
}

// ─── Kết quả gộp CVH + Than cốc <10mm (cùng nhóm/NVL/tỷ lệ, khác nguồn G) ───

export interface KetQuaThanCocDto {
  idLoCao: number;
  ca: number | null;
  idNvl: number;
  tenNvl: string | null;
  idNhomPhanBo: number;
  tenNhomPhanBo: string | null;
  phuongThucPhanBo: number;
  khoiLuongNapLieu: number; // E (dùng chung)
  khoiLuongNapLieuNhom: number; // Tổng E của cả nhóm
  tyLePhanBo: number; // % (dùng chung)
  khoiLuongPhanBoCvh: number; // H_CVH
  khoiLuongPhanBoThanCoc10: number; // H_ThanCoc10
  khoiLuongChotCuoi: number; // I = E + H_CVH + H_ThanCoc10
  laDongConLai: boolean;
  trangThai: number;
}

export interface KetQuaThanCocQueryResultDto {
  ketQua: KetQuaThanCocDto[];
  validateCvh: ValidatePhanBoResultDto;
  validateThanCoc10: ValidatePhanBoResultDto;
}

export const phanBoApi = {
  tinh: (dto: { ngay: string; idNguoiThucThi: number }): Promise<{ message: string }> =>
    apiService.post("/api/PhanBo/tinh", dto),

  getKetQua: (params: { ngay: string; loaiPhanBo: number; idLoCao: number; ca?: number }): Promise<KetQuaPhanBoQueryResultDto> =>
    apiService.get("/api/PhanBo/get-ket-qua", { params }),

  getKetQuaThanCoc: (params: { ngay: string; idLoCao: number; ca?: number }): Promise<KetQuaThanCocQueryResultDto> =>
    apiService.get("/api/PhanBo/get-ket-qua-than-coc", { params }),

  chot: (dto: { ngay: string; idNguoiXacNhan: number }): Promise<{ message: string }> =>
    apiService.post("/api/PhanBo/chot", dto),

  baoCao: (params: { tuNgay: string; denNgay: string; idLoCao?: number; loaiPhanBo?: number }): Promise<KetQuaPhanBoDto[]> =>
    apiService.get("/api/PhanBo/bao-cao", { params }),
};
