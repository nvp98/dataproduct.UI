/* eslint-disable @typescript-eslint/no-explicit-any */
import CTD_STD_Sanxuat from "../../../utils/BM_config/CTD_STD_Sanxuat.json";
import { Button, Card, Form, Input, Typography, message, Upload } from "antd";
import {
  FilePdfOutlined,
  FileExcelOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService } from "../../../services/PhieuActionService";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const TaoSoTheoDoiSanXuat = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = CTD_STD_Sanxuat;
  const [form] = Form.useForm();

  const [table1Data, setTable1Data] = useState<TableRow[]>([]);
  const [table2Data, setTable2Data] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const table1DefaultData = useMemo(() => {
    const table1Layout = config.layout.find(
      (section: any) =>
        section.sectionType === "table" && section.key === "table1",
    );
    return ((table1Layout as any)?.initialData || []) as TableRow[];
  }, [config.layout]);

  const initData = useCallback(async () => {
    try {
      setLoading(true);

      if (idphieu) {
        const res = await PhieuApi.getDetail(idphieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) {
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
              }
            });
          } else {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy",
              );
              if (sig && pd.nguoiDuyetId) {
                signatureFields[sig.key] = pd.nguoiDuyetId;
              }
            });
          }

          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          const formValues = {
            ...data,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };
          form.setFieldsValue(formValues);

          if ((res as any)?.tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig) => sig.capDuyet === 0)
              .forEach((sig) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) {
              form.setFieldsValue(overrides);
            }
          }

          setTable1Data((formValues.table1 as TableRow[]) || table1DefaultData);
          setTable2Data((formValues.table2 as TableRow[]) || []);

          setPhieuInfo({
            tinhTrang: (res as any)?.tinhTrang ?? 0,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });
        }
      } else {
        setPhieuInfo({});
        setTable1Data(table1DefaultData);
        setTable2Data([]);

        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig) => sig.capDuyet === 0)
            .forEach((sig) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) {
            form.setFieldsValue(overrides);
          }
        }, 200);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [
    idphieu,
    form,
    config.signatures,
    config.headerFields,
    currentUserInfo,
    table1DefaultData,
  ]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();

    const pheDuyetFlow = config.signatures.map((s) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) {
        formattedDates[k] = formData[k].format("YYYY-MM-DD");
      }
    });

    const normalizeRows = (rows: TableRow[]) =>
      rows.map((row) => {
        const clone = { ...row };
        delete clone._isNewRow;
        delete clone.key;
        return clone;
      });

    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      prefix: config.prefix,
      scope: formData.xuong ?? null,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: normalizeRows(table1Data),
      table2: normalizeRows(table2Data),
      pheDuyet: pheDuyetFlow,
    };
  }, [getUserInfo, form, config, table1Data, table2Data]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieusotheodoisanxuat/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }
      await initData();
    },
    [navigate, initData],
  );

  const handleExportPdf = async () => {
    if (!idphieu) {
      message.warning("Vui lòng lưu phiếu trước khi xuất PDF!");
      return;
    }
    try {
      setLoading(true);
      const response = await PhieuApi.exportDynamicPDF(idphieu, {});
      const blob = new Blob([response as any], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `So_theo_doi_san_xuat_${soPhieu || idphieu}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success("Xuất PDF thành công!");
    } catch (error: any) {
      console.error("Export PDF failed:", error);
      message.error(error?.message || "Xuất file PDF thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const table1Section = config.layout.find(
      (section: any) =>
        section.sectionType === "table" && section.key === "table1",
    );
    if (!table1Section) {
      message.error("Không tìm thấy cấu hình bảng!");
      return;
    }

    // Exclude "Loại phôi" column (isLabel: true) from template
    const templateColumns = table1Section.columns.filter(
      (col: any) => !col.isLabel,
    );
    const headers = [
      [
        ...templateColumns.map((col: any) => col.title),
        "Phôi nóng (Tích x)",
        "Phôi nguội (Tích x)",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!cols"] = [
      { wch: 8 },
      { wch: 16 },
      ...templateColumns.map((col: any) => ({
        wch: Math.min(col.width ? col.width / 10 : 15, 30),
      })),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SoTheoDoiSanXuat");
    XLSX.writeFile(wb, "Template_SoTheoDoiSanXuat.xlsx");
    message.success("Tải template thành công!");
  };

  const handleImportExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) {
          message.warning("File không có dữ liệu!");
          return;
        }

        const table1Section = config.layout.find(
          (section: any) =>
            section.sectionType === "table" && section.key === "table1",
        );
        if (!table1Section) {
          message.error("Không tìm thấy cấu hình bảng!");
          return;
        }

        // Get columns separated by type
        const labelColumns = table1Section.columns.filter(
          (col: any) => col.isLabel,
        );
        const templateColumns = table1Section.columns.filter(
          (col: any) => !col.isLabel,
        );
        const columnKeys = templateColumns.map((col: any) => col.dataIndex);

        // Get the header row to detect column mapping
        const headerRow = rows[0] || [];
        const headerTitles = headerRow.map((h: any) =>
          String(h ?? "")
            .trim()
            .toLowerCase(),
        );

        // Check if this is an imported file with 3-row fixed structure
        const isMacPhoiType =
          headerTitles.some((h) => h.includes("mác phôi")) ||
          headerTitles.some((h) => h.includes("mac phoi"));

        // Detect indices of checkbox columns
        const phoiNongColIndex = headerTitles.findIndex(
          (h) => h.includes("phôi nóng (tích x)") || h.includes("phoi nong"),
        );
        const phoiNguoiColIndex = headerTitles.findIndex(
          (h) => h.includes("phôi nguội (tích x)") || h.includes("phoi nguoi"),
        );

        const dataRows = rows
          .slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== ""));

        // For template with 3 fixed rows, allow only 3 rows; otherwise flexible
        if (isMacPhoiType && dataRows.length !== 3) {
          message.warning(
            "File phải chứa đúng 3 dòng dữ liệu (Loại I, II, III)!",
          );
          return;
        }

        // Fixed MacPhoiLoai labels for type-based import
        const fixedMacPhoiLoai = ["a. Loại I", "b. Loại II", "c. Loại III"];

        const imported: TableRow[] = dataRows.map((r, idx) => {
          const row: TableRow = {
            key: `import-${Date.now()}-${idx}`,
          };

          // Set MacPhoiLoai for label column
          if (isMacPhoiType && labelColumns.length > 0) {
            const labelKey = labelColumns[0].dataIndex || "MacPhoiLoai";
            row[labelKey] = fixedMacPhoiLoai[idx] ?? "";
          }

          // Map template columns to row data
          columnKeys.forEach((key, colIdx) => {
            const value = r[colIdx];
            if (
              [
                "soPhoiRaKhoiLo",
                "soPhoiHoiLo",
                "soPhoiCanRaSanPham",
                "soPhoiPheCongNghe",
              ].includes(key)
            ) {
              row[key] = Number(value) || 0;
            } else {
              row[key] = value ?? "";
            }
          });
          // Handle checkbox marking for phôi type (nóng/nguội)
          if (phoiNongColIndex >= 0 || phoiNguoiColIndex >= 0) {
            const phoiNongValue = String(r[phoiNongColIndex] ?? "")
              .trim()
              .toLowerCase();
            const phoiNguoiValue = String(r[phoiNguoiColIndex] ?? "")
              .trim()
              .toLowerCase();
            const isNongMarked =
              phoiNongValue === "x" ||
              phoiNongValue === "X" ||
              phoiNongValue === "1";
            const isNguoiMarked =
              phoiNguoiValue === "x" ||
              phoiNguoiValue === "X" ||
              phoiNguoiValue === "1";

            if (isNongMarked) {
              row["loaiPhoi"] = 1; // Phôi nóng
            } else if (isNguoiMarked) {
              row["loaiPhoi"] = 2; // Phôi nguội
            }
          }

          return row;
        });
        setTable1Data(imported);
        message.success(`Import thành công ${imported.length} dòng dữ liệu!`);
      } catch (error) {
        console.error("Import failed:", error);
        message.error("Đọc file thất bại, vui lòng kiểm tra lại template!");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const actionButtons = useMemo(() => {
    const userInfo = getUserInfo();

    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu || "",
      tinhTrang: phieuInfo.tinhTrang ?? 0,
      isClone: phieuInfo.isClone ?? false,
      currentUserId: userInfo.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo.tenNgan ?? null,
      nguoiTaoId: phieuInfo.nguoiTaoId ?? null,
      phieuPhongBanId: phieuInfo.idphongBan ?? null,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
      },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(
      buttons,
      idphieu || "",
      getFormData,
    );
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleActionSuccess]);

  const table1Section = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1",
  );
  const table2Section = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table2",
  );

  const handleAddTable1Triplet = useCallback(() => {
    const ts = Date.now();
    const newRows: TableRow[] = [
      { key: `${ts}-L1`, MacPhoiLoai: "a. Loại I" },
      { key: `${ts}-L2`, MacPhoiLoai: "b. Loại II" },
      { key: `${ts}-L3`, MacPhoiLoai: "c. Loại III" },
    ];
    setTable1Data((prev) => [...prev, ...newRows]);
  }, []);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <CustomFormItem
              key={f.key || idx}
              field={f}
              idx={idx}
              disabled={isFormLocked}
            />
          ))}
        </div>

        <div
          style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}
        >
          {!isFormLocked && (
            <>
              <Button
                type="default"
                style={{
                  backgroundColor: "#faad14",
                  borderColor: "#faad14",
                  color: "#fff",
                }}
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
              >
                Tải template
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={handleImportExcel}
              >
                <Button
                  icon={<FileExcelOutlined />}
                  style={{
                    backgroundColor: "#007906",
                    borderColor: "#007906",
                    color: "#fff",
                  }}
                >
                  Import Excel
                </Button>
              </Upload>
            </>
          )}
          {idphieu &&
            (currentTinhTrang === TrangThaiPhieuConst.HoanThanh ||
              currentTinhTrang === TrangThaiPhieuConst.DaChot) && (
              <Button
                type="default"
                icon={<FilePdfOutlined />}
                onClick={handleExportPdf}
                loading={loading}
              >
                Xuất PDF
              </Button>
            )}
          {actionButtons}
        </div>

        {table1Section && (
          <div>
            <Typography.Title
              level={5}
              style={{ marginTop: 4, marginBottom: 2 }}
            >
              {table1Section.title}
            </Typography.Title>
            {!isFormLocked && (
              <Button
                type="dashed"
                onClick={handleAddTable1Triplet}
                style={{ marginTop: 8 }}
              >
                + Thêm bộ loại I/II/III
              </Button>
            )}
            <CustomFormTable
              columns={table1Section.columns || []}
              initialData={table1Data}
              onDataChange={(rows) => setTable1Data(rows as TableRow[])}
              loading={loading}
              editable={!isFormLocked}
              showAddButton={false}
              showDeleteButton={false}
              minRows={table1Data.length || 3}
            />
          </div>
        )}

        {table2Section && (
          <div>
            <Typography.Title
              level={5}
              style={{ marginTop: 16, marginBottom: 2 }}
            >
              {table2Section.title}
            </Typography.Title>
            <CustomFormTable
              columns={table2Section.columns || []}
              initialData={table2Data}
              onDataChange={(rows) => setTable2Data(rows as TableRow[])}
              addRowButtonText="+ Thêm diễn biến"
              loading={loading}
              editable={!isFormLocked}
              showAddButton={!isFormLocked}
              showDeleteButton={!isFormLocked}
              minRows={0}
            />
          </div>
        )}

        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig, i) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue = isLevelZero
              ? (currentUserInfo?.iD_TaiKhoan ?? null)
              : undefined;
            const duyet = phieuInfo.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capDuyet,
            );
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      {duyet?.tinhTrang === 1
                        ? "Đã ký"
                        : duyet?.tinhTrang === 2
                          ? "Đã từ chối"
                          : "Chưa xử lý"}
                    </Typography.Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoSoTheoDoiSanXuat;
