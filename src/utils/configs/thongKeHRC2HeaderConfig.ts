// Cấu hình header cho trang thống kê HRC2.
// Hiện tại chỉ là placeholder, bạn có thể điền thêm các column sau.

export type ThongKeLoaiBMKey = "BOF" | "LF" | "RH";

export interface ThongKeHeaderColumn {
  dataIndex: string;
  title: string;
  width?: number;
  children?: ThongKeHeaderColumn[];
}

// Header cho bảng tổng hợp dữ liệu tiêu hao Lò thổi (BOF)
export const Header_TieuHaoLoThoi: ThongKeHeaderColumn[] = [
  { dataIndex: "ngay", title: "Ngày", width: 120 },
  { dataIndex: "ca", title: "Ca", width: 80 },
  { dataIndex: "kip", title: "Kíp", width: 80 },
  { dataIndex: "loThoi", title: "Lò thổi", width: 80 },
  { dataIndex: "meThoi", title: "Mẻ thổi", width: 80 },
  { dataIndex: "macThep", title: "Mác thép", width: 120 },
  { dataIndex: "klGangLongCCT", title: "Gang lỏng", width: 80 },
  { dataIndex: "klThepPhe", title: "Thép phế", width: 80 },
  // { dataIndex: "fe", title: "Quặng FE", width: 80 },
  // { dataIndex: "voi", title: "Vôi", width: 80 },
  // { dataIndex: "dolomite", title: "Dolomite", width: 80 },
  // { dataIndex: "voiLF", title: "Vôi LF", width: 80 },
  // { dataIndex: "simn", title: "SiMn", width: 80 },
  // { dataIndex: "fesi", title: "FeSi", width: 80 },
  // { dataIndex: "than", title: "Than", width: 80 },
  // { dataIndex: "femn", title: "FeMn", width: 80 },
  // { dataIndex: "ldsf", title: "LDSF", width: 80 },
  // { dataIndex: "al", title: "Al", width: 80 },
  // { dataIndex: "femn75", title: "FeMn 75", width: 80 },
  // { dataIndex: "lfak", title: "LFAK", width: 80 },
  // { dataIndex: "fesiThap", title: "FeSi thấp", width: 80 },
  // { dataIndex: "bauxite85", title: "Bauxite-85", width: 80 },
  // { dataIndex: "huynhThach", title: "Huỳnh thạch", width: 80 },
];

// Header cho bảng tổng hợp dữ liệu tiêu hao tinh luyện (LF, RH)
export const Header_TieuHaoTinhLuyen: ThongKeHeaderColumn[] = [
  { dataIndex: "ngaySx", title: "Ngày", width: 120 },
  { dataIndex: "ca", title: "Ca", width: 80 },
  { dataIndex: "kip", title: "Kíp", width: 80 },
  { dataIndex: "tinhLuyen", title: "Tinh Luyện/RH", width: 80 },
  { dataIndex: "meThoi", title: "Mẻ thổi", width: 80 },
  { dataIndex: "macThep", title: "Mác thép", width: 120 },
  // { dataIndex: "fesi", title: "FeSi", width: 80 },
  // { dataIndex: "simn", title: "SiMn", width: 80 },
  // { dataIndex: "than", title: "Than", width: 80 },
  // { dataIndex: "fecr", title: "FeCr", width: 80 },
  // { dataIndex: "fev", title: "FeV", width: 80 },
  // { dataIndex: "niken", title: "Niken", width: 80 },
  // { dataIndex: "fep", title: "FeP", width: 80 },
  // { dataIndex: "cu", title: "Đồng", width: 80 },
  // { dataIndex: "fesiThap", title: "FeSi thấp", width: 80 },
  // { dataIndex: "huynhThach", title: "Huỳnh thạch", width: 80 },
  // { dataIndex: "al", title: "Al", width: 80 },
  // { dataIndex: "voi", title: "Vôi", width: 80 },
  // { dataIndex: "dolomite", title: "Dolomite", width: 80 },
  // { dataIndex: "quaczit", title: "Quaczít", width: 80 },
  // { dataIndex: "lfak", title: "LFAK", width: 80 },
  // { dataIndex: "thanhGhi", title: "Thanh Ghi", width: 80 },
  // { dataIndex: "niobium", title: "Niobium", width: 80 },
  // { dataIndex: "feti", title: "FeTi", width: 80 },
  // { dataIndex: "fecr60", title: "FeCr60", width: 80 },
  // { dataIndex: "feb", title: "FeB", width: 80 },
  // { dataIndex: "femn75", title: "FeMn 75", width: 80 },
  // { dataIndex: "femo", title: "FeMo", width: 80 }
];

// Map loại BM -> header sử dụng
export const THONGKE_HRC2_HEADERS: Record<ThongKeLoaiBMKey, ThongKeHeaderColumn[]> = {
  BOF: Header_TieuHaoLoThoi,
  LF: Header_TieuHaoTinhLuyen,
  RH: Header_TieuHaoTinhLuyen,
};

