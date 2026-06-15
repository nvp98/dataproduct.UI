import apiService from "./ApiService";

// ─── Chi tiết phun than (LG_NKVHPT_ChiTiet) ──────────────────────────────────

export interface LGPTLCChiTietDto {
  id: number;
  idPhieu: string;
  soPhieu: string | null;
  idLoCao: number;
  ngayVanHanh: string;
  idCa: number;
  kip: string | null;
  thoiGian: string;

  nhietDoSiloBotThan1_Auto: number | null;
  nhietDoSiloBotThan1_Manual: number | null;
  nhietDoSiloBotThan2_Auto: number | null;
  nhietDoSiloBotThan2_Manual: number | null;
  nhietDoBonPhunThoi1_Auto: number | null;
  nhietDoBonPhunThoi1_Manual: number | null;
  nhietDoBonPhunThoi2_Auto: number | null;
  nhietDoBonPhunThoi2_Manual: number | null;
  nhietDoBonPhunThoi3_Auto: number | null;
  nhietDoBonPhunThoi3_Manual: number | null;
  dongDienMayNghien_Auto: number | null;
  dongDienMayNghien_Manual: number | null;
  dongDienQuatGioNguoc_Auto: number | null;
  dongDienQuatGioNguoc_Manual: number | null;
  nhietDoDauVaoMayNghien_Auto: number | null;
  nhietDoDauVaoMayNghien_Manual: number | null;
  nhietDoDauRaMayNghien_Auto: number | null;
  nhietDoDauRaMayNghien_Manual: number | null;
  nhietDoKhoangLo_Auto: number | null;
  nhietDoKhoangLo_Manual: number | null;
  mucLieuSiloBotThan1_Auto: number | null;
  mucLieuSiloBotThan1_Manual: number | null;
  mucLieuSiloBotThan2_Auto: number | null;
  mucLieuSiloBotThan2_Manual: number | null;
  mucLieuSiloThanTho_Auto: number | null;
  mucLieuSiloThanTho_Manual: number | null;
  trongLuongBonPhunThoi1_Auto: number | null;
  trongLuongBonPhunThoi1_Manual: number | null;
  trongLuongBonPhunThoi2_Auto: number | null;
  trongLuongBonPhunThoi2_Manual: number | null;
  trongLuongBonPhunThoi3_Auto: number | null;
  trongLuongBonPhunThoi3_Manual: number | null;
  apLucKhiThan_Auto: number | null;
  apLucKhiThan_Manual: number | null;
  apLucBonKhiN2_Auto: number | null;
  apLucBonKhiN2_Manual: number | null;
  nhietDoTramDauBoiTron_Auto: number | null;
  nhietDoTramDauBoiTron_Manual: number | null;
  nhietDoStatoDongCoMayNghien_Auto: number | null;
  nhietDoStatoDongCoMayNghien_Manual: number | null;
  nhietDoTrucDongCoMayNghien_Auto: number | null;
  nhietDoTrucDongCoMayNghien_Manual: number | null;
  apLucTrucNghien_Auto: number | null;
  apLucTrucNghien_Manual: number | null;
  yeuCauTuLoCao_Auto: number | null;
  yeuCauTuLoCao_Manual: number | null;
  luongThanPhunThucTe_Auto: number | null;
  luongThanPhunThucTe_Manual: number | null;
  luyKeLuongPhunThanTrongCa_Auto: number | null;
  luyKeLuongPhunThanTrongCa_Manual: number | null;
  soLuongSungPhun_Auto: number | null;
  soLuongSungPhun_Manual: number | null;
  apLucGioLanhLoCao_Auto: number | null;
  apLucGioLanhLoCao_Manual: number | null;

  sanLuongNghien: number | null;
  sanLuongPhun: number | null;
  tonThanTho: number | null;
  tonThanTinh: number | null;
  ghiChu: string | null;
  tinhTrangSanXuat: string | null;
  sapXepSanXuat: string | null;
  createdAt: string | null;
}

export interface UpdateLGPTLCManualItemDto {
  id: number;
  nhietDoSiloBotThan1_Manual: number | null;
  nhietDoSiloBotThan2_Manual: number | null;
  nhietDoBonPhunThoi1_Manual: number | null;
  nhietDoBonPhunThoi2_Manual: number | null;
  nhietDoBonPhunThoi3_Manual: number | null;
  dongDienMayNghien_Manual: number | null;
  dongDienQuatGioNguoc_Manual: number | null;
  nhietDoDauVaoMayNghien_Manual: number | null;
  nhietDoDauRaMayNghien_Manual: number | null;
  nhietDoKhoangLo_Manual: number | null;
  mucLieuSiloBotThan1_Manual: number | null;
  mucLieuSiloBotThan2_Manual: number | null;
  mucLieuSiloThanTho_Manual: number | null;
  trongLuongBonPhunThoi1_Manual: number | null;
  trongLuongBonPhunThoi2_Manual: number | null;
  trongLuongBonPhunThoi3_Manual: number | null;
  apLucKhiThan_Manual: number | null;
  apLucBonKhiN2_Manual: number | null;
  nhietDoTramDauBoiTron_Manual: number | null;
  nhietDoStatoDongCoMayNghien_Manual: number | null;
  nhietDoTrucDongCoMayNghien_Manual: number | null;
  apLucTrucNghien_Manual: number | null;
  yeuCauTuLoCao_Manual: number | null;
  luongThanPhunThucTe_Manual: number | null;
  luyKeLuongPhunThanTrongCa_Manual: number | null;
  soLuongSungPhun_Manual: number | null;
  apLucGioLanhLoCao_Manual: number | null;
  ghiChu: string | null;
}

export interface UpdateLGPTLCManualDto {
  idPhieu: string;
  items: UpdateLGPTLCManualItemDto[];
}

export interface UpdateLGPTLCSummaryDto {
  sanLuongNghien: number | null;
  sanLuongPhun: number | null;
  tonThanTho: number | null;
  tonThanTinh: number | null;
  tinhTrangSanXuat: string | null;
  sapXepSanXuat: string | null;
}

export const lgPTLCApi = {
  getChiTiet: (idPhieu: string) =>
    apiService.get<LGPTLCChiTietDto[]>(`/api/LGPTLC/chitiet/${idPhieu}`),

  updateManual: (dto: UpdateLGPTLCManualDto) =>
    apiService.post("/api/LGPTLC/chitiet/update-manual", dto),

  updateSummary: (idPhieu: string, dto: UpdateLGPTLCSummaryDto) =>
    apiService.put(`/api/LGPTLC/chitiet/${idPhieu}/summary`, dto),

  getAutoData: (idLoCao: number, ngaySanXuat: string, idPhieu?: string) =>
    apiService.get(`/api/LGPTLC/get-phunthan-auto-data`, {
      params: { idLoCao, ngaySanXuat, ...(idPhieu ? { idPhieu } : {}) },
    }),

  exportExcel: (idPhieu: string) =>
    apiService.get(`/api/LGPTLC/export-excel/${idPhieu}`, {
      responseType: "blob",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    }),

  exportPdf: (idPhieu: string) =>
    apiService.get(`/api/LGPTLC/export-pdf/${idPhieu}`, {
      responseType: "blob",
      headers: { Accept: "application/pdf" },
    }),
};
