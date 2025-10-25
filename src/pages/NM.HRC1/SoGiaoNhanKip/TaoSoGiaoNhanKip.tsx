import HRC1_BB_Lothoi from "../../../utils/BM_config/HRC1_Sogiaonhankip.json";
import { Button, Card, Form, Input, Typography, message } from "antd";
import CustomFormTable from "../../../components/CustomFormTable";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation } from "react-router-dom";

const TaoSoGiaoNhanKipHRC1 = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};
  const config = HRC1_BB_Lothoi;
  const [form] = Form.useForm();

  // tableData: keyed by layout.key (table1, table2, ...)
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  // Ensure rows have unique keys
  const ensureRowKeys = (rows: any[], prefix: string) =>
    (rows || []).map((r: any, i: number) => ({ key: r.key ?? `${prefix}-${i}`, ...r }));

  // Initialize data
  const initData = async () => {
    try {
      setLoading(true);
      if (idphieu) {
        const res = await PhieuApi.getDetail(idphieu);
        if (res) {
          const data = (res as any)?.jsonData.jsonData || {};

          console.log("Loaded data for idphieu", data)

          // Set form fields (header + simple fields)
          const formValues = {
            ...data,
            idphieu: (res as any)?.idphieu || "",
            NgaySX: data.NgaySX ? dayjs(data.NgaySX, "YYYY-MM-DD") : null,
          };
          form.setFieldsValue(formValues);

          // Populate tableData from jsonData if present, otherwise fallback to layout.initialData
          const tables: Record<string, any[]> = {};
          config.layout.forEach((section) => {
            if (section.sectionType === "table" && section.key) {
              const fromJson = data[section.key];
              if (Array.isArray(fromJson) && fromJson.length > 0) {
                tables[section.key] = ensureRowKeys(fromJson, section.key);
              } else if (Array.isArray(section.initialData) && section.initialData.length > 0) {
                tables[section.key] = ensureRowKeys(section.initialData, section.key);
              } else {
                tables[section.key] = [];
              }
            }
          });
          setTableData(tables);

          message.success("Đã tải dữ liệu phiếu!");
        }
      } else {
        // No idphieu: initialize tables from config.initialData
        const tables: Record<string, any[]> = {};
        config.layout.forEach((section) => {
          if (section.sectionType === "table" && section.key) {
            if (Array.isArray(section.initialData) && section.initialData.length > 0) {
              tables[section.key] = ensureRowKeys(section.initialData, section.key);
            } else {
              tables[section.key] = [];
            }
          }
        });
        setTableData(tables);
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idphieu]);

  // table change handler
  const handleTableChange = (key: string, rows: any[]) => {
    setTableData((prev) => ({ ...prev, [key]: ensureRowKeys(rows, key) }));
  };

  // Submit: collect Form values + tables under their keys and send as jsonData
  const handleSubmit = async () => {
    try {
      const stored = localStorage.getItem("userinfo");
      const pheDuyetFlow = config.signatures
        .filter((s) => s.isChon)
        .map((s) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      // creator
      const hasCreator = config.signatures.find(
        (x) => x.isChon === false && x.capduyet === 1
      );
      if (hasCreator) {
        pheDuyetFlow.unshift({
          capDuyet: 1,
          maKyDuyet: hasCreator?.key || "",
          nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
          tinhTrang: 1,
          ghiChu: "Người tạo phiếu",
        });
      }

      // Collect all form values (header + other named fields)
      const formValues = form.getFieldsValue();

      // Build jsonData: include all named fields plus tableData keyed by section.key
      const jsonData: Record<string, any> = { ...formValues };
      Object.keys(tableData).forEach((k) => {
        jsonData[k] = tableData[k];
      });

      const payload = {
        ...formValues,
        NgaySX: formValues.NgaySX ? formValues.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
        idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
        jsonData,
        pheDuyet: pheDuyetFlow,
      };

      if (formValues.idphieu) {
        await PhieuApi.putData(formValues.idphieu, payload);
        message.success("Cập nhật phiếu thành công!");
      } else {
        const res = await PhieuApi.postData(payload);
        message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu || ""}`);
      }
    } catch (error) {
      console.error("Lỗi tạo phiếu:", error);
      message.error("Không thể tạo phiếu! Vui lòng thử lại.");
    }
  };

  // Render a section: text, children (fields), table
  const renderSection = (section: any, idx: number) => {
    const sectionKey = section.key ?? `section-${idx}`;
    const titleEl = section.title ? (
      <div className="mb-2 whitespace-pre-line font-bold">{section.title}</div>
    ) : null;

    if (section.sectionType === "text") {
      // Use Form.Item with textarea for top-level text section
      return (
        <div key={sectionKey} className="mb-5">
          {titleEl}
          <Form.Item name={section.key}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </div>
      );
    }

    if (Array.isArray(section.children) && section.children.length > 0) {
      // Render each child using CustomFormItem (it already wraps Form.Item)
      return (
        <div key={sectionKey} className="mb-5">
          {titleEl}
          <div className="pl-4">
            {section.children.map((child: any, i: number) => (
              <div key={child.key ?? `${sectionKey}-child-${i}`} className="mb-3">
                {/* CustomFormItem includes Form.Item, so render directly */}
                <CustomFormItem field={child} idx={i} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (section.sectionType === "table") {
      const rows = tableData[section.key] ?? ensureRowKeys(section.initialData ?? [], section.key);
      return (
        <div key={sectionKey} className="mb-5">
          {titleEl}
          <CustomFormTable
            columns={section.columns || []}
            initialData={rows}
            onDataChange={(data) => handleTableChange(section.key, data)}
            className="w-full overflow-x-auto"
            addRowButtonText="+ Thêm dòng"
            showAddButton={true}
            showDeleteButton={true}
            minRows={section.initialData?.length || 1}
            editable={(section as any).editable !== false}
            loading={loading}
          />
        </div>
      );
    }

    // Unknown section -> skip
    return null;
  };

  return (
    <Card className="mt-6 shadow-md">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex-1 text-center">
          <Typography.Title level={3} className="mb-0">
            {config.title}
          </Typography.Title>
        </div>
        {config.isoInfo && (
          <div className="text-right leading-5 text-[13px]">
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {config.isoInfo.revision}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* header fields */}
        <div className="grid-cols-[repeat(auto-fit,minmax(200px,1fr))] grid gap-6">
          {config.headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key ?? `header-${idx}`} field={f} idx={idx} />
          ))}
        </div>

        {/* dynamic layout */}
        {config.layout.map((section: any, idx: number) => renderSection(section, idx))}

        {/* signatures */}
        <div className="mt-10 flex justify-around text-center">
          {config.signatures
            .filter((x: any) => x.isChon)
            .map((sig: any, i: number) => (
              <div key={sig.key ?? `sig-${i}`}>
                <CustomFormItem field={sig} idx={i} />
              </div>
            ))}
          {config.signatures
            .filter((x: any) => x.capduyet === 1)
            .map((sig: any, i: number) => (
              <Form.Item key={`hidden-${sig.key ?? i}`} name={sig.key || `hidden-${i}`} hidden>
                <Input type="hidden" />
              </Form.Item>
            ))}
        </div>

        <div className="mt-8 text-center">
          <Button type="primary" htmlType="submit">
            Lưu & Gửi phê duyệt
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default TaoSoGiaoNhanKipHRC1;
