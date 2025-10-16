import { Layout, Button, Avatar, Dropdown, Space } from "antd";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";

const { Header } = Layout;

const userMenu = [
  {
    key: "profile",
    label: "Thông tin cá nhân",
    icon: <UserOutlined />,
  },
  {
    key: "logout",
    label: "Đăng xuất",
    icon: <LogoutOutlined />,
  },
];

const MainHeader = ({ collapsed, setCollapsed }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      // 1. Xoá localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("auth"); // nếu bạn lưu redux-persist

      // 2. Reset redux state
      dispatch(logout());

      // 3. Chuyển hướng về login
      navigate("/login");
    }

    if (key === "profile") {
      navigate("/profile");
    }
  };
  const username = localStorage.getItem("username");
  return (
    <Header
      style={{
        height: 70,
        lineHeight: "70px",
        padding: "0 16px",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between", // căn 2 bên
        borderBottom: "1px solid #e5e5e5", //viền dưới
      }}
    >
      {/* Nút toggle sidebar */}
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: "16px", width: 64, height: "100%" }}
      />

      {/* User account */}
      <Dropdown
        menu={{ items: userMenu, onClick: handleMenuClick }}
        placement="bottomRight"
        trigger={["click"]}
      >
        <Space style={{ cursor: "pointer" }}>
          <Avatar src="https://i.pravatar.cc/150?img=3" />
          <span style={{ fontWeight: 500 }}>{username}</span>
        </Space>
      </Dropdown>
    </Header>
  );
};

export default MainHeader;
