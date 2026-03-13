import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Row,
  Col,
  Input,
  Alert,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { BmQuyenXlApi } from "../../services/BmQuyenXlApi";
import { TaiKhoanApi } from "../../services/TaiKhoanService";
import bmQuyenConfig from "../../utils/configs/bmQuyenConfig.json";
import {
  isAdminUser,
  canManagePermissions,
} from "../../utils/helpers/checkAdminRole";

/** 1 = Xử lý, 2 = Phê duyệt, 3 = Chốt, 4 = Xử lý + Phê duyệt */
const QUYEN_CHUC_NANG_OPTIONS = [
  { value: 1, label: "Xử lý (Việc tôi bắt đầu)" },
  { value: 2, label: "Phê duyệt (Việc đến tôi)" },
  { value: 3, label: "Chốt" },
  { value: 4, label: "Xử lý + Phê duyệt" },
];

const PhanQuyenBieuMau = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{ id: number; idTaiKhoan: number; maBm: string; maKhuVuc: string; quyenChucNang?: number } | null>(null);
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filter states
  const [filterTaiKhoan, setFilterTaiKhoan] = useState<number | undefined>();
  const [filterBieuMau, setFilterBieuMau] = useState<string | undefined>();
  const [filterKhuVuc, setFilterKhuVuc] = useState<string | undefined>();

  // Check quyền admin
  useEffect(() => {
    const userStr = localStorage.getItem("userinfo");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);

      //   if (!canManagePermissions(user)) {
      //     message.error("Bạn không có quyền truy cập trang này");
      //   }
    }
  }, []);

  // Load danh sách quyền
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await BmQuyenXlApi.getAll();
      // Đảm bảo res là array
      const dataList = Array.isArray(res) ? res : (res as any)?.data || [];
      setDataSource(dataList);
    } catch (error) {
      console.error("Error loading permissions:", error);
      message.error("Không thể tải dữ liệu phân quyền");
      setDataSource([]); // Set empty array để tránh lỗi
    } finally {
      setLoading(false);
    }
  };

  // Load danh sách user
  const loadUsers = async () => {
    try {
      const res = await TaiKhoanApi.getData();
      // Đảm bảo res là array, nếu không thì lấy từ property data hoặc users
      const userList = Array.isArray(res) ? res : res?.data || [];
      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
      message.error("Không thể tải danh sách tài khoản");
      setUsers([]); // Set empty array để tránh lỗi map
    }
  };

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  // Thêm quyền mới
  const handleAdd = async (values: any) => {
    if (!isAdminUser(currentUser)) {
      message.error("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      await BmQuyenXlApi.create({
        idTaiKhoan: values.idTaiKhoan,
        maBm: values.maBm,
        maKhuVuc: values.maKhuVuc,
        quyenChucNang: values.quyenChucNang ?? 1,
      });
      message.success("Thêm quyền thành công");
      setModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error("Không thể thêm quyền");
    }
  };

  // Cập nhật quyền
  const handleUpdate = async (values: any) => {
    if (!editingRecord || !isAdminUser(currentUser)) {
      message.error("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      await BmQuyenXlApi.update(editingRecord.id, {
        idTaiKhoan: values.idTaiKhoan,
        maBm: values.maBm,
        maKhuVuc: values.maKhuVuc,
        quyenChucNang: values.quyenChucNang ?? 1,
      });
      message.success("Cập nhật quyền thành công");
      setModalOpen(false);
      setEditingRecord(null);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error("Không thể cập nhật quyền");
    }
  };

  const handleEdit = (record: { id: number; idTaiKhoan?: number; IdTaiKhoan?: number; maBm: string; maKhuVuc: string; quyenChucNang?: number }) => {
    const idTaiKhoan = record.idTaiKhoan ?? record.IdTaiKhoan ?? 0;
    setEditingRecord({ id: record.id, idTaiKhoan, maBm: record.maBm, maKhuVuc: record.maKhuVuc, quyenChucNang: record.quyenChucNang });
    form.setFieldsValue({
      idTaiKhoan,
      maBm: record.maBm,
      maKhuVuc: record.maKhuVuc,
      quyenChucNang: record.quyenChucNang ?? 1,
    });
    setModalOpen(true);
  };

  // Xóa quyền
  const handleDelete = async (id: number) => {
    if (!isAdminUser(currentUser)) {
      message.error("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    try {
      await BmQuyenXlApi.delete(id);
      message.success("Xóa quyền thành công");
      loadData();
    } catch (error) {
      message.error("Không thể xóa quyền");
    }
  };

  // Lấy tên biểu mẫu từ mã
  const getBmName = (maBm: string) => {
    const bm = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
    return bm ? bm.tenBm : maBm;
  };

  // Lấy tên khu vực từ mã
  const getKhuVucName = (maKhuVuc: string) => {
    const kv = bmQuyenConfig.danhSachKhuVuc.find(
      (k) => k.maKhuVuc === maKhuVuc
    );
    return kv ? kv.tenKhuVuc : maKhuVuc;
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Tài khoản",
      dataIndex: "idTaiKhoan",
      key: "idTaiKhoan",
      width: 200,
      render: (idTaiKhoan: number) => {
        const user = users.find((u) => u.iD_TaiKhoan === idTaiKhoan);
        return user ? `${user.tenTaiKhoan} - ${user.hoVaTen}` : idTaiKhoan;
      },
    },
    {
      title: "Mã biểu mẫu",
      dataIndex: "maBm",
      key: "maBm",
      width: 200,
      render: (maBm: string) => <Tag color="blue">{maBm}</Tag>,
    },
    {
      title: "Tên biểu mẫu",
      dataIndex: "maBm",
      key: "tenBm",
      render: (maBm: string) => getBmName(maBm),
    },
    {
      title: "Khu vực",
      dataIndex: "maKhuVuc",
      key: "maKhuVuc",
      width: 150,
      render: (maKhuVuc: string) => (
        <Tag color="green">{getKhuVucName(maKhuVuc)}</Tag>
      ),
    },
    {
      title: "Quyền xử lý",
      dataIndex: "quyenChucNang",
      key: "quyenChucNang",
      width: 180,
      render: (q: number | null | undefined) => {
        const opt = QUYEN_CHUC_NANG_OPTIONS.find((o) => o.value === q);
        if (q == null) return <Tag color="default">Xử lý (mặc định)</Tag>;
        let color: string = "blue";
        if (q === 2) color = "orange";
        else if (q === 3) color = "green";
        else if (q === 4) color = "purple";
        return <Tag color={color}>{opt?.label ?? q}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "ngayTao",
      key: "ngayTao",
      width: 150,
      render: (date: string) =>
        date ? new Date(date).toLocaleString("vi-VN") : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa quyền này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Filtered data based on filters
  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      if (filterTaiKhoan && item.idTaiKhoan !== filterTaiKhoan) return false;
      if (filterBieuMau && item.maBm !== filterBieuMau) return false;
      if (filterKhuVuc && item.maKhuVuc !== filterKhuVuc) return false;
      return true;
    });
  }, [dataSource, filterTaiKhoan, filterBieuMau, filterKhuVuc]);

  // Clear all filters
  const handleClearFilter = () => {
    setFilterTaiKhoan(undefined);
    setFilterBieuMau(undefined);
    setFilterKhuVuc(undefined);
  };

  // Nếu không phải admin, hiển thị thông báo
  //   if (!currentUser || !canManagePermissions(currentUser)) {
  //     return (
  //       <div style={{ padding: 24 }}>
  //         <Alert
  //           message="Không có quyền truy cập"
  //           description="Bạn không có quyền quản lý phân quyền biểu mẫu. Chỉ các phòng ban PKH, IT, ADMIN mới có quyền này."
  //           type="error"
  //           showIcon
  //         />
  //       </div>
  //     );
  //   }

  return (
    <div style={{ padding: 24 }}>
      {/* Filter Card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo tài khoản"
              allowClear
              style={{ width: "100%" }}
              value={filterTaiKhoan}
              onChange={setFilterTaiKhoan}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={(users || []).map((u) => ({
                value: u.iD_TaiKhoan,
                label: `${u.tenTaiKhoan} - ${u.hoVaTen}`,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo biểu mẫu"
              allowClear
              style={{ width: "100%" }}
              value={filterBieuMau}
              onChange={setFilterBieuMau}
              showSearch
              optionFilterProp="children"
              options={bmQuyenConfig.danhSachBieuMau.map((bm) => ({
                value: bm.maBm,
                label: `[${bm.nhom}] ${bm.tenBm}`,
              }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo khu vực"
              allowClear
              style={{ width: "100%" }}
              value={filterKhuVuc}
              onChange={setFilterKhuVuc}
              options={bmQuyenConfig.danhSachKhuVuc.map((kv) => ({
                value: kv.maKhuVuc,
                label: `[${kv.nhom}] ${kv.tenKhuVuc}`,
              }))}
            />
          </Col>
          <Col>
            <Button onClick={handleClearFilter}>Xóa bộ lọc</Button>
          </Col>
        </Row>
      </Card>

      <Card
        title="Phân quyền xử lý biểu mẫu"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRecord(null);
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Thêm quyền
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={Array.isArray(filteredData) ? filteredData : []}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Tổng: ${total} quyền`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật quyền xử lý" : "Thêm quyền xử lý"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingRecord(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingRecord ? "Cập nhật" : "Thêm"}
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingRecord ? handleUpdate : handleAdd}
        >
          <Form.Item
            name="idTaiKhoan"
            label="Tài khoản"
            rules={[{ required: true, message: "Vui lòng chọn tài khoản" }]}
          >
            <Select
              showSearch
              placeholder="Chọn tài khoản"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={(users || []).map((u) => ({
                value: u.iD_TaiKhoan,
                label: `${u.tenTaiKhoan} - ${u.hoVaTen}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="maBm"
            label="Biểu mẫu"
            rules={[{ required: true, message: "Vui lòng chọn biểu mẫu" }]}
          >
            <Select
              showSearch
              placeholder="Chọn biểu mẫu"
              optionFilterProp="children"
              options={bmQuyenConfig.danhSachBieuMau.map((bm) => ({
                value: bm.maBm,
                label: `[${bm.nhom}] ${bm.tenBm}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="maKhuVuc"
            label="Khu vực"
            rules={[{ required: true, message: "Vui lòng chọn khu vực" }]}
          >
            <Select
              placeholder="Chọn khu vực"
              options={bmQuyenConfig.danhSachKhuVuc.map((kv) => ({
                value: kv.maKhuVuc,
                label: `[${kv.nhom}] ${kv.tenKhuVuc}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quyenChucNang"
            label="Quyền xử lý"
            initialValue={1}
            rules={[{ required: true, message: "Vui lòng chọn quyền xử lý" }]}
          >
            <Select
              placeholder="Chọn quyền (Xử lý / Phê duyệt / Chốt)"
              options={QUYEN_CHUC_NANG_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhanQuyenBieuMau;
