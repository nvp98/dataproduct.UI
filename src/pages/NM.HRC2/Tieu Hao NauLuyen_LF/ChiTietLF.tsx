/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Descriptions,
  Table,
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
import HRC2_BB_NauLuyen_LF from "../../../utils/BM_config/HRC2_BB_NauLuyen_LF.json";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { PheDuyetApi } from "../../../services/PheDuyetApi";

const { Title, Text } = Typography;

type DynamicColumnMeta = {
  dataIndex: string;
  width?: number;
  label: string;
};

type DynamicColumnsMap = Record<string, DynamicColumnMeta[]>;

const ChiTietTieuHaoNauLuyen_LF = () => {
  const location = useLocation();
  const { pheduyet } = location.state || {};
  const { idphieu, safeGetDetail } = usePhieuNavigation(
    "phieu_lf_id",
    "/tieuhaonauluyen_lf"
  );

  const config = HRC2_BB_NauLuyen_LF;

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
        if (!idphieu) return;
        const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
        if (!res) return;
        setData((res as any)?.data ?? res);
      } catch (error) {
        console.error("Lỗi tải dữ liệu phiếu:", error);
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
  // cấu hình bảng hiển thị
  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1"
  );
  const tableColumns = useMemo(() => {
    const sourceColumns = (tableSection?.columns || []) as any[];
    const dynamicColumnsMap =
      (formData?.table1DynamicColumns as DynamicColumnsMap | undefined) || {};

    const mapped = sourceColumns.map((col) => {
      const key = col.dataIndex || col.key;
      const dynamicChildren =
        key && dynamicColumnsMap[key] ? dynamicColumnsMap[key] : undefined;
      if (dynamicChildren && dynamicChildren.length > 0) {
        return {
          ...col,
          children: dynamicChildren.map((child) => ({
            title: child.label,
            dataIndex: child.dataIndex,
            width: child.width,
          })),
        };
      }
      return col;
    });

    if (dynamicColumnsMap.adjust && dynamicColumnsMap.adjust.length > 0) {
      mapped.push({
        title: "Điều chỉnh số liệu",
        children: dynamicColumnsMap.adjust.map((child) => ({
          title: child.label,
          dataIndex: child.dataIndex,
          width: child.width,
        })),
      });
    }

    return mapped;
  }, [tableSection, formData?.table1DynamicColumns]);

  const tableSection2 = config.layout2.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table2"
  );
  const columns2 = tableSection2?.columns || [];
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
          columns={tableColumns}
          dataSource={tableData?.map((r: any, i: number) => ({
            key: i,
            stt: i + 1,
            ...r,
          }))}
          pagination={false}
          size="small"
          scroll={{ x: "max-content" }}
          sticky={{ offsetHeader: 0 }}
        />

        {table2Data && table2Data.length > 0 && (
          <Table
            bordered
            style={{ marginTop: 16 }}
            columns={columns2}
            dataSource={table2Data.map((r: any, i: number) => ({
              key: i,
              stt: i + 1,
              ...r,
            }))}
            pagination={false}
            size="small"
          />
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

export default ChiTietTieuHaoNauLuyen_LF;
