/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Form, Input, Select, DatePicker } from "antd";
import CustomChonNguoiKy from "./CustomChonNguoiKy";
import "../styles/readonly.css";

interface CustomFormItemProps {
  field: any; // hoặc định nghĩa kiểu riêng nếu có schema cụ thể
  idx?: number;
  disabled?: boolean;
  readOnly?: boolean;
  initialValue?: any;
  maBm?: string; // mã biểu mẫu để lọc danh sách người ký theo BmQuyenXl
}

const CustomFormItem: React.FC<CustomFormItemProps> = ({
  field,
  idx,
  disabled,
  readOnly = false,
  maBm,
  // initialValue,
}) => {
  const isDisabled = disabled ?? field.disabled ?? false;

  const renderField = () => {
    switch (field.type) {
      case "datetime":
        return (
          <DatePicker
            showTime
            format="DD/MM/YYYY"
            disabled={isDisabled}
            style={{ width: "100%" }}
            size="middle"
          />
        );

      case "date":
        return (
          <DatePicker
            allowClear={!readOnly}
            // open={!readOnly}
            open={readOnly ? false : undefined}
            inputReadOnly={readOnly}
            format="DD/MM/YYYY"
            disabled={isDisabled}
            style={{ width: "100%" }}
            size="middle"
          />
        );

      case "select":
        return (
          <Select
            placeholder={field.placeholder || "Chọn..."}
            allowClear={!readOnly}
            open={readOnly ? false : undefined}
            disabled={isDisabled}
            style={{ width: "100%" }}
            size="middle"
          >
            {field.options?.map((opt: any) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        );

      case "selectNguoiKy": {
        // loaiQuyen: capduyet=0 → người xử lý (1), capduyet>0 → người phê duyệt (2)
        const loaiQuyen = field.capduyet != null ? (field.capduyet === 0 ? 1 : 2) : 2;
        return (
          <CustomChonNguoiKy
            maBm={maBm}
            loaiQuyen={loaiQuyen}
            maphongBan={field.maphongBan}
            disabled={isDisabled}
          />
        );
      }

      case "number":
        return (
          <Input
            type="number"
            placeholder={field.placeholder || ""}
            readOnly={isDisabled}
          />
        );

      case "textarea":
        return (
          <Input.TextArea
            placeholder={field.placeholder || ""}
            readOnly={isDisabled}
          />
        );

      default:
        return (
          <Input placeholder={field.placeholder || ""} disabled={isDisabled} />
        );
    }
  };

  // const initialValue =
  //   field.type === "datetime"
  //     ? field.defaultValue
  //       ? dayjs(field.defaultValue)
  //       : dayjs()
  //     : field.defaultValue ?? "";

  return (
    <Form.Item
      key={field.key || idx}
      name={field.key}
      label={field.label}
      className={readOnly ? "readonly-field" : undefined}
      // initialValue={initialValue ?? field.initialValue}
      // initialValue={initialValue}
      rules={[
        ...(field.rules || []),
        ...(field.required
          ? [{ required: true, message: `${field.label} là bắt buộc!` }]
          : []),
      ]}
    >
      <>
        {renderField()}
        {/* {readOnly && <div className="readonly-overlay" />} */}
      </>
    </Form.Item>
  );
};

export default CustomFormItem;
