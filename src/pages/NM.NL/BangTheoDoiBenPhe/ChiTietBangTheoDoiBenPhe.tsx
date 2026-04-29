import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Space,
  Typography,
  message,
} from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { PhieuApi } from "../../../services/PhieuApi";
import { PheDuyetApi } from "../../../services/PheDuyetApi";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import CustomFormTable from "../../../components/CustomFormTable";
import NL_BB_TheoDoiBenPhe from "../../../utils/BM_config/NL_BB_TheoDoiBenPhe.json";

const { Title, Text } = Typography;

const ChiTietBangTheoDoiBenPhe = () => {
  const location = useLocation();
  const { pheduyet } = location.state || {};
  const { idphieu, safeGetDetail } = usePhieuNavigation(
    "benphe_idphieu",
    "/bangtheodoibenphe"
  );

  const config = NL_BB_TheoDoiBenPhe;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [datapheduyet, setDataPheDuyet] = useState<any>(null);
  const [action, setAction] = useState("");
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!idphieu) return;
      try {
        setLoading(true);
        if (pheduyet != null) setDataPheDuyet(pheduyet);
        const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
        if (!res) return;
        setData(res);
      } catch (err: any) {
        console.error("Lỗi tải phiếu:", err);
        message.error("Không thể tải phiếu.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [idphieu, pheduyet, safeGetDetail]);

  const formData = data?.jsonData || {};
  const tableData = formData?.table1 || [];
  const layout = config.layout[0];

  const openModal = (type: string) => {
    setAction(type);
    setOpen(true);
  };

  const handlePheDuyet = async () => {
    if (!action) return;
    try {
      setLoading(true);
      await PheDuyetApi.putData(pheduyet?.id, {
        ...pheduyet,
        tinhTrang: action === "approve" ? 1 : 2,
        ghiChu,
      });
      message.success(
        action === "approve" ? "Xác nhận phiếu thành công!" : "Đã từ chối phiếu!"
      );
      setOpen(false);
      setGhiChu("");
    } catch {
      message.error("Lỗi khi gửi phê duyệt, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Nút phê duyệt */}
      <div style={{ textAlign: "right", marginBottom: 8 }}>
        <Space>
          {datapheduyet?.tinhTrang === 0 && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => openModal("approve")}
              >
                Xác nhận
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => openModal("reject")}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      </div>

      <Modal
        title={action === "approve" ? "Nhập nội dung phê duyệt" : "Nhập lý do từ chối"}
        open={open}
        okText={action === "approve" ? "Xác nhận phê duyệt" : "Xác nhận từ chối"}
        cancelText="Hủy"
        confirmLoading={loading}
        onOk={handlePheDuyet}
        onCancel={() => setOpen(false)}
      >
        <Input.TextArea
          rows={3}
          placeholder={
            action === "approve"
              ? "Nhập ghi chú phê duyệt (nếu có)..."
              : "Nhập lý do từ chối..."
          }
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
        />
      </Modal>

      <Card bordered loading={loading} style={{ background: "#fff" }}>
        {/* Header: logo + ISO */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <img
              src="https://report.hoaphatdungquat.vn/img/logoHP.png"
              alt="logo"
              style={{ height: "auto", width: 150 }}
            />
            {config.headerInfo && (
              <>
                <Text strong>{config.headerInfo.subCompany}</Text>
                <Text strong>{config.headerInfo.company}</Text>
              </>
            )}
          </div>
          {config.isoInfo && (
            <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
              <div><b>{config.isoInfo.code}</b></div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>

        {/* Tiêu đề */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={4} style={{ marginBottom: 4 }}>
            {config.title}
          </Title>
          {data?.soPhieu && <Text strong>Số phiếu: {data.soPhieu}</Text>}
        </div>

        {/* Thông tin chung */}
        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Số phiếu">
            {data?.soPhieu || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Ca">
            {formData?.ca === 1 ? "Ca ngày" : formData?.ca === 2 ? "Ca đêm" : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày sản xuất">
            {formData?.NgaySX ? dayjs(formData.NgaySX).format("DD/MM/YYYY") : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Người tạo">
            {data?.nguoiTao || "—"}
          </Descriptions.Item>
        </Descriptions>

        {/* Bảng chi tiết - read-only */}
        {layout?.sectionType === "table" && (
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              {layout.title}
            </Text>
            <CustomFormTable
              columns={layout.columns || []}
              initialData={tableData}
              onDataChange={() => {}}
              showAddButton={false}
              showDeleteButton={false}
              editable={false}
              loading={loading}
            />
          </div>
        )}

        {/* Khu vực chữ ký */}
        <Row justify="space-around" style={{ textAlign: "center", marginTop: 32 }}>
          {config.signatures.map((sig) => {
            const duyet = data?.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capduyet
            );
            return (
              <Col key={sig.key}>
                <Text strong>{sig.label}</Text>
                <br />
                <Text type={duyet?.tinhTrang === 1 ? "success" : "secondary"}>
                  {duyet?.tinhTrang === 1 ? "Đã ký" : "Chưa xử lý"}
                </Text>
                <br />
                <Text>{duyet?.tenNguoiDuyet || ""}</Text>
              </Col>
            );
          })}
        </Row>
      </Card>
    </>
  );
};

export default ChiTietBangTheoDoiBenPhe;
