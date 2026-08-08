/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Typography,
  Row,
  Col,
  message,
  Space,
  Button,
  Modal,
  Input,
} from "antd";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import HRC2_STD_NXT from "../../../utils/BM_config/HRC2_STD_NXT.json";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { PheDuyetApi } from "../../../services/PheDuyetApi";
import GroupedTableSTD from "../../../components/GroupedTableSTD";
import SummaryTableSTD from "../../../components/SummaryTableSTD";
import logoHP from "../../../assets/images/LogoPDF.png";

const { Title, Text } = Typography;

const ChiTiet_STD = () => {
  const location = useLocation();
  const { pheduyet } = location.state || {};
  const { idphieu, safeGetDetail } = usePhieuNavigation(
    "std_nxt_hrc2_idphieu",
    "/std_nhapxuatton"
  );

  const config = HRC2_STD_NXT;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // thông tin phê duyệt
  const [datapheduyet, setDataPheDuyet] = useState<any>(null);
  const [action, setAction] = useState(""); // "approve" hoặc "reject"
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!idphieu) return;
      try {
        // Thông tin phê duyệt
        if (pheduyet != null) {
          setDataPheDuyet(pheduyet);
        }
        setLoading(true);
        const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
        if (!res) return;
        setData(res);
      } catch (err: any) {
        console.error("Lỗi tải dữ liệu phiếu:", err);
        message.error("Không thể tải phiếu.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [idphieu, pheduyet, safeGetDetail]);

  //   if (!data) return null;

  const formData = data?.jsonData || {};
  const tableData = formData?.table1 || [];
  const table2Data = formData?.table2 || [];
  
  // Cấu hình bảng hiển thị
  const layout1 = config.layout1?.[0];
  const layout2 = config.layout2?.[0];
  // xử lý phiếu
  const handleSubmit = async () => {
    if (!action) return;
    try {
      setLoading(true);
      await PheDuyetApi.putData(pheduyet?.id, {
        ...pheduyet,
        tinhTrang: action === "approve" ? 1 : 2,
        ghiChu: ghiChu,
      });
      message.success(
        action === "approve"
          ? "Xác nhận phiếu thành công!"
          : "Đã từ chối phiếu!"
      );
      setOpen(false);
      setGhiChu("");
    } catch (error) {
      console.error("Lỗi khi gửi phê duyệt:", error);
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
          {datapheduyet && datapheduyet?.tinhTrang === 0 && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => openModal("approve")}
              >
                Xác nhận
              </Button>
              {/* Nút Từ chối phiếu */}
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => openModal("reject")}
              >
                Từ chối
              </Button>
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
            <img src={logoHP} alt="logo" style={{ height: "auto", width: 220 }} />
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

        {/* Hiển thị bảng 1 - nhóm theo khu vực */}
        {layout1 && layout1.sectionType === "groupedTable" && (
          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>{layout1.title}</Typography.Title>
            <GroupedTableSTD
              columns={layout1.columns || []}
              initialData={tableData}
              khuVucList={layout1.khuVucList.map((k: any) => k?.label || k?.value || "")}
              defaultViTri={layout1.defaultViTri || 1}
              editable={false}
              loading={loading}
            />
          </div>
        )}

        {/* Hiển thị bảng 2 - tổng hợp */}
        {layout2 && layout2.sectionType === "summaryTable" && table2Data && table2Data.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Typography.Title level={5}>{layout2.title}</Typography.Title>
            <SummaryTableSTD
              columns={layout2.columns || []}
              table1Data={tableData}
              initialData={table2Data}
              editable={false}
              loading={loading}
            />
          </div>
        )}
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

export default ChiTiet_STD;
