import { BM_CONFIG } from "./BieuMauConst";

export interface BieuMauQuyenItem {
  maBm: string;
  tenBm: string;
  nhom: string;
}

export interface KhuVucQuyenItem {
  maKhuVuc: string;
  tenKhuVuc: string;
  nhom: string;
}

export const bmQuyenConfig = {
  danhSachBieuMau: [
    {
      maBm: BM_CONFIG.CTD.CTD_STD_Sanxuat,
      tenBm: "Sổ theo dõi sản xuất hàng ngày",
      nhom: "NM.CTD",
    },
    {
      maBm: BM_CONFIG.CTD.CTD_BB_Phoinong,
      tenBm: "Biên bản phôi nóng",
      nhom: "NM.CTD",
    },
    {
      maBm: BM_CONFIG.CTD.CTD_KPH_Sanxuat,
      tenBm: "Phiếu xử lý sản phẩm không phù hợp",
      nhom: "NM.CTD",
    },
    {
      maBm: BM_CONFIG.CTD.CTD_BB_SanLuong_KCS,
      tenBm: "Biên bản xác nhận sản lượng",
      nhom: "NM.CTD",
    },
     {
      maBm: BM_CONFIG.CTD.CTD_BB_PhoiNapnguoi,
      tenBm: "Biên bản phôi nạp nguội",
      nhom: "NM.CTD",
    },
    {
      maBm: BM_CONFIG.CTD.CTD_BB_GiaoNhanPhoi,
      tenBm: "Biên bản giao nhận phôi",
      nhom: "NM.CTD",
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_STD_NXT,
      tenBm: "STD - Nhập xuất tồn",
      nhom: "NM.HRC2",
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_BOF,
      tenBm: "Biên bản tiêu hao nấu luyện lò thổi BOF",
      nhom: "NM.HRC2",
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_LF,
      tenBm: "Biên bản tiêu hao nấu luyện lò tinh luyện LF",
      nhom: "NM.HRC2",
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_RH,
      tenBm: "Biên bản tiêu hao nấu luyện lò tinh luyện RH",
      nhom: "NM.HRC2",
    },
    {
      maBm: BM_CONFIG.HRC1.HRC1_BB_GiaoNhanPhoiNhapKho,
      tenBm: "Biên bản giao nhận phôi nhập kho",
      nhom: "NM.HRC1",
    },
    {
      maBm: BM_CONFIG.HRC1.HRC1_BB_Sanluongphoi,
      tenBm: "Biên bản sản lượng phôi",
      nhom: "NM.HRC1",
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BBGN_ThepLong,
      tenBm: "HRC2 -Biên bản giao nhận thép lỏng",
      nhom: "NM.HRC2",
    },
    {
      maBm: BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
      tenBm: "HRC1 - Biên bản giao nhận thép lỏng",
      nhom: "NM.HRC1",
    },
  ] as BieuMauQuyenItem[],
  danhSachKhuVuc: [
    { maKhuVuc: "1", tenKhuVuc: "Xưởng cán 1", nhom: "NM.CTD" },
    { maKhuVuc: "2", tenKhuVuc: "Xưởng cán 2", nhom: "NM.CTD" },
    { maKhuVuc: "3", tenKhuVuc: "Xưởng cán 3", nhom: "NM.CTD" },
    { maKhuVuc: "LF", tenKhuVuc: "Lò LF", nhom: "NM.HRC2" },
    { maKhuVuc: "RH", tenKhuVuc: "Lò RH", nhom: "NM.HRC2" },
    { maKhuVuc: "BOF", tenKhuVuc: "Lò BOF", nhom: "NM.HRC2" },
    { maKhuVuc: "ALL", tenKhuVuc: "Tất cả", nhom: "COMMON" },
    { maKhuVuc: "4", tenKhuVuc: "NM.HRC1", nhom: "NM.HRC1" }
  ] as KhuVucQuyenItem[],
};
