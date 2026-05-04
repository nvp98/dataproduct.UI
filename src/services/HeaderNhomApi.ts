import apiService from "./ApiService";

export interface HeaderNhom {
  id: number;
  tenHienThi: string;
  tenNhom?: string | null;
}

export interface HeaderNhomSearchResponse {
  data: HeaderNhom[];
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const headerNhomApi = {
  search: async (params: {
    searchKey?: string;
    page?: number;
    pageSize?: number;
  }): Promise<HeaderNhomSearchResponse> => {
    const res = (await apiService.get("/api/HeaderNhom", {
      params,
    })) as HeaderNhomSearchResponse;
    return {
      data: res.data ?? [],
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 20,
      totalPages: res.totalPages ?? 0,
    };
  },

  create: async (payload: {
    tenHienThi: string;
    tenNhom?: string | null;
  }): Promise<HeaderNhom> => {
    return (await apiService.post("/api/HeaderNhom", payload)) as HeaderNhom;
  },

  update: async (
    id: number,
    payload: { tenHienThi: string; tenNhom?: string | null }
  ): Promise<void> => {
    await apiService.put(`/api/HeaderNhom/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await apiService.delete(`/api/HeaderNhom/${id}`);
  },
};
