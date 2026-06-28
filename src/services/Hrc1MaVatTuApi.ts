import apiService from "./ApiService";

export interface Hrc1MaVatTuItem {
  id: number;
  maVatTu: string;
  tenVatTu?: string | null;
  isLock?: boolean | null;
}

export interface Hrc1MaVatTuSearchRequest {
  searchKey?: string | null;
  page?: number;
  pageSize?: number;
}

export interface Hrc1MaVatTuSearchResponse {
  data: Hrc1MaVatTuItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const BASE = "/api/hrc1-ma-vat-tu";

export const Hrc1MaVatTuApi = {
  search: async (req: Hrc1MaVatTuSearchRequest): Promise<Hrc1MaVatTuSearchResponse> => {
    const res = (await apiService.post(`${BASE}/search`, { page: 1, pageSize: 50, ...req })) as Hrc1MaVatTuSearchResponse;
    return { data: res.data ?? [], totalCount: res.totalCount ?? 0, page: res.page ?? 1, pageSize: res.pageSize ?? 50 };
  },

  create: async (payload: { maVatTu: string; tenVatTu?: string | null; isLock?: boolean | null }): Promise<Hrc1MaVatTuItem> => {
    return (await apiService.post(BASE, payload)) as Hrc1MaVatTuItem;
  },

  update: async (id: number, payload: { maVatTu: string; tenVatTu?: string | null; isLock?: boolean | null }): Promise<void> => {
    await apiService.put(`${BASE}/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`${BASE}/${id}`);
  },

  bulkCreate: async (items: { maVatTu: string; tenVatTu?: string | null }[]): Promise<{
    created: number;
    skipped: number;
    skippedItems: string[];
  }> => {
    return (await apiService.post(`${BASE}/bulk`, { items })) as {
      created: number;
      skipped: number;
      skippedItems: string[];
    };
  },
};
