import { Input, Select, DatePicker } from "antd";

export const DynamicField = ({ field, value, onChange }: any) => {
  switch (field.type) {
    case "text":
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "select":
      return (
        <Select
          style={{ width: 120 }}
          value={value}
          options={(field.options || []).map((v: any) => ({
            value: v,
            label: v,
          }))}
          onChange={onChange}
        />
      );
    case "date":
      return <DatePicker onChange={(d) => onChange(d?.format("YYYY-MM-DD"))} />;
    default:
      return null;
  }
};
