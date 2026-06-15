import apiService from "./ApiService";

// ─── SiLo (LG_TSL_SiLo) ──────────────────────────────────────────────────────

export interface LGTSLSiLoDto {
  id: number;
  idLoCao: number | null;
  tenSiLo: string | null;
  thuTu: number | null;
}

export interface CreateLGTSLSiLoDto {
  idLoCao: number;
  tenSiLo: string;
  thuTu?: number | null;
}

export interface UpdateLGTSLSiLoDto extends CreateLGTSLSiLoDto {}

export const lgTSLSiLoApi = {
  getList: (params?: { idLoCao?: number }) =>
    apiService.get<LGTSLSiLoDto[]>("/api/LGTSL/get-tonsilo-silo", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLSiLoDto>(`/api/LGTSL/get-tonsilo-silo/${id}`),

  create: (dto: CreateLGTSLSiLoDto) =>
    apiService.post<LGTSLSiLoDto>("/api/LGTSL/post-tonsilo-silo", dto),

  update: (id: number, dto: UpdateLGTSLSiLoDto) =>
    apiService.put<LGTSLSiLoDto>(`/api/LGTSL/put-tonsilo-silo/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/delete-tonsilo-silo/${id}`),
};

// ─── NVL (LG_TSL_NVL) ────────────────────────────────────────────────────────

export interface LGTSLNvlDto {
  id: number;
  tenNVL: string;
  tenNVLTk: string | null;
  tenHienThi: string | null;
  ghiChu: string | null;
  ngayTao: string;
  idLoCao: number;
  xacNhan: boolean;
  ngayXacNhan: string | null;
  idNguoiXacNhan: number | null;
}

export interface CreateLGTSLNvlDto {
  tenNVL: string;
  tenNVLTk?: string | null;
  ghiChu?: string | null;
  idLoCao: number;
  xacNhan?: boolean;
}

export interface UpdateLGTSLNvlDto extends CreateLGTSLNvlDto {}

export const lgTSLNvlApi = {
  getList: (params?: { idLoCao?: number }) =>
    apiService.get<LGTSLNvlDto[]>("/api/LGTSL/get-tonsilo-nvl", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLNvlDto>(`/api/LGTSL/get-tonsilo-nvl/${id}`),

  create: (dto: CreateLGTSLNvlDto) =>
    apiService.post<LGTSLNvlDto>("/api/LGTSL/post-tonsilo-nvl", dto),

  update: (id: number, dto: UpdateLGTSLNvlDto) =>
    apiService.put<LGTSLNvlDto>(`/api/LGTSL/put-tonsilo-nvl/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/delete-tonsilo-nvl/${id}`),

  updateXacNhan: (data: { id: number; xacNhan: boolean }) =>
    apiService.put("/api/LGTSL/put-tonsilo-nvl/xac-nhan", data),
};

// ─── Mapping (LG_TSL_SiLo_Mapping) ───────────────────────────────────────────

export interface LGTSLMappingDto {
  id: number;
  idLoCao: number;
  idSiLo: number;
  tenSiLo: string | null;  // join từ LG_TSL_SiLo
  idNVL: number;
  tenNVL: string | null;   // join từ LG_TSL_NVL
  ngay: string;            // "YYYY-MM-DD"
  ca: number;
  ghiChu: string | null;
  ngayTao: string;
  nguoiTao: string | null;
}

export interface CreateLGTSLMappingDto {
  idLoCao: number;
  idSiLo: number;
  idNVL: number;
  ngay: string;
  ca: number;
  ghiChu?: string | null;
}

export interface UpdateLGTSLMappingDto extends CreateLGTSLMappingDto {}

export const lgTSLMappingApi = {
  getList: (params?: { ngay?: string; ca?: number; idLoCao?: number }) =>
    apiService.get<LGTSLMappingDto[]>("/api/LGTSL/get-tonsilo-mapping", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLMappingDto>(`/api/LGTSL/get-tonsilo-mapping/${id}`),

  create: (dto: CreateLGTSLMappingDto) =>
    apiService.post<LGTSLMappingDto>("/api/LGTSL/post-tonsilo-mapping", dto),

  update: (id: number, dto: UpdateLGTSLMappingDto, force = false) =>
    apiService.put<LGTSLMappingDto>(
      `/api/LGTSL/put-tonsilo-mapping/${id}`,
      dto,
      force ? { params: { force: true } } : undefined,
    ),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/delete-tonsilo-mapping/${id}`),
};

// ─── View: SiLo + NVL theo Ngày/Ca/LoCao ─────────────────────────────────────

export interface LGTSLSiLoMappingViewDto {
  idMapping: number;
  idSiLo: number;
  idLoCao: number;
  idNVL: number;
  tenSiLo: string | null;
  thuTu: number | null;
  tenNVL: string | null;
  tenNVLTk: string | null;
  ngay: string;
  ca: number;
  ghiChu: string | null;
}

export const lgTSLSiLoMappingViewApi = {
  getList: (params?: { idLoCao?: number; ngay?: string; ca?: number }) =>
    apiService.get<LGTSLSiLoMappingViewDto[]>("/api/LGTSL/get-tonsilo-silo-mapping", { params }),
};

// ─── Chi tiết Tồn Silo theo Phiếu (LG_TSL_ChiTiet) ──────────────────────────

export interface LGTSLChiTietDto {
  id: number;
  idPhieu: string;
  idLoCao: number;
  ngay: string;
  ca: number;
  idSiLo: number;
  idMapping: number | null;
  idNVL: number | null;
  tenSiLo: string | null;
  tenNVL: string | null;
  klTonCuoiKip: number | null;
  manualKL: boolean;
  klGoc: number | null;
  ghiChu: string | null;
  thuTu: number | null;
  ngayTao: string;
  nguoiTao: string | null;
}

export interface UpsertLGTSLChiTietItemDto {
  idSiLo: number;
  idMapping: number | null;
  idNVL: number | null;
  tenSiLo: string | null;
  tenNVL: string | null;
  klTonCuoiKip: number | null;
  ghiChu: string | null;
  thuTu: number | null;
}

export interface UpsertLGTSLChiTietDto {
  idPhieu: string;
  idLoCao: number;
  ngay: string;
  ca: number;
  nguoiTao?: string | null;
  items: UpsertLGTSLChiTietItemDto[];
}

export const lgTSLChiTietApi = {
  upsert: (dto: UpsertLGTSLChiTietDto) =>
    apiService.post("/api/LGTSL/post-chitiet/upsert", dto),

  /** POST /api/LGTSL/post-sync-chitiet/{idPhieu} — backend tự đọc ngày/ca/lò cao từ phiếu, merge ManualKL, lưu DB */
  syncChiTiet: (idPhieu: string) =>
    apiService.post<LGTSLSiLoMappingViewDto[]>(`/api/LGTSL/post-sync-chitiet/${idPhieu}`, null),

  getByPhieu: (idPhieu: string) =>
    apiService.get<LGTSLChiTietDto[]>(`/api/LGTSL/get-chitiet/${idPhieu}`),

  exportPdf: (idPhieu: string, useKeHoachName = false) =>
    apiService.get<Blob>(`/api/LGTSL/get-export-pdf/${idPhieu}`, {
      responseType: "blob",
      params: useKeHoachName ? { useKeHoachName: true } : undefined,
    }),

  exportExcel: (idPhieu: string) =>
    apiService.get(`/api/LGTSL/get-export-excel/${idPhieu}`, {
      responseType: "blob",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    }),
};
