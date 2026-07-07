import apiService from "./ApiService";

export interface Hrc1PhuLieuNm {
  id: number;
  tenPhuLieu: string;
  tenPhuLieuNM?: string | null;
  dangSuDung: boolean;
  isNM: boolean;
  thuTu?: number | null;
  ngayTao?: string;
  nguoiTao?: string | null;
}

export interface Hrc1PhuLieuNmPayload {
  tenPhuLieu: string;
  thuTu?: number | null;
}

export const Hrc1PhuLieuNmServiceApi = {
  getAll: async (params?: { dangSuDung?: boolean; searchKey?: string }): Promise<Hrc1PhuLieuNm[]> => {
    return (await apiService.get("/api/Hrc1PhuLieuNm", { params })) as Hrc1PhuLieuNm[];
  },

  getById: async (id: number): Promise<Hrc1PhuLieuNm> => {
    return (await apiService.get(`/api/Hrc1PhuLieuNm/${id}`)) as Hrc1PhuLieuNm;
  },

  create: async (payload: Hrc1PhuLieuNmPayload): Promise<Hrc1PhuLieuNm> => {
    return (await apiService.post("/api/Hrc1PhuLieuNm", payload)) as Hrc1PhuLieuNm;
  },

  update: async (id: number, payload: Hrc1PhuLieuNmPayload): Promise<void> => {
    await apiService.put(`/api/Hrc1PhuLieuNm/${id}`, payload);
  },

  toggleXacNhan: async (id: number): Promise<{ id: number; dangSuDung: boolean }> => {
    return (await apiService.patch(`/api/Hrc1PhuLieuNm/${id}/xac-nhan`)) as { id: number; dangSuDung: boolean };
  },
};
