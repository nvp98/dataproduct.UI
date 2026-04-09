export type FetchMeThoiRequest = {
  ngaySX: string;
  ca: number;
  nhaMay: number;
}

export type LoadBBGNRequest = {
  IdPhieu?: string | null;
  NgaySX: string;
  Ca: number;
  NhaMay: number;
}

export type BBGN_ThepLong = {
  mayDuc?: string;
  me?: string;
  macThep?: string;
  thungSo?: string;
  thoiGian?: string;
  klLan1?: number;
  klLan2?: number;
  klLan3?: number;
  klThepLong?: number;
  ghiChu?: string;
  tinhLuyenLenThang?: string;
  phanLoai?: string;
}