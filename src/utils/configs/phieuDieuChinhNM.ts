import LG_PhieuDieuChinh from "../BM_config/LG_PhieuDieuChinh.json";

// Phiếu điều chỉnh số liệu theo phòng ban (NM.TKVV, NM.NL, NM.LC...): cùng một trang, khác cấu hình.
// Nhập / Xuất lấy dòng BBGN theo các xưởng của phòng ban (bảng LG_PDC_Scope_PhongBan, cột ID_Xuong), mỗi xưởng 1 tab.
// Không có tab Nội bộ (chỉ NM.LG có, xem LG_PhieuDieuChinh.json).
// Thêm nhà máy mới = thêm 1 dòng vào PHIEU_DIEU_CHINH_NM + thêm các xưởng của phòng ban vào LG_PDC_Scope_PhongBan.
export interface PhieuDieuChinhNM {
  /** Khóa dùng trong đường dẫn: /phieudieuchinh{key}, /taophieudieuchinh{key}... */
  key: string;
  /** Tên hiển thị / mã nhà máy, cũng là mã phòng ban của ô chọn người lập phiếu (maphongBan) */
  ten: string;
  /** ID phòng ban (Tbl_Xuong.ID_PhongBan / LG_PDC_Scope_PhongBan.ID_PhongBan) */
  ID_PhongBan: number;
  /** Mã biểu mẫu (BmPhieu.MaBm) */
  maBm: string;
  /** Tiền tố số phiếu */
  prefix: string;
  /** Có thêm tab Nội bộ - Xuất vào sản xuất (chia tab theo xưởng của phòng ban). Nguồn dữ liệu: LayNguonNoiBo ở BE */
  coNoiBo?: boolean;
}

export const PHIEU_DIEU_CHINH_NM: PhieuDieuChinhNM[] = [
  { key: "tkvv", ten: "NM.TKVV", ID_PhongBan: 66, maBm: "NMTKVV_BM_PhieuDieuChinh", prefix: "NMTKVV_PDC", coNoiBo: true },
  { key: "nl", ten: "NM.NL", ID_PhongBan: 64, maBm: "NMNL_BM_PhieuDieuChinh", prefix: "NMNL_PDC", coNoiBo: true },
  { key: "lc", ten: "NM.LC", ID_PhongBan: 62, maBm: "NMLC_BM_PhieuDieuChinh", prefix: "NMLC_PDC", coNoiBo: true },
];

export const getPhieuDieuChinhNMPaths = (nm: PhieuDieuChinhNM) => ({
  danhSach: `/phieudieuchinh${nm.key}`,
  viecDenToi: `/viecdentoi/phieudieuchinh${nm.key}`,
  xemPhieu: `/xemphieu/phieudieuchinh${nm.key}`,
  tao: `/taophieudieuchinh${nm.key}`,
  chiTiet: `/chitietphieudieuchinh${nm.key}`,
});

const cache = new Map<string, Record<string, unknown>>();

/** Cấu hình biểu mẫu của 1 nhà máy — cùng dạng với LG_PhieuDieuChinh.json (trang đọc config.code, headerFields, signatures...) */
export const buildPhieuDieuChinhNMConfig = (nm: PhieuDieuChinhNM): Record<string, unknown> => {
  const cached = cache.get(nm.key);
  if (cached) return cached;

  const paths = getPhieuDieuChinhNMPaths(nm);
  const config = {
    code: nm.maBm,
    title: `PHIẾU ĐIỀU CHỈNH SỐ LIỆU ${nm.ten}`,
    prefix: nm.prefix,
    ID_PhongBan: nm.ID_PhongBan,
    taoPath: paths.tao,
    chiTietPath: paths.chiTiet,
    headerInfo: LG_PhieuDieuChinh.headerInfo,
    isoInfo: LG_PhieuDieuChinh.isoInfo,
    // Ngày / Ca / Kíp giống phiếu NM.LG
    headerFields: LG_PhieuDieuChinh.headerFields,
    // Có Nội bộ → dùng bảng chi tiết của phiếu NM.LG (Nội bộ chia tab theo xưởng, chung danh sách với Nhập / Xuất)
    coNoiBo: nm.coNoiBo === true,
    layout: nm.coNoiBo ? LG_PhieuDieuChinh.layout : [],
    signatures: [
      {
        label: "Người lập phiếu",
        type: "selectNguoiKy",
        key: `nguoiLapPhieu_${nm.ten}`,
        maphongBan: nm.ten,
        capDuyet: 0,
        isChon: true,
        required: true,
      },
    ],
  };
  cache.set(nm.key, config);
  return config;
};
