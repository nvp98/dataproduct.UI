// import {
//   MenuFoldOutlined,
//   MenuUnfoldOutlined,
//   UploadOutlined,
//   UserOutlined,
//   VideoCameraOutlined,
// } from "@ant-design/icons";
import {  Layout, theme } from "antd";
import { Content } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import logo from "../assets/images/logoHP.png";
import SidebarMenu from "../components/SidebarMenu";
import MainHeader from "../components/MainHeader";
import MainFooter from "../components/MainFooter";

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  return (
    <>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={80}
          theme="light"
          style={{
          borderRight: "1px solid #e5e5e5", 
        }}
        >
          <div
            style={{
              height: 70,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? 0 : "0 16px",
              transition: "all 0.2s",
            }}
          >
            {!collapsed && (
              <span
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 18,
                  marginLeft: 8,
                  whiteSpace: "nowrap",
                }}
              >
                <img
                  src={logo}
                  alt="logo"
                  style={{ height: 32, objectFit: "contain" }}
                />
              </span>
            )}
          </div>
          <div className="demo-logo-vertical" />
          {/* <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["1"]}
            items={[
              { key: "1", icon: <UserOutlined />, label: "nav 1" },
              { key: "2", icon: <VideoCameraOutlined />, label: "nav 2" },
              { key: "3", icon: <UploadOutlined />, label: "nav 3" },
            ]}
          /> */}
          <SidebarMenu />
        </Sider>

        <Layout>
          {/* <Header
            style={{
              height: 70,
              lineHeight: "70px",
              padding: 0,
              background: colorBgContainer,
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: "16px", width: 64, height: "100%" }}
            />
          </Header> */}
          <MainHeader collapsed={collapsed} setCollapsed={setCollapsed} />

          <Content
            style={{
              margin: "24px 16px",
              padding: 24,
              flex: 1,
              overflowY: "auto",
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
          <MainFooter />
        </Layout>
      </Layout>
    </>
  );
};

export default MainLayout;
