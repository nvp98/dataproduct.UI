import dayjs from "dayjs";

export type HRC2MainData = {
  ngay: dayjs.Dayjs | string | Date | null;
  ca: number | string | null;
  bieuMau: string | null;
  scope: number | string | null;
  meThoi: string | null;
  macThep: string | null;
  o2: number | string | null;
  ar_RH: number | string | null;
  n2: number | string | null;
  ar_BOF: number | string | null;
  ar_LF: number | string | null;
  klGangLong: number | string | null;
  klThepPhe: number | string | null;
};

export type HRC2DetailRow = {
  idPhuLieu: number | null;
  tenPhuLieu: string | null;
  klPhuGia: number | null;
  klPhuGia_Manual?: number | null;
  isManual?: boolean | null;
  klPhuGiaTotal?: number | null; // Tổng KLPhuGia sau khi group
  keyGuid: string | null;
  tenHienThi: string | null;
  tenNguonDuLieu: string | null;
  idHeaderKey: number | null;
  mappingId?: number | null;
  loaiPhuLieu?: string | null; // Loại phụ liệu: "PG" hoặc "KL"
  thuTu?: number | null; // Thứ tự để sắp xếp
};

export type HRC2RawData = Record<string, unknown>;

export const pickValue = <T>(source: HRC2RawData, keys: string[]): T | null => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return null;
};

export interface DLNM_HRC2MainData extends HRC2MainData {
  id: number;
  reportNo: number | null;
  ngaySx: string | null;
  ngay: string | null;
  isNM?: boolean | null;
  isChuyenCa?: boolean | null;
  isTrungMeThoi?: boolean | null;
}

export type HeaderKeyResponse = HRC2DetailRow;

export interface HRC2DetailByReportNoModel {
  data: DLNM_HRC2MainData | null;
  phulieus: HeaderKeyResponse[];
}

export interface HRC2GroupedByReportNoModel {
  data: DLNM_HRC2MainData | null;
  mappedPhulieus: HeaderKeyResponse[];
  unmappedPhulieus: HeaderKeyResponse[];
  phanBoPhulieus?: HeaderKeyResponse[]; // Dữ liệu phân bổ (IsPhanBo = true)
  manualAdjustPhulieus?: HeaderKeyResponse[]; // Điều chỉnh tay (IsManual = true, IsPhanBo != true)
}

// Raw response type từ API (có thể có các biến thể tên field)
type RawHRC2GroupedResponse = {
  data?: HRC2RawData | null;
  mappedPhulieus?: HRC2RawData[] | null;
  unmappedPhulieus?: HRC2RawData[] | null;
  phanBoPhulieus?: HRC2RawData[] | null; // Dữ liệu phân bổ
  manualAdjustPhulieus?: HRC2RawData[] | null; // Điều chỉnh tay
};

// Helper function để normalize dữ liệu từ API response
export const normalizeHRC2GroupedResponse = (
  raw: RawHRC2GroupedResponse | HRC2RawData
): HRC2GroupedByReportNoModel => {
  const normalizePhuLieu = (item: HRC2RawData): HeaderKeyResponse => {
    const getValue = <T>(...keys: string[]): T | null => {
      for (const key of keys) {
        const val = item[key];
        if (val !== undefined && val !== null) {
          return val as T;
        }
      }
      return null;
    };

    return {
      idPhuLieu: getValue<number>("iD_PhuLieu", "idPhuLieu", "ID_PhuLieu"),
      tenPhuLieu: getValue<string>("tenPhuLieu", "TenPhuLieu"),
      klPhuGia: getValue<number>("klPhuGia", "KLPhuGia"),
      klPhuGia_Manual: getValue<number>("klPhuGia_Manual", "KLPhuGia_Manual"),
      isManual: getValue<boolean>("isManual", "IsManual"),
      klPhuGiaTotal:
        getValue<number>("klPhuGiaTotal", "KLPhuGiaTotal") ??
        getValue<number>("klPhuGia", "KLPhuGia"),
      keyGuid: getValue<string>("keyGuid", "KeyGuid"),
      tenHienThi: getValue<string>("tenHienThi", "TenHienThi"),
      tenNguonDuLieu: getValue<string>("tenNguonDuLieu", "TenNguonDuLieu"),
      idHeaderKey: getValue<number>(
        "iD_HeaderKey",
        "idHeaderKey",
        "ID_HeaderKey"
      ),
      mappingId: getValue<number>("mappingId", "MappingId"),
      loaiPhuLieu: getValue<string>(
        "loaiPhuLieu",
        "LoaiPhuLieu",
        "loaiPhuLieu"
      ),
      thuTu: getValue<number>("thuTu", "ThuTu"),
    };
  };

  const normalizeData = (
    rawData: HRC2RawData | null | undefined
  ): DLNM_HRC2MainData | null => {
    if (!rawData) return null;

    const getValue = <T>(...keys: string[]): T | null => {
      for (const key of keys) {
        const val = rawData[key];
        if (val !== undefined && val !== null) {
          return val as T;
        }
      }
      return null;
    };

    return {
      id: getValue<number>("id", "ID") ?? 0,
      reportNo: getValue<number>("reporT_NO", "reportNo", "REPORT_NO"),
      ngaySx: getValue<string>("ngaySx", "NgaySx"),
      ngay: getValue<string>("ngay", "Ngay"),
      ca: getValue<number>("ca", "Ca"),
      bieuMau: getValue<string>("bieuMau", "BieuMau"),
      scope: getValue<number>("scope", "Scope"),
      meThoi: getValue<string>("meThoi", "MeThoi"),
      macThep: getValue<string>("macThep", "MacThep"),
      o2: getValue<number>("o2", "O2"),
      ar_RH: getValue<number>("aR_RH", "ar_RH", "AR_RH"),
      n2: getValue<number>("n2", "N2"),
      ar_BOF: getValue<number>("aR_BOF", "ar_BOF", "AR_BOF"),
      ar_LF: getValue<number>("aR_LF", "ar_LF", "AR_LF"),
      klGangLong: getValue<number>(
        "klGangLongCCT",
        "KLGangLongCCT",
        // "klGangLong",
        // "KLGangLong"
      ), // Ưu tiên lấy từ klGangLongCCT, fallback về klGangLong
      klThepPhe: getValue<number>("klThepPhe", "KLThepPhe"),
      isNM: getValue<boolean>("isNM", "IsNM"),
      isChuyenCa: getValue<boolean>("isChuyenCa", "IsChuyenCa"),
      isTrungMeThoi: getValue<boolean>("isTrungMeThoi", "IsTrungMeThoi"),
    };
  };

  const rawObj = raw as RawHRC2GroupedResponse;
  return {
    data: normalizeData(rawObj.data ?? null),
    mappedPhulieus: Array.isArray(rawObj.mappedPhulieus)
      ? rawObj.mappedPhulieus.map(normalizePhuLieu)
      : [],
    unmappedPhulieus: Array.isArray(rawObj.unmappedPhulieus)
      ? rawObj.unmappedPhulieus.map(normalizePhuLieu)
      : [],
    phanBoPhulieus: Array.isArray(rawObj.phanBoPhulieus)
      ? rawObj.phanBoPhulieus.map(normalizePhuLieu)
      : [],
    manualAdjustPhulieus: Array.isArray(rawObj.manualAdjustPhulieus)
      ? rawObj.manualAdjustPhulieus.map(normalizePhuLieu)
      : [],
  };
};

export interface ChuyenMeThoiRequest {
  MaBM: string;
  NgaySX: string;
  Ca: number;
  Scope: number;
  ChuyenToiCa: number;
  MeThoi: string;
  BieuMau: string;
}

export interface FilterSTD_NXTRequest {
  NgaySX: string;
  Ca: number;
  /** Nếu có: BE sẽ chạy sp_Init_XuatNhapTon_HRC2 để cập nhật dữ liệu phiếu hiện tại. */
  idPhieu?: string | null;
  /** Danh sách Id_HeaderKey đang hiển thị trên bảng (kể cả dòng mới chưa lưu). BE dùng cho Init. */
  headerKeyIds?: number[] | null;
}