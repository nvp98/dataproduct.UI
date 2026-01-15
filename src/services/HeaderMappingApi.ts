import apiService from "./ApiService";

export interface HeaderMappingPayload {
  idPhuLieu: number;
  headerKeyId: number;
  tenNguonDuLieu?: string | null;
}

const toRequestBody = (payload: HeaderMappingPayload) => ({
  ID_PhuLieu: payload.idPhuLieu,
  ID_HeaderKey: payload.headerKeyId,
  TenNguonDuLieu: payload.tenNguonDuLieu ?? null,
});

export const headerMappingApi = {
  create: (payload: HeaderMappingPayload) =>
    apiService.post("/api/HeaderMapping", toRequestBody(payload)),
  update: (id: number, payload: HeaderMappingPayload) =>
    apiService.put(`/api/HeaderMapping/${id}`, toRequestBody(payload)),
  delete: (id: number) => apiService.delete(`/api/HeaderMapping/${id}`),
};

