import { useState, useEffect } from "react";
import { Form, Input, DatePicker, Button, Card, Typography } from "antd";
import dayjs from "dayjs";
import CustomFormTable from "./CustomFormTable";

export interface DynamicBMFormProps {
  config: {
    code?: string; // Mã biểu mẫu (VD: BM-HRC1-GLPN)
    title: string;
    headerInfo?: {
      company?: string;
      subCompany?: string;
    };
    isoInfo?: {
      code?: string;
      effectiveDate?: string;
      revision?: string;
    };

    headerFields: Array<{
      label: string;
      type: "text" | "datetime" | "number" | "select";
      value?: any;
      options?: Array<{ label: string; value: any }>; // cho select
    }>;

    // Thay vì 1 bảng, giờ là mảng nhiều bảng
    tables: Array<{
      title: string; // Tên bảng
      apiSource?: string; // API nguồn dữ liệu (nếu có)
      queryParams?: Record<string, any>; // Tham số truyền API
      editable?: boolean; // Cho phép nhập tay hay không
      columns: Array<{
        title: string;
        dataIndex?: string;
        align?: "left" | "center" | "right";
        children?: Array<{
          title: string;
          dataIndex: string;
          align?: "left" | "center" | "right";
        }>;
      }>;
    }>;

    footerNotes?: string[];
    signatures?: Array<{
      label: string;
      signer?: string;
    }>;
  };

  // Props để load/save dữ liệu tổng thể
  apiEndpoint?: string; // Endpoint để load form tổng (ví dụ GET /api/bm/:id)
  recordId?: string | number; // ID khi load record
  onDataLoaded?: (data: any) => void; // Callback khi load xong dữ liệu
  onSave?: (data: any) => Promise<void>; // Callback khi lưu form
}

export default function DynamicBMForm({ config }: DynamicBMFormProps) {
  const [form] = Form.useForm();
  const [tableData, setTableData] = useState([{ key: 1 }]);
  // Fetch dữ liệu ban đầu từ API

  useEffect(() => {}, []);

  // Gửi dữ liệu form
  const handleSubmit = (values: any) => {
    const payload = { ...values, tableData };
    console.log("➡️ Dữ liệu phiếu:", payload);
    alert("✅ Đã tạo phiếu thành công! (xem console log)");
  };

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      {/* Tiêu đề biên bản */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        {/* Logo + tên công ty */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <img
            src="https://report.hoaphatdungquat.vn/img/logoHP.png"
            alt="logo"
            style={{ height: "auto", width: 150 }}
          />
          {config.headerInfo && (
            <>
              <Typography.Text strong>
                {config.headerInfo.subCompany}
              </Typography.Text>
              <Typography.Text>{config.headerInfo.company}</Typography.Text>
            </>
          )}
        </div>

        {/* Tiêu đề trung tâm */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
        </div>

        {/* ISO góc phải */}
        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {config.isoInfo.revision}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* HEADER - các trường nhập đầu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <Form.Item
              key={idx}
              name={f.label}
              label={f.label}
              initialValue={
                f.type === "datetime" ? dayjs(f.value) : f.value || ""
              }
            >
              {f.type === "datetime" ? (
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
        </div>

        {/* TABLE - danh sách phôi */}
        <CustomFormTable
          columns={config.tables[0].columns}
          initialData={tableData}
          onDataChange={setTableData}
          addRowButtonText="+ Thêm dòng"
          showAddButton={true}
        />

        {/* FOOTER - ghi chú */}
        <div style={{ marginTop: 24 }}>
          <Typography.Text strong>Ghi chú:</Typography.Text>
          <ul>
            {config.footerNotes?.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>

        {/* SIGNATURES - ký tên */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig, i) => (
            <div key={i}>
              <Typography.Text strong>{sig.label}</Typography.Text>
              <div
                style={{
                  borderBottom: "1px solid #aaa",
                  height: 40,
                  width: 180,
                  margin: "16px auto",
                }}
              ></div>
              <Typography.Text>{sig.signer}</Typography.Text>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Button type="primary" htmlType="submit">
            Lưu & Gửi phê duyệt
          </Button>
        </div>
      </Form>
    </Card>
  );
}
