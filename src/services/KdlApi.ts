import apiService from "./ApiService";

// Kho dữ liệu động (KDL) — xem dữ liệu theo cấu hình form (KDL_Form.CotJson). Thiết kế: docs/04-Thiet-Ke-Kho-Du-Lieu-Dong.md

export const KDL_KIEU_DL = { SO: 1, CHUOI: 2 } as const;
export const KDL_CACH_LAY = { DU_LIEU: 1, CONG_THUC: 2, TINH_KHI_XEM: 3, NHAP_TAY: 4, XU_LY_RIENG: 5 } as const;

/** Nút cột: lá có `key` (KDL_Key) hoặc `field` (trường header); nhóm có `children`. */
export interface KdlCot {
  key?: string | null;
  field?: string | null;
  label?: string | null;
  width?: number | null;
  decimals?: number | null;
  editable?: boolean | null;
  hidden?: boolean | null;
  excel?: boolean | null;
  /** Cố định cột khi cuộn ngang. */
  fixed?: "left" | "right" | null;
  children?: KdlCot[] | null;
}

export interface KdlKey {
  maKey: string;
  tenKey?: string | null;
  donVi?: string | null;
  kieuDL: number;
  cachLay: number;
  kieuTongHop: number;
  soLe: number;
  congThuc?: string | null;
  maNguon?: string | null;
}

export interface KdlCauTruc {
  maForm: string;
  tenForm: string;
  maModule: string;
  maBM?: string | null;
  cot: KdlCot[];
  keys: Record<string, KdlKey>;
  canhBao: string[];
}

export interface KdlDong {
  idDoiTuong: number;
  me: string;
  ngaySX: string;
  caSX?: number | null;
  kip?: string | null;
  mayDuc?: string | null;
  mac?: string | null;
  kichThuoc?: string | null;
  lenhSanXuat?: string | null;
  giaTri: Record<string, number | string | null>;
  /** Key đang hiển thị giá trị nhập tay / điều chỉnh. */
  thuCong: string[];
}

export interface KdlNhom {
  nhom: Record<string, string | number | null>;
  soDoiTuong: number;
  giaTri: Record<string, number | null>;
}

/** Loại dòng bảng "Tổng hợp chi tiết": CT = đối tượng, còn lại = dòng tổng theo cấp. */
export type KdlLoaiDongTH = "CT" | "CA" | "NGAY" | "THANG" | "NAM";

/** Dòng tổng: idDoiTuong = 0, chỉ các chiều thuộc cấp đó có ý nghĩa (ngaySX của THANG/NAM chỉ để sắp xếp). */
export interface KdlDongTongHopCT extends KdlDong {
  loai: KdlLoaiDongTH;
  nam: number;
  thang: number;
  soDoiTuong: number;
  nhan?: string | null;
  /** Dòng "Tổng ca / ngày / tháng / năm" (bảng theo chiều còn có dòng "Theo …" từng giá trị chiều). */
  laTong: boolean;
}

/** Chiều của bảng tổng hợp theo chiều (field KDL_DoiTuong). */
export type KdlChieuTH = "Mac" | "LenhSanXuat" | "MayDuc" | "KichThuoc";

/** "Loại dữ liệu" ở bảng theo chiều — cùng giá trị, nhãn "Theo …". */
export const KDL_LOAI_DU_LIEU_THEO_CHIEU = [
  { value: "tatCa", label: "Tất cả" },
  { value: "ca", label: "Theo ca" },
  { value: "ngay", label: "Theo ngày" },
  { value: "thang", label: "Theo tháng" },
  { value: "nam", label: "Theo năm" },
] as const;

/** Bộ lọc "Loại dữ liệu": cấp thấp nhất được hiển thị. */
export const KDL_LOAI_DU_LIEU = [
  { value: "tatCa", label: "Tất cả" },
  { value: "ca", label: "Tổng ca" },
  { value: "ngay", label: "Tổng ngày" },
  { value: "thang", label: "Tổng tháng" },
  { value: "nam", label: "Tổng năm" },
] as const;

export interface KdlLoc {
  tuNgay: string; // YYYY-MM-DD
  denNgay: string;
  caSX?: number;
  kip?: string;
  mayDuc?: string;
  mac?: string;
  kichThuoc?: string;
  lenhSanXuat?: string;
  searchKey?: string;
}

export interface KdlSyncLog {
  id: number;
  maModule: string;
  thoiGianBatDau: string;
  thoiGianKetThuc?: string | null;
  tuNgay: string;
  denNgay: string;
  soDong: number;
  thanhCong: boolean;
  loiChiTiet?: string | null;
  nguonChay?: string | null;
}

const toParams = (obj: object) => {
  const q: Record<string, string | number> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q[k] = v as string | number;
  });
  return q;
};

const taiFile = (blob: Blob, tenFile: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile;
  a.click();
  URL.revokeObjectURL(url);
};

export const KdlApi = {
  getCauTruc: async (maForm: string): Promise<KdlCauTruc> =>
    (await apiService.get(`/api/Kdl/form/${maForm}/cau-truc`)) as KdlCauTruc,

  getDuLieu: async (
    maForm: string,
    loc: KdlLoc & { page?: number; pageSize?: number }
  ): Promise<{ data: KdlDong[]; tong: Record<string, number | null>; totalRecords: number; page: number; pageSize: number }> => {
    const res = (await apiService.get(`/api/Kdl/form/${maForm}/du-lieu`, { params: toParams(loc) })) as {
      data: KdlDong[];
      tong: Record<string, number | null>;
      totalRecords: number;
      page: number;
      pageSize: number;
    };
    return {
      data: res.data ?? [],
      tong: res.tong ?? {},
      totalRecords: res.totalRecords ?? 0,
      page: res.page ?? 1,
      pageSize: res.pageSize ?? 50,
    };
  },

  /** nhom: các chiều nhóm, vd ["Kip"], ["NgaySX", "CaSX"]. */
  getTongHop: async (maForm: string, loc: KdlLoc, nhom: string[]): Promise<KdlNhom[]> =>
    ((await apiService.get(`/api/Kdl/form/${maForm}/tong-hop`, {
      params: toParams({ ...loc, nhom: nhom.join(",") }),
    })) as KdlNhom[]) ?? [],

  exportExcel: async (maForm: string, loc: KdlLoc): Promise<void> => {
    const blob = (await apiService.get(`/api/Kdl/form/${maForm}/export-excel`, {
      params: toParams(loc),
      responseType: "blob",
    })) as unknown as Blob;
    taiFile(blob, `${maForm}_${loc.tuNgay.replace(/-/g, "")}_${loc.denNgay.replace(/-/g, "")}.xlsx`);
  },

  getTongHopChiTiet: async (
    maForm: string,
    loc: KdlLoc,
    loaiDuLieu: string
  ): Promise<{ data: KdlDongTongHopCT[]; vuotGioiHan: boolean }> => {
    const res = (await apiService.get(`/api/Kdl/form/${maForm}/tong-hop-chi-tiet`, {
      params: toParams({ ...loc, loaiDuLieu }),
    })) as { data?: KdlDongTongHopCT[]; vuotGioiHan?: boolean };
    return { data: res?.data ?? [], vuotGioiHan: !!res?.vuotGioiHan };
  },

  exportTongHopChiTiet: async (maForm: string, loc: KdlLoc, loaiDuLieu: string): Promise<void> => {
    const blob = (await apiService.get(`/api/Kdl/form/${maForm}/tong-hop-chi-tiet/export-excel`, {
      params: toParams({ ...loc, loaiDuLieu }),
      responseType: "blob",
    })) as unknown as Blob;
    taiFile(blob, `${maForm}_THCT_${loc.tuNgay.replace(/-/g, "")}_${loc.denNgay.replace(/-/g, "")}.xlsx`);
  },

  getTongHopTheoChieu: async (
    maForm: string,
    loc: KdlLoc,
    chieu: KdlChieuTH,
    loaiDuLieu: string
  ): Promise<{ data: KdlDongTongHopCT[]; vuotGioiHan: boolean }> => {
    const res = (await apiService.get(`/api/Kdl/form/${maForm}/tong-hop-theo-chieu`, {
      params: toParams({ ...loc, chieu, loaiDuLieu }),
    })) as { data?: KdlDongTongHopCT[]; vuotGioiHan?: boolean };
    return { data: res?.data ?? [], vuotGioiHan: !!res?.vuotGioiHan };
  },

  exportTongHopTheoChieu: async (maForm: string, loc: KdlLoc, chieu: KdlChieuTH, loaiDuLieu: string): Promise<void> => {
    const blob = (await apiService.get(`/api/Kdl/form/${maForm}/tong-hop-theo-chieu/export-excel`, {
      params: toParams({ ...loc, chieu, loaiDuLieu }),
      responseType: "blob",
    })) as unknown as Blob;
    taiFile(blob, `${maForm}_TH_${chieu}_${loc.tuNgay.replace(/-/g, "")}_${loc.denNgay.replace(/-/g, "")}.xlsx`);
  },

  /** giaTri: { MaKey: giá trị | null } — null / "" = xóa nhập tay, quay về số tự động. */
  nhapTay: async (maForm: string, idDoiTuong: number, giaTri: Record<string, number | string | null>): Promise<KdlDong> =>
    (await apiService.put(`/api/Kdl/form/${maForm}/doi-tuong/${idDoiTuong}/nhap-tay`, giaTri)) as KdlDong,

  dongBo: async (maModule: string, params: { tuNgay: string; denNgay: string }): Promise<KdlSyncLog> =>
    (await apiService.post(`/api/Kdl/${maModule}/dong-bo`, null, { params: toParams(params) })) as KdlSyncLog,

  // Chưa có lần đồng bộ nào → API trả 204 (body rỗng)
  lanDongBoGanNhat: async (maModule: string): Promise<KdlSyncLog | null> =>
    ((await apiService.get(`/api/Kdl/${maModule}/dong-bo/lan-gan-nhat`)) as KdlSyncLog | "" | null) || null,
};
