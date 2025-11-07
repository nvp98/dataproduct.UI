import apiService from "./ApiService";

export const dlnmHRC2Api = {
  search: (params?: any) => apiService.get("/api/DLNMHRC2/search", { params }),
  getById: (id: number) => apiService.get(`/api/DLNMHRC2/${id}`),
  getByReportNo: (reportNo: number) => apiService.get(`/api/DLNMHRC2/report/${reportNo}`),
  getAll: (params?: any) => apiService.get("/api/DLNMHRC2", { params }),
};

