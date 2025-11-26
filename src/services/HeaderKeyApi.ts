import apiService from "./ApiService";
import type { HeaderKey, HeaderKeyPayload, HeaderKeySearchResponse } from "../models/HeaderKeyModel";

type RawHeaderKeySearchResponse = {
  data?: HeaderKey[];
  Data?: HeaderKey[];
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
    data,
    totalRecords,
    page,
    pageSize,
  };
};

type HeaderKeySearchParams = {
  searchKey?: string;
  LoaiPhieu?: string;
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
};

