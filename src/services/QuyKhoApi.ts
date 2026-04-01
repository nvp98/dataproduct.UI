import apiService from "./ApiService";

export interface QuyKhoItem {
  id: number;
  ngay: string;
  idCa: number;
  idLoCao: number;
  dataIndex: string;
  tenNVL: string;
  tongCong: number;
  doAm: number;
  quyKho: number;
  ngayTao: string;
}

export interface QuyKhoSavePayload {
  ngay: string;
  idCa: number;
  idLoCao: number;
  items: {
    dataIndex: string;
    tenNVL: string;
    tongCong: number;
    doAm: number;
  }[];
}

const BASE = "/api/nmlg/quykho";

export const quyKhoApi = {
  getAll: (params: { ngay: string; idCa: number; idLoCao: number }): Promise<QuyKhoItem[]> =>
    apiService.get(BASE, { params }),

  save: (payload: QuyKhoSavePayload): Promise<{ message: string }> =>
    apiService.post(BASE, payload),
};
