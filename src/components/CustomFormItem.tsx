import React from "react";
import { Form, Input, Select, DatePicker } from "antd";
import CustomChonNguoiKy from "./CustomChonNguoiKy";

interface CustomFormItemProps {
  field: any; // hoặc định nghĩa kiểu riêng nếu có schema cụ thể
  idx?: number;
}

const CustomFormItem: React.FC<CustomFormItemProps> = ({ field, idx }) => {
  const renderField = () => {
    switch (field.type) {
      case "datetime":
        return <DatePicker showTime format="DD/MM/YYYY" />;

      case "date":
        return <DatePicker format="DD/MM/YYYY" />;

      case "select":
        return (
          <Select
            placeholder={field.placeholder || "Chọn..."}
            allowClear
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
        return <CustomChonNguoiKy maphongBan={field.maphongBan} />;

      case "number":
        return <Input type="number" placeholder={field.placeholder || ""} />;

      case "textarea":
        return <Input.TextArea placeholder={field.placeholder || ""} />;

      default:
        return <Input placeholder={field.placeholder || ""} />;
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
      // initialValue={initialValue}
      rules={[
        ...(field.rules || []),
        ...(field.required
          ? [{ required: true, message: `${field.label} là bắt buộc!` }]
          : []),
      ]}
    >
      {renderField()}
    </Form.Item>
  );
};

export default CustomFormItem;
