import apiService from "./ApiService";

// ─── Nhóm phân bổ (LG_NhomPhanBo / LG_NVL_NhomPhanBo) ───────────────────────

export interface NhomPhanBoDto {
  id: number;
  tenNhom: string;
  loaiPhanBo: number; // 1=QHLC, 2=CVH, 3=Than cốc <10mm
  phuongThucPhanBo: number; // 1=tỷ trọng+dòng dư, 2=tỷ lệ nhập tay
  maVatTu: string | null;
  thuTu: number | null;
  idLoCao: number; // nhóm chỉ áp dụng cho ĐÚNG 1 lò cao — dùng chung nhiều lò phải tạo nhiều nhóm riêng
}

export interface CreateNhomPhanBoDto {
  tenNhom: string;
  loaiPhanBo: number;
  phuongThucPhanBo: number;
  maVatTu?: string | null;
  thuTu?: number | null;
  idLoCao: number;
}

export interface UpdateNhomPhanBoDto extends CreateNhomPhanBoDto {}

// NVL thành viên của nhóm — cấu hình RIÊNG cho từng (Ngày, Ca, Lò cao), không kế thừa từ ca/ngày khác
export interface NvlNhomPhanBoDto {
  id: number;
  idNvl: number;
  tenNvl: string | null;
  idNhomPhanBo: number;
  ngay: string; // "YYYY-MM-DD"
  ca: number;
  idLoCao: number;
}

export interface AddNvlNhomPhanBoDto {
  idNvl: number;
  ngay: string;
  ca: number;
  idLoCao: number;
}

export const nhomPhanBoApi = {
  getList: (loaiPhanBo?: number, idLoCao?: number): Promise<NhomPhanBoDto[]> =>
    apiService.get("/api/LG_PhanBo/nhom/get-list", { params: { loaiPhanBo, idLoCao } }),

  create: (dto: CreateNhomPhanBoDto): Promise<NhomPhanBoDto> =>
    apiService.post("/api/LG_PhanBo/nhom/create", dto),

  update: (id: number, dto: UpdateNhomPhanBoDto): Promise<NhomPhanBoDto> =>
    apiService.put(`/api/LG_PhanBo/nhom/update/${id}`, dto),

  delete: (id: number) => apiService.delete(`/api/LG_PhanBo/nhom/delete/${id}`),

  getNvl: (idNhomPhanBo: number, ngay: string, ca: number): Promise<NvlNhomPhanBoDto[]> =>
    apiService.get(`/api/LG_PhanBo/nhom/${idNhomPhanBo}/get-nvl`, { params: { ngay, ca } }),

  addNvl: (idNhomPhanBo: number, dto: AddNvlNhomPhanBoDto): Promise<NvlNhomPhanBoDto> =>
    apiService.post(`/api/LG_PhanBo/nhom/${idNhomPhanBo}/add-nvl`, dto),

  removeNvl: (idNhomPhanBo: number, idNvl: number, ngay: string, ca: number) =>
    apiService.delete(`/api/LG_PhanBo/nhom/${idNhomPhanBo}/remove-nvl/${idNvl}`, { params: { ngay, ca } }),

  getTyLeNhom: (params: { idNhomPhanBo: number; ngay: string; ca: number; idLoCao: number }): Promise<number | null> =>
    apiService.get("/api/LG_PhanBo/nhom/ty-le", { params }),

  createTyLeNhom: (dto: CreateTyLeNhomDto): Promise<{ message: string }> =>
    apiService.post("/api/LG_PhanBo/nhom/ty-le", dto),

  saoChep: (dto: SaoChepNhomPhanBoRequestDto): Promise<SaoChepNhomPhanBoResultDto> =>
    apiService.post("/api/LG_PhanBo/nhom/sao-chep", dto),
};

// % theo nhóm — chỉ áp dụng cho nhóm PhuongThucPhanBo=2 (Tỷ lệ nhập tay), cascade xuống từng NVL thành viên
export interface CreateTyLeNhomDto {
  idNhomPhanBo: number;
  ngay: string;
  ca: number;
  idLoCao: number;
  tyLe: number;
  ghiChu?: string | null;
  idNguoiNhap: number;
}

// Sao chép cấu hình nhóm/NVL/% từ ca liền kề gần nhất có cấu hình (cùng lò cao đích) sang đích
export interface SaoChepNhomPhanBoRequestDto {
  loaiPhanBo: number;
  ngayDich: string;
  caDich: number;
  idLoCaoDich: number;
  idNguoiThucHien: number;
}

export interface SaoChepNhomPhanBoResultDto {
  soNvlDaCopy: number;
  soTyLeDaCopy: number;
  ngayNguon: string;
  caNguon: number;
}

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
    apiService.get("/api/LG_PhanBo/ty-le/get-history", { params }),

  create: (dto: CreateTyLePhanBoDto): Promise<TyLePhanBoDto> =>
    apiService.post("/api/LG_PhanBo/ty-le/create", dto),
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
  maCongDoanChiPhi: string | null; // DQ1 / DQ2
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
  maCongDoanChiPhi: string | null; // DQ1 / DQ2
  idNhomPhanBo: number;
  tenNhomPhanBo: string | null;
  phuongThucPhanBo: number;
  khoiLuongNapLieu: number; // E (dùng chung)
  khoiLuongNapLieuNhom: number; // Tổng E của cả nhóm
  tyLePhanBo: number; // % (dùng chung)
  khoiLuongNhanVeCvh: number; // G_CVH — dùng chung cho cả bảng
  khoiLuongPhanBoCvh: number; // H_CVH
  khoiLuongNhanVeThanCoc10: number; // G_ThanCoc10 — dùng chung cho cả bảng
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
    apiService.post("/api/LG_PhanBo/tinh", dto),

  getKetQua: (params: { ngay: string; loaiPhanBo: number; idLoCao: number; ca?: number }): Promise<KetQuaPhanBoQueryResultDto> =>
    apiService.get("/api/LG_PhanBo/get-ket-qua", { params }),

  getKetQuaThanCoc: (params: { ngay: string; idLoCao: number; ca?: number }): Promise<KetQuaThanCocQueryResultDto> =>
    apiService.get("/api/LG_PhanBo/get-ket-qua-than-coc", { params }),

  chot: (dto: { ngay: string; idNguoiXacNhan: number }): Promise<{ message: string }> =>
    apiService.post("/api/LG_PhanBo/chot", dto),

  huyChot: (dto: { ngay: string; idNguoiXacNhan: number }): Promise<{ message: string }> =>
    apiService.post("/api/LG_PhanBo/huy-chot", dto),

  baoCao: (params: { tuNgay: string; denNgay: string; idLoCao?: number; loaiPhanBo?: number }): Promise<KetQuaPhanBoDto[]> =>
    apiService.get("/api/LG_PhanBo/bao-cao", { params }),

  updateMaCongDoanChiPhi: (dto: { ngay: string; idNvl: number; maCongDoanChiPhi: string | null }): Promise<{ message: string }> =>
    apiService.put("/api/LG_PhanBo/ket-qua/ma-cong-doan-chi-phi", dto),
};
