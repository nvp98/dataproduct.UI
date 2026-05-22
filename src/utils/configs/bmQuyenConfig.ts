import { BM_CONFIG } from "./BieuMauConst";

export interface KhuVucQuyenItem {
  maKhuVuc: string;
  tenKhuVuc: string;
}

export interface KhuVucPhuItem {
  khuVucPhu: string;
  tenKhuVuc: string;
}

export interface BieuMauQuyenItem {
  maBm: string;
  tenBm: string;
  nhom: string;
  scope?: KhuVucQuyenItem[];
  khuVucPhus?: KhuVucPhuItem[];
}

export const bmQuyenConfig = {
  danhSachQuyenChucNang: [
    {value: 1, label: "Xử lý "},
    {value: 2, label: "Phê duyệt "},
    {value: 3, label: "Chốt"},
    {value: 4, label: "Xử lý + Phê duyệt", disabled: true}, // không cho chọn mới, chỉ để hiển thị dữ liệu cũ
    {value: 5, label: "Xem "},
  ],
  danhSachBieuMau: [
    {
      maBm: BM_CONFIG.CTD.CTD_STD_Sanxuat,
      tenBm: "Sổ theo dõi sản xuất hàng ngày",
      nhom: "NM.CTD"
    },
    {
      maBm: BM_CONFIG.CTD.CTD_BB_Phoinong,
      tenBm: "Biên bản phôi nóng",
      nhom: "NM.CTD",
      scope: [
        {maKhuVuc: "1", tenKhuVuc: "Xưởng cán 1"},
        {maKhuVuc: "2", tenKhuVuc: "Xưởng cán 2"},
        {maKhuVuc: "3", tenKhuVuc: "Xưởng cán 3"},
      ]
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
      scope: [
        {maKhuVuc: "6", tenKhuVuc: "Lò thổi 6"},
        {maKhuVuc: "7", tenKhuVuc: "Lò thổi 7"},
      ]
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_LF,
      tenBm: "Biên bản tiêu hao nấu luyện lò tinh luyện LF",
      nhom: "NM.HRC2",
      scope: [
        {maKhuVuc: "6", tenKhuVuc: "Tinh luyện 6"},
      ]
    },
    {
      maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_RH,
      tenBm: "Biên bản tiêu hao nấu luyện lò tinh luyện RH",
      nhom: "NM.HRC2",
      scope: [
        {maKhuVuc: "1", tenKhuVuc: "RH 1"},
        {maKhuVuc: "2", tenKhuVuc: "RH 2"},
      ]
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
      scope: [
        {maKhuVuc: "6", tenKhuVuc: "CCM1",},
        {maKhuVuc: "7", tenKhuVuc: "CCM2"},
      ],
      khuVucPhus: [
        {khuVucPhu: "6", tenKhuVuc: "Lò thổi 6"},
        {khuVucPhu: "7", tenKhuVuc: "Lò thổi 7"},
        {khuVucPhu: "TL", tenKhuVuc: "Tinh luyện"}
      ]
    },
    {
      maBm: BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
      tenBm: "HRC1 - Biên bản giao nhận thép lỏng",
      nhom: "NM.HRC1",
      scope: [
        {maKhuVuc: "1", tenKhuVuc: "TSC 1",},
        {maKhuVuc: "2", tenKhuVuc: "TSC 2"},
        {maKhuVuc: "3", tenKhuVuc: "Đúc vuông 1"},
        {maKhuVuc: "4", tenKhuVuc: "Đúc vuông 2"},
        {maKhuVuc: "5", tenKhuVuc: "Đúc vuông 3"},
      ],
      khuVucPhus: [
        {khuVucPhu: "1", tenKhuVuc: "Lò thổi 1"},
        {khuVucPhu: "2", tenKhuVuc: "Lò thổi 2"},
        {khuVucPhu: "3", tenKhuVuc: "Lò thổi 3"},
        {khuVucPhu: "4", tenKhuVuc: "Lò thổi 4"},
        {khuVucPhu: "5", tenKhuVuc: "Lò thổi 5"},
        {khuVucPhu: "TL", tenKhuVuc: "Tinh luyện"}
      ]
    },
    {
      maBm: BM_CONFIG.NL.NL_BB_TheoDoiBenPhe,
      tenBm: "Biên bản theo dõi ben phế",
      nhom: "NM.NL",
    },
    {
      maBm: BM_CONFIG.NMLG.NMLG_BM_TonSiloLoCao,
      tenBm: "Biên bản tồn silo lò cao",
      nhom: "NM.NMLG",
    }
  ] as BieuMauQuyenItem[],
  danhSachKhuVuc: [
    { maKhuVuc: "1", tenKhuVuc: "Xưởng cán 1", nhom: "NM.CTD" },
    { maKhuVuc: "2", tenKhuVuc: "Xưởng cán 2", nhom: "NM.CTD" },
    { maKhuVuc: "3", tenKhuVuc: "Xưởng cán 3", nhom: "NM.CTD" },
    { maKhuVuc: "LF", tenKhuVuc: "Lò LF", nhom: "NM.HRC2" },
    { maKhuVuc: "RH", tenKhuVuc: "Lò RH", nhom: "NM.HRC2" },
    { maKhuVuc: "BOF", tenKhuVuc: "Lò BOF", nhom: "NM.HRC2" },
    { maKhuVuc: "ALL", tenKhuVuc: "Tất cả", nhom: "COMMON" },
    { maKhuVuc: "4", tenKhuVuc: "NM.HRC1", nhom: "NM.HRC1" },
    { maKhuVuc: "5", tenKhuVuc: "NM.NMLG", nhom: "NM.NMLG" },
  ] as KhuVucQuyenItem[],

  // danhSachKhuVuc: [
  //   { maKhuVuc: "1", tenKhuVuc: "Xưởng cán 1", nhom: "NM.CTD" },
  //   { maKhuVuc: "2", tenKhuVuc: "Xưởng cán 2", nhom: "NM.CTD" },
  //   { maKhuVuc: "3", tenKhuVuc: "Xưởng cán 3", nhom: "NM.CTD" },
  //   { maKhuVuc: "LF", tenKhuVuc: "Lò LF", nhom: "NM.HRC2" },
  //   { maKhuVuc: "RH", tenKhuVuc: "Lò RH", nhom: "NM.HRC2" },
  //   { maKhuVuc: "BOF", tenKhuVuc: "Lò BOF", nhom: "NM.HRC2" },
  //   { maKhuVuc: "ALL", tenKhuVuc: "Tất cả", nhom: "COMMON" },
  //   { maKhuVuc: "4", tenKhuVuc: "NM.HRC1", nhom: "NM.HRC1" }
  // ] as KhuVucQuyenItem[],
};
