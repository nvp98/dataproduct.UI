import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { ColumnType } from "antd/es/table";
import { DongLucApi } from "../../../services/DongLucApi";
import type { TagDongLuc, TagDongLucPayload } from "../../../services/DongLucApi";

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string })?.message ?? fallback;

const QuanLyTagDongLuc = () => {
  const [searchForm] = Form.useForm();
  const [modalForm] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TagDongLuc[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TagDongLuc | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const values = searchForm.getFieldsValue();
      setData(
        await DongLucApi.getTags({
          maXuong: values.maXuong?.trim() || undefined,
          tinhTrang: values.tinhTrang ?? undefined,
          searchKey: values.searchKey?.trim() || undefined,
        })
      );
    } catch {
      message.error("Không thể tải danh mục tag động lực");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    searchForm.resetFields();
    fetchData();
  };

  const toPayload = (r: TagDongLuc): TagDongLucPayload => ({
    tagIDEMS: r.tagIDEMS,
    maHeader: r.maHeader,
    yNghia: r.yNghia ?? null,
    maXuong: r.maXuong,
    tinhTrang: r.tinhTrang,
    thuTu: r.thuTu,
  });

  const openCreateModal = () => {
    setEditingRecord(null);
    modalForm.resetFields();
    modalForm.setFieldsValue({ tinhTrang: true, thuTu: data.length + 1 });
    setModalVisible(true);
  };

  const openEditModal = (record: TagDongLuc) => {
    setEditingRecord(record);
    modalForm.setFieldsValue({ ...toPayload(record), yNghia: record.yNghia ?? undefined, tinhTrang: record.tinhTrang === 1 });
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
      const payload: TagDongLucPayload = {
        tagIDEMS: values.tagIDEMS.trim(),
        maHeader: values.maHeader.trim(),
        yNghia: values.yNghia?.trim() || null,
        maXuong: values.maXuong.trim().toUpperCase(),
        tinhTrang: values.tinhTrang ? 1 : 0,
        thuTu: values.thuTu ?? 0,
      };
      setModalLoading(true);
      if (editingRecord) {
        await DongLucApi.updateTag(editingRecord.id, payload);
        message.success("Cập nhật tag thành công");
      } else {
        await DongLucApi.createTag(payload);
        message.success("Thêm tag thành công");
      }
      handleModalCancel();
      fetchData();
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "errorFields" in error) return;
      message.error(getErrorMessage(error, "Không thể lưu tag"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleTinhTrang = async (record: TagDongLuc, checked: boolean) => {
    try {
      await DongLucApi.updateTag(record.id, { ...toPayload(record), tinhTrang: checked ? 1 : 0 });
      fetchData();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không thể đổi tình trạng"));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await DongLucApi.deleteTag(id);
      message.success("Đã xóa tag");
      fetchData();
    } catch {
      message.error("Không thể xóa tag");
    }
  };

  const columns = useMemo(
    () => [
      { title: "Mã xưởng", dataIndex: "maXuong", key: "maXuong", width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
      { title: "STT", dataIndex: "thuTu", key: "thuTu", width: 70, align: "center" as const },
      { title: "TagID EMS", dataIndex: "tagIDEMS", key: "tagIDEMS", width: 120, render: (v: string) => <strong>{v}</strong> },
      { title: "Mã header", dataIndex: "maHeader", key: "maHeader", width: 180 },
      { title: "Ý nghĩa", dataIndex: "yNghia", key: "yNghia", render: (v: string | null) => v ?? "" },
      {
        title: "Tình trạng",
        dataIndex: "tinhTrang",
        key: "tinhTrang",
        width: 130,
        render: (v: number, r: TagDongLuc) => (
          <Switch
            checked={v === 1}
            checkedChildren="Đang kéo"
            unCheckedChildren="Ngưng"
            onChange={(checked) => handleToggleTinhTrang(r, checked)}
          />
        ),
      },
      {
        title: "Cập nhật",
        key: "capNhat",
        width: 150,
        render: (_: unknown, r: TagDongLuc) => {
          const nguoi = r.nguoiCapNhat ?? r.nguoiTao;
          const ngay = r.ngayCapNhat ?? r.ngayTao;
          return (
            <span style={{ fontSize: 12 }}>
              {nguoi ?? ""}
              <br />
              {ngay ? dayjs(ngay).format("DD/MM/YYYY HH:mm") : ""}
            </span>
          );
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        render: (_: unknown, record: TagDongLuc) => (
          <Space>
            <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            <Popconfirm
              title="Xóa tag khỏi danh mục?"
              description="Dữ liệu đã kéo về của tag vẫn được giữ."
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
    [data]
  );

  return (
    <div>
      <Card
        title="Danh mục tag Động lực (EMS)"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm tag
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Form form={searchForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={4}>
              <Form.Item label="Mã xưởng" name="maXuong">
                <Input placeholder="VD: DPV" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Tình trạng" name="tinhTrang">
                <Select
                  allowClear
                  placeholder="Tất cả"
                  options={[
                    { value: 1, label: "Đang kéo" },
                    { value: 0, label: "Ngưng" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Tìm kiếm" name="searchKey">
                <Input placeholder="TagID, mã header, ý nghĩa..." allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} md={6} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={fetchData}>
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
          columns={columns as unknown as ColumnType<TagDongLuc>[]}
          dataSource={data}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật tag" : "Thêm tag"}
        open={modalVisible}
        onCancel={handleModalCancel}
        onOk={handleSave}
        confirmLoading={modalLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={modalForm}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="tagIDEMS"
                label="TagID EMS"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập TagID" }, { max: 50 }]}
              >
                <Input placeholder="VD: 5467" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maXuong"
                label="Mã xưởng"
                rules={[{ required: true, whitespace: true, message: "Vui lòng nhập mã xưởng" }, { max: 20 }]}
              >
                <Input placeholder="VD: DPV" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="maHeader"
            label="Mã header"
            tooltip="Mã báo cáo dùng để đọc giá trị, vd DPV_DienKhi"
            rules={[{ required: true, whitespace: true, message: "Vui lòng nhập mã header" }, { max: 50 }]}
          >
            <Input placeholder="VD: DPV_DienKhi" />
          </Form.Item>
          <Form.Item name="yNghia" label="Ý nghĩa" rules={[{ max: 200 }]}>
            <Input placeholder="VD: Điện khí PX.ĐPV" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="thuTu" label="Thứ tự">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tinhTrang" label="Tình trạng" valuePropName="checked">
                <Switch checkedChildren="Đang kéo" unCheckedChildren="Ngưng" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default QuanLyTagDongLuc;
