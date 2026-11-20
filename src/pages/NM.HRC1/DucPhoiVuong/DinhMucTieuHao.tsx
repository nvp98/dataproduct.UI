import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { ColumnType } from "antd/es/table";
import { DinhMucTieuHaoApi } from "../../../services/DPVDinhMucTieuHaoApi";
import type { DinhMucTieuHao as DinhMucTieuHaoRow, DinhMucTieuHaoPayload } from "../../../services/DPVDinhMucTieuHaoApi";
import { useDanhMucMasterOptions } from "../../../hooks/useDanhMucMasterOptions";

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string })?.message ?? fallback;

type FilterState = { idPB?: number; idXuong?: number; baoCao?: string; chiTieu?: string; ngayApDung?: string };

const DinhMucTieuHao = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const { phongBanOptions, xuongOptions, tenPhongBan, tenXuong } = useDanhMucMasterOptions();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DinhMucTieuHaoRow[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState<FilterState>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DinhMucTieuHaoRow | null>(null);

  const fetchData = async (page = pagination.current, pageSize = pagination.pageSize, applied: FilterState = filters) => {
    setLoading(true);
    try {
      const res = await DinhMucTieuHaoApi.search({ ...applied, page, pageSize });
      setData(res.data);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setFilters(applied);
    } catch {
      message.error("Không thể tải danh sách định mức");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1, pagination.pageSize); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleSearch = () => {
    const v = searchForm.getFieldsValue();
    fetchData(1, pagination.pageSize, {
      idPB: v.idPB ?? undefined,
      idXuong: v.idXuong ?? undefined,
      baoCao: v.baoCao?.trim() || undefined,
      chiTieu: v.chiTieu?.trim() || undefined,
      ngayApDung: v.ngayApDung ? dayjs(v.ngayApDung).format("YYYY-MM-DD") : undefined,
    });
  };

  const handleReset = () => { searchForm.resetFields(); fetchData(1, pagination.pageSize, {}); };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: DinhMucTieuHaoRow) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      idPB: record.idPB ?? undefined,
      idXuong: record.idXuong ?? undefined,
      dayChuyen: record.dayChuyen ?? undefined,
      baoCao: record.baoCao ?? undefined,
      chiTieu: record.chiTieu,
      donViTinh: record.donViTinh ?? undefined,
      mucSanLuong: record.mucSanLuong ?? undefined,
      dieuKienSanLuong: record.dieuKienSanLuong ?? undefined,
      mucTieuHaoLDG: record.mucTieuHaoLDG ?? undefined,
      dieuKienTieuHaoLDG: record.dieuKienTieuHaoLDG ?? undefined,
      mucTyLePhe: record.mucTyLePhe ?? undefined,
      dieuKienTyLePhe: record.dieuKienTyLePhe ?? undefined,
      khoangThoiGian: record.tuNgay && record.denNgay ? [dayjs(record.tuNgay), dayjs(record.denNgay)] : undefined,
      ghiChu: record.ghiChu ?? undefined,
    });
    setModalVisible(true);
  };

  const handleModalCancel = () => { setModalVisible(false); modalForm.resetFields(); setEditingRecord(null); };

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields();
      const [tuNgay, denNgay] = values.khoangThoiGian ?? [null, null];
      const payload: DinhMucTieuHaoPayload = {
        idPB: values.idPB ?? null,
        idXuong: values.idXuong ?? null,
        dayChuyen: values.dayChuyen?.trim() || null,
        baoCao: values.baoCao?.trim() || null,
        chiTieu: values.chiTieu.trim(),
        donViTinh: values.donViTinh?.trim() || null,
        mucSanLuong: values.mucSanLuong ?? null,
        dieuKienSanLuong: values.dieuKienSanLuong ?? null,
        mucTieuHaoLDG: values.mucTieuHaoLDG ?? null,
        dieuKienTieuHaoLDG: values.dieuKienTieuHaoLDG ?? null,
        mucTyLePhe: values.mucTyLePhe ?? null,
        dieuKienTyLePhe: values.dieuKienTyLePhe ?? null,
        tuNgay: tuNgay ? dayjs(tuNgay).format("YYYY-MM-DD") : null,
        denNgay: denNgay ? dayjs(denNgay).format("YYYY-MM-DD") : null,
        ghiChu: values.ghiChu?.trim() || null,
      };
      setModalLoading(true);
      if (editingRecord) {
        await DinhMucTieuHaoApi.update(editingRecord.id, payload);
        message.success("Cập nhật định mức thành công");
      } else {
        await DinhMucTieuHaoApi.create(payload);
        message.success("Thêm định mức thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error(getErrorMessage(error, "Không thể lưu định mức"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DinhMucTieuHaoApi.delete(id);
      message.success("Đã xóa định mức");
      const nextPage = data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa định mức");
    }
  };

  const columns = useMemo<ColumnType<DinhMucTieuHaoRow>[]>(() => [
    { title: "BP/NM", dataIndex: "idPB", key: "idPB", width: 120, render: (v: number | null) => tenPhongBan(v) ?? "-" },
    { title: "Xưởng", dataIndex: "idXuong", key: "idXuong", width: 140, render: (v: number | null) => tenXuong(v) ?? "-" },
    { title: "Dây chuyền", dataIndex: "dayChuyen", key: "dayChuyen", width: 110, render: (v: string | null) => v ?? "-" },
    { title: "Báo cáo", dataIndex: "baoCao", key: "baoCao", width: 110, render: (v: string | null) => v ?? "-" },
    { title: "Chỉ tiêu", dataIndex: "chiTieu", key: "chiTieu", width: 180 },
    { title: "ĐVT", dataIndex: "donViTinh", key: "donViTinh", width: 70, render: (v: string | null) => v ?? "-" },
    {
      title: "Định mức",
      children: [
        { title: "Mức SL", dataIndex: "mucSanLuong", key: "mucSanLuong", width: 90, align: "right" as const, render: (v: number | null) => v ?? "-" },
        { title: "ĐK SL", dataIndex: "dieuKienSanLuong", key: "dieuKienSanLuong", width: 80, align: "right" as const, render: (v: number | null) => v ?? "-" },
      ],
    },
    {
      title: "Điều kiện áp dụng",
      children: [
        { title: "Mức LDG", dataIndex: "mucTieuHaoLDG", key: "mucTieuHaoLDG", width: 90, align: "right" as const, render: (v: number | null) => v ?? "-" },
        { title: "ĐK LDG", dataIndex: "dieuKienTieuHaoLDG", key: "dieuKienTieuHaoLDG", width: 80, align: "right" as const, render: (v: number | null) => v ?? "-" },
        { title: "Mức phế", dataIndex: "mucTyLePhe", key: "mucTyLePhe", width: 90, align: "right" as const, render: (v: number | null) => v ?? "-" },
        { title: "ĐK phế", dataIndex: "dieuKienTyLePhe", key: "dieuKienTyLePhe", width: 80, align: "right" as const, render: (v: number | null) => v ?? "-" },
      ],
    },
    {
      title: "Thời gian áp dụng",
      children: [
        { title: "Từ ngày", dataIndex: "tuNgay", key: "tuNgay", width: 100, render: (v: string | null) => v ? dayjs(v).format("DD/MM/YYYY") : "-" },
        { title: "Đến ngày", dataIndex: "denNgay", key: "denNgay", width: 100, render: (v: string | null) => v ? dayjs(v).format("DD/MM/YYYY") : "-" },
      ],
    },
    { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", render: (v: string | null) => v ?? "" },
    {
      title: "Thao tác", key: "actions", width: 120, fixed: "right" as const,
      render: (_: unknown, record: DinhMucTieuHaoRow) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>Sửa</Button>
          <Popconfirm title="Xóa định mức này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data, tenPhongBan, tenXuong]);

  return (
    <div>
      <Card
        title="Định mức tiêu hao sản xuất — Xưởng Đúc phôi vuông"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>Thêm định mức</Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="BP/NM" name="idPB">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả" options={phongBanOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Xưởng" name="idXuong">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả" options={xuongOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label="Báo cáo" name="baoCao">
                <Input allowClear placeholder="Tìm báo cáo..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Chỉ tiêu" name="chiTieu">
                <Input allowClear placeholder="Tìm chỉ tiêu..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label="Ngày áp dụng" name="ngayApDung">
                <DatePicker format="DD/MM/YYYY" placeholder="Lọc theo ngày" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Lọc</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>Xóa lọc</Button>
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
          scroll={{ x: 1600 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            onChange: (page, pageSize) => fetchData(page, pageSize),
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật định mức" : "Thêm định mức"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
        width={760}
      >
        <Form layout="vertical" form={modalForm}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="idPB" label="BP/NM">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn BP/NM" options={phongBanOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idXuong" label="Xưởng">
                <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn xưởng" options={xuongOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="dayChuyen" label="Dây chuyền" rules={[{ max: 100 }]}>
                <Input placeholder="VD: Máy đúc 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="baoCao" label="Báo cáo" rules={[{ max: 100 }]}>
                <Input placeholder="VD: BCSX_DPV" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item
                name="chiTieu"
                label="Chỉ tiêu"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập chỉ tiêu" }, { max: 200 }]}
              >
                <Input placeholder="VD: Tiêu hao điện" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="donViTinh" label="ĐVT" rules={[{ max: 50 }]}>
                <Input placeholder="VD: kWh/t" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12} style={{ background: "#f5f5f5", padding: "8px 0", borderRadius: 4, marginBottom: 8 }}>
            <Col span={24} style={{ paddingLeft: 12, fontWeight: 600, marginBottom: 4 }}>Định mức</Col>
            <Col span={12}>
              <Form.Item name="mucSanLuong" label="Mức — Sản lượng" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dieuKienSanLuong" label="Điều kiện — Sản lượng" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12} style={{ background: "#f0f7ff", padding: "8px 0", borderRadius: 4, marginBottom: 8 }}>
            <Col span={24} style={{ paddingLeft: 12, fontWeight: 600, marginBottom: 4 }}>Điều kiện áp dụng</Col>
            <Col span={12}>
              <Form.Item name="mucTieuHaoLDG" label="Mức — Tiêu hao LDG" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dieuKienTieuHaoLDG" label="Điều kiện — Tiêu hao LDG" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mucTyLePhe" label="Mức — Tỷ lệ phế" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dieuKienTyLePhe" label="Điều kiện — Tỷ lệ phế" style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="khoangThoiGian" label="Thời gian áp dụng (Từ ngày — Đến ngày)">
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DinhMucTieuHao;
