import { BM_CONFIG } from "./BieuMauConst";

export const MenuDataDashboard = [
  {
    category: "NM.NL",
    icon: "nmnl",
    color: "#1890ff",
    items: [
      {
        code: "nhatkyquangtrunghoa",
        title: "BM.06/QT.05.01 NHẬT KÝ THAO TÁC PHỐI TRỘN QUẶNG TRUNG HÒA",
        maBm: "NL_BB_Quangtrunghoa",
      },
    ],
  },
  {
    category: "NM.HRC1",
    icon: "hrc1",
    color: "#720101ff",
    items: [
      {
        code: "bienbantheplong",
        title: "BM.16/QT.05.10 BIÊN BẢN GIAO NHẬN THÉP LỎNG",
        maBm: BM_CONFIG.HRC1.HRC1_BB_Theplong,
      },
      {
        code: "tieuhaolothoi",
        title: "BM.08/QT.05.15 BIÊN BẢN TIÊU HAO NẤU LUYỆN LÒ THỔI",
        maBm: BM_CONFIG.HRC1.HRC1_BB_Lothoi,
      },
      {
        code: "bienbanphoinong",
        title: "BM.06/QT.05.10 BIÊN BẢN GIAO NHẬN PHÔI NÓNG (GIAO PHÔI)",
        maBm: BM_CONFIG.CTD.CTD_BB_Phoinong,
      },
      {
        code: "bienbanphoinguoi",
        title: "BM.06/QT.05.10 BIÊN BẢN GIAO NHẬN PHÔI NGUỘI",
        maBm: BM_CONFIG.CTD.CTD_BB_Phoinguoi,
      },
    ],
  },
  {
    category: "NM.HRC2",
    icon: "nmhrc2",
    color: "#019221ff",
    items: [
      {
        code: "tieuhaonauluyen_lf",
        title: "BM.14/QT.05.15 BẢNG TIÊU HAO NẤU LUYỆN LÒ TINH LUYỆN LF",
        maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_LF,
      },
      {
        code: "tieuhaonauluyen_bof",
        title: "BM.08/QT.05.15 BIÊN BẢN TIÊU HAO NẤU LUYỆN LÒ THỔI",
        maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_BOF,
      },
      {
        code: "tieuhaonauluyen_rf",
        title: "BM.16/QT.05.15 BẢNG TIÊU HAO NẤU LUYỆN LÒ TINH LUYỆN RH",
        maBm: BM_CONFIG.HRC2.HRC2_BB_NauLuyen_RH,
      },
    ],
  },
  {
    category: "NM.CTD",
    icon: "nmctd",
    color: "#722ed1",
    items: [
      {
        code: "viecdentoi/bienbanphoinong",
        title: "BM.06/QT.05.10 BIÊN BẢN GIAO NHẬN PHÔI NÓNG (NHẬN PHÔI)",
        maBm: BM_CONFIG.CTD.CTD_BB_Phoinong,
      },
      // {
      //   code: "bienbanphoinguoi",
      //   title: "BM.06/QT.05.10 BIÊN BẢN GIAO NHẬN PHÔI NGUỘI",
      // },
      {
        code: "bienbanphoinguoi",
        title: "BM.06/QT.05.10 BIÊN BẢN GIAO NHẬN PHÔI NGUỘI",
      },
      {
        code: "bienbansanluongphoi",
        title: "BM.11/QT.05.11 BIÊN BẢN XÁC NHẬN SẢN LƯỢNG PHÔI THÉP",
      },
      {
        code: "bienbanphoinapkho",
        title: "BM.12/QT.05.11 BIÊN BẢN GIAO NHẬN PHÔI NHẬP KHO",
      },
    ],
  },
  {
    category: "NM.LG",
    icon: "nmlg",
    color: "#019221ff",
    items: [
      {
        code: "naplieulocao",
        title: "BM.05/QT.05.09 SỔ THEO DÕI NẠP LIỆU LÒ CAO",
      },
      {
        code: "khoiluongsilo",
        title: "BM.07/QT.05.09 CHỐT KHỐI LƯỢNG SILO LÒ CAO",
      },
      {
        code: "vanhanhthanphun",
        title: "BM.10/QT.05.09 NHẬT KÝ VẬN HÀNH THAN PHUN LÒ CAO",
      },
    ],
  },

  // {
  //   category: "Quản lý thiết bị",
  //   icon: "equipment",
  //   color: "#13c2c2",
  //   items: [
  //     { code: "BM.09/QT.09", title: "Biên bản sự cố thiết bị" },
  //     { code: "BM.11A/QT.09", title: "Phiếu đề nghị thuê ngoài" },
  //     { code: "BM.11B/QT.09", title: "Phiếu đề nghị nội bộ" },
  //   ],
  // },
  // {
  //   category: "Công nghệ thông tin",
  //   icon: "it",
  //   color: "#2f54eb",
  //   items: [
  //     { code: "BM.01/QT.23.01", title: "Đăng ký tài khoản nội bộ" },
  //     { code: "BM.03A/QT.23.01", title: "Chuyển đổi vị trí chấm công" },
  //     { code: "BM.03B/QT.23.01", title: "Thêm vị trí chấm công" },
  //   ],
  // },
  // {
  //   category: "An toàn - Môi trường",
  //   icon: "safety",
  //   color: "#fa8c16",
  //   items: [
  //     { code: "BM.01/QT.18.07", title: "Giấy phép công việc đào đất" },
  //     { code: "BM.02/QT.18.07", title: "Giấy phép công việc nâng hạ" },
  //     {
  //       code: "BM.05/QT.18.07",
  //       title: "Giấy phép công việc phát sinh tia lửa",
  //     },
  //   ],
  // },
  // {
  //   category: "Thủ tục hành chính",
  //   icon: "admin",
  //   color: "#52c41a",
  //   items: [
  //     { code: "BM.03/QT.22", title: "Đơn đề nghị hỗ trợ phương tiện" },
  //     { code: "BM.21/QT.22", title: "Đề nghị photocopy, in ấn" },
  //     { code: "BM.24/QT.22", title: "Đề nghị gửi hàng hóa" },
  //   ],
  // },
];
