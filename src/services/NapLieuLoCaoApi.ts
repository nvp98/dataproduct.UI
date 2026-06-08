import apiService from "./ApiService";
import type { LGNLDuLieuSiLoResult } from "./LGNLApi";

export const napLieuLoCaoApi = {
  /** GET /api/LGNL/dulieu-silo — pivot dữ liệu nạp liệu theo ngày/ca/lò cao (LO 1-4, TagKey/SCADA) */
  getSiloMapped: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/dulieu-silo", { params }),

  /** POST /api/LGNL/sync-chitiet/{idPhieu} — tải SCADA mới, merge với bản đã lưu (ngày/ca/lò cao đọc từ phiếu), ghi DB, trả pivot */
  syncChiTiet: (idPhieu: string): Promise<LGNLDuLieuSiLoResult> =>
    apiService.post(`/api/LGNL/sync-chitiet/${idPhieu}`, null),

  /** GET /api/LGNL/dulieu-lo56 — dữ liệu từ TSVHNAPLIELC5/6 (LO 5-6, cột cố định) */
  getSiloMappedLo56: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<LGNLDuLieuSiLoResult> =>
    apiService.get("/api/LGNL/dulieu-lo56", { params }),
};
