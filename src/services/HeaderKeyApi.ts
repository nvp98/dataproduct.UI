import apiService from "./ApiService";
import type { HeaderKeyMapping, HeaderKeyPayload, HeaderKeySearchResponse } from "../models/HeaderKeyModel";

type RawHeaderKeySearchResponse = {
  data?: HeaderKeyMapping[];
  Data?: HeaderKeyMapping[];
  totalRecords?: number;
  TotalRecords?: number;
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
};

const normalizeSearchResponse = (
  res: RawHeaderKeySearchResponse,
  fallback: { page: number; pageSize: number }
): HeaderKeySearchResponse => {
  const data = res?.data ?? res?.Data ?? [];
  const totalRecords = res?.totalRecords ?? res?.TotalRecords ?? 0;
  const page = res?.page ?? res?.Page ?? fallback.page;
  const pageSize = res?.pageSize ?? res?.PageSize ?? fallback.pageSize;

  return {
    data: data as HeaderKeyMapping[],
    totalRecords,
    page,
    pageSize,
  };
};

type HeaderKeySearchParams = {
  searchKey?: string;
  LoaiPhieu?: string;
  TrangThai?: string; // DangDung | ChuaMocNoi | Ngung
  IsUsedNXT?: boolean;
  IsUsedThongKe?: boolean;
  FromDate?: string; // ISO string
  ToDate?: string; // ISO string
  IdNhom?: number;
  chuaMappingNM?: boolean;
  SortBy?: string; // thuTu_TK_BOF | thuTu_TK_LF | thuTu_TK_RH | thuTu_Excel_BOF | thuTu_Excel_LF | thuTu_Excel_RH
  SortOrder?: string; // ascend | descend
  page?: number;
  pageSize?: number;
};

export const headerKeyApi = {
  async search(params: HeaderKeySearchParams = {}): Promise<HeaderKeySearchResponse> {
    const fallback = {
      page: typeof params.page === "number" ? params.page : 1,
      pageSize: typeof params.pageSize === "number" ? params.pageSize : 10,
    };
    const res = await apiService.get("/api/HeaderKey/search", { params });
    return normalizeSearchResponse(res, fallback);
  },
  getAll: () => apiService.get("/api/HeaderKey"),
  getById: (id: number) => apiService.get(`/api/HeaderKey/${id}`),
  create: (payload: HeaderKeyPayload) => apiService.post("/api/HeaderKey", payload),
  update: (id: number, payload: HeaderKeyPayload) => apiService.put(`/api/HeaderKey/${id}`, payload),
  delete: (id: number) => apiService.delete(`/api/HeaderKey/${id}`),

  async searchAutocomplete(params: HeaderKeySearchParams = {}): Promise<HeaderKeySearchResponse> {
    const fallback = {
      page: typeof params.page === "number" ? params.page : 1,
      pageSize: typeof params.pageSize === "number" ? params.pageSize : 10,
    };
    const res = await apiService.get("/api/HeaderKey/search-autocomplete", { params });
    return normalizeSearchResponse(res, fallback);
  },
};

