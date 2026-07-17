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
  DatePicker,
  Select,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useLocation } from "react-router-dom";
import { PhieuApi } from "../../../services/PhieuApi";
import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { PheDuyetApi } from "../../../services/PheDuyetApi";
import { CtdPhoiNongApi } from "../../../services/CtdPhoiNongApi";

const { Title, Text } = Typography;

const mapCtdPhoiNongToRows = (list: any[]) =>
  (list || []).map((item: any) => ({
    id: item.id,
    key: item.id,
    me: item.me ?? "",
    mac: item.mac ?? "",
    kichThuoc: item.kichThuoc ?? "",
    duc: item.nmCan ?? 0,
    vanChuyen: item.vanChuyen ?? "",
    ST_LoaiI: item.soThanhLoai1 ?? 0,
    KL_LoaiI: item.khoiLuongLoai1 ?? 0,
    ST_LoaiII: item.soThanhLoai2 ?? 0,
    KL_LoaiII: item.khoiLuongLoai2 ?? 0,
    ST_LoaiIII: item.soThanhLoai3 ?? 0,
    KL_LoaiIII: item.khoiLuongLoai3 ?? 0,
    tongSoThanh: item.tongSt ?? 0,
    tongKhoi: item.tongKl ?? 0,
    tinhTrang: item.tinhTrang ?? 0,
    tinhTrangCTD: item.tinhTrangCTD ?? 0,
    tinhTrangQLCL: item.tinhTrangQLCL ?? 0,
    ghiChu: item.ghiChu ?? "",
    ngaySX: item.ngaySx ?? null,
    ca: item.ca ?? null,
    ngayDuc: item.ngayDuc ?? null,
  }));

const calcSummary = (rows: any[]) =>
  rows.reduce(
    (acc, r) => {
      acc.ST1 += Number(r.ST_LoaiI || 0);
      acc.ST2 += Number(r.ST_LoaiII || 0);
      acc.ST3 += Number(r.ST_LoaiIII || 0);
      acc.KL1 += Number(r.KL_LoaiI || 0);
      acc.KL2 += Number(r.KL_LoaiII || 0);
      acc.KL3 += Number(r.KL_LoaiIII || 0);
      acc.TongKL += Number(r.tongKhoi || 0);
      acc.TongST += Number(r.tongSoThanh || 0);
      return acc;
    },
    { ST1: 0, ST2: 0, ST3: 0, KL1: 0, KL2: 0, KL3: 0, TongKL: 0, TongST: 0 },
  );

const ChiTietPhieuPhoiNong = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};
  const { pheduyet } = location.state || {};

  const config = CTD_BB_Phoinong;
  const stored = localStorage.getItem("userinfo");
  const currentUserId = stored ? JSON.parse(stored).iD_TaiKhoan : null;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chuyenData, setChuyenData] = useState<any[]>([]);
  const [chuyenLoading, setChuyenLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // filter cho vùng phôi đã chuyển
  const [filterNgay, setFilterNgay] = useState<Dayjs | null>(null);
  const [filterCa, setFilterCa] = useState<string>("");
  const [filterXuong, setFilterXuong] = useState<string>("");
  const [filterMe, setFilterMe] = useState<string>("");

  // thông tin phê duyệt
  const [datapheduyet, setDataPheDuyet] = useState<any>(null);
  const [action, setAction] = useState("");
  const [open, setOpen] = useState(false);
  const [ghiChu, setGhiChu] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
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

  // Khi data load xong: set filter cố định từ top-level fields của phiếu, rồi load chuyenData
  useEffect(() => {
    if (!data) return;

    const ngay = data?.ngaySX ? dayjs(data.ngaySX) : null;
    const ca = data?.ca ? String(data.ca) : "";
    const xuong = data?.mayDuc
      ? String(data.mayDuc)
      : data?.jsonData?.mayDuc
        ? String(data.jsonData.mayDuc)
        : "";

    setFilterNgay(ngay);
    setFilterCa(ca);
    setFilterXuong(xuong);

    searchChuyenData({ ngay, ca, xuong, me: "" });
  }, [data]);

  const searchChuyenData = async (params: {
    ngay: Dayjs | null;
    ca: string;
    xuong: string;
    me: string;
  }) => {
    try {
      setChuyenLoading(true);
      const apiParams = {
        NgaySX: params.ngay ? params.ngay.format("YYYY-MM-DD") : null,
        Ca: params.ca ? Number(params.ca) : null,
        Xuong: params.xuong || null,
        Me: params.me?.trim() || null,
      };
      const res = await CtdPhoiNongApi.getData(apiParams);
      setChuyenData(mapCtdPhoiNongToRows(res as any));
    } catch {
      // silent
    } finally {
      setChuyenLoading(false);
    }
  };

  const handleSearch = () => {
    searchChuyenData({
      ngay: filterNgay,
      ca: filterCa,
      xuong: filterXuong,
      me: filterMe,
    });
  };

  const formData = data?.jsonData || {};

  const getExportParams = () => ({
    NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
    Ca: filterCa ? Number(filterCa) : null,
    Xuong: filterXuong || null,
  });

  const handleExportExcel = async () => {
    try {
      setActionLoading(true);
      const response = await CtdPhoiNongApi.exportExcel(getExportParams());
      const blob = new Blob([response as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BM.06-QT.05.11_Bien_ban_giao_nhan_phoi_nong_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Xuất Excel thất bại!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setActionLoading(true);
      const fData = data?.jsonData || {};
      const response = await CtdPhoiNongApi.exportPdf({
        NgaySX: data?.ngaySX
          ? dayjs(data.ngaySX).format("YYYY-MM-DD")
          : fData?.NgaySX
            ? dayjs(fData.NgaySX).format("YYYY-MM-DD")
            : null,
        Ca: data?.ca ? Number(data.ca) : fData?.ca ? Number(fData.ca) : null,
        Xuong:
          data?.mayDuc ??
          fData?.mayDuc ??
          fData?.mayduc ??
          null,
        id: idphieu,
      });
      const blob = new Blob([response as any], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BM.06-QT.05.11_Bien_ban_giao_nhan_phoi_nong_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Xuất PDF thất bại!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChot = async () => {
    try {
      setActionLoading(true);
      await PhieuApi.changeStatus_extended(idphieu, {
        status: 5,
        isLock: 0,
        isDelete: 0,
      });
      await CtdPhoiNongApi.updateStatusChot(getExportParams());
      await searchChuyenData({
        ngay: filterNgay,
        ca: filterCa,
        xuong: filterXuong,
        me: filterMe,
      });
      const refreshed = await PhieuApi.getDetail(idphieu);
      setData(refreshed);
      message.success("Đã chốt phiếu");
    } catch {
      message.error("Có lỗi xảy ra không thể chốt phiếu!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleHuyChot = async () => {
    try {
      setActionLoading(true);
      await PhieuApi.changeStatus_extended(idphieu, {
        status: 2,
        isLock: 0,
        isDelete: 0,
      });
      await CtdPhoiNongApi.updateStatusChot({
        ...getExportParams(),
        status: 0,
      });
      await searchChuyenData({
        ngay: filterNgay,
        ca: filterCa,
        xuong: filterXuong,
        me: filterMe,
      });
      const refreshed = await PhieuApi.getDetail(idphieu);
      setData(refreshed);
      message.success("Đã hủy chốt phiếu");
    } catch {
      message.error("Có lỗi xảy ra không thể hủy chốt phiếu!");
    } finally {
      setActionLoading(false);
    }
  };

  // cấu hình bảng hiển thị
  const tableData = formData?.table1 || [];
  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1",
  );
  const columns = tableSection?.columns || [];

  // xử lý phê duyệt
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
          : "Đã từ chối phiếu!",
      );
      setDataPheDuyet((prev: any) => ({
        ...prev,
        tinhTrang: action === "approve" ? 1 : 2,
        ghiChu,
      }));
      setOpen(false);
      setGhiChu("");
    } catch {
      message.error("Lỗi khi gửi phê duyệt, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: any) => {
    setAction(type);
    setOpen(true);
  };

  const tinhTrang = data?.tinhTrang;

  return (
    <>
      <div style={{ textAlign: "right" }}>
        <Space>
          {datapheduyet &&
            datapheduyet?.tinhTrang === 0 &&
            datapheduyet?.nguoiDuyetId === currentUserId && (
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

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            loading={actionLoading}
            disabled={!data}
          >
            Xuất Excel
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={handleExportPdf}
            loading={actionLoading}
            disabled={!data}
          >
            Xuất PDF
          </Button>
          {tinhTrang !== 5 && (
            <Button
              type="primary"
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
              onClick={handleChot}
              loading={actionLoading}
              disabled={!data}
            >
              Chốt phiếu
            </Button>
          )}
          {tinhTrang === 5 && (
            <Button
              type="primary"
              danger
              onClick={handleHuyChot}
              loading={actionLoading}
            >
              Hủy chốt
            </Button>
          )}
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
          {/* <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
          </div> */}

          {/* {config.isoInfo && (
            <div
              style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}
            >
              <div>
                <b>{config.isoInfo.code}</b>
              </div>
              <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )} */}
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

        {/* <Table
          bordered
          columns={columns}
          dataSource={tableData?.map((r: any, i: number) => ({
            key: i,
            stt: i + 1,
            ...r,
          }))}
          pagination={false}
          size="small"
        /> */}

        <Divider />

        {/* <div style={{ marginTop: 20 }}>
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
        </div> */}

        <Divider />

        {/* Vùng phôi đã chuyển */}
        <Typography.Title level={5} style={{ marginBottom: 8 }}>
          Vùng phôi đã chuyển
        </Typography.Title>

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "flex-end",
            marginBottom: 8,
            padding: 8,
            backgroundColor: "#f5f5f5",
            borderRadius: 4,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Xưởng
            </div>
            <Select
              value={filterXuong || undefined}
              size="small"
              disabled
              style={{ width: 140 }}
              options={[
                { label: "Xưởng cán 1", value: "1" },
                { label: "Xưởng cán 2", value: "2" },
                { label: "Xưởng cán 3", value: "3" },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Ngày Cán
            </div>
            <DatePicker
              style={{ width: 140 }}
              value={filterNgay}
              format="YYYY-MM-DD"
              size="small"
              disabled
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Ca
            </div>
            <Select
              style={{ width: 110 }}
              value={filterCa || undefined}
              size="small"
              disabled
              options={[
                { label: "Ngày", value: "1" },
                { label: "Đêm", value: "2" },
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Mẻ
            </div>
            <Input
              value={filterMe}
              size="small"
              style={{ width: 160 }}
              disabled
            />
          </div>
          <Button
            type="primary"
            size="small"
            onClick={handleSearch}
            loading={chuyenLoading}
          >
            Tìm kiếm
          </Button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <Table
            size="small"
            pagination={false}
            bordered
            loading={chuyenLoading}
            rowKey="key"
            dataSource={chuyenData}
            scroll={{ x: 1200 }}
            columns={[
              {
                title: "Trạng thái QLCL",
                dataIndex: "tinhTrangQLCL",
                width: 130,
                render: (val: any) => {
                  const isDone = Number(val || 0) === 1;
                  const style = isDone
                    ? {
                        backgroundColor: "#52c41a",
                        borderColor: "#52c41a",
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "#d9d9d9",
                        borderColor: "#d9d9d9",
                        color: "#333",
                      };
                  return (
                    <Button size="small" disabled style={style}>
                      {isDone ? "Đã xác nhận" : "Chưa xử lý"}
                    </Button>
                  );
                },
              },
              {
                title: "Trạng thái CTD",
                dataIndex: "tinhTrangCTD",
                width: 130,
                render: (val: any) => {
                  const isDone = Number(val || 0) === 1;
                  const style = isDone
                    ? {
                        backgroundColor: "#52c41a",
                        borderColor: "#52c41a",
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "#d9d9d9",
                        borderColor: "#d9d9d9",
                        color: "#333",
                      };
                  return (
                    <Button size="small" disabled style={style}>
                      {isDone ? "Đã xác nhận" : "Chưa xử lý"}
                    </Button>
                  );
                },
              },
              {
                title: "Tình trạng",
                dataIndex: "tinhTrang",
                width: 130,
                render: (val: any) => {
                  const isDone = Number(val || 0) === 1;
                  const style = isDone
                    ? {
                        backgroundColor: "#52c41a",
                        borderColor: "#52c41a",
                        color: "#fff",
                      }
                    : {
                        backgroundColor: "#d9d9d9",
                        borderColor: "#d9d9d9",
                        color: "#333",
                      };
                  return (
                    <Button size="small" disabled style={style}>
                      {isDone ? "Đã chốt" : "Chưa xử lý"}
                    </Button>
                  );
                },
              },
              { title: "Ngày Đúc", dataIndex: "ngayDuc", width: 160 },
              { title: "Ngày Cán", dataIndex: "ngaySX", width: 160 },
              {
                title: "Ca",
                dataIndex: "ca",
                width: 110,
                render: (val: any) => (val === 1 ? "Ngày" : "Đêm"),
              },
              { title: "Mẻ", dataIndex: "me", width: 120 },
              { title: "Mác", dataIndex: "mac", width: 140 },
              { title: "Kích thước", dataIndex: "kichThuoc", width: 160 },
              { title: "Đúc", dataIndex: "duc", width: 90 },
              {
                title: "NMC",
                dataIndex: "vanChuyen",
                width: 90,
                render: (val: any) =>
                  val ? `Cán ${val.replace("NMC", "")}` : "",
              },
              {
                title: "Loại 1",
                children: [
                  {
                    title: "ST",
                    dataIndex: "ST_LoaiI",
                    align: "center" as const,
                    width: 90,
                    render: (val: any) => (val ? val : ""),
                  },
                  {
                    title: "KL",
                    align: "center" as const,
                    dataIndex: "KL_LoaiI",
                    width: 110,
                    render: (val: any) =>
                      val !== null && val !== undefined
                        ? Number(val).toLocaleString("vi-VN")
                        : "",
                  },
                ],
              },
              {
                title: "Loại 2",
                children: [
                  {
                    title: "ST",
                    align: "center" as const,
                    dataIndex: "ST_LoaiII",
                    width: 90,
                    render: (val: any) => (val ? val : ""),
                  },
                  {
                    title: "KL",
                    align: "center" as const,
                    dataIndex: "KL_LoaiII",
                    width: 110,
                    render: (val: any) =>
                      val !== null && val !== undefined
                        ? Number(val).toLocaleString("vi-VN")
                        : "",
                  },
                ],
              },
              {
                title: "Loại 3",
                children: [
                  {
                    title: "ST",
                    align: "center" as const,
                    dataIndex: "ST_LoaiIII",
                    width: 90,
                    render: (val: any) => (val ? val : ""),
                  },
                  {
                    title: "KL",
                    align: "center" as const,
                    dataIndex: "KL_LoaiIII",
                    width: 110,
                    render: (val: any) =>
                      val !== null && val !== undefined
                        ? Number(val).toLocaleString("vi-VN")
                        : "",
                  },
                ],
              },
              {
                title: "Tổng số thanh",
                dataIndex: "tongSoThanh",
                width: 120,
                align: "center" as const,
                render: (val: any) => (
                  <Typography.Text strong>{val}</Typography.Text>
                ),
              },
              {
                title: "Tổng khối lượng",
                dataIndex: "tongKhoi",
                width: 140,
                align: "center" as const,
                render: (val: any) =>
                  val !== null && val !== undefined
                    ? Number(val).toLocaleString("vi-VN")
                    : "",
              },
              {
                title: "Ghi chú",
                dataIndex: "ghiChu",
                width: 180,
                render: (val: any) => val || "-",
              },
            ]}
            summary={() => {
              const s = calcSummary(chuyenData);
              return (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={1} colSpan={12} align="center">
                      <b>Tổng cộng</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center">
                      <b>{s.ST1}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center">
                      <b>{(s.KL1 ?? 0).toLocaleString("vi-VN")}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <b>{s.ST2}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">
                      <b>{(s.KL2 ?? 0).toLocaleString("vi-VN")}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="center">
                      <b>{s.ST3}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="center">
                      <b>{(s.KL3 ?? 0).toLocaleString("vi-VN")}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="center">
                      <b>{s.TongST}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="center">
                      <b>{(s.TongKL ?? 0).toLocaleString("vi-VN")}</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="center">
                      {" "}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
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
              (p: any) => p.capDuyet === sig.capduyet,
            );
            return (
              <Col key={sig.capduyet}>
                <Text strong>{sig.label}</Text>
                <br />
                <Text type="secondary">
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
