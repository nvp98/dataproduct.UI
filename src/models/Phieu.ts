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
  searchText?: string | null;
  nguoiDuyetId?: number | null;
  [key: string]: string | number | null | undefined;
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
}