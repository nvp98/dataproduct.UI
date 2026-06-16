/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_PhunThanLoCao from "../../../utils/BM_config/LG_BB_PhunThanLoCao.json";
import { FilterOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
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

// Các cặp Auto+Manual cần tính tổng cho dòng Tổng ca
const NUMERIC_FIELD_PAIRS: Array<[string, string]> = [
  ["nhietDoSiloBotThan1_Auto", "nhietDoSiloBotThan1_Manual"],
  ["nhietDoSiloBotThan2_Auto", "nhietDoSiloBotThan2_Manual"],
  ["nhietDoBonPhunThoi1_Auto", "nhietDoBonPhunThoi1_Manual"],
  ["nhietDoBonPhunThoi2_Auto", "nhietDoBonPhunThoi2_Manual"],
  ["nhietDoBonPhunThoi3_Auto", "nhietDoBonPhunThoi3_Manual"],
  ["dongDienMayNghien_Auto", "dongDienMayNghien_Manual"],
  ["dongDienQuatGioNguoc_Auto", "dongDienQuatGioNguoc_Manual"],
  ["nhietDoDauVaoMayNghien_Auto", "nhietDoDauVaoMayNghien_Manual"],
  ["nhietDoDauRaMayNghien_Auto", "nhietDoDauRaMayNghien_Manual"],
  ["nhietDoKhoangLo_Auto", "nhietDoKhoangLo_Manual"],
  ["mucLieuSiloBotThan1_Auto", "mucLieuSiloBotThan1_Manual"],
  ["mucLieuSiloBotThan2_Auto", "mucLieuSiloBotThan2_Manual"],
  ["mucLieuSiloThanTho_Auto", "mucLieuSiloThanTho_Manual"],
  ["trongLuongBonPhunThoi1_Auto", "trongLuongBonPhunThoi1_Manual"],
  ["trongLuongBonPhunThoi2_Auto", "trongLuongBonPhunThoi2_Manual"],
  ["trongLuongBonPhunThoi3_Auto", "trongLuongBonPhunThoi3_Manual"],
  ["apLucKhiThan_Auto", "apLucKhiThan_Manual"],
  ["apLucBonKhiN2_Auto", "apLucBonKhiN2_Manual"],
  ["nhietDoTramDauBoiTron_Auto", "nhietDoTramDauBoiTron_Manual"],
  ["nhietDoStatoDongCoMayNghien_Auto", "nhietDoStatoDongCoMayNghien_Manual"],
  ["nhietDoTrucDongCoMayNghien_Auto", "nhietDoTrucDongCoMayNghien_Manual"],
  ["apLucTrucNghien_Auto", "apLucTrucNghien_Manual"],
  ["yeuCauTuLoCao_Auto", "yeuCauTuLoCao_Manual"],
  ["luongThanPhunThucTe_Auto", "luongThanPhunThucTe_Manual"],
  ["luyKeLuongPhunThanTrongCa_Auto", "luyKeLuongPhunThanTrongCa_Manual"],
  ["soLuongSungPhun_Auto", "soLuongSungPhun_Manual"],
  ["apLucGioLanhLoCao_Auto", "apLucGioLanhLoCao_Manual"],
];

const computeRowSum = (rows: RowData[]): Record<string, number | null> => {
  const result: Record<string, number | null> = {};
  for (const [autoKey, manualKey] of NUMERIC_FIELD_PAIRS) {
    let total = 0;
    let hasValue = false;
    for (const row of rows) {
      const val = row[manualKey] ?? row[autoKey];
      if (typeof val === "number" && !isNaN(val)) { total += val; hasValue = true; }
    }
    result[manualKey] = hasValue ? total : null;
  }
  return result;
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
            onCell: (record: RowData) => ({
              style: record[manualCol.dataIndex] != null && !record._isSummary
                ? { background: "#fff7e6" }
                : undefined,
            }),
            render: (manualVal: any, row: RowData) => {
              if (row._isSummary) return manualVal != null
                ? <b style={{ color: "#222" }}>{Number(manualVal).toFixed(precision)}</b>
                : null;
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
                    background: "transparent",
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
            if (row._isSummary) return col.editable === false
              ? <b style={{ fontWeight: 700 }}>{val ?? ""}</b>
              : null;
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

  // tableData thuần (không có dòng tổng) → dùng cho lưu / edit
  // displayTableData thêm 2 dòng tổng Ca ngày (sau 19h) và Ca đêm (cuối)
  const displayTableData = useMemo<RowData[]>(() => {
    if (!tableData.length) return tableData;
    const toHour = (tg: string) => parseInt((tg || "").replace("h", ""));
    const ca1Rows = tableData.filter((r) => { const h = toHour(r.thoiGian as string); return h >= 8 && h <= 19; });
    const ca2Rows = tableData.filter((r) => { const h = toHour(r.thoiGian as string); return !isNaN(h) && (h >= 20 || h <= 7); });
    const ca1Summary: RowData = { key: "summary-ca1", thoiGian: "Tổng", _isSummary: true, ...computeRowSum(ca1Rows) };
    const ca2Summary: RowData = { key: "summary-ca2", thoiGian: "Tổng", _isSummary: true, ...computeRowSum(ca2Rows) };
    const result = [...tableData, ca2Summary];
    const idx19 = result.findIndex((r) => r.thoiGian === "19h");
    if (idx19 >= 0) result.splice(idx19 + 1, 0, ca1Summary);
    return result;
  }, [tableData]);

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

          // Ưu tiên đọc scope và NgaySX từ cột BMPhieu (đáng tin cậy hơn jsonData)
          const phieuOverrides: Record<string, any> = {};
          const phieuScope = (res as any)?.scope ?? null;
          const phieuNgaySX = (res as any)?.ngaySX ?? null;
          if (phieuScope != null) phieuOverrides["loCao"] = phieuScope;
          if (phieuNgaySX) {
            const p = dayjs(phieuNgaySX);
            if (p.isValid()) phieuOverrides["NgaySX"] = p;
          }

          form.setFieldsValue({ ...data, ...signatureFields, ...parsedDates, ...phieuOverrides });

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
              // Index chi tiết by formatted hour để merge vào defaultTableData
              const byHour: Record<string, any> = {};
              chiTietRows.forEach((row: any) => { byHour[formatThoiGian(row.thoiGian)] = row; });

              // Dùng defaultTableData làm base (đủ 24 giờ theo thứ tự), overlay chi tiết lên trên
              setTableData(
                defaultTableData.map((defRow) => {
                  const ct = byHour[defRow.thoiGian as string];
                  if (!ct) return defRow;
                  return {
                    ...defRow,
                    chiTietId: ct.id,
                    nhietDoSiloBotThan1_Auto: ct.nhietDoSiloBotThan1_Auto,
                    nhietDoSiloBotThan1_Manual: ct.nhietDoSiloBotThan1_Manual,
                    nhietDoSiloBotThan2_Auto: ct.nhietDoSiloBotThan2_Auto,
                    nhietDoSiloBotThan2_Manual: ct.nhietDoSiloBotThan2_Manual,
                    nhietDoBonPhunThoi1_Auto: ct.nhietDoBonPhunThoi1_Auto,
                    nhietDoBonPhunThoi1_Manual: ct.nhietDoBonPhunThoi1_Manual,
                    nhietDoBonPhunThoi2_Auto: ct.nhietDoBonPhunThoi2_Auto,
                    nhietDoBonPhunThoi2_Manual: ct.nhietDoBonPhunThoi2_Manual,
                    nhietDoBonPhunThoi3_Auto: ct.nhietDoBonPhunThoi3_Auto,
                    nhietDoBonPhunThoi3_Manual: ct.nhietDoBonPhunThoi3_Manual,
                    dongDienMayNghien_Auto: ct.dongDienMayNghien_Auto,
                    dongDienMayNghien_Manual: ct.dongDienMayNghien_Manual,
                    dongDienQuatGioNguoc_Auto: ct.dongDienQuatGioNguoc_Auto,
                    dongDienQuatGioNguoc_Manual: ct.dongDienQuatGioNguoc_Manual,
                    nhietDoDauVaoMayNghien_Auto: ct.nhietDoDauVaoMayNghien_Auto,
                    nhietDoDauVaoMayNghien_Manual: ct.nhietDoDauVaoMayNghien_Manual,
                    nhietDoDauRaMayNghien_Auto: ct.nhietDoDauRaMayNghien_Auto,
                    nhietDoDauRaMayNghien_Manual: ct.nhietDoDauRaMayNghien_Manual,
                    nhietDoKhoangLo_Auto: ct.nhietDoKhoangLo_Auto,
                    nhietDoKhoangLo_Manual: ct.nhietDoKhoangLo_Manual,
                    mucLieuSiloBotThan1_Auto: ct.mucLieuSiloBotThan1_Auto,
                    mucLieuSiloBotThan1_Manual: ct.mucLieuSiloBotThan1_Manual,
                    mucLieuSiloBotThan2_Auto: ct.mucLieuSiloBotThan2_Auto,
                    mucLieuSiloBotThan2_Manual: ct.mucLieuSiloBotThan2_Manual,
                    mucLieuSiloThanTho_Auto: ct.mucLieuSiloThanTho_Auto,
                    mucLieuSiloThanTho_Manual: ct.mucLieuSiloThanTho_Manual,
                    trongLuongBonPhunThoi1_Auto: ct.trongLuongBonPhunThoi1_Auto,
                    trongLuongBonPhunThoi1_Manual: ct.trongLuongBonPhunThoi1_Manual,
                    trongLuongBonPhunThoi2_Auto: ct.trongLuongBonPhunThoi2_Auto,
                    trongLuongBonPhunThoi2_Manual: ct.trongLuongBonPhunThoi2_Manual,
                    trongLuongBonPhunThoi3_Auto: ct.trongLuongBonPhunThoi3_Auto,
                    trongLuongBonPhunThoi3_Manual: ct.trongLuongBonPhunThoi3_Manual,
                    apLucKhiThan_Auto: ct.apLucKhiThan_Auto,
                    apLucKhiThan_Manual: ct.apLucKhiThan_Manual,
                    apLucBonKhiN2_Auto: ct.apLucBonKhiN2_Auto,
                    apLucBonKhiN2_Manual: ct.apLucBonKhiN2_Manual,
                    nhietDoTramDauBoiTron_Auto: ct.nhietDoTramDauBoiTron_Auto,
                    nhietDoTramDauBoiTron_Manual: ct.nhietDoTramDauBoiTron_Manual,
                    nhietDoStatoDongCoMayNghien_Auto: ct.nhietDoStatoDongCoMayNghien_Auto,
                    nhietDoStatoDongCoMayNghien_Manual: ct.nhietDoStatoDongCoMayNghien_Manual,
                    nhietDoTrucDongCoMayNghien_Auto: ct.nhietDoTrucDongCoMayNghien_Auto,
                    nhietDoTrucDongCoMayNghien_Manual: ct.nhietDoTrucDongCoMayNghien_Manual,
                    apLucTrucNghien_Auto: ct.apLucTrucNghien_Auto,
                    apLucTrucNghien_Manual: ct.apLucTrucNghien_Manual,
                    yeuCauTuLoCao_Auto: ct.yeuCauTuLoCao_Auto,
                    yeuCauTuLoCao_Manual: ct.yeuCauTuLoCao_Manual,
                    luongThanPhunThucTe_Auto: ct.luongThanPhunThucTe_Auto,
                    luongThanPhunThucTe_Manual: ct.luongThanPhunThucTe_Manual,
                    luyKeLuongPhunThanTrongCa_Auto: ct.luyKeLuongPhunThanTrongCa_Auto,
                    luyKeLuongPhunThanTrongCa_Manual: ct.luyKeLuongPhunThanTrongCa_Manual,
                    soLuongSungPhun_Auto: ct.soLuongSungPhun_Auto,
                    soLuongSungPhun_Manual: ct.soLuongSungPhun_Manual,
                    apLucGioLanhLoCao_Auto: ct.apLucGioLanhLoCao_Auto,
                    apLucGioLanhLoCao_Manual: ct.apLucGioLanhLoCao_Manual,
                    ghiChu: ct.ghiChu,
                  };
                })
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
      scope: formData.loCao ?? null,
      NgaySX: formattedDates.NgaySX ?? null,
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

  const handleLoadAutoData = useCallback(async () => {
    const values = form.getFieldsValue();
    const idLoCao: number | undefined = values.loCao;
    const ngaySanXuat = values.NgaySX;

    if (!idLoCao || !ngaySanXuat) {
      message.warning("Vui lòng chọn Lò cao và Ngày sản xuất trước khi tải dữ liệu!");
      return;
    }

    try {
      setLoadingAuto(true);
      const dateStr = dayjs(ngaySanXuat).format("YYYY-MM-DD");
      const autoData = (await lgPTLCApi.getAutoData(idLoCao, dateStr, idphieu)) as unknown as any[];

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

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleLoadAutoData}
            disabled={isFormLocked}
            loading={loadingAuto}
          >
            Tải dữ liệu
          </Button>
          {actionButtons}
        </div>

        {tableSection && (
          <div style={{ marginTop: 12 }}>
            <style>{`.nkvh-table .nkvh-summary > td { background: #fffbe6 !important; }`}</style>
            <Table
              className="nkvh-table"
              bordered
              size="small"
              pagination={false}
              loading={loading}
              dataSource={displayTableData}
              rowKey="key"
              scroll={{ x: "max-content", y: 600 }}
              sticky
              columns={tableColumns}
              rowClassName={(record: RowData) => record._isSummary ? "nkvh-summary" : ""}
            />
          </div>
        )}

        {prodSummarySection && (
          <Card
            title={prodSummarySection.title}
            size="small"
            style={{ marginTop: 16 }}
          >
            <Table

              bordered
              pagination={false}
              size="small"
              rowKey="key"
              dataSource={[
                {
                  key: "sanLuongNghien",
                  chiTieu: "Sản lượng nghiền (t)"
                },
                {
                  key: "sanLuongPhun",
                  chiTieu: "Sản lượng phun (t)"
                },
                {
                  key: "tonThanTho",
                  chiTieu: "Tồn than thô (t)"
                },
                {
                  key: "tonThanTinh",
                  chiTieu: "Tồn than tinh (t)"
                }
              ]}
              columns={[
                {
                  title: "Kíp",
                  dataIndex: "chiTieu",
                  width: 250
                },
                {
                  title: "Kíp A",
                  dataIndex: "caNgay",
                  render: (_, record) => (
                    <Form.Item
                      name={[
                        prodSummarySection.key,
                        record.key,
                        "caNgay"
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        disabled={isFormLocked}
                      />
                    </Form.Item>
                  )
                },
                {
                  title: "Kíp B",
                  dataIndex: "caDem",
                  render: (_, record) => (
                    <Form.Item
                      name={[
                        prodSummarySection.key,
                        record.key,
                        "caDem"
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        disabled={isFormLocked}
                      />
                    </Form.Item>
                  )
                },
                {
                  title: "Tổng",
                  dataIndex: "tong",
                  render: (_, record) => {
                    const ngay =
                      form.getFieldValue([
                        prodSummarySection.key,
                        record.key,
                        "caNgay"
                      ]) || 0;

                    const dem =
                      form.getFieldValue([
                        prodSummarySection.key,
                        record.key,
                        "caDem"
                      ]) || 0;

                    return (
                      <InputNumber
                        value={Number(ngay) + Number(dem)}
                        disabled
                        style={{ width: "100%" }}
                      />
                    );
                  }
                }
              ]}
            />
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
