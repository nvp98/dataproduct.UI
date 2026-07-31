export interface Phieu {
  idPhieu: string;
  soPhieu: string;
  maBm: string;
  ngayTao: string;
  // các field khác...
}
export interface SearchPhieuRequest {
  page: number;
  pageSize: number;
  tuNgay?: string | null;
  denNgay?: string | null;
  ca?: number | null;
  scope?: number | null;
  mayDuc?: number | null ;
  maBm?: string | null;
  maBmList?: string[] | null;
  searchText?: string | null;
  tinhTrang?: number | null;
  nguoiDuyetId?: number | null;
  nguoiTaoId?: number | null;
  isCheck?: number | null;
  [key: string]: string | number | null | undefined | string[];
}
export interface SearchPhieuByUserRequest {
  page: number;
  pageSize: number;
  tuNgay?: string | null;
  denNgay?: string | null;
  ca?: number | null;
  kip?: string | null;
  scope?: number | null;
  scopeFilters?: string[] | null;
  mayDuc?: number | null ;
  maBm?: string | null;
  maBmList?: string[] | null;
  searchText?: string | null;
  tinhTrang?: number | null;
  // [API mới search-by-user] userId thay cho nguoiTaoId + nguoiDuyetId, backend tự phân quyền
  userId?: number | null;
  /** 1 = Việc tôi bắt đầu, 2 = Việc đến tôi, 3 = Chỉ xem, 4 = Thống kê (kèm isThongKeUser) */
  loaiVung?: number | null;
  isThongKeUser?: boolean | null;
  /**
   * Danh sách QuyenChucNang mở rộng (>= 6, khai báo trong bmQuyenConfig.ts field `extraQuyens`)
   * khớp đúng `loaiVung` đang query — FE tự tính từ bmQuyenConfig.ts, BE chỉ dùng để lọc BmQuyenXl,
   * không cần biết ý nghĩa cụ thể của từng giá trị.
   */
  extraQuyenChucNangs?: number[] | null;
}
export interface SearchPhieuResponseModel {
  idphieu: string;
  soPhieu: string;
  maBm: string;
  ngaySX: string;
  ca: number;
  scope: number;
  mayDuc: number;
  tinhTrang: number;
  nguoiTao: number;
  tenNguoiTao?: string | null;
  tenScope?: string | null;
  isCheck?: number | null;
  soLuongMe?: number | null;
}