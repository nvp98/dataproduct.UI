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
  tyTrong?: number | null;
  maVatTuChiPhi?: string | null;
}

export interface HeaderKeyPayload {
  keyGuid?: string | null;
  tenHienThi: string;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive: boolean;
  thuTu?: number | null;
  tyTrong?: number | null;
  isUsedNXT?: boolean | null;
  isUsedThongKe?: boolean | null;
  loaiThongKe?: number | null;      // Bitmask: BOF=1, LF=2, RH=4 (kết hợp tự do, vd LF+RH=6)
  thuTu_TK_BOF?: number | null;
  thuTu_TK_LF?: number | null;
  thuTu_TK_RH?: number | null;
  isUsed_Excel?: boolean | null;
  loaiExcel?: number | null;        // Bitmask: BOF=1, LF=2, RH=4 (kết hợp tự do, vd LF+RH=6)
  thuTu_Excel_BOF?: number | null;
  thuTu_Excel_LF?: number | null;
  thuTu_Excel_RH?: number | null;
  iD_NhomKey?: number | null;       // FK → Header_Nhom.Id
  maVatTuChiPhi?: string | null;    // Mã vật tư bên hệ thống chi phí (ChiPhi_ProductionData)
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
  iD_HeaderKey?: number | null;
  keyGuid?: string | null;
  tenHienThi?: string | null;
  mota?: string | null;
  loaiPhieu?: string | null;
  isActive?: boolean | null;
  ngayTao?: string | null;
  isUsedNXT?: boolean | null;
  isUsedThongKe?: boolean | null;
  thuTu?: number | null;
  tyTrong?: number | null;
  iD_PhuLieu?: number | null;
  tenNguonDuLieu?: string | null;
  tenPhuLieu?: string | null;
  loaiThongKe?: number | null;      // Bitmask: BOF=1, LF=2, RH=4 (kết hợp tự do, vd LF+RH=6)
  thuTu_TK_BOF?: number | null;
  thuTu_TK_LF?: number | null;
  thuTu_TK_RH?: number | null;
  isUsed_Excel?: boolean | null;
  loaiExcel?: number | null;        // Bitmask: BOF=1, LF=2, RH=4 (kết hợp tự do, vd LF+RH=6)
  thuTu_Excel_BOF?: number | null;
  thuTu_Excel_LF?: number | null;
  thuTu_Excel_RH?: number | null;
  iD_NhomKey?: number | null;       // FK → Header_Nhom.Id
  tenNhom?: string | null;          // TenHienThi của Header_Nhom (enriched)
  maVatTuChiPhi?: string | null;    // Mã vật tư bên hệ thống chi phí (ChiPhi_ProductionData)
}
