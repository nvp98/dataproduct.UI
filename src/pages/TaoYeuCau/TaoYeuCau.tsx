import { Card, Col, Row, Typography, Tooltip } from "antd";
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
  const handleSelect = (code: string) => {
    navigate(`/${code}`);
  };

  return (
    <div>
      <h1 className="text-xl font-bold">Tạo yêu cầu </h1>
      {MenuDataDashboard.map((group: any) => (
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
