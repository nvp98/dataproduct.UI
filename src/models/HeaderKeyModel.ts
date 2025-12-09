export interface HeaderKey {
  id: number;
  keyGuid: string;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  ngayTao?: string | null;
  thuTu?: number | null;
}

export interface HeaderKeyPayload {
  keyGuid?: string | null;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  thuTu?: number | null;
}

export interface HeaderKeySearchResponse {
  data: HeaderKey[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export interface HeaderMappingType {
  id: number;
  idPhuLieu: number;
  tenNguonDuLieu: string;
}