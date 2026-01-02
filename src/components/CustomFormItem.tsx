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
}

const CustomFormItem: React.FC<CustomFormItemProps> = ({
  field,
  idx,
  disabled,
  readOnly = false,
  // initialValue,
}) => {
  const isDisabled = disabled ?? field.disabled ?? false;

  const renderField = () => {
    switch (field.type) {
      case "datetime":
        return (
          <DatePicker showTime format="DD/MM/YYYY" disabled={isDisabled} />
        );

      case "date":
        return (
          <DatePicker
            format="DD/MM/YYYY"
            allowClear={!readOnly}
            // open={!readOnly}
            open={readOnly ? false : undefined}
            inputReadOnly={readOnly}
          />
        );

      case "select":
        return (
          <Select
            placeholder={field.placeholder || "Chọn..."}
            allowClear={!readOnly}
            open={readOnly ? false : undefined}
            // open={!readOnly}
            // disabled={isDisabled && !readOnly}
            // style={{ width: "100%" }}
          >
            {field.options?.map((opt: any) => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        );

      case "selectNguoiKy":
        return (
          <CustomChonNguoiKy
            maphongBan={field.maphongBan}
            disabled={isDisabled}
          />
        );

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
