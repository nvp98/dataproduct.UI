import apiService from "./ApiService";
import type { LGNLDuLieuSiLoResult } from "./LGNLApi";

export const napLieuLoCaoApi = {
  /** GET /api/LGNL/dulieu-silo — pivot dữ liệu nạp liệu theo ngày/ca/lò cao */
  getSiloMapped: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/dulieu-silo", { params }),
};
