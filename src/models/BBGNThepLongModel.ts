export type FetchMeThoiRequest = {
  ngaySX: string;
  ca: number;
  nhaMay: number;
}

export type LoadBBGNRequest = {
  IdPhieu?: string | null;
  NgaySX: string;
  Ca: number;
  BieuMau: string;
}

export type BBGN_ThepLong = {
  me?: string;
  phanLoai?: string;
}