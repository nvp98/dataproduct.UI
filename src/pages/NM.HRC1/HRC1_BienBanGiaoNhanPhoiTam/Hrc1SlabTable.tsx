/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// TODO: trang này đã cũ, không khớp với Hrc1SlabApi hiện tại (trangThaiKCS, chuyenBBSL, thuHoi
// không tồn tại ở backend HRC1 — được copy từ BkHrc2SlabTable.tsx nhưng chưa cập nhật lại).
// Không có nơi nào import trang này. Tạm tắt type-check, sẽ viết lại sau.
// @ts-nocheck
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
  Tooltip,
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  ClearOutlined,
  ArrowUpOutlined,
  RollbackOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { TableRowSelection } from "antd/es/table/interface";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Hrc1SlabApi, type Hrc1SlabItem, type Hrc1PhieuBBSLItem } from "../../../services/Hrc1SlabApi";
import { PhieuApi } from "../../../services/PhieuApi";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import {
  hasKhuVucPhu,
  getBmQuyenUiFlags,
} from "../../../utils/helpers/checkAdminRole";

const { RangePicker } = DatePicker;

const TT_COLOR: Record<number, string> = { 0: "default", 1: "green" };
const TT_TEXT: Record<number, string>  = { 0: "Chưa", 1: "Đã XN" };

function getComputedPhieuStatus(p: Hrc1PhieuBBSLItem): "chot" | "hoanThanh" | "dangXuLy" {
  if (p.tinhTrang === 5) return "chot";
  const total = p.soSlabDaChot;
  if (total > 0 && p.soSlabDuc >= total && p.soSlabKho >= total) return "hoanThanh";
  return "dangXuLy";
}

const getUserId = (): number => {
  try {
    const info = localStorage.getItem("userinfo");
    if (info) {
      const obj = JSON.parse(info);
      return obj.iD_TaiKhoan ?? obj.ID_TaiKhoan ?? obj.idTaiKhoan ?? 0;
    }
  } catch { /* empty */ }
  return 0;
};

const Hrc1SlabTable = () => {
  const userInfo = (() => { try { const s = localStorage.getItem("userinfo"); return s ? JSON.parse(s) : null; } catch { return null; } })();
  const maBm = BM_CONFIG.HRC1.HRC1_BBGN_PhoiTam;
  const isView = getBmQuyenUiFlags(maBm, userInfo).isView;
  const isDuc  = hasKhuVucPhu(userInfo, maBm, "Duc");

  const [form] = Form.useForm();
  const [data, setData] = useState<Hrc1SlabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  // Sync modal
  const [syncVisible, setSyncVisible] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncForm] = Form.useForm();


  // Chọn phiếu BBSL modal
  const [modalVisible, setModalVisible] = useState(false);
  const [phieuList, setPhieuList] = useState<Hrc1PhieuBBSLItem[]>([]);
  const [phieuLoading, setPhieuLoading] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState<Hrc1PhieuBBSLItem | null>(null);

  // Tạo phiếu BBSL mới
  const [createVisible, setCreateVisible] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm] = Form.useForm();

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
        trangThaiKCS: filters.trangThaiKCS ?? null,
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

  // ── Chuyển BBSL ──────────────────────────────────────────────────────────

  const selectedRows = useMemo(() => data.filter((r) => selectedRowKeys.includes(r.id)), [data, selectedRowKeys]);

  const handleOpenChuyenBBSL = async () => {
    if (selectedRows.length === 0) { message.warning("Vui lòng chọn ít nhất 1 slab!"); return; }

    const caValues = [...new Set(selectedRows.map((r) => r.caSX ?? ""))];
    if (caValues.length > 1) { message.warning("Các mẻ được chọn phải cùng ca sản xuất!"); return; }

    if (selectedRows.some((r) => r.trangThaiKCS === 1)) {
      message.warning("Một số mẻ đã được chuyển BBSL, vui lòng bỏ chọn chúng!");
      return;
    }

    try {
      setPhieuLoading(true);
      setModalVisible(true);
      setSelectedPhieu(null);
      const firstKip = selectedRows[0]?.kipSX;
      const firstCa = selectedRows[0]?.caSX;
      const caNum = firstCa ? parseInt(firstCa, 10) : null;
      const list = await Hrc1SlabApi.getPhieuBBSL(firstKip ?? null, caNum ?? null);
      setPhieuList(list);
    } catch {
      message.error("Không thể tải danh sách phiếu!");
    } finally {
      setPhieuLoading(false);
    }
  };

  const handleConfirmChuyenBBSL = async () => {
    if (!selectedPhieu) { message.warning("Vui lòng chọn phiếu!"); return; }
    if (getComputedPhieuStatus(selectedPhieu) === "chot") { message.error("Phiếu đã chốt, không thể chuyển slab vào!"); return; }
    try {
      setActionLoading(true);
      const ids = selectedRows.map((r) => r.id);
      await Hrc1SlabApi.chuyenBBSL(ids, selectedPhieu.idPhieu, getUserId());
      message.success(`Đã chuyển ${ids.length} slab vào phiếu ${selectedPhieu.soPhieu}`);
      setModalVisible(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi chuyển BBSL!");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePhieu = async (values: any) => {
    try {
      setCreateLoading(true);
      const stored = localStorage.getItem("userinfo");
      const ui = stored ? JSON.parse(stored) : {};
      const payload = {
        maBm,
        NgaySX: values.ngaySX ? dayjs(values.ngaySX).format("YYYY-MM-DD") : null,
        ca: values.ca,
        nguoiTaoId: ui.iD_TaiKhoan ?? null,
        xuongId: ui.iD_PhanXuong ?? null,
        idphongBan: ui.iD_PhongBan ?? null,
        tinhTrang: 0,
        prefix: "BBSL_PhoiTam_HRC1",
      };
      const res = await PhieuApi.postData(payload as Record<string, unknown>);
      message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu ?? ""}`);
      setCreateVisible(false);
      createForm.resetFields();
      const firstKip = selectedRows[0]?.kipSX;
      const firstCa = selectedRows[0]?.caSX;
      const caNum = firstCa ? parseInt(firstCa, 10) : null;
      const list = await Hrc1SlabApi.getPhieuBBSL(firstKip ?? null, caNum ?? null);
      setPhieuList(list);
      const newId = (res as any)?.idphieu;
      if (newId) {
        const newPhieu = list.find((p) => p.idPhieu === newId);
        if (newPhieu) setSelectedPhieu(newPhieu);
      }
    } catch (err: any) {
      message.error(err?.message ?? "Không thể tạo phiếu!");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Thu hồi ──────────────────────────────────────────────────────────────

  const handleThuHoi = async () => {
    const canThuHoi = selectedRows.every((r) => r.trangThaiKCS === 1 && r.trangThaiPKH === 0);
    if (!canThuHoi) { message.warning("Chỉ có thể thu hồi slab đã chuyển và chưa chốt PKH!"); return; }
    try {
      setActionLoading(true);
      await Hrc1SlabApi.thuHoi(selectedRows.map((r) => r.id), getUserId());
      message.success(`Đã thu hồi ${selectedRows.length} slab`);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi thu hồi!");
    } finally {
      setActionLoading(false);
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
    {
      title: "TT Đúc",
      dataIndex: "trangThaiKCS",
      width: 80,
      align: "center",
      fixed: "left",
      render: (v: number, r: Hrc1SlabItem) => (
        <Tooltip title={v === 1 ? `Phiếu: ${r.soPhieuBBSL ?? r.idPhieuBBSL}` : "Chưa chuyển"}>
          <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã chuyển" : "Chưa"}</Tag>
        </Tooltip>
      ),
    },
    { title: "TT Kho", dataIndex: "trangThaiKho", width: 70, align: "center", fixed: "left",
      render: (v: number) => <Tag color={TT_COLOR[v]}>{TT_TEXT[v]}</Tag> },
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
  const canChuyenBBSL = selectedCount > 0 && selectedRows.every((r) => r.trangThaiKCS === 0);
  const canThuHoi     = selectedCount > 0 && selectedRows.every((r) => r.trangThaiKCS === 1 && r.trangThaiPKH === 0);

  const phieuColumns = [
    { title: "Số phiếu", dataIndex: "soPhieu", width: 160 },
    { title: "Ngày SX", dataIndex: "ngaySX", width: 110, render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "-" },
    { title: "Ca", dataIndex: "ca", width: 70, render: (v: number) => v === 1 ? "Ca Ngày" : v === 2 ? "Ca Đêm" : v ?? "-" },
    { title: "Kíp", dataIndex: "kip", width: 60 },
    { title: "Số slab", dataIndex: "soSlabDaChot", width: 75, align: "right" as const },
    {
      title: "Trạng thái", dataIndex: "tinhTrang", width: 120,
      render: (_: number, r: Hrc1PhieuBBSLItem) => {
        const s = getComputedPhieuStatus(r);
        if (s === "chot")      return <Tag color="blue">Đã chốt</Tag>;
        if (s === "hoanThanh") return <Tag color="green">Hoàn thành</Tag>;
        return <Tag color="processing">Đang xử lý</Tag>;
      },
    },
  ];

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
              <Form.Item name="trangThaiKCS" label="TT Đúc">
                <Select allowClear placeholder="Tất cả">
                  <Select.Option value={0}>Chưa chuyển</Select.Option>
                  <Select.Option value={1}>Đã chuyển</Select.Option>
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

            {!isView && isDuc && (<>
              <Button type="primary" icon={<ArrowUpOutlined />} disabled={!canChuyenBBSL} loading={actionLoading} onClick={handleOpenChuyenBBSL}>
                Chuyển BBSL
              </Button>
              <Popconfirm title={`Thu hồi ${selectedCount} slab đã chọn?`} onConfirm={handleThuHoi} disabled={!canThuHoi}>
                <Button icon={<RollbackOutlined />} disabled={!canThuHoi} loading={actionLoading}>Thu hồi</Button>
              </Popconfirm>
            </>)}

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
          rowClassName={(r) => (r.trangThaiKCS === 1 ? "row-chuyen" : "")}
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

      {/* Modal chọn phiếu BBSL */}
      <Modal
        title="Chọn phiếu BBSL để chuyển slab vào"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Hủy</Button>,
          <Button
            key="create"
            onClick={() => {
              const first = selectedRows[0];
              if (first?.ngaySX) createForm.setFieldValue("ngaySX", dayjs(String(first.ngaySX)));
              const caRaw = parseInt(String(first?.caSX ?? ""), 10);
              if (caRaw === 1 || caRaw === 2) createForm.setFieldValue("ca", caRaw);
              setCreateVisible(true);
            }}
          >
            + Tạo phiếu mới
          </Button>,
          <Button
            key="ok"
            type="primary"
            disabled={!selectedPhieu}
            loading={actionLoading}
            onClick={handleConfirmChuyenBBSL}
          >
            Xác nhận chuyển vào phiếu đã chọn
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 8, color: "#555" }}>
          Sẽ chuyển <b>{selectedCount}</b> slab vào phiếu được chọn.
          {selectedPhieu && <> Phiếu đã chọn: <b style={{ color: "#1976d2" }}>{selectedPhieu.soPhieu}</b></>}
        </p>
        <Table<Hrc1PhieuBBSLItem>
          rowKey="idPhieu"
          columns={phieuColumns}
          dataSource={phieuList}
          loading={phieuLoading}
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selectedPhieu ? [selectedPhieu.idPhieu] : [],
            onChange: (_, rows) => {
              const p = rows[0];
              if (p && getComputedPhieuStatus(p) === "chot") { message.warning("Phiếu đã chốt, không thể chọn!"); return; }
              setSelectedPhieu(p ?? null);
            },
            getCheckboxProps: (r) => ({ disabled: getComputedPhieuStatus(r) === "chot" }),
          }}
          onRow={(r) => ({
            onClick: () => {
              if (getComputedPhieuStatus(r) === "chot") { message.warning("Phiếu đã chốt!"); return; }
              setSelectedPhieu(r);
            },
            style: {
              cursor: getComputedPhieuStatus(r) === "chot" ? "not-allowed" : "pointer",
              opacity: getComputedPhieuStatus(r) === "chot" ? 0.5 : 1,
            },
          })}
        />
      </Modal>

      {/* Sub-modal tạo phiếu BBSL mới */}
      <Modal
        title="Tạo phiếu biên bản sản lượng mới"
        open={createVisible}
        onCancel={() => { setCreateVisible(false); createForm.resetFields(); }}
        footer={null}
        width={380}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreatePhieu}>
          <Form.Item name="ngaySX" label="Ngày sản xuất" rules={[{ required: true, message: "Chọn ngày" }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
          </Form.Item>
          <Form.Item name="ca" label="Ca sản xuất" rules={[{ required: true, message: "Chọn ca" }]}>
            <Select placeholder="Chọn ca">
              <Select.Option value={1}>Ca ngày (1)</Select.Option>
              <Select.Option value={2}>Ca đêm (2)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setCreateVisible(false); createForm.resetFields(); }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={createLoading}>Tạo phiếu</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Hrc1SlabTable;
