/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { SearchOutlined, ClearOutlined, SyncOutlined } from "@ant-design/icons";
import type { TableRowSelection } from "antd/es/table/interface";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Hrc1SlabApi, type Hrc1SlabItem } from "../../../services/Hrc1SlabApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { hasKhuVucPhu } from "../../../utils/helpers/checkAdminRole";

const { RangePicker } = DatePicker;

const TT_COLOR: Record<number, string> = { 0: "default", 1: "green" };
const TT_TEXT: Record<number, string>  = { 0: "Chưa", 1: "Đã XN" };

const Hrc1SlabTable = () => {
  const userInfo = (() => { try { const s = localStorage.getItem("userinfo"); return s ? JSON.parse(s) : null; } catch { return null; } })();
  const maBm = BM_CONFIG.HRC1.HRC1_BBGN_PhoiTam;
  const isDuc = hasKhuVucPhu(userInfo, maBm, "Duc");

  const [form] = Form.useForm();
  const [data, setData] = useState<Hrc1SlabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  // Sync modal
  const [syncVisible, setSyncVisible] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncForm] = Form.useForm();

  const fetchData = useCallback(async (page = 1, pageSize = 50, values?: any, resetSel = true) => {
    try {
      setLoading(true);
      const filters = values ?? form.getFieldsValue();
      const dateRange = filters.dateRange;
      const res = await Hrc1SlabApi.search({
        tuNgay:  dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : null,
        denNgay: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : null,
        caSX:    filters.caSX || null,
        kipSX:   filters.kipSX || null,
        mayDuc:  filters.mayDuc || null,
        maMe:    filters.maMe || null,
        idSlab:  filters.idSlab || null,
        macThep: filters.macThep || null,
        isChot:  filters.isChot ?? null,
        trangThaiDuc: filters.trangThaiDuc ?? null,
        page,
        pageSize,
      });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalCount });
      if (resetSel) setSelectedRowKeys([]);
    } catch {
      message.error("Không thể tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => { fetchData(1, 50); }, []);

  const handleSearch = async (values: any) => fetchData(1, pagination.pageSize, values);

  const handleClear = () => {
    form.resetFields();
    setData([]);
    setSelectedRowKeys([]);
    setPagination({ current: 1, pageSize: 50, total: 0 });
  };

  // ── Sync ─────────────────────────────────────────────────────────────────

  // Ca ngày: 8h–19:59 → caSX=1, ngàySX=hôm nay
  // Ca đêm: 20h–23:59 → caSX=2, ngàySX=hôm nay
  // Ca đêm: 0h–7:59  → caSX=2, ngàySX=hôm qua (ca đêm bắt đầu từ hôm qua)
  const getCurrentCa = () => {
    const now = dayjs();
    const hour = now.hour();
    if (hour >= 8 && hour < 20) {
      return { ngaySX: now.format("YYYY-MM-DD"), caSX: 1, label: `Ca ngày — ${now.format("DD/MM/YYYY")}` };
    } else if (hour >= 20) {
      return { ngaySX: now.format("YYYY-MM-DD"), caSX: 2, label: `Ca đêm — ${now.format("DD/MM/YYYY")}` };
    } else {
      // 0h–7:59: ca đêm của ngày hôm qua
      const yesterday = now.subtract(1, "day");
      return { ngaySX: yesterday.format("YYYY-MM-DD"), caSX: 2, label: `Ca đêm — ${yesterday.format("DD/MM/YYYY")}` };
    }
  };

  const handleSync = async () => {
    const values = syncForm.getFieldsValue();
    const current = getCurrentCa();
    const ngaySX = values.ngaySX ? dayjs(values.ngaySX).format("YYYY-MM-DD") : current.ngaySX;
    const caSX = values.caSX ?? current.caSX;
    try {
      setSyncLoading(true);
      const res = await Hrc1SlabApi.sync(ngaySX, caSX);
      const macThepNote = res.macThepFilled > 0 ? ` | Mác thép: +${res.macThepFilled}` : "";
      message.success(`${res.rowsUpserted}/${res.totalFromApi} bản ghi đã sync${macThepNote}`);
      setSyncVisible(false);
      syncForm.resetFields();
      await fetchData(1, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi sync dữ liệu!");
    } finally {
      setSyncLoading(false);
    }
  };

  // ── Row selection ─────────────────────────────────────────────────────────

  const currentPageKeys = useMemo(() => data.map((r) => r.id as React.Key), [data]);

  const rowSelection: TableRowSelection<Hrc1SlabItem> = {
    selectedRowKeys,
    onChange: (newKeys) => {
      const otherPageKeys = selectedRowKeys.filter((k) => !currentPageKeys.includes(k));
      setSelectedRowKeys([...otherPageKeys, ...newKeys]);
    },
    onSelectAll: (selected) => {
      if (selected) {
        setSelectedRowKeys([...new Set([...selectedRowKeys, ...currentPageKeys])]);
      } else {
        setSelectedRowKeys(selectedRowKeys.filter((k) => !currentPageKeys.includes(k)));
      }
    },
  };

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns = useMemo((): ColumnsType<Hrc1SlabItem> => [
    { title: "TT Đúc", dataIndex: "trangThaiDuc", width: 70, align: "center", fixed: "left",
      render: (v: number) => <Tag color={TT_COLOR[v]}>{TT_TEXT[v]}</Tag> },
    { title: "TT Cán", dataIndex: "trangThaiCan", width: 70, align: "center", fixed: "left",
      render: (v: number) => <Tag color={TT_COLOR[v]}>{TT_TEXT[v]}</Tag> },
    { title: "TT GĐ/PGĐ NM", dataIndex: "trangThaiC4", width: 70, align: "center", fixed: "left",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "Đã XN" : "Chưa"}</Tag> },
    { title: "TT PKH", dataIndex: "trangThaiPKH", width: 70, align: "center", fixed: "left",
      render: (v: number) => <Tag color={v === 1 ? "blue" : "default"}>{v === 1 ? "Đã chốt" : "Chưa"}</Tag> },
    {
      title: "Ngày SX", dataIndex: "ngaySX", width: 100, fixed: "left",
      render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "-",
    },
    { title: "Ca", dataIndex: "caSX", width: 55, align: "center", fixed: "left",
      render: (v: string) => v === "1" ? "Ca 1" : v === "2" ? "Ca 2" : v ?? "-" },
    { title: "Kíp", dataIndex: "kipSX", width: 50, align: "center", fixed: "left" },
    { title: "Lò", dataIndex: "mayDuc", width: 55, align: "center", fixed: "left" },
    { title: "Mẻ thép", dataIndex: "maMe", width: 110, align: "center", fixed: "left" },
    { title: "ID Slab", dataIndex: "idSlab", width: 130, align: "center", fixed: "left" },
    { title: "ID Piece", dataIndex: "idPiece", width: 120, align: "center" },
    { title: "Mác thép", dataIndex: "macThep", width: 160, align: "center" },
    {
      title: "Kích thước (mm)",
      key: "kichThuoc",
      width: 160,
      align: "center",
      render: (_: unknown, r: Hrc1SlabItem) => {
        const parts = [r.chieuDay, r.chieuRong, r.chieuDai];
        return parts.some((v) => v != null) ? parts.map((v) => v ?? "-").join(" × ") : "-";
      },
    },
    {
      title: "KL (kg)",
      dataIndex: "khoiLuong",
      width: 100,
      align: "right",
      render: (v: number) => v != null ? Number(v).toLocaleString("vi-VN") : "-",
    },
    {
      title: "Cut Date",
      dataIndex: "cutDate",
      width: 140,
      render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : <Tag>Chưa cắt</Tag>,
    },
  ], []);

  const selectedCount = selectedRowKeys.length;

  return (
    <div>
      {/* Form tìm kiếm */}
      <Card style={{ marginBottom: 8 }}>
        <Form form={form} layout="vertical" onFinish={handleSearch}>
          <Row gutter={[12, 0]}>
            <Col xs={24} sm={12} md={4}>
              <Form.Item name="dateRange" label="Khoảng ngày SX">
                <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder={["Từ ngày", "Đến ngày"]} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="caSX" label="Ca">
                <Select allowClear placeholder="Ca">
                  <Select.Option value="1">Ca 1</Select.Option>
                  <Select.Option value="2">Ca 2</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={1}>
              <Form.Item name="kipSX" label="Kíp">
                <Select allowClear placeholder="Kíp">
                  <Select.Option value="A">A</Select.Option>
                  <Select.Option value="B">B</Select.Option>
                  <Select.Option value="C">C</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={1}>
              <Form.Item name="mayDuc" label="Lò">
                <Input placeholder="Lò..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="maMe" label="Mẻ thép">
                <Input placeholder="Mẻ thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="idSlab" label="ID Slab">
                <Input placeholder="ID Slab..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="macThep" label="Mác thép">
                <Input placeholder="Mác thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="trangThaiDuc" label="TT Đúc">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={0}>Chưa XN</Select.Option>
                  <Select.Option value={1}>Đã XN</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={2}>
              <Form.Item name="isChot" label="Trạng thái chốt">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={false}>Chưa chốt</Select.Option>
                  <Select.Option value={true}>Đã chốt</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
            <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Tìm</Button>
            <Button icon={<ClearOutlined />} onClick={handleClear}>Xóa Lọc</Button>

            <span style={{ color: "#d9d9d9" }}>|</span>
            <span style={{ color: "#555" }}>
              {selectedCount > 0
                ? <b style={{ color: "#1976d2" }}>Đã chọn {selectedCount} dòng</b>
                : `Tổng: ${pagination.total} bản ghi`}
            </span>

            <div style={{ marginLeft: "auto" }}>
              {isDuc && (
                <Button icon={<SyncOutlined />} onClick={() => setSyncVisible(true)}>Làm mới dữ liệu</Button>
              )}
            </div>
          </div>
        </Form>
      </Card>

      {/* Bảng dữ liệu */}
      <Card bodyStyle={{ padding: "8px 12px" }}>
        <Table<Hrc1SlabItem>
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          sticky
          scroll={{ x: "max-content", y: "calc(100vh - 330px)" }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            onChange: (page, pageSize) => fetchData(page, pageSize, undefined, false),
          }}
          rowClassName={(r) => (r.isChuyenCa ? "row-chuyen" : "")}
        />
      </Card>

      {/* Modal Sync từ TSC API */}
      <Modal
        title="Làm mới dữ liệu từ TSC"
        open={syncVisible}
        onCancel={() => { setSyncVisible(false); syncForm.resetFields(); }}
        footer={null}
        width={380}
        afterOpenChange={(open) => {
          if (open) {
            const { caSX } = getCurrentCa();
            syncForm.setFieldsValue({ ngaySX: null, caSX });
          }
        }}
      >
        <Form form={syncForm} layout="vertical" onFinish={handleSync}>
          <Form.Item name="ngaySX" label="Ngày sản xuất" extra="Để trống sẽ lấy ngày hiện tại">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Mặc định: hôm nay" />
          </Form.Item>
          <Form.Item name="caSX" label="Ca sản xuất" extra="Để trống sẽ lấy ca hiện tại">
            <Select placeholder="Mặc định: ca hiện tại" allowClear>
              <Select.Option value={1}>Ca ngày (8h – 20h)</Select.Option>
              <Select.Option value={2}>Ca đêm (20h – 8h hôm sau)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setSyncVisible(false); syncForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={syncLoading} icon={<SyncOutlined />}>
                Làm mới ngay
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Hrc1SlabTable;
