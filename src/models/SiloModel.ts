export interface Silo {
  id: number;
  tenSilo: string;
  theTich: number;
  bieuMau: string;
  scope?: number | null; 
  ngayTao?: string | null;
  tinhTrang: boolean;
  nhaMay: number; 
}

export interface SiloPayload {
  tenSilo: string;
  theTich: number;
  bieuMau: string;
  scope?: number | null; 
  tinhTrang: boolean;
  nhaMay: number; 
}

export enum NhaMayEnum {
  HRC1 = 1,
  HRC2 = 2,
}

export interface SiloSearchResponse {
  data: Silo[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

// MapSiloPhuLieuNM types
export interface MapSiloPhuLieuNM {
  id: number;
  siloId: number;
  tenSilo: string;
  phuLieuNMId: number;
  tenPhuLieu: string;
  ngayBatDau: string;
  ngayKetThuc?: string | null;
  isActive: boolean;
}

export interface MapSiloPhuLieuNMPayload {
  siloId: number;
  phuLieuNMId: number;
  ngayBatDau: string;
  ngayKetThuc?: string | null;
  isActive: boolean;
}

export interface PhuLieuNM {
  id: number;
  idPhuLieu: number;
  tenPhuLieu?: string | null;
  ngayTao?: string | null;
  isActive: boolean;
}

export interface PhuLieuNMSearchResponse {
  data: PhuLieuNM[];
  totalRecords: number;
  page: number;
  pageSize: number;
}

// Resolve Silo và PhuLieuNM types
export interface SiloOptionDto {
  siloId: number;
  tenSilo: string;
  theTich?: number | null;
  phuLieuNMIds: number[];
  isAuto: boolean;
}

export interface SelectSiloResponse {
  isAutoSelected: boolean;
  siloId?: number | null;
  phuLieuNMId?: number | null;
  options: SiloOptionDto[];
}

export interface SelectPhuLieuNMResponse {
  isAutoSelected: boolean;
  phuLieuNMId?: number | null;
  phuLieuNMIds: number[];
}

export interface ResolveSiloRequest {
  phuLieuNMIds: number[];
  ngaySX: string; // YYYY-MM-DD
}

export interface ResolvePhuLieuWhenChangeSiloRequest {
  siloId: number;
  phuLieuNMIds: number[];
  ngaySX: string; // YYYY-MM-DD
}

export interface ValidateBeforeSaveRequest {
  siloId: number;
  phuLieuNMId: number;
  ngaySX: string; // YYYY-MM-DD
}export interface GetSiloByHeaderKeyRequest {
  headerKeyId: number;
  ngaySX: string; // YYYY-MM-DD
  nhaMay: number; // HRC1 = 1, HRC2 = 2
  bieuMau?: string | null; // BOF, LF, RH
}

export interface SiloByHeaderKey {
  siloId: number;
  tenSilo: string;
  theTich?: number | null;
}
