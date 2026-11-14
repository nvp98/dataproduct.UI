import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  Tag,
  Tooltip,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import type { ColumnType } from "antd/es/table";
import { DPVLenhSanXuatApi, TIEN_TO_LSX } from "../../../services/DPVLenhSanXuatApi";
import type { DPVLenhSanXuat, DPVLenhSanXuatPayload } from "../../../services/DPVLenhSanXuatApi";
import { useDanhMucMasterOptions } from "../../../hooks/useDanhMucMasterOptions";

type FilterState = {
  mac?: string;
  kichThuoc?: string;
  mayDuc?: number;
  searchKey?: string;
  chiCanhBao?: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string })?.message ?? fallback;

const QuanLyLenhSanXuat = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();
  const [sinhForm] = Form.useForm();
  const { phongBanOptions, xuongOptions, xuongOptionsTheoPB, tenPhongBan, tenXuong } = useDanhMucMasterOptions();
  const sinhIdPB: number | undefined = Form.useWatch("idPB", sinhForm);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DPVLenhSanXuat[]>([]);
  const [canhBao, setCanhBao] = useState({ soTrungLSX: 0, soChuaCoMaLenh: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState<FilterState>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DPVLenhSanXuat | null>(null);

  const [sinhVisible, setSinhVisible] = useState(false);
  const [sinhLoading, setSinhLoading] = useState(false);

  const fetchData = async (
    page = pagination.current,
    pageSize = pagination.pageSize,
    appliedFilters: FilterState = filters
  ) => {
    setLoading(true);
    try {
      const res = await DPVLenhSanXuatApi.search({ ...appliedFilters, page, pageSize });
      setData(res.data);
      setCanhBao({ soTrungLSX: res.soTrungLSX, soChuaCoMaLenh: res.soChuaCoMaLenh });
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setFilters(appliedFilters);
    } catch {
      message.error("Không thể tải danh sách Lệnh sản xuất");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    fetchData(1, pagination.pageSize, {
      mac: values.mac?.trim() || undefined,
      kichThuoc: values.kichThuoc?.trim() || undefined,
      mayDuc: values.mayDuc ?? undefined,
      searchKey: values.searchKey?.trim() || undefined,
      chiCanhBao: values.chiCanhBao || undefined,
    });
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData(1, pagination.pageSize, {});
  };

  // ── Thêm / sửa ──────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: DPVLenhSanXuat) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      idPB: record.idPB ?? undefined,
      idXuong: record.idXuong ?? undefined,
      mac: record.mac,
      kichThuoc: record.kichThuoc,
      mayDuc: record.mayDuc,
      maLenh: record.maLenh ?? undefined,
      ghiChu: record.ghiChu ?? undefined,
    });
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    modalForm.resetFields();
    setEditingRecord(null);
  };

  const handleSave = async () => {
    try {
      const values = await modalForm.validateFields();
      const payload: DPVLenhSanXuatPayload = {
        idPB: values.idPB ?? null,
        idXuong: values.idXuong ?? null,
        mac: values.mac.trim(),
        kichThuoc: values.kichThuoc.trim(),
        mayDuc: values.mayDuc,
        maLenh: values.maLenh?.trim() || null,
        ghiChu: values.ghiChu?.trim() || null,
      };
      setModalLoading(true);
      if (editingRecord) {
        await DPVLenhSanXuatApi.update(editingRecord.id, payload);
        message.success("Cập nhật Lệnh sản xuất thành công");
      } else {
        await DPVLenhSanXuatApi.create(payload);
        message.success("Thêm Lệnh sản xuất thành công");
      }
      handleModalCancel();
      fetchData(editingRecord ? pagination.current : 1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error(getErrorMessage(error, "Không thể lưu Lệnh sản xuất"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DPVLenhSanXuatApi.delete(id);
      message.success("Đã xóa Lệnh sản xuất");
      const nextPage = data.length === 1 && pagination.current > 1 ? pagination.current - 1 : pagination.current;
      fetchData(nextPage, pagination.pageSize);
    } catch {
      message.error("Không thể xóa Lệnh sản xuất");
    }
  };

  // ── Sinh từ dữ liệu mẻ ──────────────────────────────────────────────────────
  const openSinhModal = () => {
    sinhForm.resetFields();
    sinhForm.setFieldsValue({ khoangNgay: [dayjs().startOf("month"), dayjs()] });
    setSinhVisible(true);
  };

  const handleSinh = async () => {
    try {
      const values = await sinhForm.validateFields();
      const [tuNgay, denNgay]: [Dayjs, Dayjs] = values.khoangNgay;
      setSinhLoading(true);
      const res = await DPVLenhSanXuatApi.sinhTuDuLieuMe({
        tuNgay: tuNgay.format("YYYY-MM-DD"),
        denNgay: denNgay.format("YYYY-MM-DD"),
        idPB: values.idPB ?? null,
        idXuong: values.idXuong ?? null,
      });
      Modal.info({
        title: `Quét dữ liệu mẻ ${tuNgay.format("DD/MM/YYYY")} – ${denNgay.format("DD/MM/YYYY")}`,
        content: (
          <div>
            <p>Tổ hợp (Mác, KT, Máy đúc) trong dữ liệu mẻ: <strong>{res.tongToHop}</strong></p>
            <p>Đã có trong danh mục: <strong>{res.daCo}</strong></p>
            <p style={{ color: "#52c41a" }}>Thêm mới: <strong>{res.themMoi}</strong></p>
            {res.themMoi > 0 && (
              <p style={{ color: "#faad14" }}>Các LSX mới chưa có mã lệnh — vui lòng nhập bổ sung.</p>
            )}
          </div>
        ),
      });
      setSinhVisible(false);
      fetchData(1, pagination.pageSize);
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error(getErrorMessage(error, "Không thể sinh Lệnh sản xuất"));
    } finally {
      setSinhLoading(false);
    }
  };

  const modalMaLenh: string | undefined = Form.useWatch("maLenh", modalForm);

  const columns = useMemo(
    () => [
      {
        title: "BP/NM",
        dataIndex: "idPB",
        key: "idPB",
        width: 120,
        render: (v: number | null) => tenPhongBan(v) ?? "-",
      },
      {
        title: "Xưởng",
        dataIndex: "idXuong",
        key: "idXuong",
        width: 160,
        render: (v: number | null) => tenXuong(v) ?? "-",
      },
      { title: "Mác", dataIndex: "mac", key: "mac", width: 130 },
      { title: "Kích thước", dataIndex: "kichThuoc", key: "kichThuoc", width: 150 },
      { title: "Máy đúc", dataIndex: "mayDuc", key: "mayDuc", width: 90, align: "center" as const },
      {
        title: "Mã lệnh",
        dataIndex: "maLenh",
        key: "maLenh",
        width: 100,
        render: (v: string | null) => v ?? <Tag color="warning">Chưa nhập</Tag>,
      },
      {
        title: "Lệnh sản xuất",
        dataIndex: "lenhSanXuat",
        key: "lenhSanXuat",
        width: 150,
        render: (v: string | null, r: DPVLenhSanXuat) =>
          !v ? "-" : r.trungLSX ? (
            <Tooltip title="LSX này đang dùng cho nhiều tổ hợp (Mác, KT, Máy đúc)">
              <Tag color="error" icon={<WarningOutlined />}>{v}</Tag>
            </Tooltip>
          ) : (
            <strong>{v}</strong>
          ),
      },
      {
        title: "Ghi chú",
        dataIndex: "ghiChu",
        key: "ghiChu",
        render: (v: string | null) => v ?? "",
      },
      {
        title: "Cập nhật",
        key: "capNhat",
        width: 150,
        render: (_: unknown, r: DPVLenhSanXuat) => {
          const nguoi = r.nguoiCapNhat ?? r.nguoiTao;
          const ngay = r.ngayCapNhat ?? r.ngayTao;
          return nguoi || ngay ? (
            <span style={{ fontSize: 12 }}>
              {nguoi ?? ""}
              <br />
              {ngay ? dayjs(ngay).format("DD/MM/YYYY HH:mm") : ""}
            </span>
          ) : "-";
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        fixed: "right" as const,
        render: (_: unknown, record: DPVLenhSanXuat) => (
          <Space>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa Lệnh sản xuất này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button size="small" type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, tenPhongBan, tenXuong]
  );

  return (
    <div>
      <Card
        title="Quản lý Lệnh sản xuất – Xưởng Đúc phôi vuông (NM.HRC1)"
        extra={
          <Space>
            <Button icon={<ThunderboltOutlined />} onClick={openSinhModal}>
              Sinh từ dữ liệu mẻ
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm LSX
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Mác" name="mac">
                <Input placeholder="Mác thép..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Kích thước" name="kichThuoc">
                <Input placeholder="Kích thước..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item label="Máy đúc" name="mayDuc">
                <InputNumber min={1} placeholder="Số máy" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Mã lệnh / LSX" name="searchKey">
                <Input placeholder="Tìm mã lệnh, LSX..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={5} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space wrap>
                <Form.Item name="chiCanhBao" valuePropName="checked" noStyle>
                  <Checkbox>Chỉ dòng cảnh báo</Checkbox>
                </Form.Item>
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

      {(canhBao.soTrungLSX > 0 || canhBao.soChuaCoMaLenh > 0) && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <span>
              {canhBao.soTrungLSX > 0 && <>{canhBao.soTrungLSX} dòng trùng LSX. </>}
              {canhBao.soChuaCoMaLenh > 0 && <>{canhBao.soChuaCoMaLenh} dòng chưa có mã lệnh.</>}
            </span>
          }
        />
      )}

      <Card>
        <Table
          columns={columns as unknown as ColumnType<DPVLenhSanXuat>[]}
          dataSource={data}
          loading={loading}
          rowKey="id"
          size="small"
          scroll={{ x: 1300 }}
          onRow={(r) => ({
            style: r.trungLSX ? { background: "#fff1f0" } : r.chuaCoMaLenh ? { background: "#fffbe6" } : undefined,
          })}
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

      {/* Modal thêm/sửa */}
      <Modal
        title={editingRecord ? "Cập nhật Lệnh sản xuất" : "Thêm Lệnh sản xuất"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
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
            <Col span={9}>
              <Form.Item
                name="mac"
                label="Mác"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập mác" }, { max: 100 }]}
              >
                <Input placeholder="VD: CT5" />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item
                name="kichThuoc"
                label="Kích thước"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập kích thước" }, { max: 100 }]}
              >
                <Input placeholder="VD: 165x165x11700" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="mayDuc" label="Máy đúc" rules={[{ required: true, message: "Nhập máy đúc" }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="maLenh"
            label="Mã lệnh"
            rules={[{ pattern: /^\d{1,14}$/, message: "Mã lệnh chỉ gồm chữ số" }]}
            extra={modalMaLenh ? <>Lệnh sản xuất: <strong>{TIEN_TO_LSX + modalMaLenh.trim()}</strong></> : undefined}
          >
            <Input addonBefore={TIEN_TO_LSX} placeholder="VD: 3861" />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú" rules={[{ max: 500 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal sinh từ dữ liệu mẻ */}
      <Modal
        title="Sinh Lệnh sản xuất từ dữ liệu mẻ"
        open={sinhVisible}
        onCancel={() => setSinhVisible(false)}
        onOk={handleSinh}
        okText="Sinh LSX"
        confirmLoading={sinhLoading}
        destroyOnClose
      >
        <p style={{ color: "#8c8c8c" }}>
          Quét các tổ hợp (Mác, Kích thước, Máy đúc) có trong dữ liệu mẻ của khoảng ngày và thêm vào danh mục
          những tổ hợp chưa có. LSX mới chưa có mã lệnh, cần nhập bổ sung.
        </p>
        <Form layout="vertical" form={sinhForm}>
          <Form.Item name="khoangNgay" label="Khoảng ngày dữ liệu mẻ" rules={[{ required: true, message: "Vui lòng chọn khoảng ngày" }]}>
            <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="idPB" label="BP/NM gán cho LSX mới">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Chọn BP/NM"
              options={phongBanOptions}
              onChange={() => sinhForm.setFieldValue("idXuong", undefined)}
            />
          </Form.Item>
          <Form.Item name="idXuong" label="Xưởng gán cho LSX mới">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={sinhIdPB != null ? "Chọn xưởng thuộc BP/NM" : "Chọn xưởng"}
              options={xuongOptionsTheoPB(sinhIdPB)}
              notFoundContent="BP/NM này không có xưởng đang hoạt động"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyLenhSanXuat;
