// src/config/menuConfig.ts
import {
  UserOutlined,
  UploadOutlined,
  AppstoreOutlined,
  AppstoreAddOutlined,
  DeliveredProcedureOutlined,
  ProfileOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { NavLink } from "react-router-dom";

export const menuConfig = [
  {
    key: "1",
    icon: <UserOutlined />,
    label: <NavLink to="/">Trang chủ</NavLink>,
    roles: ["admin"], // chỉ admin mới thấy
  },
  {
    key: "sub1",
    label: "Kho dữ liệu",
    icon: <AppstoreOutlined />,
    children: [
      {
        key: "sub1-1",
        label: "NM.CTD",
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
      // { key: "sub1-2", label: "Option 4" },
    ],
  },
  {
    key: "2",
    icon: <UploadOutlined />,
    label: <NavLink to="/taoyeucau">Tạo yêu cầu</NavLink>,
    roles: ["admin"], // chỉ admin mới thấy
  },
  {
    key: "sub2",
    label: "Việc tôi bắt đầu",
    icon: <AppstoreAddOutlined />,
    children: [
      // { key: "3", label: <NavLink to="/dashboard">Tạo yêu cầu</NavLink> },
      // { key: "4", label: "Option 4" },
      {
        key: "sub2-2",
        label: "NM.NL",
        children: [
          {
            key: "4",
            label: (
              <Tooltip title="BM.06/QT.05.01 (Nhật ký thao tác phối trộn quặng trung hòa)">
                <NavLink to="/nhatkyquangtrunghoa">
                  BM.06/QT.05.01 (Nhật ký thao tác phối trộn quặng trung hòa)
                </NavLink>
              </Tooltip>
            ),
          },
          // { key: "6", label: "Option 6" },
        ],
      },
      {
        key: "sub2-3",
        label: "NM.HRC1",
        children: [
          {
            key: "5",
            label: (
              <Tooltip title="BM.16/QT.05.10 (Biên bản giao nhận thép lỏng)">
                <NavLink to="/bienbantheplong">
                  BM.16/QT.05.10 (Biên bản giao nhận thép lỏng)
                </NavLink>
              </Tooltip>
            ),
          },
          // { key: "6", label: "Option 6" },
        ],
      },
      // {
      //   key: "sub2-3",
      //   label: "NM.HRC2",
      //   children: [
      //     {
      //       key: "5",
      //       label: <NavLink to="/dashboard">BM.06/QT.05.10</NavLink>,
      //     },
      //     // { key: "6", label: "Option 6" },
      //   ],
      // },
      {
        key: "sub2-4",
        label: "NM.CTD",
        children: [
          {
            key: "6",
            label: (
              <Tooltip title="BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)">
                <NavLink to="/bienbanphoinong">
                  BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)
                </NavLink>
              </Tooltip>
            ),
          },
          {
            key: "7",
            label: (
              <Tooltip title="BM.07/QT.05.10 (Biên bản giao nhận phôi nguội)">
                <NavLink to="/bienbanphoinguoi">
                  BM.06/QT.05.10 (Biên bản giao nhận phôi nguội)
                </NavLink>
              </Tooltip>
            ),
          },
          // { key: "6", label: "Option 6" },
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
    ],
  },
  {
    key: "sub4",
    label: "Xử lý phiếu",
    icon: <ProfileOutlined />,
    // children: [
    //   // { key: "3", label: <NavLink to="/dashboard">Tạo yêu cầu</NavLink> },
    //   // { key: "4", label: "Option 4" },
    //   {
    //     key: "sub4-2",
    //     label: "NM.NL",
    //     children: [
    //       {
    //         key: "sub4-2-1",
    //         label: <NavLink to="/dashboard">BM.06/QT.05.10</NavLink>,
    //       },
    //       // { key: "6", label: "Option 6" },
    //     ],
    //   },
    //   {
    //     key: "sub4-3",
    //     label: "NM.HRC2",
    //     children: [
    //       {
    //         key: "5",
    //         label: <NavLink to="/dashboard">BM.06/QT.05.10</NavLink>,
    //       },
    //       // { key: "6", label: "Option 6" },
    //     ],
    //   },
    //   {
    //     key: "sub4-4",
    //     label: "NM.CTD",
    //     children: [
    //       {
    //         key: "9",
    //         label: (
    //           <Tooltip title="BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)">
    //             <NavLink to="/chitietphieuphoinong">
    //               BM.06/QT.05.10 (Biên bản giao nhận phôi nóng)
    //             </NavLink>
    //           </Tooltip>
    //         ),
    //       },
    //       {
    //         key: "10",
    //         label: (
    //           <Tooltip title="BM.07/QT.05.10 (Biên bản giao nhận phôi nguội)">
    //             <NavLink to="/bienbanphoinguoi">
    //               BM.06/QT.05.10 (Biên bản giao nhận phôi nguội)
    //             </NavLink>
    //           </Tooltip>
    //         ),
    //       },
    //       // { key: "6", label: "Option 6" },
    //     ],
    //   },
    // ],
  },
  // {
  //   key: "4",
  //   icon: <VideoCameraOutlined />,
  //   label: <NavLink to="/reports">Báo cáo</NavLink>,
  //   roles: ["admin"], // chỉ admin mới thấy
  // },
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
