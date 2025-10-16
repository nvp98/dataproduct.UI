import apiService from "./ApiService";

export const nguyenlieuApi = {
  getData: (params?: any) => apiService.get("/api/BKNguyenLieu", { params }),

  //   getDetail: (id: string) => apiService.get(`/api/phoigionhan/${id}`),
};
