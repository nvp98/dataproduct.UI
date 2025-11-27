import { useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
  Typography,
  Row,
  Col,
  Divider,
  message,
  Space,
  Button,
  Modal,
  Input,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { PhieuApi } from "../../../services/PhieuApi";
import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { PheDuyetApi } from "../../../services/PheDuyetApi";

const { Title, Text } = Typography;

const ChiTietPhieuPhoiNong = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};
  const { pheduyet } = location.state || {};

  const config = CTD_BB_Phoinong;
  const stored = localStorage.getItem("userinfo");
  const currentUserId = stored ? JSON.parse(stored).iD_TaiKhoan : null;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // thông tin phê duyệt
  const [datapheduyet, setDataPheDuyet] = useState<any>(null);
  const [action, setAction] = useState(""); // "approve" hoặc "reject"
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Thông tin phê duyệt
        if (pheduyet != null) {
          setDataPheDuyet(pheduyet);
        }
        setLoading(true);
        const res = await PhieuApi.getDetail(idphieu);

        setData(res);
      } catch (err) {
        console.error("Lỗi tải dữ liệu phiếu:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  //   if (!data) return null;

  const formData = data?.jsonData || {};
  const tableData = formData?.table1 || [];
  // cấu hình bảng hiển thị
  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1"
  );
  const columns = tableSection?.columns || [];
  // xử lý phiếu
  const handleSubmit = async () => {
    if (!action) return;
    try {
      setLoading(true);
      await PheDuyetApi.putData(datapheduyet?.id, {
        ...datapheduyet,
        tinhTrang: action === "approve" ? 1 : 2,
        ghiChu: ghiChu,
      });
      message.success(
        action === "approve"
          ? "Xác nhận phiếu thành công!"
          : "Đã từ chối phiếu!"
      );
      setDataPheDuyet((prev: any) => ({
        ...prev,
        tinhTrang: action === "approve" ? 1 : 2,
        ghiChu,
      }));
      setOpen(false);
      setGhiChu("");
    } catch (err) {
      message.error("Lỗi khi gửi phê duyệt, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: any) => {
    setAction(type);
    setOpen(true);
  };

  return (
    <>
      <div style={{ textAlign: "right" }}>
        <Space>
          {true && (
            <>
              <Tooltip title="Xác nhận phê duyệt">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => openModal("approve")}
                  disabled={loading}
                  style={{
                    backgroundColor: "#52c41a",
                    borderColor: "#52c41a",
                    color: "#fff",
                  }}
                >
                  Xác nhận
                </Button>
              </Tooltip>
              {/* Nút Từ chối phiếu */}
              <Tooltip title="Từ chối phiếu">
                <Button
                  type="primary"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => openModal("reject")}
                  disabled={loading}
                  style={{
                    backgroundColor: "#ff4d4f",
                    borderColor: "#ff4d4f",
                    color: "#fff",
                  }}
                >
                  Từ chối
                </Button>
              </Tooltip>
            </>
          )}

          {/* Nút in / xuất PDF */}
          {/* <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            In phiếu
          </Button> */}
        </Space>

        <Modal
          title={
            action === "approve"
              ? "Nhập nội dung phê duyệt"
              : "Nhập lý do từ chối"
          }
          open={open}
          okText={
            action === "approve" ? "Xác nhận phê duyệt" : "Xác nhận từ chối"
          }
          cancelText="Hủy"
          confirmLoading={loading}
          onOk={handleSubmit}
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
      </div>
      <Card
        bordered
        style={{ padding: 24, background: "#fff" }}
        loading={loading}
      >
        {/* Logo + tên công ty */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          {/* Logo + tên công ty */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <img
              src="https://report.hoaphatdungquat.vn/img/logoHP.png"
              alt="logo"
              style={{ height: "auto", width: 150 }}
            />
            {config.headerInfo && (
              <>
                <Typography.Text strong>
                  {config.headerInfo.subCompany}
                </Typography.Text>
                <Typography.Text strong>
                  {config.headerInfo.company}
                </Typography.Text>
              </>
            )}
          </div>

          {/* Tiêu đề trung tâm */}
          {/* <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
        </div> */}

          {/* ISO góc phải */}
          {config.isoInfo && (
            <div
              style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}
            >
              <div>
                <b>{config.isoInfo.code}</b>
              </div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Title level={4} style={{ marginBottom: 0 }}>
            {config.title}
          </Title>
          {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
        </div>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Số phiếu">
            {data?.soPhieu || ""}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày SX">
            {formData?.NgaySX
              ? dayjs(formData.NgaySX).format("DD/MM/YYYY")
              : ""}
          </Descriptions.Item>
          <Descriptions.Item label="Ca sản xuất">
            {formData?.ca || ""}
          </Descriptions.Item>
          <Descriptions.Item label="Máy đúc">
            {formData?.mayduc || ""}
          </Descriptions.Item>
        </Descriptions>

        <Table
          bordered
          columns={columns}
          dataSource={tableData?.map((r: any, i: number) => ({
            key: i,
            stt: i + 1,
            ...r,
          }))}
          pagination={false}
          size="small"
        />

        <Divider />

        <div style={{ marginTop: 20 }}>
          <Text italic>
            <b>Lưu ý:</b> Tất cả phôi khi đưa vào trong nhà máy cán, kể cả còn
            nằm trên bàn con lần đầu đều phải bàn giao ngay trong kíp, không để
            lẫn sang kíp sau.
          </Text>
          <br />
          <Text italic>
            - Thời điểm xác nhận biên bản giao nhận phôi nóng là hai thời điểm
            8h00p và 20h00p.
          </Text>
          <br />
          <Text italic>
            - Trọng lượng trên được tính theo đơn trọng quy định và chiều dài
            thực.
          </Text>
        </div>

        <Divider />

        {/* Khu vực ký duyệt */}
        <Row
          justify="space-around"
          align="top"
          style={{ textAlign: "center", marginTop: 30 }}
        >
          {config.signatures.map((sig) => {
            const duyet = data?.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capduyet
            );
            return (
              <Col>
                <Text strong>{sig.label}</Text>
                <br />
                <Text type="secondary" key={sig.capduyet}>
                  <Text>{duyet?.tinhTrang === 1 ? "Đã ký" : "Chưa xử lý"}</Text>
                  <br />
                  {duyet?.tenNguoiDuyet}
                </Text>
              </Col>
            );
          })}
        </Row>
      </Card>
    </>
  );
};

export default ChiTietPhieuPhoiNong;
