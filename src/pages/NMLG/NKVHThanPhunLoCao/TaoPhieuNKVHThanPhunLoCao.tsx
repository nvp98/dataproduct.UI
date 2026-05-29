/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_PhunThanLoCao from "../../../utils/BM_config/LG_BB_PhunThanLoCao.json";
import { FileExcelOutlined, FilePdfOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Tooltip,
  Typography,
} from "antd";
import { Table } from "antd";
import type { ColumnType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import { lgPTLCApi } from "../../../services/LGPTLCApi";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

type RowData = Record<string, any> & { key: string };

const getUserInfo = () => {
  const stored = localStorage.getItem("userinfo");
  return stored ? JSON.parse(stored) : {};
};

const config = LG_BB_PhunThanLoCao;
const tableSection = (config.layout as any[]).find((s) => s.sectionType === "table");
const textareaSections = (config.layout as any[]).filter((s) => s.sectionType === "textarea");
const prodSummarySection = (config.layout as any[]).find((s) => s.sectionType === "productionSummary");

const formatThoiGian = (thoiGianStr: string): string => {
  const d = new Date(thoiGianStr);
  const hour = d.getHours();
  return `${String(hour).padStart(2, "0")}h`;
};

const TaoPhieuNKVHThanPhunLoCao = ({ useChiTietApi = false }: { useChiTietApi?: boolean }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const [form] = Form.useForm();
  const [tableData, setTableData] = useState<RowData[]>([]);
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

  const handleCellChange = useCallback((key: string, dataIndex: string, value: any) => {
    setTableData((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [dataIndex]: value } : row))
    );
  }, []);

  const tableColumns = useMemo((): ColumnType<RowData>[] => {
    if (!tableSection) return [];

    // Detect a {Auto, Manual} leaf pair → merge into 1 editable column
    const isMergeablePair = (col: any): boolean => {
      if (!col.children || col.children.length !== 2) return false;
      const [a, b] = col.children;
      if (a.children || b.children) return false;
      return (
        a.editable === false &&
        typeof a.dataIndex === "string" && a.dataIndex.endsWith("_Auto") &&
        typeof b.dataIndex === "string" && b.dataIndex.endsWith("_Manual")
      );
    };

    const extractUnit = (title: string): string => {
      const m = title.match(/\(([^)]+)\)/);
      return m ? ` (${m[1]})` : "";
    };

    const buildCols = (cols: any[]): ColumnType<RowData>[] =>
      cols.map((col: any) => {
        // Mergeable Auto+Manual pair → single editable column
        if (isMergeablePair(col)) {
          const autoCol = col.children[0];
          const manualCol = col.children[1];
          const unit = extractUnit(autoCol.title);
          const precision = manualCol.precision !== undefined
            ? manualCol.precision
            : autoCol.precision !== undefined ? autoCol.precision : 1;
          return {
            title: `${col.title}${unit}`,
            dataIndex: manualCol.dataIndex,
            width: manualCol.width ?? autoCol.width ?? 90,
            align: (autoCol.align ?? "center") as "center" | "left" | "right",
            fixed: autoCol.fixed as "left" | "right" | undefined,
            onHeaderCell: () => ({ style: { fontSize: 11 } }),
            render: (manualVal: any, row: RowData) => {
              const autoVal = row[autoCol.dataIndex];
              const isOverridden = manualVal != null;
              const displayVal = isOverridden ? manualVal : autoVal;
              if (isFormLocked) {
                return displayVal != null
                  ? <span style={{ color: isOverridden ? undefined : "#1677ff" }}>{String(displayVal)}</span>
                  : "";
              }
              return (
                <InputNumber
                  value={displayVal ?? undefined}
                  size="small"
                  precision={precision}
                  style={{
                    width: "100%",
                    minWidth: 70,
                    color: isOverridden ? undefined : "#1677ff",
                  }}
                  onChange={(v) => handleCellChange(row.key, manualCol.dataIndex, v ?? null)}
                />
              );
            },
          } as ColumnType<RowData>;
        }

        // Has children (group header) – recurse
        if (col.children && col.children.length > 0) {
          return {
            title: col.title,
            children: buildCols(col.children),
          } as ColumnType<RowData>;
        }

        // Plain leaf column (e.g. ghiChu, thoiGian)
        return {
          title: col.title,
          dataIndex: col.dataIndex,
          width: col.width ?? 90,
          align: (col.align ?? "center") as "center" | "left" | "right",
          fixed: col.fixed as "left" | "right" | undefined,
          onHeaderCell: col.editable === false
            ? () => ({ style: { background: "#e6f4ff", fontSize: 11 } })
            : () => ({ style: { fontSize: 11 } }),
          render: (val: any, row: RowData) => {
            if (col.editable === false) {
              return (
                <span style={{ color: "#1677ff", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {val ?? ""}
                </span>
              );
            }
            if (isFormLocked) return val != null ? String(val) : "";
            if (col.inputType === "text") {
              return (
                <Input
                  value={val ?? ""}
                  size="small"
                  style={{ width: "100%", minWidth: 120 }}
                  onChange={(e) => handleCellChange(row.key, col.dataIndex, e.target.value)}
                />
              );
            }
            return (
              <InputNumber
                value={val ?? undefined}
                style={{ width: "100%", minWidth: 70 }}
                size="small"
                precision={col.precision !== undefined ? col.precision : 1}
                onChange={(v) => handleCellChange(row.key, col.dataIndex, v)}
              />
            );
          },
        } as ColumnType<RowData>;
      });

    return buildCols(tableSection.columns);
  }, [isFormLocked, handleCellChange]);

  const defaultTableData: RowData[] = useMemo(
    () =>
      ((tableSection?.defaultRows as any[]) || []).map((row: any, idx: number) => ({
        ...row,
        key: `row-${idx}`,
      })),
    []
  );

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      if (idphieu) {
        const res = await PhieuApi.getDetail(idphieu);
        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          if (useChiTietApi) {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = (config.signatures as any[]).find(
                (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
              );
              if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
            });
          } else {
            const pheDuyetFromJson = data.pheDuyet || [];
            if (pheDuyetFromJson.length > 0) {
              pheDuyetFromJson.forEach((pd: any) => {
                if (pd.maKyDuyet && pd.nguoiDuyetId) signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
              });
            } else {
              ((res as any)?.pheDuyet || []).forEach((pd: any) => {
                const sig = (config.signatures as any[]).find(
                  (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
                );
                if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
              });
            }
          }

          const dateFields = (config.headerFields as any[])
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const p = dayjs(data[k]);
              parsedDates[k] = p.isValid() ? p : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          form.setFieldsValue({ ...data, ...signatureFields, ...parsedDates });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            (config.signatures as any[])
              .filter((s: any) => s.capDuyet === 0)
              .forEach((s: any) => {
                overrides[s.key] = getUserInfo()?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          // Load chi tiết from dedicated API (Auto + Manual data)
          try {
            const chiTietRows = (await lgPTLCApi.getChiTiet(idphieu)) as unknown as any[];
            if (chiTietRows && chiTietRows.length > 0) {
              setTableData(
                chiTietRows.map((row: any, idx: number) => ({
                  key: `row-${idx}`,
                  chiTietId: row.id,
                  thoiGian: formatThoiGian(row.thoiGian),
                  nhietDoSiloBotThan1_Auto: row.nhietDoSiloBotThan1_Auto,
                  nhietDoSiloBotThan1_Manual: row.nhietDoSiloBotThan1_Manual,
                  nhietDoSiloBotThan2_Auto: row.nhietDoSiloBotThan2_Auto,
                  nhietDoSiloBotThan2_Manual: row.nhietDoSiloBotThan2_Manual,
                  nhietDoBonPhunThoi1_Auto: row.nhietDoBonPhunThoi1_Auto,
                  nhietDoBonPhunThoi1_Manual: row.nhietDoBonPhunThoi1_Manual,
                  nhietDoBonPhunThoi2_Auto: row.nhietDoBonPhunThoi2_Auto,
                  nhietDoBonPhunThoi2_Manual: row.nhietDoBonPhunThoi2_Manual,
                  nhietDoBonPhunThoi3_Auto: row.nhietDoBonPhunThoi3_Auto,
                  nhietDoBonPhunThoi3_Manual: row.nhietDoBonPhunThoi3_Manual,
                  dongDienMayNghien_Auto: row.dongDienMayNghien_Auto,
                  dongDienMayNghien_Manual: row.dongDienMayNghien_Manual,
                  dongDienQuatGioNguoc_Auto: row.dongDienQuatGioNguoc_Auto,
                  dongDienQuatGioNguoc_Manual: row.dongDienQuatGioNguoc_Manual,
                  nhietDoDauVaoMayNghien_Auto: row.nhietDoDauVaoMayNghien_Auto,
                  nhietDoDauVaoMayNghien_Manual: row.nhietDoDauVaoMayNghien_Manual,
                  nhietDoDauRaMayNghien_Auto: row.nhietDoDauRaMayNghien_Auto,
                  nhietDoDauRaMayNghien_Manual: row.nhietDoDauRaMayNghien_Manual,
                  nhietDoKhoangLo_Auto: row.nhietDoKhoangLo_Auto,
                  nhietDoKhoangLo_Manual: row.nhietDoKhoangLo_Manual,
                  mucLieuSiloBotThan1_Auto: row.mucLieuSiloBotThan1_Auto,
                  mucLieuSiloBotThan1_Manual: row.mucLieuSiloBotThan1_Manual,
                  mucLieuSiloBotThan2_Auto: row.mucLieuSiloBotThan2_Auto,
                  mucLieuSiloBotThan2_Manual: row.mucLieuSiloBotThan2_Manual,
                  mucLieuSiloThanTho_Auto: row.mucLieuSiloThanTho_Auto,
                  mucLieuSiloThanTho_Manual: row.mucLieuSiloThanTho_Manual,
                  trongLuongBonPhunThoi1_Auto: row.trongLuongBonPhunThoi1_Auto,
                  trongLuongBonPhunThoi1_Manual: row.trongLuongBonPhunThoi1_Manual,
                  trongLuongBonPhunThoi2_Auto: row.trongLuongBonPhunThoi2_Auto,
                  trongLuongBonPhunThoi2_Manual: row.trongLuongBonPhunThoi2_Manual,
                  trongLuongBonPhunThoi3_Auto: row.trongLuongBonPhunThoi3_Auto,
                  trongLuongBonPhunThoi3_Manual: row.trongLuongBonPhunThoi3_Manual,
                  apLucKhiThan_Auto: row.apLucKhiThan_Auto,
                  apLucKhiThan_Manual: row.apLucKhiThan_Manual,
                  apLucBonKhiN2_Auto: row.apLucBonKhiN2_Auto,
                  apLucBonKhiN2_Manual: row.apLucBonKhiN2_Manual,
                  nhietDoTramDauBoiTron_Auto: row.nhietDoTramDauBoiTron_Auto,
                  nhietDoTramDauBoiTron_Manual: row.nhietDoTramDauBoiTron_Manual,
                  nhietDoStatoDongCoMayNghien_Auto: row.nhietDoStatoDongCoMayNghien_Auto,
                  nhietDoStatoDongCoMayNghien_Manual: row.nhietDoStatoDongCoMayNghien_Manual,
                  nhietDoTrucDongCoMayNghien_Auto: row.nhietDoTrucDongCoMayNghien_Auto,
                  nhietDoTrucDongCoMayNghien_Manual: row.nhietDoTrucDongCoMayNghien_Manual,
                  apLucTrucNghien_Auto: row.apLucTrucNghien_Auto,
                  apLucTrucNghien_Manual: row.apLucTrucNghien_Manual,
                  yeuCauTuLoCao_Auto: row.yeuCauTuLoCao_Auto,
                  yeuCauTuLoCao_Manual: row.yeuCauTuLoCao_Manual,
                  luongThanPhunThucTe_Auto: row.luongThanPhunThucTe_Auto,
                  luongThanPhunThucTe_Manual: row.luongThanPhunThucTe_Manual,
                  luyKeLuongPhunThanTrongCa_Auto: row.luyKeLuongPhunThanTrongCa_Auto,
                  luyKeLuongPhunThanTrongCa_Manual: row.luyKeLuongPhunThanTrongCa_Manual,
                  soLuongSungPhun_Auto: row.soLuongSungPhun_Auto,
                  soLuongSungPhun_Manual: row.soLuongSungPhun_Manual,
                  apLucGioLanhLoCao_Auto: row.apLucGioLanhLoCao_Auto,
                  apLucGioLanhLoCao_Manual: row.apLucGioLanhLoCao_Manual,
                  ghiChu: row.ghiChu,
                }))
              );
            } else {
              setTableData(defaultTableData);
            }
          } catch {
            // Fall back to JSON table data if chi tiết API fails
            const savedRows = data[tableSection?.key] || [];
            setTableData(
              defaultTableData.map((defRow) => {
                const saved = savedRows.find((r: any) => r.thoiGian === defRow.thoiGian);
                return saved ? { ...defRow, ...saved, key: defRow.key } : defRow;
              })
            );
          }

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
            idPhieuGoc:
              (res as any)?.idPhieuGoc ??
              (res as any)?.iD_PhieuGoc ??
              null,
          });
        }
      } else {
        setPhieuInfo({});
        setTableData(defaultTableData);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          (config.signatures as any[])
            .filter((s: any) => s.capDuyet === 0)
            .forEach((s: any) => {
              overrides[s.key] = getUserInfo()?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, useChiTietApi, defaultTableData]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();
    const pheDuyetFlow = (config.signatures as any[]).map((s: any) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));
    const dateFields = (config.headerFields as any[])
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });
    // Exclude chiTietId (internal tracking only) from persisted JSON
    const processedTable = tableData.map(({ key, chiTietId, ...rest }) => rest);
    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      [tableSection?.key ?? "nhatKyVanHanh"]: processedTable,
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [form, tableData]);

  // Saves Manual values to LG_NKVHPT_ChiTiet via dedicated API
  const handleCustomPut = useCallback(
    async (idPhieuParam: string, _formData: Record<string, unknown>) => {
      const items = tableData
        .filter((row) => typeof row.chiTietId === "number" && row.chiTietId > 0)
        .map((row) => ({
          id: row.chiTietId as number,
          nhietDoSiloBotThan1_Manual: row.nhietDoSiloBotThan1_Manual ?? null,
          nhietDoSiloBotThan2_Manual: row.nhietDoSiloBotThan2_Manual ?? null,
          nhietDoBonPhunThoi1_Manual: row.nhietDoBonPhunThoi1_Manual ?? null,
          nhietDoBonPhunThoi2_Manual: row.nhietDoBonPhunThoi2_Manual ?? null,
          nhietDoBonPhunThoi3_Manual: row.nhietDoBonPhunThoi3_Manual ?? null,
          dongDienMayNghien_Manual: row.dongDienMayNghien_Manual ?? null,
          dongDienQuatGioNguoc_Manual: row.dongDienQuatGioNguoc_Manual ?? null,
          nhietDoDauVaoMayNghien_Manual: row.nhietDoDauVaoMayNghien_Manual ?? null,
          nhietDoDauRaMayNghien_Manual: row.nhietDoDauRaMayNghien_Manual ?? null,
          nhietDoKhoangLo_Manual: row.nhietDoKhoangLo_Manual ?? null,
          mucLieuSiloBotThan1_Manual: row.mucLieuSiloBotThan1_Manual ?? null,
          mucLieuSiloBotThan2_Manual: row.mucLieuSiloBotThan2_Manual ?? null,
          mucLieuSiloThanTho_Manual: row.mucLieuSiloThanTho_Manual ?? null,
          trongLuongBonPhunThoi1_Manual: row.trongLuongBonPhunThoi1_Manual ?? null,
          trongLuongBonPhunThoi2_Manual: row.trongLuongBonPhunThoi2_Manual ?? null,
          trongLuongBonPhunThoi3_Manual: row.trongLuongBonPhunThoi3_Manual ?? null,
          apLucKhiThan_Manual: row.apLucKhiThan_Manual ?? null,
          apLucBonKhiN2_Manual: row.apLucBonKhiN2_Manual ?? null,
          nhietDoTramDauBoiTron_Manual: row.nhietDoTramDauBoiTron_Manual ?? null,
          nhietDoStatoDongCoMayNghien_Manual: row.nhietDoStatoDongCoMayNghien_Manual ?? null,
          nhietDoTrucDongCoMayNghien_Manual: row.nhietDoTrucDongCoMayNghien_Manual ?? null,
          apLucTrucNghien_Manual: row.apLucTrucNghien_Manual ?? null,
          yeuCauTuLoCao_Manual: row.yeuCauTuLoCao_Manual ?? null,
          luongThanPhunThucTe_Manual: row.luongThanPhunThucTe_Manual ?? null,
          luyKeLuongPhunThanTrongCa_Manual: row.luyKeLuongPhunThanTrongCa_Manual ?? null,
          soLuongSungPhun_Manual: row.soLuongSungPhun_Manual ?? null,
          apLucGioLanhLoCao_Manual: row.apLucGioLanhLoCao_Manual ?? null,
          ghiChu: row.ghiChu ?? null,
        }));
      if (items.length > 0) {
        await lgPTLCApi.updateManual({ idPhieu: idPhieuParam, items });
      }
    },
    [tableData]
  );

  const [loadingAuto, setLoadingAuto] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const downloadBlob = useCallback((blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!idphieu) return;
    try {
      setExportingExcel(true);
      const res = await lgPTLCApi.exportExcel(idphieu);
      const raw = res as unknown;
      const blob = raw instanceof Blob
        ? raw
        : new Blob([raw as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (blob.size === 0) throw new Error("Dữ liệu Excel rỗng hoặc không hợp lệ.");
      downloadBlob(blob, `${config.prefix}_${soPhieu || idphieu}.xlsx`);
    } catch (error: any) {
      message.error(error?.message || "Xuất Excel thất bại!");
    } finally {
      setExportingExcel(false);
    }
  }, [idphieu, soPhieu, downloadBlob]);

  const handleExportPdf = useCallback(async () => {
    if (!idphieu) return;
    try {
      setExportingPdf(true);
      const res = await lgPTLCApi.exportPdf(idphieu);
      const raw = res as unknown;
      const blob = raw instanceof Blob
        ? raw
        : new Blob([raw as any], { type: "application/pdf" });
      if (blob.size === 0) throw new Error("Dữ liệu PDF rỗng hoặc không hợp lệ.");
      downloadBlob(blob, `${config.prefix}_${soPhieu || idphieu}.pdf`);
    } catch (error: any) {
      message.error(error?.message || "Xuất PDF thất bại!");
    } finally {
      setExportingPdf(false);
    }
  }, [idphieu, soPhieu, downloadBlob]);

  const handleLoadAutoData = useCallback(async () => {
    const values = form.getFieldsValue();
    const idLoCao: number | undefined = values.loCao;
    const ngaySanXuat = values.ngaySanXuat;

    if (!idLoCao || !ngaySanXuat) {
      message.warning("Vui lòng chọn Lò cao và Ngày sản xuất trước khi tải dữ liệu!");
      return;
    }

    try {
      setLoadingAuto(true);
      const dateStr = dayjs(ngaySanXuat).format("YYYY-MM-DD");
      const autoData = (await lgPTLCApi.getAutoData(idLoCao, dateStr)) as unknown as any[];

      if (!autoData || autoData.length === 0) {
        message.warning("Không có dữ liệu tự động cho ngày và lò cao đã chọn!");
        return;
      }

      // Build lookup by hour from datetime string
      const autoByHour: Record<string, any> = {};
      autoData.forEach((item: any) => {
        const hour = new Date(item.thoiGian).getHours();
        const key = `${String(hour).padStart(2, "0")}h`;
        autoByHour[key] = item;
      });

      setTableData((prev) =>
        prev.map((row) => {
          const auto = autoByHour[row.thoiGian as string];
          if (!auto) return row;
          return {
            ...row,
            nhietDoSiloBotThan1_Auto: auto.nhietDoSiloBotThan1_Auto ?? row.nhietDoSiloBotThan1_Auto,
            nhietDoSiloBotThan2_Auto: auto.nhietDoSiloBotThan2_Auto ?? row.nhietDoSiloBotThan2_Auto,
            nhietDoBonPhunThoi1_Auto: auto.nhietDoBonPhunThoi1_Auto ?? row.nhietDoBonPhunThoi1_Auto,
            nhietDoBonPhunThoi2_Auto: auto.nhietDoBonPhunThoi2_Auto ?? row.nhietDoBonPhunThoi2_Auto,
            nhietDoBonPhunThoi3_Auto: auto.nhietDoBonPhunThoi3_Auto ?? row.nhietDoBonPhunThoi3_Auto,
            dongDienMayNghien_Auto: auto.dongDienMayNghien_Auto ?? row.dongDienMayNghien_Auto,
            dongDienQuatGioNguoc_Auto: auto.dongDienQuatGioNguoc_Auto ?? row.dongDienQuatGioNguoc_Auto,
            nhietDoDauVaoMayNghien_Auto: auto.nhietDoDauVaoMayNghien_Auto ?? row.nhietDoDauVaoMayNghien_Auto,
            nhietDoDauRaMayNghien_Auto: auto.nhietDoDauRaMayNghien_Auto ?? row.nhietDoDauRaMayNghien_Auto,
            nhietDoKhoangLo_Auto: auto.nhietDoKhoangLo_Auto ?? row.nhietDoKhoangLo_Auto,
            mucLieuSiloBotThan1_Auto: auto.mucLieuSiloBotThan1_Auto ?? row.mucLieuSiloBotThan1_Auto,
            mucLieuSiloBotThan2_Auto: auto.mucLieuSiloBotThan2_Auto ?? row.mucLieuSiloBotThan2_Auto,
            mucLieuSiloThanTho_Auto: auto.mucLieuSiloThanTho_Auto ?? row.mucLieuSiloThanTho_Auto,
            trongLuongBonPhunThoi1_Auto: auto.trongLuongBonPhunThoi1_Auto ?? row.trongLuongBonPhunThoi1_Auto,
            trongLuongBonPhunThoi2_Auto: auto.trongLuongBonPhunThoi2_Auto ?? row.trongLuongBonPhunThoi2_Auto,
            trongLuongBonPhunThoi3_Auto: auto.trongLuongBonPhunThoi3_Auto ?? row.trongLuongBonPhunThoi3_Auto,
            apLucKhiThan_Auto: auto.apLucKhiThan_Auto ?? row.apLucKhiThan_Auto,
            apLucBonKhiN2_Auto: auto.apLucBonKhiN2_Auto ?? row.apLucBonKhiN2_Auto,
            nhietDoTramDauBoiTron_Auto: auto.nhietDoTramDauBoiTron_Auto ?? row.nhietDoTramDauBoiTron_Auto,
            nhietDoStatoDongCoMayNghien_Auto: auto.nhietDoStatoDongCoMayNghien_Auto ?? row.nhietDoStatoDongCoMayNghien_Auto,
            nhietDoTrucDongCoMayNghien_Auto: auto.nhietDoTrucDongCoMayNghien_Auto ?? row.nhietDoTrucDongCoMayNghien_Auto,
            apLucTrucNghien_Auto: auto.apLucTrucNghien_Auto ?? row.apLucTrucNghien_Auto,
            yeuCauTuLoCao_Auto: auto.yeuCauTuLoCao_Auto ?? row.yeuCauTuLoCao_Auto,
            luongThanPhunThucTe_Auto: auto.luongThanPhunThucTe_Auto ?? row.luongThanPhunThucTe_Auto,
            luyKeLuongPhunThanTrongCa_Auto: auto.luyKeLuongPhunThanTrongCa_Auto ?? row.luyKeLuongPhunThanTrongCa_Auto,
            soLuongSungPhun_Auto: auto.soLuongSungPhun_Auto ?? row.soLuongSungPhun_Auto,
            apLucGioLanhLoCao_Auto: auto.apLucGioLanhLoCao_Auto ?? row.apLucGioLanhLoCao_Auto,
          };
        })
      );

      message.success(`Đã tải ${autoData.length} dòng dữ liệu tự động từ SCADA!`);
    } catch {
      message.error("Không thể tải dữ liệu tự động!");
    } finally {
      setLoadingAuto(false);
    }
  }, [form]);

  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error: any) {
      message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái");
    }
  }, [form]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieunkvhthanphunlocao/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

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
      customPutApi: handleCustomPut,
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess, handleCustomPut]);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>
        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div><b>{config.isoInfo.code}</b></div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {(config.isoInfo as any).revision || "-"}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {(config.headerFields as any[]).map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {actionButtons}
          <Tooltip title="Tải dữ liệu tự động từ SCADA theo Lò cao và Ngày sản xuất đã chọn">
            <Button
              icon={<ReloadOutlined />}
              loading={loadingAuto}
              onClick={handleLoadAutoData}
            >
              Tải dữ liệu
            </Button>
          </Tooltip>
          {idphieu && (
            <>
              <Button
                icon={<FileExcelOutlined />}
                style={{ backgroundColor: "#217346", borderColor: "#217346", color: "#fff" }}
                loading={exportingExcel}
                onClick={() => void handleExportExcel()}
              >
                Xuất Excel
              </Button>
              <Button
                icon={<FilePdfOutlined />}
                style={{ backgroundColor: "#d32f2f", borderColor: "#d32f2f", color: "#fff" }}
                loading={exportingPdf}
                onClick={() => void handleExportPdf()}
              >
                Xuất PDF
              </Button>
            </>
          )}
        </div>

        {tableSection && (
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontSize: 12, color: "#888" }}>
              <span style={{ color: "#1677ff", fontWeight: 500 }}>■</span> Giá trị tự động (SCADA) — chỉnh sửa để ghi đè thủ công
            </div>
            <Table
              bordered
              size="small"
              pagination={false}
              loading={loading}
              dataSource={tableData}
              rowKey="key"
              scroll={{ x: "max-content", y: 600 }}
              sticky
              columns={tableColumns}
            />
          </div>
        )}

        {prodSummarySection && (
          <Card title={prodSummarySection.title} size="small" style={{ marginTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {(prodSummarySection.fields as any[]).map((field: any) => (
                <Form.Item
                  key={field.key}
                  name={[prodSummarySection.key, field.key]}
                  label={field.label}
                  style={{ marginBottom: 0 }}
                >
                  {field.type === "number" ? (
                    <InputNumber style={{ width: "100%" }} disabled={isFormLocked} />
                  ) : (
                    <Input disabled={isFormLocked} />
                  )}
                </Form.Item>
              ))}
            </div>
          </Card>
        )}

        {textareaSections.map((section: any) => (
          <Form.Item
            key={section.key}
            name={section.key}
            label={<b>{section.title}</b>}
            style={{ marginTop: 16 }}
          >
            <Input.TextArea rows={section.rows || 4} disabled={isFormLocked} />
          </Form.Item>
        ))}

        {(config.footerNotes as string[])?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Typography.Text strong style={{ fontStyle: "italic" }}>
              Ghi chú:
            </Typography.Text>
            {(config.footerNotes as string[]).map((note, idx) => (
              <div key={`note-${idx}`} style={{ fontStyle: "italic" }}>
                - {note}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {(config.signatures as any[])?.map((sig: any, i: number) => {
            const isLevelZero = sig.capDuyet === 0;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={isLevelZero ? (getUserInfo()?.iD_TaiKhoan ?? null) : form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
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

export default TaoPhieuNKVHThanPhunLoCao;
