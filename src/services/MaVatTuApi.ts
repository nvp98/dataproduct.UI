import apiService from "./ApiService";

export interface MaVatTuItem {
  id: number;
  nhaMay: string;
  macThep?: string | null;
  vatTuCode: string;
  tenVatTu?: string | null;
  isLock?: boolean | null;
  congDoan?: string | null;
  kichThuoc?: string | null;
}

export interface MaVatTuSearchRequest {
  searchKey?: string | null;
  nhaMay?: string | null;
  macThep?: string | null;
  congDoan?: string | null;
  page?: number;
  pageSize?: number;
}

export interface MaVatTuSearchResponse {
  data: MaVatTuItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const BASE = "/api/hrc1-ma-vat-tu";

export const MaVatTuApi = {
  search: async (req: MaVatTuSearchRequest): Promise<MaVatTuSearchResponse> => {
    const res = (await apiService.post(`${BASE}/search`, { page: 1, pageSize: 20, ...req })) as MaVatTuSearchResponse;
    return { data: res.data ?? [], totalCount: res.totalCount ?? 0, page: res.page ?? 1, pageSize: res.pageSize ?? 20 };
  },

  create: async (payload: {
    nhaMay: string;
    macThep?: string | null;
    vatTuCode: string;
    tenVatTu?: string | null;
    isLock?: boolean | null;
    congDoan?: string | null;
    kichThuoc?: string | null;
  }): Promise<MaVatTuItem> => {
    return (await apiService.post(BASE, payload)) as MaVatTuItem;
  },

  update: async (id: number, payload: {
    nhaMay: string;
    macThep?: string | null;
    vatTuCode: string;
    tenVatTu?: string | null;
    isLock?: boolean | null;
    congDoan?: string | null;
    kichThuoc?: string | null;
  }): Promise<void> => {
    await apiService.put(`${BASE}/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`${BASE}/${id}`);
  },

  bulkCreate: async (items: {
    nhaMay: string;
    macThep?: string | null;
    vatTuCode: string;
    tenVatTu?: string | null;
    congDoan?: string | null;
  }[]): Promise<{
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
