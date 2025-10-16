import apiService from "./ApiService";

export const phoiGiaoNhanApi = {
  getData: (params?: any) => apiService.get("/api/BKPhoiThep", { params }),

  //   getDetail: (id: string) => apiService.get(`/api/phoigionhan/${id}`),
};
