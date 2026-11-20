import apiService from "./ApiService";

// Biên bản chốt số liệu Xưởng Đúc phôi vuông (BM.14/QT.05.11, MaBM HRC1_BCSX_DPV).
// Lưu / gửi / duyệt / xuất file đi qua PhieuApi (BM_Phieu); file này chỉ có API đặc thù.
// Tài liệu: docs/BCSX_HRC1_DucVuong/02-BienBan-ChotSoLieu.md

/** Nguồn dòng: 1 lấy từ Kho dữ liệu, 3 nhập tay, 4 điều chỉnh (cùng mã KdlConst.Nguon). */
export const NGUON_BCSX = { TU_DONG: 1, NHAP_TAY: 3, DIEU_CHINH: 4 } as const;

/** Cột chung của 4 vùng (khớp HRC1_BC_DongBase phía API, JSON camelCase). */
export interface BcsxDongBase {
  /** Khóa dòng phía FE (không gửi lên API). */
  _key?: string;
  kip?: string | null;
  caSX?: number | null;
  idKip?: number | null;
  ghiChu?: string | null;
  nguon?: number;
}

export interface BcsxThepLong extends BcsxDongBase {
  mac?: string | null;
  donViTinh?: string | null;
  soLuongMe?: number | null;
  mayDuc?: number | null;
  tonDau?: number | null;
  nhap?: number | null;
  xuat?: number | null;
  tonCuoi?: number | null;
  lenhSanXuat?: string | null;
}

export interface BcsxDien extends BcsxDongBase {
  noiDung?: string | null;
  donViTinh?: string | null;
  soLieu?: number | null;
}

export interface BcsxNguyenVatLieu extends BcsxDongBase {
  noiDung?: string | null;
  donViTinh?: string | null;
  soLieu?: number | null;
  soLieuBoPhan?: number | null;
  boPhanLienQuan?: string | null;
  lenhSanXuat?: string | null;
}

export interface BcsxThanhPham extends BcsxDongBase {
  me?: string | null;
  mac?: string | null;
  kichThuoc?: string | null;
  mayDuc?: number | null;
  lenhSanXuat?: string | null;
  laNganDai?: boolean;
  nguoi_SoThanh?: number | null;
  nguoi_Loai1?: number | null;
  nguoi_Loai2BM?: number | null;
  nguoi_Loai2TPHH?: number | null;
  nguoi_Loai3?: number | null;
  nong_SoThanh?: number | null;
  nong_Loai1?: number | null;
  nong_Loai2BM?: number | null;
  nong_Loai2TPHH?: number | null;
  nong_Loai3?: number | null;
  /** Chỉ đọc (cột tính phía DB / FE). */
  tong?: number | null;
}

/** 4 vùng của biên bản — cũng là 4 mảng trong DataJson của phiếu. */
export interface BcsxChiTiet {
  thepLong: BcsxThepLong[];
  dien: BcsxDien[];
  nguyenVatLieu: BcsxNguyenVatLieu[];
  thanhPham: BcsxThanhPham[];
}

export interface BcsxGoiY extends BcsxChiTiet {
  canhBao: string[];
}

export const HRC1BCSXApi = {
  /** Số liệu gợi ý từ Kho dữ liệu (CSDL HRC1_DPV) cho ngày sản xuất (YYYY-MM-DD). */
  getGoiY: async (ngaySX: string): Promise<BcsxGoiY> => {
    const res = (await apiService.get("/api/HRC1_BCSX/goi-y", { params: { ngaySX } })) as Partial<BcsxGoiY>;
    return {
      thepLong: res?.thepLong ?? [],
      dien: res?.dien ?? [],
      nguyenVatLieu: res?.nguyenVatLieu ?? [],
      thanhPham: res?.thanhPham ?? [],
      canhBao: res?.canhBao ?? [],
    };
  },
};
