import apiService from "./ApiService";

export const phoiGiaoNhanApi = {
  getData: (params?: any) => apiService.get("/api/BKPhoiThep", { params }),
  stDaChuyenBulk: (data: Array<{ id: number; sT_DaChuyen: number }>) =>
    apiService.put("/api/BKPhoiThep/st-dachuyen-bulk", data),
  stThuHoiBulk: (data: Array<{ id: number; soThuHoi: number }>) =>
    apiService.put("/api/BKPhoiThep/st-thuhoi-bulk", data),

  //   getDetail: (id: string) => apiService.get(`/api/phoigionhan/${id}`),
};
