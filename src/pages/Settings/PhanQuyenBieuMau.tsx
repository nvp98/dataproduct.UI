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
  SearchOutlined,
} from "@ant-design/icons";
import { BmQuyenXlApi } from "../../services/BmQuyenXlApi";
import { TaiKhoanApi } from "../../services/TaiKhoanService";
import bmQuyenConfig from "../../utils/configs/bmQuyenConfig.json";
import {
  isAdminUser,
  canManagePermissions,
} from "../../utils/helpers/checkAdminRole";

const PhanQuyenBieuMau = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
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
      });
      message.success("Thêm quyền thành công");
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error("Không thể thêm quyền");
    }
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
      width: 100,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Bạn có chắc chắn muốn xóa quyền này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
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
            onClick={() => setModalOpen(true)}
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
        title="Thêm quyền xử lý"
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Thêm"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
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
        </Form>
      </Modal>
    </div>
  );
};

export default PhanQuyenBieuMau;
