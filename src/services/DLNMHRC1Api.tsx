import apiService from "./ApiService";

export const dlnmHRC1Api = {
  searchThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/search-thongke", payload),
  sumThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/sum-thongke", payload),
  exportThongKe: (payload?: Record<string, unknown>) =>
    apiService.post("/api/DLNMHRC1/export-thongke", payload, {
      responseType: "blob",
    }),
};
