import apiService from "./ApiService";

export const bkcankphapi = {
  getData: (params?: any) =>
    apiService.get("/api/BKKcscanBbxlSanxuat", { params }),

  getDetail: (params: {
    ngaySX?: string;
    ngayXL?: string;
    order?: string;
    xuongCan?: number;
  }) => apiService.get("/api/BKKcscanBbxlSanxuat", { params }),
};
