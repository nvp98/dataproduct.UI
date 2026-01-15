export interface HeaderKey {
  id: number;
  keyGuid: string;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  ngayTao?: string | null;
  thuTu?: number | null;
  isUsedNXT?: boolean | null;
}

export interface HeaderKeyPayload {
  keyGuid?: string | null;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  thuTu?: number | null;
  isUsedNXT?: boolean | null;
}

export interface HeaderKeySearchResponse {
  data: HeaderKeyMapping[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

export interface HeaderMappingType {
  id: number;
  idPhuLieu: number;
  tenNguonDuLieu: string;
}

// Response model cho search API (trả về "full list" gồm mapped + unmapped HeaderKey + unmapped PhuLieu_NM)
export interface HeaderKeyMapping {
  mappingId?: number | null;
  iD_HeaderKey?: number | null; // có thể null nếu phụ liệu NM chưa móc nối
  keyGuid?: string | null;
  tenHienThi?: string | null;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive?: boolean | null;
  ngayTao?: string | null;
  isUsedNXT?: boolean | null;
  thuTu?: number | null;
  iD_PhuLieu?: number | null; // có thể null nếu là HeaderKey chưa móc nối
  tenNguonDuLieu?: string | null;
  tenPhuLieu?: string | null;
}