import apiService from "./ApiService";
import type {
  ColumnMappingItem,
  ColumnMappingPayload,
  ColumnMappingUpdatePayload,
  NhomItem,
  NhomPayload,
  NhomUpdatePayload,
} from "../models/ColumnMappingModel";

const BASE = "/api/column-mapping";
const NHOM = `${BASE}/nhom`;

// ── NHÓM ──────────────────────────────────────────────────────────────────────

export const columnMappingNhomApi = {
  /** GET /api/column-mapping/nhom?loCao={loCao} */
  getAll: (loCao?: number | null): Promise<NhomItem[]> =>
    apiService.get(NHOM, { params: loCao != null ? { loCao } : {} }),

  /** POST /api/column-mapping/nhom */
  create: (payload: NhomPayload): Promise<NhomItem> =>
    apiService.post(NHOM, payload),

  /** PUT /api/column-mapping/nhom */
  update: (payload: NhomUpdatePayload): Promise<NhomItem> =>
    apiService.put(NHOM, payload),

  /** PATCH /api/column-mapping/nhom/{id}/toggle-visible */
  toggleVisible: (id: number): Promise<{ id: number; isVisible: boolean }> =>
    apiService.patch(`${NHOM}/${id}/toggle-visible`),

  /** DELETE /api/column-mapping/nhom/{id} — cascade xóa cột con */
  delete: (id: number): Promise<void> =>
    apiService.delete(`${NHOM}/${id}`),
};

// ── CỘT CON ───────────────────────────────────────────────────────────────────

export const columnMappingApi = {
  /** GET /api/column-mapping?loCao={loCao} */
  getAll: (loCao?: number | null): Promise<ColumnMappingItem[]> =>
    apiService.get(BASE, { params: loCao != null ? { loCao } : {} }),

  /** GET /api/column-mapping/{id} */
  getById: (id: number): Promise<ColumnMappingItem> =>
    apiService.get(`${BASE}/${id}`),

  /** POST /api/column-mapping */
  create: (payload: ColumnMappingPayload): Promise<ColumnMappingItem> =>
    apiService.post(BASE, payload),

  /** PUT /api/column-mapping */
  update: (payload: ColumnMappingUpdatePayload): Promise<ColumnMappingItem> =>
    apiService.put(BASE, payload),

  /** PATCH /api/column-mapping/{id}/toggle-visible */
  toggleVisible: (id: number): Promise<{ id: number; isVisible: boolean }> =>
    apiService.patch(`${BASE}/${id}/toggle-visible`),

  /** DELETE /api/column-mapping/{id} */
  delete: (id: number): Promise<void> =>
    apiService.delete(`${BASE}/${id}`),
};
