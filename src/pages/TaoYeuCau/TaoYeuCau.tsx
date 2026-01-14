import { Card, Col, Row, Typography, Tooltip, Alert, Spin } from "antd";
import {
  FileTextOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  CloudOutlined,
  FolderOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { MenuDataDashboard } from "../../utils/configs/menuDashboard";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { BmQuyenXlApi } from "../../services/BmQuyenXlApi";
import { isAdminUser } from "../../utils/helpers/checkAdminRole";

const { Title } = Typography;

// interface TaoYeuCauProps {
//   onSelect: (code: string) => void;
// }

const getIcon = (type: string, color: string) => {
  switch (type) {
    case "iso":
      return <FileTextOutlined style={{ color, fontSize: 24 }} />;
    case "technology":
      return <SettingOutlined style={{ color, fontSize: 24 }} />;
    case "equipment":
      return <ToolOutlined style={{ color, fontSize: 24 }} />;
    case "it":
      return <CloudOutlined style={{ color, fontSize: 24 }} />;
    case "safety":
      return <SafetyCertificateOutlined style={{ color, fontSize: 24 }} />;
    case "admin":
      return <FolderOutlined style={{ color, fontSize: 24 }} />;
    default:
      return <FileTextOutlined style={{ color, fontSize: 24 }} />;
  }
};

const TaoYeuCau = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userBmPermissions, setUserBmPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndPermissions();
  }, []);

  const loadUserAndPermissions = async () => {
    try {
      // Lấy user từ localStorage
      const userStr = localStorage.getItem("userinfo");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        // Nếu admin thì không cần load quyền (xem tất cả)
        if (isAdminUser(userData)) {
          setUserBmPermissions([]);
        } else {
          // Gọi API để lấy danh sách BM mà user có quyền
          const ID_TaiKhoan = userData.iD_TaiKhoan || userData.ID_TaiKhoan;
          const res = await BmQuyenXlApi.getByTaiKhoan(ID_TaiKhoan);
          const permissions = Array.isArray(res) ? res : res?.data || [];
          console.log("Quyền BM của user:", permissions);
          const bmList = permissions
            .map((p: any) => p.maBm)
            .filter((bm: string) => bm);
          console.log("Danh sách mã BM được phép:", bmList);
          setUserBmPermissions(bmList);
        }
      }
    } catch (error) {
      console.error("Lỗi load user và quyền:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (code: string) => {
    navigate(`/${code}`);
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  // Filter menu dựa trên quyền BM
  const filteredMenuData = MenuDataDashboard.map((group: any) => {
    const filteredItems = group.items.filter((item: any) => {
      // Admin xem tất cả
      if (isAdminUser(user)) return true;
      // User thường chỉ xem các BM được cấp quyền
      return userBmPermissions.includes(item.maBm || item.code);
    });

    return {
      ...group,
      items: filteredItems,
    };
  }).filter((group: any) => group.items.length > 0); // Loại bỏ group không còn item nào

  return (
    <div>
      <h1 className="text-xl font-bold">Tạo yêu cầu </h1>
      {!isAdminUser(user) && userBmPermissions.length === 0 && (
        <Alert
          message="Thông báo"
          description="Bạn không có quyền tạo yêu cầu cho biểu mẫu nào. Vui lòng liên hệ quản trị viên để được cấp quyền."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {filteredMenuData.map((group: any) => (
        <div key={group.category} style={{ marginBottom: 40 }}>
          <Title
            level={4}
            style={{
              color: group.color,
              marginBottom: 12,
              // borderBottom: `2px solid ${group.color}`,
              paddingBottom: 4,
            }}
          >
            {group.category}
          </Title>

          <Row gutter={[16, 16]}>
            {group.items.map((item: any) => (
              <Col xs={24} sm={12} md={8} lg={6}>
                <Tooltip title="Nhấn để tạo phiếu">
                  <Card
                    hoverable
                    bordered
                    style={{
                      padding: "6px 10px", //
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      borderRadius: 8,
                      height: 64, //
                    }}
                    bodyStyle={{
                      padding: 0, //
                    }}
                    onClick={() => handleSelect(item.code)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {getIcon(group.icon, group.color)} {/* 👈 thu nhỏ icon */}
                      <div style={{ marginLeft: 8 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12, //
                            color: "#333",
                          }}
                        >
                          {item.title}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Tooltip>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  );
};

export default TaoYeuCau;
