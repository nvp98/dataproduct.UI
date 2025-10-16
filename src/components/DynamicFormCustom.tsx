import { useState } from "react";
import { Button } from "antd";
import { DynamicField } from "./DynamicField";
import { DynamicTable } from "./DynamicTable";

export const DynamicForm = ({ formDefinition, onSubmit }: any) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const handleChange = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    console.log("Form data:", formValues);
    onSubmit?.(formValues);
  };

  return (
    <div>
      {formDefinition.fields.map((field: any) => {
        if (field.type === "table") {
          return (
            <div key={field.key} style={{ marginTop: 20 }}>
              <h4>{field.label}</h4>
              <DynamicTable
                field={field}
                formValues={formValues}
                onChange={(data: any) => handleChange(field.key, data)}
              />
            </div>
          );
        }

        return (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <label style={{ width: 100, display: "inline-block" }}>
              {field.label}:
            </label>
            <DynamicField
              field={field}
              value={formValues[field.key]}
              onChange={(v: any) => handleChange(field.key, v)}
            />
          </div>
        );
      })}

      <Button type="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
        Lưu phiếu
      </Button>
    </div>
  );
};
