import apiService from "./ApiService";

// ─── TS Mapping lookup (LG1_NL_TS_Mapping) ───────────────────────────────────

export interface LGNLTsMappingDto {
  id: number;
  tagKey: string | null;   // ví dụ: "XUAT.TS1"
  isActive: boolean | null;
}

export const lgnlTsMappingApi = {
  getList: () =>
    apiService.get<LGNLTsMappingDto[]>("/api/LGNL/ts-mapping"),
};

// ─── SiLo Master (LG_NL_SiLo) ────────────────────────────────────────────────

export interface LGNLSiLoMasterDto {
  id: number;
  idLoCao: number | null;
  tenSiLo: string | null;
  thuTu: number | null;
  ngayTao: string | null;
  tagKey: string | null;
}

export interface CreateLGNLSiLoMasterDto {
  idLoCao: number;
  tenSiLo: string;
  thuTu?: number | null;
  tagKey?: string | null;
}

export interface UpdateLGNLSiLoMasterDto extends CreateLGNLSiLoMasterDto {}

export const lgnlSiLoMasterApi = {
  getList: (params?: { idLoCao?: number }) =>
    apiService.get<LGNLSiLoMasterDto[]>("/api/LGNL/silo-master", { params }),

  getById: (id: number) =>
    apiService.get<LGNLSiLoMasterDto>(`/api/LGNL/silo-master/${id}`),

  create: (dto: CreateLGNLSiLoMasterDto) =>
    apiService.post<LGNLSiLoMasterDto>("/api/LGNL/silo-master", dto),

  update: (id: number, dto: UpdateLGNLSiLoMasterDto) =>
    apiService.put<LGNLSiLoMasterDto>(`/api/LGNL/silo-master/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/silo-master/${id}`),
};

// ─── Mapping (LG_NL_Mapping) ─────────────────────────────────────────────────

export interface LGNLMappingDto {
  id: number;
  ngay: string | null;          // "YYYY-MM-DD"
  idCa: number | null;          // 1 | 2
  idLoCao: number | null;
  idSiLo: number | null;
  tenSiLo: string | null;       // join từ LG_NL_SiLo
  tagKey: string | null;        // join từ LG_NL_SiLo — link đến LG1_DuLieuNL
  idNVL: number | null;
  maNVL: string | null;         // join từ LG_NL_NVL — dùng làm dataIndex trong pivot
  tenNVL: string | null;        // join từ LG_NL_NVL
  nhomHienThi: string | null;   // join từ LG_NL_NVL — tên cột cha trên BM
  thuTuNhom: number | null;     // join từ LG_NL_NVL — thứ tự nhóm
  ghiChu: string | null;
  ngayTao: string | null;
}

export interface CreateLGNLMappingDto {
  ngay: string;
  idCa: number;
  idLoCao: number;
  idSiLo?: number | null;
  idNVL?: number | null;
  ghiChu?: string | null;
}

export interface UpdateLGNLMappingDto extends CreateLGNLMappingDto {}

export const lgnlMappingApi = {
  getList: (params?: { ngay?: string; idCa?: number; idLoCao?: number }) =>
    apiService.get<LGNLMappingDto[]>("/api/LGNL/mapping", { params }),

  getById: (id: number) =>
    apiService.get<LGNLMappingDto>(`/api/LGNL/mapping/${id}`),

  create: (dto: CreateLGNLMappingDto) =>
    apiService.post<LGNLMappingDto>("/api/LGNL/mapping", dto),

  update: (id: number, dto: UpdateLGNLMappingDto) =>
    apiService.put<LGNLMappingDto>(`/api/LGNL/mapping/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/mapping/${id}`),
};

// ─── NVL (LG_NL_NVL) ─────────────────────────────────────────────────────────

export interface LGNLNvlDto {
  id: number;
  ngay: string | null;
  idCa: number | null;
  idLoCao: number | null;
  maNVL: string | null;
  tenNVL: string | null;
  donVi: string | null;
  soLuong: number | null;
  doAm: number | null;
  ghiChu: string | null;
  ngayTao: string | null;
  nhomHienThi: string | null;   // tên nhóm cột cha trên BM (null = leaf)
  thuTuNhom: number | null;     // thứ tự nhóm trên BM
}

export interface CreateLGNLNvlDto {
  ngay: string;
  idCa: number;
  idLoCao: number;
  maNVL?: string | null;
  tenNVL?: string | null;
  donVi?: string | null;
  soLuong?: number | null;
  doAm?: number | null;
  ghiChu?: string | null;
  nhomHienThi?: string | null;
  thuTuNhom?: number | null;
}

export interface UpdateLGNLNvlDto extends CreateLGNLNvlDto {}

export const lgnlNvlApi = {
  getList: (params?: { ngay?: string; idCa?: number; idLoCao?: number }) =>
    apiService.get<LGNLNvlDto[]>("/api/LGNL/nvl", { params }),

  getById: (id: number) =>
    apiService.get<LGNLNvlDto>(`/api/LGNL/nvl/${id}`),

  create: (dto: CreateLGNLNvlDto) =>
    apiService.post<LGNLNvlDto>("/api/LGNL/nvl", dto),

  update: (id: number, dto: UpdateLGNLNvlDto) =>
    apiService.put<LGNLNvlDto>(`/api/LGNL/nvl/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/nvl/${id}`),
};

// ─── Dữ liệu Silo pivot (LG1_DuLieuNL JOIN LG_NL_Mapping) ───────────────────

export interface LGNLColumnDto {
  title: string;
  dataIndex?: string;             // undefined nếu là cột cha (có children)
  children?: LGNLColumnDto[];     // undefined nếu là cột lá
}

export interface LGNLDuLieuSiLoResult {
  columns: LGNLColumnDto[];
  rows: Record<string, unknown>[];
}

export const lgnlDuLieuSiLoApi = {
  /** GET /api/LGNL/dulieu-silo — pivot dữ liệu nạp liệu theo ngày/ca/lò cao */
  getPivot: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/dulieu-silo", { params }),
};
