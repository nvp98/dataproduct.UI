import type { ChuyenMeThoiRequest, FilterSTD_NXTRequest } from "../models/DLMN_HRC2Model";
import apiService from "./ApiService";

export const dlnmHRC2Api = {
  search: (params?: any) => apiService.get("/api/DLNMHRC2/search", { params }),
  getById: (id: number) => apiService.get(`/api/DLNMHRC2/${id}`),
  getByReportNo: (reportNo: number) => apiService.get(`/api/DLNMHRC2/report/${reportNo}`),
  getAll: (params?: any) => apiService.get("/api/DLNMHRC2", { params }),
  filter: (payload?: any) => apiService.post("/api/DLNMHRC2/filter",  payload ),
  chuyenMeThoi: (payload: ChuyenMeThoiRequest) => apiService.post("/api/DLNMHRC2/chuyen-me-thoi", payload ),
  deleteRowByKey: (rowKey: number) => apiService.delete(`/api/DLNMHRC2/${rowKey}`),
  filterSTD_NXT: (payload: FilterSTD_NXTRequest) =>
    apiService.post("/api/DLNMHRC2/filterSTD_NXT", payload),
};

