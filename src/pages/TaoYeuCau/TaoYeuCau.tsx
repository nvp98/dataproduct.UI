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
  /** Danh sách MaBM trong processing (QuyenChucNang = 1 hoặc 4) — giống "Việc tôi bắt đầu" */
  const [processingForms, setProcessingForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndPermissions();
  }, []);

  const loadUserAndPermissions = async () => {
    try {
      const userStr = localStorage.getItem("userinfo");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);

        if (isAdminUser(userData)) {
          setProcessingForms([]);
        } else {
          const raw = userData.iD_TaiKhoan ?? userData.ID_TaiKhoan ?? userData.idTaiKhoan ?? userData.IdTaiKhoan;
          const idTaiKhoan = typeof raw === "number" ? raw : Number(raw);
          if (!Number.isFinite(idTaiKhoan) || idTaiKhoan <= 0) {
            setProcessingForms([]);
          } else {
            const res = await BmQuyenXlApi.getMenuPermissions(idTaiKhoan);
            setProcessingForms(res?.processingForms ?? []);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi load user và quyền:", error);
      setProcessingForms([]);
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

  // Chỉ hiển thị MaBM nằm trong processing (giống "Việc tôi bắt đầu": QuyenChucNang = 1 hoặc 4)
  const allowAll = isAdminUser(user);
  const processingSet = allowAll ? null : new Set(processingForms);

  const filteredMenuData = MenuDataDashboard.map((group: any) => {
    const filteredItems = group.items.filter((item: any) => {
      if (allowAll) return true;
      const maBm = item.maBm || item.code;
      return maBm && processingSet?.has(maBm);
    });

    return {
      ...group,
      items: filteredItems,
    };
  }).filter((group: any) => group.items.length > 0);

  return (
    <div>
      <h1 className="text-xl font-bold">Tạo yêu cầu </h1>
      {!isAdminUser(user) && user && processingForms.length === 0 && (
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
