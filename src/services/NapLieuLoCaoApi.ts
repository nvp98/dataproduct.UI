import apiService from "./ApiService";

export interface NapLieuMappedColumn {
  title: string;
  dataIndex?: string;
  format?: string | null;
  children?: Omit<NapLieuMappedColumn, "children">[];
}

export interface NapLieuMappedResponse {
  columns: NapLieuMappedColumn[];
  rows: Record<string, unknown>[];
}

export interface NapLieuFilterParams {
  loCao: number;
  ngay: string;   // YYYY-MM-DD
  ca: number | string;
}

export const napLieuLoCaoApi = {
  /** GET /api/NMLG/naplieu/mapped — trả columns + rows cùng lúc */
  getMapped: (params: NapLieuFilterParams): Promise<NapLieuMappedResponse> =>
    apiService.get("/api/NMLG/naplieu/mapped", { params }),
};
