
import { Table, Button, Input, Space } from "antd";
import { useState } from "react";

const EditableTable = () => {
  const [data, setData] = useState([
    { id: "1", name: "Nguyễn Văn A", email: "a@example.com" },
  ]);

  const handleAddRow = () => {
    setData([...data, { id: "1", name: "", email: "" }]);
  };

  const handleDuplicateRow = (record: any) => {
    setData([...data, { ...record, id: 1 }]);
  };

  const handleChange = (id: string, field: string, value: string) => {
    const newData = data.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setData(newData);
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
      render: (_: any, record: any) => (
        <Input
          value={record.name}
          onChange={(e) => handleChange(record.id, "name", e.target.value)}
        />
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (_: any, record: any) => (
        <Input
          value={record.email}
          onChange={(e) => handleChange(record.id, "email", e.target.value)}
        />
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleDuplicateRow(record)}>Copy</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Button onClick={handleAddRow} type="primary" style={{ marginBottom: 16 }}>
        ➕ Thêm dòng
      </Button>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        pagination={false}
      />
    </>
  );
};

export default EditableTable;
