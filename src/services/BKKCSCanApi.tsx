import apiService from "./ApiService";

export const bkcankphapi = {
  getData: (params?: any) =>
    apiService.get("/api/BKKcscanBbxlSanxuat", { params }),

  getDetail: (params: {
    ngaySX?: string;
    caSX?: string;
    ngayXL?: string;
    caXL?: string;
    order?: string;
    xuongCan?: number;
  }) => apiService.get("/api/BKKcscanBbxlSanxuat", { params }),
  getDataSanLuong: (params?: any) =>
    apiService.get("/api/BkKcsBbxnSanLuong", { params }),

  getDetailSanLuong: (params: {
    ngaySX?: string;
    ngayXL?: string;
    order?: string;
    xuongCan?: number;
  }) => apiService.get("/api/BkKcsBbxnSanLuong", { params }),
};
