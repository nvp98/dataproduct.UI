// ── NHÓM (cột cha) ───────────────────────────────────────────────────────────
export interface NhomItem {
  id: number;
  loCao: number;
  tenNhom: string;
  thuTu: number;
  isVisible: boolean;
  sourceField: string | null;
  dataIndex: string | null;
  format: string | null;
}

export type NhomPayload = Omit<NhomItem, "id">;

export interface NhomUpdatePayload extends NhomPayload {
  id: number;
}

// ── CỘT CON ───────────────────────────────────────────────────────────────────
export interface ColumnMappingItem {
  id: number;
  nhomId: number;
  tenCot: string;
  dataIndex: string;
  sourceField: string;
  thuTu: number;
  isVisible: boolean;
  format: string | null;
  nhom: NhomItem;
}

export type ColumnMappingPayload = {
  nhomId: number;
  tenCot: string;
  dataIndex: string;
  sourceField: string;
  thuTu: number;
  isVisible: boolean;
  format: string | null;
};

export interface ColumnMappingUpdatePayload extends ColumnMappingPayload {
  id: number;
}
