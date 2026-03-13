/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Model cho dữ liệu bảng 1 - Số liệu kiểm kê
 */
export interface STD_NXT_Table1Row {
  key?: string;
  khuVuc: string; // Khu vực (Lò thổi 6, Lò thổi 7, Tinh luyện LF, RH1, RH2)
  viTri: number; // Vị trí (Trong silo, Ngoài silo)
  nguyenNhienLieu: string; // Tên nguyên nhiên liệu (từ HeaderKey.tenHienThi)
  idNguyenNhienLieu?: number | null; // ID của HeaderKey
  siloId?: number | null; // ID của Silo
  tenSilo?: string | null; // Tên Silo
  tonDauCa?: string | number; // Tồn đầu ca - Khối lượng (Kg)
  tuongQuanDauCa?: string; // Tồn đầu ca - Tương quan (bao, kiện, mức...)
  nhapTrongCa?: string | number; // Nhập trong ca (Kg)
  mucLieu?: string | number; // Mức liệu
  theTich?: string | number; // Thể tích
  tyTrong?: string | number; // Tỷ trọng
  tonCuoiCa?: string | number; // Tồn cuối ca - Khối lượng (Kg)
  tuongQuanCuoiCa?: string; // Tồn cuối ca - Tương quan (bao, kiện, mức...)
  tongThucTe?: string | number; // Tổng thực tế sử dụng
  rawTenPhuLieu?: string; // Tên phụ liệu gốc (dùng cho unmapped items)
  isUnmapped?: boolean; // Flag để đánh dấu item chưa được map với HeaderKey
  idPhuLieu?: number | null; // ID của PhuLieu (dùng cho unmapped items)
}

/**
 * Model cho dữ liệu bảng 2 - Tổng hợp số liệu kiểm kê
 */
export interface STD_NXT_Table2Row {
  key?: string;
  totalText?: string;
  totalNguyenNhienLieu?: string;
  totalTonDauCa?: string | number;
  totalNhapTrongCa?: string | number;
  totalTonCuoiCa?: string | number;
  totalSuDung?: string | number;
  totalSDTrongSoSach?: string | number;
  totalChenhLech?: string | number;
  /** Từ BE: đã phân bổ chênh lệch hay chưa (để hiển thị nút Thu hồi/Phân bổ) */
  HasPhanBo?: boolean | null;
  Id_HeaderKey?: number | null;
  /** Ngày sản xuất (YYYY-MM-DD) — dùng cho payload phân bổ/thu hồi */
  NgaySX?: string;
  /** Ca (1/2) — dùng cho payload phân bổ/thu hồi */
  Ca?: number;
}

/**
 * Model payload gửi lên server khi lưu phiếu
 */
export interface STD_NXT_SavePayload {
  idphieu?: string;
  NgaySX: string; // Format: YYYY-MM-DD
  ca: number; // 1: Ca Ngày, 2: Ca Đêm
  maBm: string; // "HRC2_STD_NXT"
  nguoiTaoId?: number | null;
  xuongId?: number | null;
  idphongBan?: number | null;
  table1: STD_NXT_Table1Row[]; // Dữ liệu bảng 1
  table2: STD_NXT_Table2Row[]; // Dữ liệu bảng 2
  pheDuyet?: Array<{
    capDuyet: number;
    maKyDuyet: string;
    nguoiDuyetId: number | null;
    tinhTrang: number;
    ghiChu: string;
  }>;
}

/**
 * Model cho chi tiết nguyên liệu trong payload NXT Upsert
 */
export interface NXTDetailDto {
  Scope: number; // Scope (1: Lò thổi 6, 2: Lò thổi 7, 3: Tinh luyện LF, 4: RH1, 5: RH2)
  ViTri: number; // Vị trí (Trong silo = 1, Ngoài silo = 2)
  Id_HeaderKey: number; // ID của HeaderKey
  IDSilo?: number | null; // ID của Silo
  TenNguyenLieu: string; // Tên nguyên nhiên liệu
  TonDauCa: number; // Tồn đầu ca
  MucLieu: number; // Mức liệu
  TheTich: number; // Thể tích
  TyTrong: number; // Tỷ trọng
  TuongQuanDauCa: string; // Tương quan đầu ca
  NhapVaoTrongCa: number; // Nhập vào trong ca
  TonCuoiCa: number; // Tồn cuối ca
  TuongQuanCuoiCa: string; // Tương quan cuối ca
  TongThucTe: number; // Tổng thực tế
}

/**
 * Model cho tổng hợp nguyên liệu trong payload NXT Upsert
 */
export interface NXTSummaryDto {
  Id_HeaderKey: number; // ID của HeaderKey
  TenNguyenLieu: string; // Tên nguyên nhiên liệu
  TongTonDauCa: number; // Tổng tồn đầu ca
  TongNhapTrongCa: number; // Tổng nhập trong ca
  TongTonCuoiCa: number; // Tổng tồn cuối ca
  TongSuDung: number; // Tổng sử dụng
  TongSDTrenSoSach: number; // Tổng sử dụng trên sổ sách
  ChenhLech: number; // Chênh lệch
  HasPhanBo?: boolean | null; // Đã phân bổ hay chưa (từ BE)
}

/**
 * Model payload gửi lên API Upsert cho STD_NXT_HRC2
 * Dùng để lưu vào bảng STD_XUAT_NHAP_TON_HRC2 và STD_NXT_TOTAL_HRC2
 */
export interface STD_NXT_HRC2_UpsertDto {
  IdPhieu: string | null; // ID phiếu (Guid)
  NgaySX: string | null; // Ngày sản xuất (Format: YYYY-MM-DD)
  Ca: number; // Ca (1: Ca Ngày, 2: Ca Đêm)
  Scope: number; // Scope (mặc định 0)
  BieuMau: string; // Mã biểu mẫu (ví dụ: "HRC2_STD_NXT")
  Details: NXTDetailDto[]; // Danh sách chi tiết
  Summary: NXTSummaryDto[]; // Danh sách tổng hợp
}

export interface STD_NXT_HRC2_GetDetailResponse {
  Id_Phieu: string;
  BieuMau: string;
  NgaySX: string;
  Ca: number;
  Details: NXTDetailDto[];
  Summary: NXTSummaryDto[];
}

export interface STD_NXT_HRC2_PhanBoDto {
  NgaySX: string;
  Ca: number;
  Id_HeaderKey: number;
  ChenhLech: number;
  IdPhieu: string;
}