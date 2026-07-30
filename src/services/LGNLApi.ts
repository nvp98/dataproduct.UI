import apiService from "./ApiService";

export interface LGNLTsMappingDto {
  id: number;
  tagKey: string | null;   // ví dụ: "XUAT.TS1"
  isActive: boolean | null;
}

export const lgnlTsMappingApi = {
  getList: () =>
    apiService.get<LGNLTsMappingDto[]>("/api/LGNL/get-ts-mapping"),
};

// ─── SiLo Master (LG_NL_SiLo) ────────────────────────────────────────────────

export interface LGNLSiLoMasterDto {
  id: number;
  idLoCao: number | null;
  tenSiLo: string | null;
  thuTu: number | null;
  ngayTao: string | null;
  tagKey: string | null;
  ngaySanXuat: string | null;
  idCaSanXuat: number | null;
  isDelete?: boolean | null;
}

export interface CreateLGNLSiLoMasterDto {
  idLoCao: number;
  tenSiLo: string;
  thuTu?: number | null;
  tagKey?: string | null;
  ngaySanXuat?: string | null;
  idCaSanXuat?: number | null;
}

export interface UpdateLGNLSiLoMasterDto extends CreateLGNLSiLoMasterDto {
  isDelete?: boolean | null;
}

export const lgnlSiLoMasterApi = {
  getList: (params?: { idLoCao?: number; ngaySX?: string; idCaSX?: number }) =>
    apiService.get<LGNLSiLoMasterDto[]>("/api/LGNL/get-silo-master", { params }),

  getById: (id: number) =>
    apiService.get<LGNLSiLoMasterDto>(`/api/LGNL/get-silo-master/${id}`),

  create: (dto: CreateLGNLSiLoMasterDto) =>
    apiService.post<LGNLSiLoMasterDto>("/api/LGNL/create-silo-master", dto),

  update: (id: number, dto: UpdateLGNLSiLoMasterDto) =>
    apiService.put<LGNLSiLoMasterDto>(`/api/LGNL/update-silo-master/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/delete-silo-master/${id}`),
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
  thoiDiemBD: string | null;    // null = từ đầu ca; có giá trị = đổi NVL giữa ca
  ngayHetHL: string | null;     // null = config đang active
  idCaHetHL: number | null;
  ghiChu: string | null;
  ngayTao: string | null;
}

export interface LGNLChangeSiLoNVLDto {
  idLoCao: number;
  ngay: string;           // "YYYY-MM-DD"
  idCa: number;
  idSiLo: number;
  idNVLMoi: number;
  thoiDiem: string;       // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  ghiChu?: string | null;
}

export interface LGNLUndoChangeSiLoNVLDto {
  idLoCao: number;
  ngay: string;           // "YYYY-MM-DD"
  idCa: number;
  idSiLo: number;
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

// ─── Snapshot trạng thái Silo hiện tại ───────────────────────────────────────

export interface LGNLSiloSnapshotDto {
  idSiLo: number;
  tenSiLo: string | null;
  idNVL: number | null;
  tenNVL: string | null;
  thoiDiemBD: string | null;   // null = từ đầu ca; có giá trị = đổi giữa ca tại thời điểm này
  daDoiGiuaCa: boolean;
  thuTu: number | null;
}

export const lgnlMappingApi = {
  getList: (params?: { ngay?: string; idCa?: number; idLoCao?: number}) =>
    apiService.get<LGNLMappingDto[]>("/api/LGNL/get-mapping", { params }),

  getById: (id: number) =>
    apiService.get<LGNLMappingDto>(`/api/LGNL/get-mapping/${id}`),

  create: (dto: CreateLGNLMappingDto) =>
    apiService.post<LGNLMappingDto>("/api/LGNL/create-mapping", dto),

  update: (id: number, dto: UpdateLGNLMappingDto) =>
    apiService.put<LGNLMappingDto>(`/api/LGNL/update-mapping/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/delete-mapping/${id}`),

  doiNVL: (dto: LGNLChangeSiLoNVLDto) =>
    apiService.post<{ message: string; id: number }>("/api/LGNL/doi-nvl", dto),

  undoDoiNVL: (dto: LGNLUndoChangeSiLoNVLDto) =>
    apiService.post<{ message: string; deleted: number }>("/api/LGNL/undo-doi-nvl", dto),

  getSnapshotSilo: (params: { ngay: string; idCa: number; idLoCao: number }) =>
    apiService.get<LGNLSiloSnapshotDto[]>("/api/LGNL/get-snapshot-silo", { params }),

  copyFromPreviousShift: (dto: {
    idLoCao: number;
    ngay: string;
    idCa: number;
  }): Promise<CopyMappingFromPreviousShiftResultDto> =>
    apiService.post("/api/LGNL/copy-mapping-from-previous-shift", dto),
};

// Kết quả sao chép mapping từ ca gần nhất có dữ liệu — BE tự lùi qua các ca
// nếu ca liền kề chưa có mapping (xem CopyMappingFromPreviousShiftResultDto ở BE).
export interface CopyMappingFromPreviousShiftResultDto {
  found: boolean;
  sourceNgay: string | null;
  sourceCa: number | null;
  shiftsSearched: number;
  createdCount: number;
  totalToCreate: number;
  message: string;
}

// ─── Nhóm NVL (LG_NL_NhomNVL) ────────────────────────────────────────────────

export interface LGNLNhomNvlDto {
  id: number;
  tenNhom: string | null;
  thuTu: number | null;
  ghiChu: string | null;
}

export interface CreateLGNLNhomNvlDto {
  tenNhom: string;
  thuTu?: number | null;
  ghiChu?: string | null;
}

export interface UpdateLGNLNhomNvlDto extends CreateLGNLNhomNvlDto {}

export const lgnlNhomNvlApi = {
  getList: () =>
    apiService.get<LGNLNhomNvlDto[]>("/api/LGNL/get-nhom-nvl"),

  getById: (id: number) =>
    apiService.get<LGNLNhomNvlDto>(`/api/LGNL/get-nhom-nvl/${id}`),

  create: (dto: CreateLGNLNhomNvlDto) =>
    apiService.post<LGNLNhomNvlDto>("/api/LGNL/create-nhom-nvl", dto),

  update: (id: number, dto: UpdateLGNLNhomNvlDto) =>
    apiService.put<LGNLNhomNvlDto>(`/api/LGNL/update-nhom-nvl/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/delete-nhom-nvl/${id}`),
};

// ─── NVL (LG_NL_NVL) ─────────────────────────────────────────────────────────

export interface LGNLNvlDto {
  id: number;
  idLoCao: number | null;
  idNhomNVL: number | null;
  tenNVL_NM: string | null;
  thuTu: number | null;
  ghiChu: string | null;
  ngayTao: string | null;
  nhomHienThi: string | null;
  thuTuNhom: number | null;
  tenNVL_TK: string | null;
  xacNhan: boolean | null;
  ngaySanXuat: string | null;
  idCaSanXuat: number | null;
}

export interface CreateLGNLNvlDto {
  idLoCao: number;
  idNhomNVL?: number | null;
  tenNVL_NM?: string | null;
  thuTu?: number | null;
  ghiChu?: string | null;
  thuTuNhom?: number | null;
  tenNVL_TK?: string | null;
  xacNhan?: boolean | null;
  ngaySanXuat?: string | null;
  idCaSanXuat?: number | null;
}

export interface UpdateLGNLNvlDto extends CreateLGNLNvlDto {}

export const lgnlNvlApi = {
  getList: (params?: { idLoCao?: number }) =>
    apiService.get<LGNLNvlDto[]>("/api/LGNL/get-nvl", { params }),

  getById: (id: number) =>
    apiService.get<LGNLNvlDto>(`/api/LGNL/get-nvl/${id}`),

  create: (dto: CreateLGNLNvlDto) =>
    apiService.post<LGNLNvlDto>("/api/LGNL/create-nvl", dto),

  update: (id: number, dto: UpdateLGNLNvlDto) =>
    apiService.put<LGNLNvlDto>(`/api/LGNL/update-nvl/${id}`, dto),

  delete: (id: number) =>
    apiService.delete(`/api/LGNL/delete-nvl/${id}`),

  updateXacNhan: (data: { id: number; xacNhan: boolean }) =>
    apiService.put("/api/LGNL/update-nvl-xac-nhan", data),
};

// ─── Dữ liệu Silo pivot (LG1_DuLieuNL JOIN LG_NL_Mapping) ───────────────────

export interface LGNLColumnDto {
  title: string;
  dataIndex?: string;           
  children?: LGNLColumnDto[];   
}

export interface LGNLDuLieuSiLoResult {
  columns: LGNLColumnDto[];
  rows: Record<string, unknown>[];
}

// ─── Dữ liệu SCADA theo TagKey, NVL, LoCao, Ngày ──────────────────────────

export interface LGNLDuLieuScadaDto {
  id: number;
  tagName: string | null;
  tagKey: string | null;
  time: string | null;
  value: number | null;
  idLoCao: number | null;
}

export const lgnlDuLieuScadaApi = {
  getByFilter: (params: {
    idLoCao?: number | null;
    ngayBatDau?: string | null;
    ngayKetThuc?: string | null;
  }): Promise<LGNLDuLieuScadaDto[]> =>
    apiService.get("/api/LGNL/get-datanaplieu-filter", { params: { ...params } }),
};

export const lgnlDuLieuSiLoApi = {
  getPivot: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/get-dulieu-silo", { params }),
};

// ─── Chi tiết nạp liệu theo phiếu (LG_NL_ChiTiet) ───────────────────────────

export interface LGNLChiTietDto {
  id: number;
  idPhieu: string;
  idLoCao: number | null;
  ngay: string | null;
  idCa: number | null;
  thoiGianNapLieu: string | null;
  soMe: number | null;
  meGio: string | null;
  cheDo: string | null;
  thuocThamLieu1: number | null;
  thuocThamLieu2: number | null;
  ghiChu: string | null;
  idNVL: number;
  giaTri: number | null;
  thuTu: number | null;
  doAm: number | null;
  quyKho: number | null;
  manualGiaTri: boolean;
  giaTri_Goc: number | null;
}

export const lgnlChiTietApi = {
  getByPhieu: (idPhieu: string): Promise<LGNLChiTietDto[]> =>
    apiService.get(`/api/LGNL/get-chitiet/${idPhieu}`),

  exportPdf: (idPhieu: string, useKeHoachName = false) =>
    apiService.get<Blob>(`/api/LGNL/get-export-pdf/${idPhieu}`, {
      responseType: "blob",
      params: useKeHoachName ? { useKeHoachName: true } : undefined,
    }),

  exportExcel: (idPhieu: string) =>
    apiService.get(`/api/LGNL/get-export-excel/${idPhieu}`, {
      responseType: "blob",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    }),
};

export const napLieuLoCaoApi = {
  /** GET /api/LGNL/dulieu-silo — pivot dữ liệu nạp liệu theo ngày/ca/lò cao (LO 1-4, TagKey/SCADA) */
  getSiloMapped: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/get-dulieu-silo", { params }),

  syncChiTiet: (idPhieu: string): Promise<LGNLDuLieuSiLoResult> =>
    apiService.post(`/api/LGNL/sync-chitiet/${idPhieu}`, null),
};

