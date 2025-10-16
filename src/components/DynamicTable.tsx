import { useEffect, useState } from "react";
import { Table, InputNumber } from "antd";
import { apiClient } from "../services/ApiService";

export const DynamicTable = ({ field, formValues }: any) => {
  const [data, setData] = useState<any[]>([]);

  const replaceParams = (params: any) => {
    const result: any = {};
    for (const key in params) {
      const val = params[key];
      if (typeof val === "string" && val.startsWith("@")) {
        const ref = val.substring(1);
        result[key] = formValues[ref];
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  useEffect(() => {
    if (field.dataSource?.type === "api") {
      const params = replaceParams(field.dataSource.params || {});
      apiClient.get(field.dataSource.url, params).then(setData);
    }
  }, [formValues]);

  const columns = field.columns.map((col: any) => ({
    title: col.label,
    dataIndex: col.key,
    render:
      col.type === "number"
        ? (val: any, record: any) => (
            <InputNumber
              defaultValue={val}
              onChange={(v) => (record[col.key] = v)}
              style={{ width: "100%" }}
            />
          )
        : (val: any) => val,
  }));

  return (
    <Table
      dataSource={data}
      rowKey="machineCode"
      columns={columns}
      pagination={false}
    />
  );
};
