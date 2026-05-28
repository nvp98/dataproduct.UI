import apiService from "./ApiService";

export const KipApi = {
  /// Get kip (shift) data by date and shift number
  getKipByDateAndCa: (ngayLamViec: string, ca: number) =>
    apiService.get("/api/Kip/by-date-ca", {
      params: { ngayLamViec, ca },
    }),
};
