import { Button, Card, Form, Input, InputNumber, Modal, Space, Switch, Table, Tag, message } from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { ColumnType } from "antd/es/table";
import { Hrc1PhuLieuNmServiceApi,
  type Hrc1PhuLieuNm,
  type Hrc1PhuLieuNmPayload } from "../../../services/Hrc1PhuLieuNmServiceApi";


const PhuLieuHRC1 = () => {
  const [modalForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Hrc1PhuLieuNm[]>([]);
  const [searchKey, setSearchKey] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Hrc1PhuLieuNm | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchData = async (appliedSearchKey = searchKey) => {
    setLoading(true);
    try {
      const res = await Hrc1PhuLieuNmServiceApi.getAll({
        searchKey: appliedSearchKey.trim() || undefined,
      });
      setData(res);
    } catch {
      message.error("Không thể tải danh sách phụ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => fetchData(searchKey);

  const handleReset = () => {
    setSearchKey("");
    fetchData("");
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: Hrc1PhuLieuNm) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({
      tenPhuLieu: record.tenPhuLieu,
      thuTu: record.thuTu ?? null,
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
      const payload: Hrc1PhuLieuNmPayload = {
        tenPhuLieu: values.tenPhuLieu.trim(),
        thuTu: values.thuTu ?? null,
      };
      setModalLoading(true);
      if (editingRecord) {
        await Hrc1PhuLieuNmServiceApi.update(editingRecord.id, payload);
        message.success("Cập nhật phụ liệu thành công");
      } else {
        await Hrc1PhuLieuNmServiceApi.create(payload);
        message.success("Thêm phụ liệu thành công");
      }
      handleModalCancel();
      fetchData();
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error(error instanceof Error ? error.message : "Không thể lưu phụ liệu");
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleXacNhan = async (record: Hrc1PhuLieuNm) => {
    setTogglingId(record.id);
    const prev = record.dangSuDung;
    setData((d) => d.map((r) => (r.id === record.id ? { ...r, dangSuDung: !prev } : r)));
    try {
      const res = await Hrc1PhuLieuNmServiceApi.toggleXacNhan(record.id);
      setData((d) => d.map((r) => (r.id === record.id ? { ...r, dangSuDung: res.dangSuDung } : r)));
    } catch {
      setData((d) => d.map((r) => (r.id === record.id ? { ...r, dangSuDung: prev } : r)));
      message.error("Không thể cập nhật trạng thái sử dụng");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo<ColumnType<Hrc1PhuLieuNm>[]>(
    () => [
      {
        title: "Thứ tự",
        dataIndex: "thuTu",
        key: "thuTu",
        width: 90,
        align: "center",
        sorter: (a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0),
        render: (v?: number | null) => v ?? "-",
      },
      {
        title: "Tên phụ liệu",
        dataIndex: "tenPhuLieu",
        key: "tenPhuLieu",
        sorter: (a, b) => a.tenPhuLieu.localeCompare(b.tenPhuLieu),
      },
      {
        title: "Cột nguồn NM",
        dataIndex: "tenPhuLieuNM",
        key: "tenPhuLieuNM",
        width: 160,
        render: (v?: string | null) => (v ? <Tag color="blue">{v}</Tag> : "-"),
      },
      {
        title: "Nguồn",
        dataIndex: "isNM",
        key: "isNM",
        width: 130,
        align: "center",
        render: (v: boolean) => (v ? <Tag color="green">Tự động (NM)</Tag> : <Tag>Thêm tay</Tag>),
      },
      {
        title: "Xác nhận sử dụng",
        dataIndex: "dangSuDung",
        key: "dangSuDung",
        width: 150,
        align: "center",
        render: (v: boolean, record: Hrc1PhuLieuNm) => (
          <Switch
            checked={v === true}
            loading={togglingId === record.id}
            onChange={() => void handleToggleXacNhan(record)}
            checkedChildren="Đang dùng"
            unCheckedChildren="Ngừng dùng"
          />
        ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 100,
        align: "center",
        render: (_: unknown, record: Hrc1PhuLieuNm) => (
          <Space>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>
          </Space>
        ),
      },
    ],
    [togglingId]
  );

  return (
    <div>
      <Card
        title="Quản lý phụ liệu HRC1 (Lò thổi BOF)"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm phụ liệu
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Space>
          <Input
            placeholder="Tìm theo tên phụ liệu..."
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
            style={{ width: 260 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Lọc
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Xóa lọc
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật phụ liệu" : "Thêm phụ liệu"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Form.Item
            name="tenPhuLieu"
            label="Tên phụ liệu"
            rules={[
              { required: true, message: "Vui lòng nhập tên phụ liệu" },
              { max: 100, message: "Tối đa 100 ký tự" },
              { whitespace: true, message: "Không được chỉ có khoảng trắng" },
            ]}
          >
            <Input placeholder="Nhập tên phụ liệu" />
          </Form.Item>
          <Form.Item name="thuTu" label="Thứ tự hiển thị">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="Số thứ tự hiển thị trên biểu mẫu" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PhuLieuHRC1;
