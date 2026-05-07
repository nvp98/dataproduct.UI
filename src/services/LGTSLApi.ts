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
    apiService.get<LGTSLSiLoDto[]>("/api/LGTSL/tonsilo-silo", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLSiLoDto>(`/api/LGTSL/tonsilo-silo/${id}`),

  create: (dto: CreateLGTSLSiLoDto) =>
    apiService.post<LGTSLSiLoDto>("/api/LGTSL/tonsilo-silo", dto),

  update: (id: number, dto: UpdateLGTSLSiLoDto) =>
    apiService.put<LGTSLSiLoDto>(`/api/LGTSL/tonsilo-silo/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/tonsilo-silo/${id}`),
};

// ─── NVL (LG_TSL_NVL) ────────────────────────────────────────────────────────

export interface LGTSLNvlDto {
  id: number;
  tenNVL: string;
  tenNVLTk: string | null;
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
    apiService.get<LGTSLNvlDto[]>("/api/LGTSL/tonsilo-nvl", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLNvlDto>(`/api/LGTSL/tonsilo-nvl/${id}`),

  create: (dto: CreateLGTSLNvlDto) =>
    apiService.post<LGTSLNvlDto>("/api/LGTSL/tonsilo-nvl", dto),

  update: (id: number, dto: UpdateLGTSLNvlDto) =>
    apiService.put<LGTSLNvlDto>(`/api/LGTSL/tonsilo-nvl/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/tonsilo-nvl/${id}`),

  updateXacNhan: (data: { id: number; xacNhan: boolean }) =>
    apiService.put("/api/LGTSL/tonsilo-nvl/xac-nhan", data),
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
    apiService.get<LGTSLMappingDto[]>("/api/LGTSL/tonsilo-mapping", { params }),

  getById: (id: number) =>
    apiService.get<LGTSLMappingDto>(`/api/LGTSL/tonsilo-mapping/${id}`),

  create: (dto: CreateLGTSLMappingDto) =>
    apiService.post<LGTSLMappingDto>("/api/LGTSL/tonsilo-mapping", dto),

  update: (id: number, dto: UpdateLGTSLMappingDto) =>
    apiService.put<LGTSLMappingDto>(`/api/LGTSL/tonsilo-mapping/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGTSL/tonsilo-mapping/${id}`),
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
  tenNVL_TK: string | null;
  ngay: string;
  ca: number;
  ghiChu: string | null;
}

export const lgTSLSiLoMappingViewApi = {
  getList: (params?: { idLoCao?: number; ngay?: string; ca?: number }) =>
    apiService.get<LGTSLSiLoMappingViewDto[]>("/api/LGTSL/tonsilo-silo-mapping", { params }),
};
