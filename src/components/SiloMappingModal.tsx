import { useEffect, useState, useCallback } from "react";
import { Form, Modal, message, Button, Popconfirm, DatePicker, Switch, Table, Tag, Row, Col } from "antd";
import { SiloServiceApi } from "../services/SiloServiceApi";
import type { MapSiloPhuLieuNM, MapSiloPhuLieuNMPayload, PhuLieuNM } from "../models/SiloModel";
import { CommonAutocomplete } from "./CommonAutocomplete";
import dayjs from "dayjs";

export type SiloMappingRecord = {
  siloId: number;
  tenSilo: string;
};

type ErrorLike = {
  message?: unknown;
  Message?: unknown;
  errorFields?: unknown;
};

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const errObj = error as ErrorLike;
    if (typeof errObj.message === "string") {
      return errObj.message;
    }
    if (typeof errObj.Message === "string") {
      return errObj.Message;
    }
  }
  return undefined;
};

export type SiloMappingModalProps = {
  open: boolean;
  record: SiloMappingRecord | null;
  title?: string;
  onSuccess?: () => void;
  onCancel: () => void;
};

const SiloMappingModal = ({
  open,
  record,
  title,
  onSuccess,
  onCancel,
}: SiloMappingModalProps) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<MapSiloPhuLieuNM[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMapping, setEditingMapping] = useState<MapSiloPhuLieuNM | null>(null);

  const loadMappings = useCallback(async () => {
    if (!record?.siloId) return;
    setLoading(true);
    try {
      const data = await SiloServiceApi.getMappingsBySiloId(record.siloId);
      setMappings(data);
    } catch (error) {
      console.error("Failed to load mappings:", error);
      message.error("Không thể tải danh sách móc nối");
    } finally {
      setLoading(false);
    }
  }, [record?.siloId]);

  // useEffect để load data khi modal mở
  useEffect(() => {
    if (!open || !record) {
      return;
    }
    loadMappings();
    form.resetFields();
    setEditingMapping(null);
  }, [open, record, form, loadMappings]);

  // Wrapper function cho CommonAutocomplete
  const searchPhuLieuNM = useCallback(
    async (params: { searchKey?: string; page?: number; pageSize?: number }) => {
      const response = await SiloServiceApi.searchPhuLieuNM(params);
      return {
        data: response.data || [],
        totalRecords: response.totalRecords || 0,
        page: response.page || 1,
        pageSize: response.pageSize || 50,
      };
    },
    []
  );

  const handleOk = async () => {
    if (!record?.siloId) {
      message.error("Thiếu thông tin Silo");
      return;
    }

    try {
      const values = await form.validateFields();
      // Đảm bảo lấy đúng PhuLieuNMId dạng number
      const phuLieuNMId = Number(values.phuLieuNMId);
      if (!phuLieuNMId || Number.isNaN(phuLieuNMId)) {
        message.error("Vui lòng chọn phụ liệu NM hợp lệ");
        return;
      }

      const payload: MapSiloPhuLieuNMPayload = {
        siloId: record.siloId,
        phuLieuNMId,
        ngayBatDau: values.ngayBatDau.format("YYYY-MM-DD"),
        ngayKetThuc: values.ngayKetThuc ? values.ngayKetThuc.format("YYYY-MM-DD") : null,
        isActive: values.isActive ?? true,
      };
      setSaving(true);
      if (editingMapping) {
        await SiloServiceApi.updateMapping(editingMapping.id, payload);
        message.success("Cập nhật móc nối thành công");
      } else {
        await SiloServiceApi.createMapping(payload);
        message.success("Tạo móc nối thành công");
      }
      form.resetFields();
      setEditingMapping(null);
      loadMappings();
      onSuccess?.();
    } catch (error) {
      if ((error as ErrorLike)?.errorFields) {
        return;
      }
      console.error("Failed to save mapping:", error);
      message.error(getErrorMessage(error) || "Không thể lưu móc nối");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setSaving(true);
      await SiloServiceApi.deleteMapping(id);
      message.success("Đã xóa móc nối");
      loadMappings();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete mapping:", error);
      message.error(getErrorMessage(error) || "Không thể xóa móc nối");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (mapping: MapSiloPhuLieuNM) => {
    setEditingMapping(mapping);
    form.setFieldsValue({
      phuLieuNMId: mapping.phuLieuNMId,
      ngayBatDau: dayjs(mapping.ngayBatDau),
      ngayKetThuc: mapping.ngayKetThuc ? dayjs(mapping.ngayKetThuc) : null,
      isActive: mapping.isActive,
    });
  };

  const handleCancel = () => {
    form.resetFields();
    setEditingMapping(null);
    onCancel();
  };

  const columns = [
    {
      title: "Phụ liệu NM",
      dataIndex: "tenPhuLieu",
      key: "tenPhuLieu",
      width: 200,
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "ngayBatDau",
      key: "ngayBatDau",
      width: 120,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "ngayKetThuc",
      key: "ngayKetThuc",
      width: 120,
      render: (value: string | null) => value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (value: boolean) =>
        value ? <Tag color="green">Đang dùng</Tag> : <Tag color="red">Ngưng</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_: unknown, mapping: MapSiloPhuLieuNM) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" type="link" onClick={() => handleEdit(mapping)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa móc nối này?"
            onConfirm={() => handleDelete(mapping.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" type="link" danger>
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={title || "Móc nối Silo với Phụ liệu NM"}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={saving}
      destroyOnClose
      width={900}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Đóng
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk} loading={saving}>
          {editingMapping ? "Cập nhật" : "Thêm mới"}
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <strong>Silo: {record?.tenSilo}</strong>
      </div>

      <Form layout="vertical" form={form}>
        <Form.Item
          label="Phụ liệu NM"
          name="phuLieuNMId"
          rules={[{ required: true, message: "Vui lòng chọn phụ liệu NM" }]}
          style={{ marginBottom: 16 }}
        >
          <CommonAutocomplete<PhuLieuNM>
            searchApi={searchPhuLieuNM}
            mapOption={(item) => {
              // Đảm bảo idPhuLieu là số hợp lệ
              const idPhuLieu = item.idPhuLieu ?? 0;
              return {
                value: idPhuLieu,
                label: item.tenPhuLieu || `ID: ${idPhuLieu}`,
              };
            }}
            placeholder="Chọn phụ liệu NM"
            pageSize={50}
            disabled={!!editingMapping}
            allowClear
            style={{ width: "100%" }}
            fallbackLabelBuilder={(value) => `ID: ${value}`}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Ngày bắt đầu"
              name="ngayBatDau"
              rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Ngày kết thúc" name="ngayKetThuc">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label="Trạng thái"
          name="isActive"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch checkedChildren="Đang dùng" unCheckedChildren="Ngưng" />
        </Form.Item>
        {editingMapping && (
          <Button
            type="link"
            onClick={() => {
              form.resetFields();
              setEditingMapping(null);
            }}
          >
            Hủy chỉnh sửa
          </Button>
        )}
      </Form>

      <div style={{ marginTop: 24 }}>
        <strong>Danh sách móc nối hiện tại:</strong>
        <Table
          columns={columns}
          dataSource={mappings}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          style={{ marginTop: 8 }}
        />
      </div>
    </Modal>
  );
};

export default SiloMappingModal;

