/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { siLoLGApi } from "../services/NMLGService";
import { PhieuApi } from "../services/PhieuApi";

interface SiLoItem {
  id: number;
  iD_LoCao: number;
  tenSiLo: string;
  thuTu: number;
  tenNL: string | null;
  tenNL_DieuChinh: string | null;
}

interface LoCaoItem {
  id: number;
  tenLoCao: string;
}

const SiLoLG = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState<SiLoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SiLoItem | null>(null);
  const [loCaoOptions, setLoCaoOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [filterLoCao, setFilterLoCao] = useState<number | null>(null);

  const loadLoCao = useCallback(async () => {
    try {
      const res = await PhieuApi.getDsLoCao();
      const options = (Array.isArray(res) ? res : [])
        .map((item: LoCaoItem) => ({ label: item.tenLoCao, value: item.id }))
        .filter((item) => Number.isFinite(item.value));
      setLoCaoOptions(options);
    } catch {
      setLoCaoOptions([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siLoLGApi.getAll();
      const list: SiLoItem[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setData(list);
    } catch {
      message.error("Không thể tải danh sách Silo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    loadLoCao();
  }, [fetchData, loadLoCao]);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: SiLoItem) => {
    setEditingRecord(record);
    form.setFieldsValue({
      iD_LoCao: record.iD_LoCao,
      tenSiLo: record.tenSiLo,
      thuTu: record.thuTu,
      tenNL: record.tenNL ?? "",
      tenNL_DieuChinh: record.tenNL_DieuChinh ?? "",
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ID_LoCao: values.iD_LoCao,
        TenSiLo: values.tenSiLo,
        ThuTu: values.thuTu,
        TenNL: values.tenNL || null,
        TenNL_DieuChinh: values.tenNL_DieuChinh || null,
      };
      setModalLoading(true);
      if (editingRecord) {
        await siLoLGApi.update(editingRecord.id, payload);
        message.success("Cập nhật Silo thành công");
      } else {
        await siLoLGApi.add(payload);
        message.success("Thêm Silo thành công");
      }
      setModalVisible(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || "Lỗi khi lưu dữ liệu");
    } finally {
      setModalLoading(false);
    }
  };

  const tenLoCaoMap = Object.fromEntries(loCaoOptions.map((o) => [o.value, o.label]));

  const filteredData = filterLoCao
    ? data.filter((item) => item.iD_LoCao === filterLoCao)
    : data;

  const sortedData = [...filteredData].sort((a, b) => a.thuTu - b.thuTu);

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center" as const,
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "Lò Cao",
      dataIndex: "iD_LoCao",
      key: "iD_LoCao",
      width: 100,
      render: (val: number) => tenLoCaoMap[val] ?? val,
    },
    {
      title: "Thứ Tự",
      dataIndex: "thuTu",
      key: "thuTu",
      width: 90,
      align: "center" as const,
    },
    {
      title: "Tên Silo",
      dataIndex: "tenSiLo",
      key: "tenSiLo",
      width: 150,
    },
    {
      title: "Tên NL",
      dataIndex: "tenNL",
      key: "tenNL",
      width: 200,
      render: (val: string | null) => val ?? "-",
    },
    {
      title: "Tên NL Điều Chỉnh",
      dataIndex: "tenNL_DieuChinh",
      key: "tenNL_DieuChinh",
      width: 220,
      render: (val: string | null) => val ?? "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: unknown, record: SiLoItem) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<b>Quản lý Silo - Lò Cao</b>}
        extra={
          <Space>
            <Select
              placeholder="Lọc theo Lò Cao"
              allowClear
              style={{ width: 160 }}
              options={loCaoOptions}
              onChange={(val) => setFilterLoCao(val ?? null)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Làm mới
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm mới
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={sortedData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Tổng: ${t}` }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>

      <Modal
        title={editingRecord ? "Cập nhật Silo" : "Thêm Silo mới"}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        confirmLoading={modalLoading}
        okText={editingRecord ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Lò Cao"
                name="iD_LoCao"
                rules={[{ required: true, message: "Vui lòng chọn Lò Cao" }]}
              >
                <Select placeholder="Chọn Lò Cao" options={loCaoOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Thứ Tự"
                name="thuTu"
                rules={[{ required: true, message: "Vui lòng nhập thứ tự" }]}
              >
                <InputNumber style={{ width: "100%" }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Tên Silo"
            name="tenSiLo"
            rules={[{ required: true, message: "Vui lòng nhập tên Silo" }]}
          >
            <Input placeholder="Ví dụ: A1, Quặng hồi..." />
          </Form.Item>
          <Form.Item label="Tên NL" name="tenNL">
            <Input placeholder="Tên nguyên liệu" />
          </Form.Item>
          <Form.Item label="Tên NL Điều Chỉnh" name="tenNL_DieuChinh">
            <Input placeholder="Tên nguyên liệu điều chỉnh" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SiLoLG;
