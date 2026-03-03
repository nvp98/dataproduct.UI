// src/config/menuConfig.ts
import {
  UserOutlined,
  UploadOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
  DeliveredProcedureOutlined,
  ProfileOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { NavLink } from "react-router-dom";

/** Trường maBM dùng để so khớp với MaBM trong bảng BM_QuyenXL khi lọc menu theo quyền (XULY / PHEDUYET). */
export type MenuItemWithMaBM = {
  key: string;
  maBM?: string;
  label: React.ReactNode;
  children?: MenuItemWithMaBM[];
  [key: string]: unknown;
};

export const menuConfig = [
  {
    key: "1",
    icon: <UserOutlined />,
    label: <NavLink to="/">Trang chủ</NavLink>,
    // roles: ["admin"], // chỉ admin mới thấy
  },
  {
    key: "sub1",
    label: "Kho dữ liệu",
    roles: ["admin", "PKH"],
    icon: <AppstoreOutlined />,
    children: [
      {
        key: "sub1-1",
        label: "NM.HRC1",
        children: [
          {
            key: "sub1-1.1",
            label: (
              <Tooltip title="Phôi thép">
                <NavLink to="/sanluongphoi">Sản lượng phôi</NavLink>
              </Tooltip>
            ),
          },
          // { key: "6", label: "Option 6" },
        ],
      },
      // {
      //   key: "sub1-2",
      //   label: "NM.NL",
      //   children: [
      //     {
      //       key: "sub1-1.2",
      //       label: (
      //         <Tooltip title="Nguyên Vật liệu">
      //           <NavLink to="/nguyennhienlieu">Nguyên vật liệu</NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      // {
      //   key: "sub1-3",
      //   label: "NM.HRC2",
      //   children: [
      //     {
      //       key: "sub1-1.3",
      //       label: (
      //         <Tooltip title="HRC2 - Dữ liệu luyện thép">
      //           <NavLink to="/dlnmhrc2luyenthep">
      //             HRC2 - Dữ liệu luyện thép
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     {
      //       key: "sub1-1.4",
      //       label: (
      //         <Tooltip title="HRC2 - Header Mapping">
      //           <NavLink to="/header-mapping">HRC2 - Header Mapping</NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //   ],
      // },
      {
        key: "sub1-2",
        label: "NM.NL",
        children: [
          {
            key: "sub1-1.2",
            label: (
              <Tooltip title="Nguyên Vật liệu">
                <NavLink to="/nguyennhienlieu">Nguyên vật liệu</NavLink>
              </Tooltip>
            ),
          },
          // { key: "6", label: "Option 6" },
        ],
      },
      {
        key: "sub1-3",
        label: "NM.HRC2",
        children: [
          {
            key: "sub1-1.3",
            label: (
              <Tooltip title="HRC2 - Dữ liệu luyện thép">
                <NavLink to="/dlnmhrc2luyenthep">HRC2 - Dữ liệu luyện thép</NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub1-1.4",
            label: (
              <Tooltip title="HRC2 - Phụ Liệu">
                <NavLink to="/header-mapping">HRC2 - Phụ Liệu</NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub1-1.5",
            label: (
              <Tooltip title="HRC2 - Silo Nguyên liệu">
                <NavLink to="/silo">HRC2 - Silo Nguyên liệu</NavLink>
              </Tooltip>
            ),
          },
        ],
      },
    ],
  },
  {
    key: "taoyeucau",
    icon: <UploadOutlined />,
    label: <NavLink to="/taoyeucau">Tạo yêu cầu</NavLink>,
    // roles: ["admin"], // chỉ admin mới thấy
  },
  {
    key: "sub2",
    label: "Việc tôi bắt đầu",
    icon: <AppstoreAddOutlined />,
    children: [
      // { key: "3", label: <NavLink to="/dashboard">Tạo yêu cầu</NavLink> },
      // { key: "4", label: "Option 4" },
      // {
      //   key: "sub2-2",
      //   label: "NM.NL",
      //   children: [
      //     {
      //       key: "4",
      //       label: (
      //         <Tooltip title="BM.06/QT.05.01 (Nhật ký thao tác phối trộn quặng trung hòa)">
      //           <NavLink to="/nhatkyquangtrunghoa">
      //             BM.06/QT.05.01 (Nhật ký thao tác phối trộn quặng trung hòa)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      // {
      //   key: "sub2-3",
      //   label: "NM.HRC1",
      //   children: [
      //     {
      //       key: "5",
      //       label: (
      //         <Tooltip title="BM.16/QT.05.10 (Biên bản giao nhận thép lỏng)">
      //           <NavLink to="/bienbantheplong">
      //             BM.16/QT.05.10 (Biên bản giao nhận thép lỏng)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     {
      //       key: "sub2-3-1",
      //       label: (
      //         <Tooltip title="BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi)">
      //           <NavLink to="/tieuhaolothoi">
      //             BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //   ],
      // },
      {
        key: "sub2-4",
        label: "NM.CTD",
        children: [
          {
            key: "6",
            maBM: "CTD_BB_Phoinong",
            label: (
              <Tooltip title="BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)">
                <NavLink to="/bienbanphoinong">
                  BM.06/QT.05.10 Biên bản giao nhận phôi nóng (Nhận phôi)
                </NavLink>
              </Tooltip>
            ),
          },
          // {
          //   key: "7",
          //   label: (
          //     <Tooltip title="BM.07/QT.05.10 (Biên bản giao nhận phôi nguội)">
          //       <NavLink to="/bienbanphoinguoi">
          //         BM.06/QT.05.10 (Biên bản giao nhận phôi nguội)
          //       </NavLink>
          //     </Tooltip>
          //   ),
          // },
          // { key: "6", label: "Option 6" },
        ],
      },
      // {
      //   key: "sub2-5",
      //   label: "NM.LG",
      //   children: [
      //     {
      //       key: "sub2-5-1",
      //       label: (
      //         <Tooltip title="BM.05/QT.05.09 (Sổ theo dõi nạp liệu lò cao)">
      //           <NavLink to="/naplieulocao">
      //             BM.05/QT.05.09 (Sổ theo dõi nạp liệu lò cao)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     {
      //       key: "sub2-5-2",
      //       label: (
      //         <Tooltip title="BM.07/QT.05.09 (Chốt khối lượng silo lò cao)">
      //           <NavLink to="/khoiluongsilo">
      //             BM.07/QT.05.09 (Chốt khối lượng silo lò cao)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     {
      //       key: "sub2-5-3",
      //       label: (
      //         <Tooltip title="BM.10/QT.05.09 (Nhật ký vận hành than phun lò cao)">
      //           <NavLink to="/vanhanhthanphun">
      //             BM.10/QT.05.09 (Nhật ký vận hành than phun lò cao)
      //           </NavLink>
      //         </Tooltip>
      //       ),
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      {
        key: "sub2-6",
        label: "NM.HRC2",
        children: [
          {
            key: "sub2-6-0",
            maBM: "HRC2_STD_NXT",
            label: (
              <Tooltip title="STD - Nhập xuất tồn">
                <NavLink to="/std_nhapxuatton">STD - Nhập xuất tồn</NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub2-6-1",
            maBM: "HRC2_BB_NauLuyen_BOF",
            label: (
              <Tooltip title="BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi BOF)">
                <NavLink to="/tieuhaonauluyen_bof">
                  BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi BOF)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub2-6-2",
            maBM: "HRC2_BB_NauLuyen_LF",
            label: (
              <Tooltip title="BM.14/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện LF)">
                <NavLink to="/tieuhaonauluyen_lf">
                  BM.14/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện LF)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub2-6-3",
            maBM: "HRC2_BB_NauLuyen_RH",
            label: (
              <Tooltip title="BM.16/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện RH)">
                <NavLink to="/tieuhaonauluyen_rh">
                  BM.16/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện RH)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub2-6-4",
            maBM: "HRC2_BBGN_PhoiTam",
            label: (
              <Tooltip title="BM.40/QT.05.15 (Biên bản giao nhận phôi tấm)">
                <NavLink to="/bbgnphoitam">
                  BM.40/QT.05.15 (Biên bản giao nhận phôi tấm)
                </NavLink>
              </Tooltip>
            ),
          },
        ],
      },{
        key: "sub2-7",
        label: "NM.HRC1",
        children: [
          {
            key: "sub2-7-1",  
            label: (
                <Tooltip title="BM.11/QT.05.11 (Biên bản xác nhận sản lượng phôi thép)">
                <NavLink to="/bienbansanluongphoi">
                  BM.11/QT.05.11 (Biên bản xác nhận sản lượng phôi thép)
                </NavLink>
              </Tooltip>
            ),
        },
        {
              key: "sub2-7-2",  
            label: (
                <Tooltip title="BM.12/QT.05.11 (Biên bản giao nhận phôi nhập kho)">
                  <NavLink to="/bienbanphoinapkho">
                    BM.12/QT.05.11 (Biên bản giao nhận phôi nhập kho)
                  </NavLink>
                </Tooltip>
              ),
        },
        ],
      },
    ],
  },
  {
    key: "sub3",
    label: "Việc đến tôi",
    icon: <DeliveredProcedureOutlined />,
    children: [
      // { key: "3", label: <NavLink to="/dashboard">Tạo yêu cầu</NavLink> },
      // { key: "4", label: "Option 4" },
      // {
      //   key: "sub3-2",
      //   label: "NM.NL",
      //   children: [
      //     {
      //       key: "sub3-2-1",
      //       label: <NavLink to="/dashboard">BM.06/QT.05.10</NavLink>,
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      // {
      //   key: "sub3-3",
      //   label: "NM.HRC2",
      //   children: [
      //     {
      //       key: "sub3-3-1",
      //       label: <NavLink to="/dashboard">BM.06/QT.05.10</NavLink>,
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      {
        key: "sub4-4",
        label: "NM.CTD",
        children: [
          {
            key: "9",
            maBM: "CTD_BB_Phoinong",
            label: (
              <Tooltip title="BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)">
                <NavLink to="/viecdentoi/bienbanphoinong">
                  BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)
                </NavLink>
              </Tooltip>
            ),
          },
          // {
          //   key: "10",
          //   label: (
          //     <Tooltip title="BM.07/QT.05.10 (Biên bản giao nhận phôi nguội)">
          //       <NavLink to="/bienbanphoinguoi">
          //         BM.06/QT.05.10 (Biên bản giao nhận phôi nguội)
          //       </NavLink>
          //     </Tooltip>
          //   ),
          // },
          // { key: "6", label: "Option 6" },
        ],
      },
      {
        key: "sub4-5",
        label: "NM.HRC2",
        children: [
          {
            key: "sub4-5-1",
            maBM: "HRC2_BB_NauLuyen_BOF",
            label: (
              <Tooltip title="BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi)">
                <NavLink to="/viecdentoi/tieuhaonauluyen_bof">
                  BM.08/QT.05.15 (Biên bản tiêu hao nấu luyện lò thổi)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub4-5-2",
            maBM: "HRC2_BB_NauLuyen_LF",
            label: (
              <Tooltip title="BM.14/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện LF)">
                <NavLink to="/viecdentoi/tieuhaonauluyen_lf">
                  BM.14/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện LF)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub4-5-3",
            maBM: "HRC2_BB_NauLuyen_RH",
            label: (
              <Tooltip title="BM.16/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện RH)">
                <NavLink to="/viecdentoi/tieuhaonauluyen_rh">
                  BM.16/QT.05.15 (Bảng tiêu hao nấu luyện lò tinh luyện RH)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub4-5-4",
            maBM: "HRC2_BBGN_PhoiTam",
            label: (
              <Tooltip title="BM.40/QT.05.15 (Biên bản giao nhận phôi tấm)">
                <NavLink to="/viecdentoi/bbgnphoitam">
                  BM.40/QT.05.15 (Biên bản giao nhận phôi tấm)
                </NavLink>
              </Tooltip>
            ),
          },
        ],
      },
      {
        key: "sub4-6",
        label: "NM.HRC1",
        children: [
          {
            key: "sub4-6-1",  
            label: (
                <Tooltip title="BM.11/QT.05.11 (Biên bản xác nhận sản lượng phôi thép)">
                <NavLink to="/viecdentoi/bienbansanluongphoi">
                  BM.11/QT.05.11 (Biên bản xác nhận sản lượng phôi thép)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "sub4-6-2",  
             label: (
              <Tooltip title="BM.12/QT.05.11 (Biên bản giao nhận phôi nhập kho)">
                <NavLink to="/viecdentoi/bienbanphoinapkho">
                  BM.12/QT.05.11 (Biên bản giao nhận phôi nhập kho)
                </NavLink>
              </Tooltip>
            ),
          },
        ],
      },
    ],
  },
  {
    key: "sub5",
    label: "Xử lý phiếu",
    icon: <ProfileOutlined />,
    roles: ["PKH", "admin"], // chỉ P.KH mới xử lý phiếu
    children: [
      // { key: "3", label: <NavLink to="/dashboard">Tạo yêu cầu</NavLink> },
      // { key: "4", label: "Option 4" },

      {
        key: "sub5-1",
        label: "NM.CTD",
        children: [
          {
            key: "9",
            maBM: "CTD_BB_Phoinong",
            label: (
              <Tooltip title="BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)">
                <NavLink to="/viecdentoi/bienbanphoinong">
                  BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)
                </NavLink>
              </Tooltip>
            ),
          },

          // { key: "6", label: "Option 6" },
        ],
      },
      
    ],
  },
  // {
  //   key: "4",
  //   icon: <VideoCameraOutlined />,
  //   label: <NavLink to="/reports">Báo cáo</NavLink>,
  //   roles: ["admin"], // chỉ admin mới thấy
  // },
  {
    key: "sub-admin",
    label: "Quản trị",
    icon: <SettingOutlined />,
    roles: ["admin"],
    children: [
      {
        key: "admin-1",
        icon: <SafetyCertificateOutlined />,
        label: (
          <Tooltip title="Phân quyền xử lý biểu mẫu theo khu vực">
            <NavLink to="/phanquyenbieumau">Phân quyền biểu mẫu</NavLink>
          </Tooltip>
        ),
      },
    ],
  },
  // {
  //   key: "5",
  //   icon: <UploadOutlined />,
  //   label: <NavLink to="/settings">Cài đặt</NavLink>,
  //   roles: ["admin"], // chỉ admin mới thấy
  // },
  // {
  //   key: "6",
  //   icon: <UserOutlined />,
  //   label: <NavLink to="/users">Quản lý tài khoản</NavLink>,
  //   roles: ["admin"],
  // },
];
