export interface HeaderKey {
  id: number;
  keyGuid: string;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  ngayTao?: string | null;
}

export interface HeaderKeyPayload {
  keyGuid?: string | null;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
}

export interface HeaderKeySearchResponse {
  data: HeaderKey[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

