import apiService from "./ApiService";

export interface DonTrongPhoi {
  id: number;
  macPhoi: string;
  donTrong: number;
  mac?: string | null;
  kichThuoc?: string | null;
}

export interface DonTrongPhoiPayload {
  macPhoi: string;
  donTrong: number;
  mac?: string | null;
  kichThuoc?: string | null;
}

export interface DonTrongPhoiSearchResponse {
  data: DonTrongPhoi[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export const DonTrongPhoiServiceApi = {
  search: async (params: {
    searchKey?: string;
    mac?: string;
    kichThuoc?: string;
    page?: number;
    pageSize?: number;
  }): Promise<DonTrongPhoiSearchResponse> => {
    const q: Record<string, string | number> = {};
    if (params.searchKey) q.searchKey = params.searchKey;
    if (params.mac) q.mac = params.mac;
    if (params.kichThuoc) q.kichThuoc = params.kichThuoc;
    if (params.page) q.page = params.page;
    if (params.pageSize) q.pageSize = params.pageSize;
    const res = (await apiService.get("/api/DonTrongPhoi/search", { params: q })) as DonTrongPhoiSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 30,
    };
  },

  getAll: async (): Promise<DonTrongPhoi[]> => {
    return (await apiService.get("/api/DonTrongPhoi")) as DonTrongPhoi[];
  },

  create: async (payload: DonTrongPhoiPayload): Promise<DonTrongPhoi> => {
    return (await apiService.post("/api/DonTrongPhoi", payload)) as DonTrongPhoi;
  },

  update: async (id: number, payload: DonTrongPhoiPayload): Promise<void> => {
    await apiService.put(`/api/DonTrongPhoi/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/DonTrongPhoi/${id}`);
  },
};
