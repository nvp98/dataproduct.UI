import { useEffect, useState } from "react";
import { Form, Input, Modal, message, Button, Popconfirm } from "antd";
import { headerMappingApi } from "../services/HeaderMappingApi";
import HeaderKeyAutocomplete from "./HeaderKeyAutocomplete";

export type HeaderMappingRecord = {
  idPhuLieu: number | null;
  tenPhuLieu?: string | null;
  tenNguonDuLieu?: string | null;
  idHeaderKey?: number | null;
  mappingId?: number | null;
  headerKeyName?: string | null;
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

export type HeaderMappingModalProps = {
  open: boolean;
  record: HeaderMappingRecord | null;
  title?: string;
  onSuccess?: () => void;
  onCancel: () => void;
};

const HeaderMappingModal = ({
  open,
  record,
  title,
  onSuccess,
  onCancel,
}: HeaderMappingModalProps) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!record) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      tenPhuLieu: record.tenPhuLieu || "",
      headerKeyId: record.idHeaderKey || undefined,
      tenNguonDuLieu: record.tenNguonDuLieu || record.tenPhuLieu || "",
    });
  }, [record, open, form]);

  const handleUnlink = async () => {
    // Nếu không có mappingId nhưng có idHeaderKey, cần fetch lại dữ liệu
    if (!record?.mappingId && !record?.idHeaderKey) {
      message.info("Phụ liệu này chưa được móc nối.");
      return;
    }

    // Nếu có idHeaderKey nhưng không có mappingId, yêu cầu user filter lại
    if (!record?.mappingId && record?.idHeaderKey) {
      message.warning("Vui lòng bấm nút 'Lọc dữ liệu phụ liệu' để cập nhật thông tin móc nối mới nhất.");
      return;
    }

    try {
      setSaving(true);
      await headerMappingApi.delete(record.mappingId!);
      message.success("Đã bỏ móc nối phụ liệu");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to unlink mapping:", error);
      message.error(getErrorMessage(error) || "Không thể gỡ móc nối");
    } finally {
      setSaving(false);
    }
  };

  const handleOk = async () => {
    if (!record?.idPhuLieu) {
      message.error("Thiếu thông tin phụ liệu");
      return;
    }

    try {
      const values = await form.validateFields();
      const headerKeyId: number | null | undefined = values.headerKeyId;
      if (!headerKeyId) {
        message.error("Vui lòng chọn Header Key");
        return;
      }

      const payload = {
        idPhuLieu: record.idPhuLieu,
        headerKeyId,
        tenNguonDuLieu: values.tenNguonDuLieu?.trim() || record.tenPhuLieu || "",
      };
      setSaving(true);
      if (record.mappingId) {
        await headerMappingApi.update(record.mappingId, payload);
        message.success("Cập nhật móc nối thành công");
      } else {
        await headerMappingApi.create(payload);
        message.success("Tạo móc nối thành công");
      }
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

  // Kiểm tra xem có móc nối hay không: có idHeaderKey hoặc mappingId
  const hasMapping = !!(record?.idHeaderKey || record?.mappingId);

  return (
    <Modal
      title={title || (hasMapping ? "Chỉnh sửa móc nối" : "Thêm móc nối")}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={saving}
      destroyOnHidden
      footer={[
        hasMapping ? (
          <Popconfirm
            key="unlink"
            title="Bỏ móc nối"
            description="Bạn có chắc chắn muốn gỡ móc nối này? Tất cả các phụ liệu móc nối với Header Key này sẽ bị gỡ."
            onConfirm={handleUnlink}
            okText="Xác nhận"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={saving} style={{ float: "left" }}>
              Gỡ móc nối
            </Button>
          </Popconfirm>
        ) : null,
        <Button key="cancel" onClick={onCancel}>
          Hủy
        </Button>,
        <Button key="ok" type="primary" onClick={handleOk} loading={saving}>
          OK
        </Button>,
      ]}
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Tên phụ liệu" name="tenPhuLieu">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Header Key"
          name="headerKeyId"
          rules={[
            {
              validator: (_, value) => {
                if (value === undefined) {
                  return Promise.reject(new Error("Vui lòng chọn Header Key"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <HeaderKeyAutocomplete
            placeholder="Chọn Header Key"
            defaultLabel={record?.headerKeyName || undefined}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default HeaderMappingModal;

