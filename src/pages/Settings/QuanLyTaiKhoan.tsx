import {
  Button,
  Card,
  Col,
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
import {
  CheckCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnType } from "antd/es/table";

interface TaiKhoan {
  id: number;
  maNhanVien: string;
  tenDangNhap: string;
  hoVaTen: string;
  email?: string;
  soDienThoai?: string;
  phongBan: string;
  phanXuong?: string;
  phongBanNS?: string;
  phanXuongNS?: string;
  chucVu: string;
  quyenDangNhap: string;
  phongBanBoSung?: string;
  quyenBoSung?: string;
  phanQuyenXuLyXuong?: string;
  isLocked: boolean;
}

const SAMPLE_DATA: TaiKhoan[] = [
  {
    id: 1,
    maNhanVien: "NV001",
    tenDangNhap: "HPDQ17898",
    hoVaTen: "Huỳnh Trung Phúc",
    email: "phuc@example.com",
    soDienThoai: "0901234567",
    phongBan: "BP. Logistics",
    phanXuong: "Không xưởng",
    phongBanNS: "BP. Logistics",
    phanXuongNS: "Không xưởng",
    chucVu: "Phụ Trách Kho",
    quyenDangNhap: "Nhân viên nhập liệu NM",
    isLocked: true,
  },
  {
    id: 2,
    maNhanVien: "NV002",
    tenDangNhap: "HPDQ34562",
    hoVaTen: "Đỗ Nguyễn Xuân Toàn",
    email: "toan@example.com",
    soDienThoai: "0912345678",
    phongBan: "NM. HRC 1",
    phanXuong: "Xưởng Đúc phôi tấm",
    phongBanNS: "NM. HRC 1",
    phanXuongNS: "Xưởng Đúc phôi tấm",
    chucVu: "Kỹ thuật viên Công nghệ",
    quyenDangNhap: "Nhân viên nhập liệu NM",
    isLocked: false,
  },
  {
    id: 3,
    maNhanVien: "NV003",
    tenDangNhap: "HPDQ35702",
    hoVaTen: "Đoàn Thế Hiếu",
    email: "hieu@example.com",
    soDienThoai: "0923456789",
    phongBan: "NM. HRC 1",
    phanXuong: "Xưởng Đúc phôi tấm",
    phongBanNS: "NM. HRC 1",
    phanXuongNS: "Xưởng Đúc phôi tấm",
    chucVu: "Kỹ thuật viên Công nghệ",
    quyenDangNhap: "Nhân viên nhập liệu NM",
    isLocked: false,
  },
];

const PHONG_BAN_OPTIONS = [
  "BP. Logistics",
  "NM. HRC 1",
  "NM. HRC 2",
  "Phòng Kỹ thuật",
  "Phòng Nhân sự",
];

const PHONG_BAN_XUONG_MAP: Record<string, string> = {
  "BP. Logistics": "Không xưởng",
  "NM. HRC 1": "Xưởng Đúc phôi tấm",
  "NM. HRC 2": "Xưởng Cán nóng",
  "Phòng Kỹ thuật": "Không xưởng",
  "Phòng Nhân sự": "Không xưởng",
};

const CHUC_VU_OPTIONS = [
  "Phụ Trách Kho",
  "Kỹ thuật viên Công nghệ",
  "Trưởng phòng",
  "Nhân viên",
  "Giám đốc",
];

const QUYEN_DANG_NHAP_OPTIONS = [
  "Nhân viên nhập liệu NM",
  "Quản lý xưởng",
  "Quản lý phòng ban",
  "Admin",
  "Kế toán",
];

const QUYEN_BO_SUNG_OPTIONS = [
  "Xem báo cáo",
  "Duyệt phiếu",
  "Xuất Excel",
  "Quản lý tài khoản",
];

const QuanLyTaiKhoan = () => {
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TaiKhoan[]>([]);
  const [searchText, setSearchText] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaiKhoan | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call: const res = await TaiKhoanApi.getAll();
      setData(SAMPLE_DATA);
    } catch {
      message.error("Không thể tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const lower = searchText.toLowerCase();
    return data.filter((item) =>
      [
        item.tenDangNhap,
        item.hoVaTen,
        item.phongBan,
        item.phanXuong,
        item.phongBanNS,
        item.phanXuongNS,
        item.chucVu,
        item.quyenDangNhap,
        item.phongBanBoSung,
        item.quyenBoSung,
        item.phanQuyenXuLyXuong,
        item.isLocked ? "Đã khóa" : "Hoạt động",
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(lower))
    );
  }, [data, searchText]);

  const handleLockToggle = useCallback(async (record: TaiKhoan) => {
    try {
      // TODO: await TaiKhoanApi.toggleLock(record.id);
      setData((prev) =>
        prev.map((item) =>
          item.id === record.id ? { ...item, isLocked: !item.isLocked } : item
        )
      );
      message.success(record.isLocked ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản");
    } catch {
      message.error("Không thể thay đổi trạng thái tài khoản");
    }
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  }, [modalForm]);

  const openEditModal = useCallback(
    (record: TaiKhoan) => {
      setEditingRecord(record);
      modalForm.setFieldsValue({
        maNhanVien: record.maNhanVien,
        hoVaTen: record.hoVaTen,
        email: record.email,
        soDienThoai: record.soDienThoai,
        phongBan: record.phongBan,
        phanXuong: record.phanXuong,
        chucVu: record.chucVu,
        quyenDangNhap: record.quyenDangNhap,
        quyenBoSung: record.quyenBoSung,
        phongBanBoSung: record.phongBanBoSung,
      });
      setModalVisible(true);
    },
    [modalForm]
  );

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    modalForm.resetFields();
    setEditingRecord(null);
  }, [modalForm]);

  const handleSave = useCallback(async () => {
    try {
      const values = await modalForm.validateFields();
      setModalLoading(true);
      if (editingRecord) {
        // TODO: await TaiKhoanApi.update(editingRecord.id, values);
        setData((prev) =>
          prev.map((item) =>
            item.id === editingRecord.id ? { ...item, ...values } : item
          )
        );
        message.success("Cập nhật tài khoản thành công");
      } else {
        // TODO: await TaiKhoanApi.create(values);
        const newItem: TaiKhoan = { ...values, id: Date.now(), isLocked: false };
        setData((prev) => [...prev, newItem]);
        message.success("Thêm tài khoản thành công");
      }
      handleModalCancel();
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error("Không thể lưu tài khoản");
    } finally {
      setModalLoading(false);
    }
  }, [editingRecord, handleModalCancel, modalForm]);

  const selectedPhongBan = Form.useWatch("phongBan", modalForm);

  useEffect(() => {
    if (selectedPhongBan) {
      modalForm.setFieldValue("phanXuong", PHONG_BAN_XUONG_MAP[selectedPhongBan] ?? "");
    }
  }, [selectedPhongBan, modalForm]);

  const columns = useMemo<ColumnType<TaiKhoan>[]>(
    () => [
      {
        title: "STT",
        key: "stt",
        width: 55,
        align: "center",
        render: (_: unknown, __: TaiKhoan, index: number) =>
          (currentPage - 1) * pageSize + index + 1,
      },
      {
        title: "Tên đăng nhập",
        dataIndex: "tenDangNhap",
        key: "tenDangNhap",
        sorter: (a, b) => a.tenDangNhap.localeCompare(b.tenDangNhap),
        width: 140,
      },
      {
        title: "Họ và tên",
        dataIndex: "hoVaTen",
        key: "hoVaTen",
        sorter: (a, b) => a.hoVaTen.localeCompare(b.hoVaTen),
        width: 180,
      },
      {
        title: "Phòng ban",
        dataIndex: "phongBan",
        key: "phongBan",
        sorter: (a, b) => (a.phongBan ?? "").localeCompare(b.phongBan ?? ""),
        width: 140,
      },
      {
        title: "Phân xưởng",
        dataIndex: "phanXuong",
        key: "phanXuong",
        sorter: (a, b) => (a.phanXuong ?? "").localeCompare(b.phanXuong ?? ""),
        width: 160,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Phòng ban NS",
        dataIndex: "phongBanNS",
        key: "phongBanNS",
        sorter: (a, b) => (a.phongBanNS ?? "").localeCompare(b.phongBanNS ?? ""),
        width: 140,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Phân xưởng NS",
        dataIndex: "phanXuongNS",
        key: "phanXuongNS",
        sorter: (a, b) => (a.phanXuongNS ?? "").localeCompare(b.phanXuongNS ?? ""),
        width: 150,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Chức vụ",
        dataIndex: "chucVu",
        key: "chucVu",
        sorter: (a, b) => (a.chucVu ?? "").localeCompare(b.chucVu ?? ""),
        width: 160,
      },
      {
        title: "Quyền đăng nhập",
        dataIndex: "quyenDangNhap",
        key: "quyenDangNhap",
        sorter: (a, b) => (a.quyenDangNhap ?? "").localeCompare(b.quyenDangNhap ?? ""),
        width: 180,
      },
      {
        title: "Phòng ban bổ sung",
        dataIndex: "phongBanBoSung",
        key: "phongBanBoSung",
        sorter: (a, b) => (a.phongBanBoSung ?? "").localeCompare(b.phongBanBoSung ?? ""),
        width: 160,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Quyền bổ sung",
        dataIndex: "quyenBoSung",
        key: "quyenBoSung",
        sorter: (a, b) => (a.quyenBoSung ?? "").localeCompare(b.quyenBoSung ?? ""),
        width: 150,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Phân quyền xử lý xưởng",
        dataIndex: "phanQuyenXuLyXuong",
        key: "phanQuyenXuLyXuong",
        sorter: (a, b) =>
          (a.phanQuyenXuLyXuong ?? "").localeCompare(b.phanQuyenXuLyXuong ?? ""),
        width: 190,
        render: (v?: string) => v ?? "-",
      },
      {
        title: "Tình trạng",
        dataIndex: "isLocked",
        key: "isLocked",
        width: 110,
        align: "center",
        sorter: (a, b) => Number(a.isLocked) - Number(b.isLocked),
        render: (isLocked: boolean) =>
          isLocked ? (
            <Tag color="red">Đã khóa</Tag>
          ) : (
            <span style={{ color: "#52c41a", fontWeight: 500 }}>Hoạt động</span>
          ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 80,
        align: "center",
        fixed: "right",
        render: (_: unknown, record: TaiKhoan) => (
          <Space direction="vertical" size={2} style={{ alignItems: "center" }}>
            <Button
              type="text"
              size="small"
              icon={
                <LockOutlined
                  style={{ color: record.isLocked ? "#ff4d4f" : "#1677ff", fontSize: 16 }}
                />
              }
              onClick={() => handleLockToggle(record)}
              title={record.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
            />
            <Button
              type="text"
              size="small"
              icon={<CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />}
              title="Xác nhận"
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: 16 }} />}
              onClick={() => openEditModal(record)}
              title="Chỉnh sửa"
            />
          </Space>
        ),
      },
    ],
    [currentPage, pageSize, handleLockToggle, openEditModal]
  );

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            color: "#003a8c",
            fontWeight: 700,
            fontSize: 18,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          Danh sách tài khoản
        </h2>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm mới
          </Button>
          <Button icon={<UploadOutlined />}>Import Excel</Button>
          <Button icon={<SyncOutlined />}>Đồng bộ</Button>
          <Button icon={<DownloadOutlined />}>Download Excel</Button>
        </Space>
      </div>

      <Card>
        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Space>
            <span>Hiển thị</span>
            <Select
              value={pageSize}
              onChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
              style={{ width: 80 }}
              options={[10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }))}
            />
            <span>bản ghi</span>
          </Space>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCurrentPage(1);
            }}
            allowClear
            style={{ width: 240 }}
          />
        </div>

        {/* Table */}
        <Table<TaiKhoan>
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1700 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredData.length,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
            onChange: (page) => setCurrentPage(page),
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* Modal Thêm / Chỉnh sửa */}
      <Modal
        title={
          <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {editingRecord ? "Chỉnh sửa thông tin" : "Thêm tài khoản mới"}
          </span>
        }
        open={modalVisible}
        onCancel={handleModalCancel}
        width={720}
        destroyOnClose
        footer={[
          <Button key="confirm" type="primary" loading={modalLoading} onClick={handleSave}>
            Xác nhận
          </Button>,
        ]}
      >
        <Form layout="vertical" form={modalForm} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="maNhanVien"
                label="Mã nhân viên"
                rules={[{ required: true, message: "Vui lòng nhập mã nhân viên" }]}
              >
                <Input
                  disabled={!!editingRecord}
                  placeholder="Nhập mã nhân viên"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="hoVaTen"
                label="Họ và tên"
                rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
              >
                <Input placeholder="Nhập họ và tên" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Nhập email" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="soDienThoai" label="Số điện thoại">
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phongBan"
                label="Phòng ban"
                rules={[{ required: true, message: "Vui lòng chọn phòng ban" }]}
              >
                <Select placeholder="Chọn phòng ban" allowClear>
                  {PHONG_BAN_OPTIONS.map((pb) => (
                    <Select.Option key={pb} value={pb}>
                      {pb}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="phanXuong" label="Phân xưởng">
                <Input readOnly placeholder="Tự động theo phòng ban" style={{ background: "#fafafa" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item
                name="chucVu"
                label="Chức vụ"
                rules={[{ required: true, message: "Vui lòng chọn chức vụ" }]}
              >
                <Select placeholder="Chọn chức vụ" allowClear>
                  {CHUC_VU_OPTIONS.map((cv) => (
                    <Select.Option key={cv} value={cv}>
                      {cv}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item
                name="quyenDangNhap"
                label="Quyền đăng nhập"
                rules={[{ required: true, message: "Vui lòng chọn quyền đăng nhập" }]}
              >
                <Select placeholder="Chọn quyền đăng nhập" allowClear>
                  {QUYEN_DANG_NHAP_OPTIONS.map((q) => (
                    <Select.Option key={q} value={q}>
                      {q}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="quyenBoSung" label="Quyền bổ sung">
                <Select placeholder="Chọn Bộ phận xử lý" allowClear>
                  {QUYEN_BO_SUNG_OPTIONS.map((q) => (
                    <Select.Option key={q} value={q}>
                      {q}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item
                name="phongBanBoSung"
                label={<span style={{ color: "#ff4d4f" }}>Phòng ban bổ sung</span>}
              >
                <Select placeholder="Chọn Bộ phận xử lý" allowClear>
                  {PHONG_BAN_OPTIONS.map((pb) => (
                    <Select.Option key={pb} value={pb}>
                      {pb}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyTaiKhoan;
