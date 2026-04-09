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
  tyTrong?: number | null; // Tỷ trọng
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
  isUsedThongKe?: boolean | null;   // Dùng cho Thống kê
  loaiThongKe?: number | null;      // Loại thống kê: 1=BOF, 2=LFRH, 3=All
  thuTu_TK_BOF?: number | null;     // Thứ tự Thống kê BOF
  thuTu_TK_LFRH?: number | null;    // Thứ tự Thống kê LFRH
  isUsed_Excel?: boolean | null;    // Dùng cho Excel
  loaiExcel?: number | null;        // Loại Excel: 1=BOF, 2=LFRH, 3=All
  thuTu_Excel_BOF?: number | null;  // Thứ tự Excel BOF
  thuTu_Excel_LFRH?: number | null; // Thứ tự Excel LFRH
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
  isUsedThongKe?: boolean | null;
  thuTu?: number | null;
  tyTrong?: number | null;
  iD_PhuLieu?: number | null; // có thể null nếu là HeaderKey chưa móc nối
  tenNguonDuLieu?: string | null;
  tenPhuLieu?: string | null;
  loaiThongKe?: number | null;      // Loại thống kê: 1=BOF, 2=LFRH, 3=All
  thuTu_TK_BOF?: number | null;
  thuTu_TK_LFRH?: number | null;
  isUsed_Excel?: boolean | null;
  loaiExcel?: number | null;        // Loại Excel: 1=BOF, 2=LFRH, 3=All
  thuTu_Excel_BOF?: number | null;
  thuTu_Excel_LFRH?: number | null;
}