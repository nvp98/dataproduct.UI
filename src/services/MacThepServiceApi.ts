import apiService from "./ApiService";
export { NhaMayEnum } from "../models/SiloModel";

export interface MacThep {
  id: number;
  tenMacThep: string;
  nhaMay: number;
  isLock?: boolean | null;
}

export interface MacThepPayload {
  tenMacThep: string;
  nhaMay: number;
  isLock?: boolean | null ;
}

export interface MacThepSearchResponse {
  data: MacThep[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export const MacThepServiceApi = {
  search: async (params: {
    searchKey?: string;
    nhaMay?: number;
    isLock?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<MacThepSearchResponse> => {
    const q: Record<string, string | number | boolean> = {};
    if (params.searchKey) q.searchKey = params.searchKey;
    if (params.nhaMay != null) q.nhaMay = params.nhaMay;
    if (params.isLock !== undefined) q.isLock = params.isLock;
    if (params.page) q.page = params.page;
    if (params.pageSize) q.pageSize = params.pageSize;
    const res = (await apiService.get("/api/MacThep/search", { params: q })) as MacThepSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 10,
    };
  },

  create: async (payload: MacThepPayload): Promise<MacThep> => {
    return (await apiService.post("/api/MacThep", payload)) as MacThep;
  },

  update: async (id: number, payload: MacThepPayload): Promise<void> => {
    await apiService.put(`/api/MacThep/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/MacThep/${id}`);
  },
};
