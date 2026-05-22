/* eslint-disable @typescript-eslint/no-explicit-any */
import CTD_BB_GiaoNhanPhoi from "../../../utils/BM_config/CTD_BB_GiaoNhanPhoi.json";
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  message,
  Table,
  Upload,
} from "antd";
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormTable from "../../../components/CustomFormTable";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const createDefaultTableRows = (): TableRow[] => {
  const tableConfig = (CTD_BB_GiaoNhanPhoi as any)?.layout?.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1",
  );
  const initRows = tableConfig?.initData;

  if (Array.isArray(initRows) && initRows.length > 0) {
    return initRows.map((row: any, idx: number) => ({
      key: row?.key || `fixed-${idx + 1}`,
      mavitri: row?.mavitri ?? "",
      vitri: row?.vitri ?? "",
      macThep: row?.macThep ?? "",
      kichThuoc: row?.kichThuoc ?? "",
      soCay: row?.soCay ?? "",
      ghiChu: row?.ghiChu ?? "",
    }));
  }

  return [];
};

const mergeWithDefaultRows = (inputRows?: TableRow[]): TableRow[] => {
  const defaults = createDefaultTableRows();
  if (!inputRows || inputRows.length === 0) return defaults;

  return defaults.map((base, idx) => {
    const src = inputRows[idx] || {};
    return {
      ...base,
      mavitri: src.mavitri ?? base.mavitri ?? "",
      macThep: src.macThep ?? "",
      kichThuoc: src.kichThuoc ?? "",
      soCay: src.soCay ?? "",
      ghiChu: src.ghiChu ?? "",
      key: base.key,
    };
  });
};

const TaoPhieuGiaoNhanPhoi = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = CTD_BB_GiaoNhanPhoi;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>(
    createDefaultTableRows(),
  );
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  // ★ Ref snapshot – đọc trong closure mà không bao giờ bị stale
  const phieuInfoRef = useRef(phieuInfo);
  useEffect(() => {
    phieuInfoRef.current = phieuInfo;
  }, [phieuInfo]);

  const ca = Form.useWatch("ca", form);
  Form.useWatch("NgaySX", form); // trigger re-render khi ngày thay đổi

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

  // ─────────────────────────────────────────────────────────────────────────
  //  initData
  // ─────────────────────────────────────────────────────────────────────────
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";
      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId)
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
            });
          } else {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy",
              );
              if (sig && pd.nguoiDuyetId)
                signatureFields[sig.key] = pd.nguoiDuyetId;
            });
          }

          const tinhTrang = (res as any)?.tinhTrang ?? 0;
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

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig) => sig.capDuyet === 0)
              .forEach((sig) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0)
              form.setFieldsValue(overrides);
          }

          const mergedRows = mergeWithDefaultRows(formValues.table1 || []);
          setTableData(mergedRows);
          setPhieuInfo({
            tinhTrang: tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
            idPhieuGoc:
              (res as any)?.idPhieuGoc ??
              (res as any)?.iD_PhieuGoc ??
              (res as any)?.ID_PhieuGoc ??
              null,
          });
        }
      } else {
        setPhieuInfo({});
        const defaultRows = createDefaultTableRows();
        setTableData(defaultRows);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig) => sig.capDuyet === 0)
            .forEach((sig) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  // ─────────────────────────────────────────────────────────────────────────
  //  getFormData
  // ─────────────────────────────────────────────────────────────────────────
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
    const defaultRows = createDefaultTableRows();
    const processedTable1 = tableData.map((row, idx) => {
      const r = { ...row };
      r.mavitri = r.mavitri ?? defaultRows[idx]?.mavitri ?? "";
      delete r._isNewRow;
      delete r.key;
      return r;
    });
    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });
    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
      scope: formData.xuong || null,
      mayDuc: formData.xuong || null,
    };
  }, [getUserInfo, form, config, tableData]);

  // ─────────────────────────────────────────────────────────────────────────
  //  handleStatusChange
  // ─────────────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (idPhieu: string, newStatus: number) => {
      try {
        // Không cần xử lý dữ liệu API vì GiaoNhanPhoi chỉ nhập thủ công
        if (newStatus === TrangThaiPhieuConst.HoanThanh) {
          message.success("Đã hoàn thành phiếu!");
          return;
        }

        if (newStatus === TrangThaiPhieuConst.DaThuHoi) {
          message.success("Đã thu hồi phiếu!");
          return;
        }

        if (newStatus === TrangThaiPhieuConst.KhongXacNhan) {
          message.success("Đã từ chối phiếu!");
        }
      } catch (error: any) {
        console.error("❌ Error in handleStatusChange:", error);
        message.error(
          `Lỗi: ${error?.response?.data?.message || error?.message || "Không xác định"}`,
        );
      }
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  handleActionSuccess
  // ─────────────────────────────────────────────────────────────────────────
  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieubienbangiaoNhanphoi/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }

      if (!idphieu) return;

      try {
        const prevStatus = phieuInfoRef.current.tinhTrang;
        const res: any = await PhieuApi.getDetail(idphieu);
        const newStatus = res?.tinhTrang;

        if (
          newStatus === TrangThaiPhieuConst.HoanThanh &&
          prevStatus !== TrangThaiPhieuConst.HoanThanh
        ) {
          await handleStatusChange(idphieu, TrangThaiPhieuConst.HoanThanh);
        }
      } catch {
        // bỏ qua lỗi fetch
      }

      await initData();
    },
    [navigate, initData, idphieu, handleStatusChange],
  );

  const handleDownloadTemplate = () => {
    const headers = [
      ["TT", "Vị trí", "Mác thép", "Kích thước", "Số cây", "Ghi chú"],
    ];
    const body = createDefaultTableRows().map((row, idx) => [
      idx % 2 === 0 ? Math.floor(idx / 2) + 1 : "",
      row.vitri || "",
      "",
      "",
      "",
      "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...body]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 15 },
      { wch: 18 },
      { wch: 12 },
      { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GiaoNhanPhoi");
    XLSX.writeFile(wb, "Template_GiaoNhanPhoi.xlsx");
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
        const dataRows = rows
          .slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== ""));

        const normalized = dataRows.map((r) => {
          const hasTT =
            typeof r[0] === "number" || /^\d+$/.test(String(r[0] ?? ""));
          const offset = hasTT ? 1 : 0;
          return {
            macThep: String(r[1 + offset] ?? r[2] ?? "").trim(),
            kichThuoc: String(r[2 + offset] ?? r[3] ?? "").trim(),
            soCay: String(r[3 + offset] ?? r[4] ?? "").trim(),
            ghiChu: String(r[4 + offset] ?? r[5] ?? "").trim(),
          };
        });

        const merged = createDefaultTableRows().map((base, idx) => {
          const src = normalized[idx] || {};
          return {
            ...base,
            macThep: src.macThep || "",
            kichThuoc: src.kichThuoc || "",
            soCay: src.soCay || "",
            ghiChu: src.ghiChu || "",
          };
        });

        setTableData(merged);
        message.success("Import Excel thành công theo mẫu cố định!");
      } catch {
        message.error("Đọc file thất bại, vui lòng kiểm tra lại template!");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

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
      link.download = `Bien_ban_giao_nhan_phoi_${soPhieu || idphieu}_${new Date().toISOString().slice(0, 10)}.pdf`;
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
      onStatusChange: handleStatusChange,
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
  }, [
    getUserInfo,
    idphieu,
    phieuInfo,
    getFormData,
    handleStatusChange,
    handleActionSuccess,
  ]);

  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1",
  );

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
          {!isFormLocked && (
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

        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={tableSection?.columns || []}
                initialData={tableData}
                onDataChange={(rows) => setTableData(rows as TableRow[])}
                addRowButtonText="+ Thêm dòng"
                minRows={0}
                loading={loading}
                editable={true}
                showAddButton={false}
                showDeleteButton={false}
                readonlyFields={["vitri"]}
                summary={(pageData) => {
                  const totals = {
                    soCay: 0,
                  };
                  pageData.forEach((row: any) => {
                    totals.soCay += Number(row.soCay ?? 0) || 0;
                  });
                  const fmt = (n: number) => n.toLocaleString("en-US");
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row
                        style={{
                          backgroundColor: "#fafafa",
                          fontWeight: "bold",
                        }}
                      >
                        <Table.Summary.Cell
                          index={0}
                          colSpan={1}
                          align="center"
                        >
                          TỔNG SỐ
                        </Table.Summary.Cell>
                        <Table.Summary.Cell
                          index={1}
                          align="right"
                        ></Table.Summary.Cell>
                        <Table.Summary.Cell
                          index={1}
                          align="right"
                        ></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {fmt(totals.soCay)}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell
                          index={2}
                          align="right"
                        ></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        ))}

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

export default TaoPhieuGiaoNhanPhoi;
