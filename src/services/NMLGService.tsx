import apiService from "./ApiService";
export const napLieuLoCaoApi = {
  getByFilter: (params: { kip: string; scope: number; ngaySX: string }) =>
    apiService.get("/api/BKNapLieuLoCao", { params }),
};

export const tonSiLoLoCaoApi = {
  getByFilter: (params: { idLoCao: number; idCa: number; ngay: string }) =>
    apiService.get("/api/NMLG/getkltonsilolocao", { params }),
};

export const siLoLGApi = {
  getAll: () => apiService.get("/api/NMLG/silowithlocao"),
  add: (payload: {
    ID_LoCao: number;
    TenSiLo: string;
    ThuTu: number;
    TenNL: string | null;
    TenNL_DieuChinh: string | null;
  }) => apiService.post("/api/NMLG/silo", payload),
  update: (
    id: number,
    payload: {
      ID_LoCao: number;
      TenSiLo: string;
      ThuTu: number;
      TenNL: string | null;
      TenNL_DieuChinh: string | null;
    }
  ) => apiService.put(`/api/NMLG/silo/${id}`, payload),
};