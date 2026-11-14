import { Alert, Button, Card, Col, DatePicker, Form, Input, Popconfirm, Row, Select, Space, Table, Tag, message } from "antd";
import { SearchOutlined, ReloadOutlined, SyncOutlined, DownloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { CA_SX_OPTIONS, DongLucApi } from "../../../services/DongLucApi";
import type { DongLucSyncLog, DuLieuDongLuc, DuLieuDongLucFilter } from "../../../services/DongLucApi";

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string })?.message ?? fallback;

const defaultFilter = (): DuLieuDongLucFilter => ({
  tuNgay: dayjs().startOf("month").format("YYYY-MM-DD"),
  denNgay: dayjs().format("YYYY-MM-DD"),
});

const columns: ColumnsType<DuLieuDongLuc> = [
  { title: "Ngày", dataIndex: "ngay", key: "ngay", width: 110, render: (v: string) => dayjs(v).format("DD/MM/YYYY") },
  { title: "Ca", dataIndex: "caSX", key: "caSX", width: 70, align: "center" },
  { title: "Mã xưởng", dataIndex: "maXuong", key: "maXuong", width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: "Mã header", dataIndex: "maHeader", key: "maHeader", width: 180 },
  { title: "TagID", dataIndex: "tagID", key: "tagID", width: 100 },
  {
    title: "Giá trị",
    dataIndex: "giaTri",
    key: "giaTri",
    width: 140,
    align: "right",
    render: (v: number | null) => (v == null ? "-" : v.toLocaleString("vi-VN", { maximumFractionDigits: 3 })),
  },
  {
    title: "Ngày cập nhật",
    dataIndex: "ngayCapNhat",
    key: "ngayCapNhat",
    width: 150,
    render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
  },
];

const DuLieuDongLucPage = () => {
  const [searchForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [data, setData] = useState<DuLieuDongLuc[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filter, setFilter] = useState<DuLieuDongLucFilter>(defaultFilter);
  const [lanGanNhat, setLanGanNhat] = useState<DongLucSyncLog | null>(null);

  const fetchLanGanNhat = async () => {
    try {
      setLanGanNhat(await DongLucApi.lanDongBoGanNhat());
    } catch {
      setLanGanNhat(null);
    }
  };

  const fetchData = async (page = pagination.current, pageSize = pagination.pageSize, applied: DuLieuDongLucFilter = filter) => {
    setLoading(true);
    try {
      const res = await DongLucApi.searchDuLieu({ ...applied, page, pageSize });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setFilter(applied);
    } catch {
      message.error("Không thể tải dữ liệu động lực");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const f = defaultFilter();
    searchForm.setFieldsValue({ khoangNgay: [dayjs(f.tuNgay), dayjs(f.denNgay)] });
    fetchData(1, pagination.pageSize, f);
    fetchLanGanNhat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readFilter = (): DuLieuDongLucFilter => {
    const values = searchForm.getFieldsValue();
    const [tu, den]: [Dayjs, Dayjs] = values.khoangNgay ?? [dayjs().startOf("month"), dayjs()];
    return {
      tuNgay: tu.format("YYYY-MM-DD"),
      denNgay: den.format("YYYY-MM-DD"),
      caSX: values.caSX ?? undefined,
      maXuong: values.maXuong?.trim().toUpperCase() || undefined,
      maHeader: values.maHeader?.trim() || undefined,
    };
  };

  const handleSearch = () => fetchData(1, pagination.pageSize, readFilter());

  const handleReset = () => {
    const f = defaultFilter();
    searchForm.resetFields();
    searchForm.setFieldsValue({ khoangNgay: [dayjs(f.tuNgay), dayjs(f.denNgay)] });
    fetchData(1, pagination.pageSize, f);
  };

  const handleDongBo = async () => {
    const f = readFilter();
    setSyncLoading(true);
    try {
      const log = await DongLucApi.dongBo({ tuNgay: f.tuNgay, denNgay: f.denNgay, maXuong: f.maXuong });
      message.success(`Đồng bộ xong: ${log.soDong} dòng được thêm/cập nhật`);
      fetchData(1, pagination.pageSize, f);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Đồng bộ thất bại"));
    } finally {
      setSyncLoading(false);
      fetchLanGanNhat();
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await DongLucApi.exportExcel(readFilter());
    } catch {
      message.error("Không thể xuất Excel");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div>
      <Card
        title="Dữ liệu Động lực theo ca (EMS)"
        extra={
          <Space>
            <Popconfirm
              title="Đồng bộ từ EMS"
              description="Kéo lại dữ liệu EMS cho khoảng ngày (và mã xưởng) đang lọc, tối đa 31 ngày."
              onConfirm={handleDongBo}
              okText="Đồng bộ"
              cancelText="Hủy"
            >
              <Button icon={<SyncOutlined />} loading={syncLoading}>
                Đồng bộ từ EMS
              </Button>
            </Popconfirm>
            <Button icon={<DownloadOutlined />} loading={exportLoading} onClick={handleExport}>
              Xuất Excel
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {lanGanNhat && (
          <Alert
            style={{ marginBottom: 16 }}
            showIcon
            type={lanGanNhat.thanhCong ? "success" : "error"}
            message={
              <span>
                Đồng bộ gần nhất: {dayjs(lanGanNhat.thoiGianBatDau).format("DD/MM/YYYY HH:mm")} (
                {lanGanNhat.nguonChay === "auto" ? "tự động" : lanGanNhat.nguonChay ?? "-"}) — kỳ{" "}
                {dayjs(lanGanNhat.tuNgay).format("DD/MM")}–{dayjs(lanGanNhat.denNgay).format("DD/MM/YYYY")}
                {lanGanNhat.maXuong ? `, xưởng ${lanGanNhat.maXuong}` : ""} —{" "}
                {lanGanNhat.thanhCong ? `${lanGanNhat.soDong} dòng` : `lỗi: ${lanGanNhat.loiChiTiet ?? ""}`}
              </span>
            }
          />
        )}
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item label="Khoảng ngày" name="khoangNgay">
                <DatePicker.RangePicker format="DD/MM/YYYY" allowClear={false} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Ca" name="caSX">
                <Select allowClear placeholder="Tất cả" options={CA_SX_OPTIONS} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label="Mã xưởng" name="maXuong">
                <Input placeholder="VD: DPV" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item label="Mã header" name="maHeader">
                <Input placeholder="VD: DPV_DienKhi" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={6} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  Lọc
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Xóa lọc
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            onChange: (page, pageSize) => fetchData(page, pageSize),
          }}
        />
      </Card>
    </div>
  );
};

export default DuLieuDongLucPage;
