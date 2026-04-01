/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { InputNumber, Table, message } from "antd";
import apiService from "../services/ApiService";
import CustomFormTable from "./CustomFormTable";
import { quyKhoApi } from "../services/QuyKhoApi";

interface DynamicColumnsConfig {
  url: string;
  param: string;
  sumFormat?: string;
}

interface CustomTableLGProps {
  loCao: number | null | undefined;
  prefixColumns: any[];
  suffixColumns: any[];
  dynamicColumnsConfig: DynamicColumnsConfig;
  fallbackMaterialColumns?: any[];
  materialColumnsOverride?: any[] | null;
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  loading?: boolean;
  editable?: boolean;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number;
  ngay?: string | null;
  ca?: number | null;
}

export interface CustomTableLGRef {
  saveQuyKho: () => Promise<void>;
}

function flattenColumns(cols: any[]): any[] {
  return cols.flatMap((c) =>
    Array.isArray(c.children) && c.children.length > 0
      ? flattenColumns(c.children)
      : [c]
  );
}

const CustomTableLG = forwardRef<CustomTableLGRef, CustomTableLGProps>(function CustomTableLG(
  {
    loCao,
    prefixColumns,
    suffixColumns,
    dynamicColumnsConfig,
    fallbackMaterialColumns = [],
    materialColumnsOverride,
    initialData,
    onDataChange,
    loading,
    editable,
    showAddButton,
    showDeleteButton,
    minRows,
    ngay,
    ca,
  },
  ref
) {
  const [materialColumns, setMaterialColumns] = useState<any[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const prevLoCaoRef = useRef<number | null | undefined>(undefined);

  const [doAmMap, setDoAmMap] = useState<Record<string, number | null>>({});
  // totals được cập nhật mỗi lần summary render
  const totalsRef = useRef<Record<string, number>>({});
  const flatColsRef = useRef<any[]>([]);

  // Load cột động theo loCao
  useEffect(() => {
    if (prevLoCaoRef.current === loCao) return;
    prevLoCaoRef.current = loCao;

    if (!loCao) {
      setMaterialColumns([]);
      return;
    }

    setColumnsLoading(true);
    apiService
      .get(dynamicColumnsConfig.url, {
        params: { [dynamicColumnsConfig.param]: loCao },
      })
      .then((res: any) => {
        const cols = (Array.isArray(res) ? res : []).map((col: any) => ({
          ...col,
          children: col.children?.map((child: any) => ({
            ...child,
            width: child.width ?? 100,
          })),
        }));
        setMaterialColumns(cols);
      })
      .catch(() => {
        message.warning("Không thể tải cấu hình cột, dùng cột mặc định");
        setMaterialColumns([]);
      })
      .finally(() => setColumnsLoading(false));
  }, [loCao, dynamicColumnsConfig]);

  // Load % độ ẩm đã lưu
  useEffect(() => {
    if (!ngay || !ca || !loCao) return;
    quyKhoApi
      .getAll({ ngay, idCa: ca, idLoCao: loCao })
      .then((items) => {
        const map: Record<string, number | null> = {};
        items.forEach((item) => { map[item.dataIndex] = item.doAm; });
        setDoAmMap(map);
      })
      .catch(() => {/* silent */});
  }, [ngay, ca, loCao]);

  // Expose saveQuyKho ra ngoài qua ref
  useImperativeHandle(ref, () => ({
    saveQuyKho: async () => {
      if (!ngay || !ca || !loCao) return;

      const summaryDIs = Object.keys(totalsRef.current);
      if (summaryDIs.length === 0) return;

      const items = summaryDIs.map((di) => {
        const col = flatColsRef.current.find((c) => c.dataIndex === di);
        const doAm = doAmMap[di] ?? 0; // không nhập → 0 → quyKho = tongCong
        return {
          dataIndex: di,
          tenNVL: col?.title ?? di,
          tongCong: totalsRef.current[di] ?? 0,
          doAm,
        };
      });

      await quyKhoApi.save({ ngay, idCa: ca, idLoCao: loCao, items });
    },
  }), [ngay, ca, loCao, doAmMap]);

  const mergedColumns = useMemo(() => {
    const prefixKeys = new Set(prefixColumns.map((c) => c.dataIndex).filter(Boolean));
    const suffixKeys = new Set(suffixColumns.map((c) => c.dataIndex).filter(Boolean));

    const dedup = (cols: any[]) =>
      cols.filter((c) => {
        if (c.children) return true;
        return !prefixKeys.has(c.dataIndex) && !suffixKeys.has(c.dataIndex);
      });

    const rawMiddle =
      materialColumnsOverride != null && materialColumnsOverride.length > 0
        ? materialColumnsOverride
        : materialColumns.length > 0
        ? materialColumns
        : fallbackMaterialColumns;

    const normalizeWidth = (cols: any[]): any[] =>
      cols.map((col) => ({
        ...col,
        children: col.children
          ? col.children.map((child: any) => ({ ...child, width: child.width ?? 100 }))
          : undefined,
      }));

    return [...prefixColumns, ...normalizeWidth(dedup(rawMiddle)), ...suffixColumns];
  }, [prefixColumns, suffixColumns, materialColumns, fallbackMaterialColumns, materialColumnsOverride]);

  const summaryDataIndexes = useMemo(() => {
    return flattenColumns(mergedColumns)
      .filter((c) => c.dataIndex && c.format != null && c.format !== "")
      .map((c) => c.dataIndex as string);
  }, [mergedColumns]);

  const flatCols = useMemo(() => flattenColumns(mergedColumns), [mergedColumns]);

  const summaryRenderer = (pageData: readonly any[]) => {
    if (summaryDataIndexes.length === 0) return null;

    const totals: Record<string, number> = {};
    summaryDataIndexes.forEach((k) => (totals[k] = 0));
    pageData.forEach((row: any) => {
      summaryDataIndexes.forEach((k) => { totals[k] += Number(row[k]) || 0; });
    });

    // Cập nhật ref để saveQuyKho dùng
    totalsRef.current = totals;
    flatColsRef.current = flatCols;

    return (
      <Table.Summary fixed>
        {/* Hàng tổng cộng */}
        <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
          {flatCols.map((col: any, colIndex: number) => {
            if (colIndex === 0) {
              return (
                <Table.Summary.Cell key="summary-label" index={0} align="center">
                  TỔNG CỘNG
                </Table.Summary.Cell>
              );
            }
            const di = col?.dataIndex;
            if (di && summaryDataIndexes.includes(di)) {
              return (
                <Table.Summary.Cell key={`sum-${di}`} index={colIndex} align="right">
                  {totals[di].toLocaleString("en-US")}
                </Table.Summary.Cell>
              );
            }
            return <Table.Summary.Cell key={`sum-empty-${colIndex}`} index={colIndex} />;
          })}
        </Table.Summary.Row>

        {/* Hàng % độ ẩm */}
        <Table.Summary.Row style={{ backgroundColor: "#fffbe6" }}>
          {flatCols.map((col: any, colIndex: number) => {
            if (colIndex === 0) {
              return (
                <Table.Summary.Cell key="doam-label" index={0} align="center">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#d46b08" }}>% Độ ẩm</span>
                </Table.Summary.Cell>
              );
            }
            const di = col?.dataIndex;
            if (di && summaryDataIndexes.includes(di)) {
              return (
                <Table.Summary.Cell key={`doam-${di}`} index={colIndex} align="center">
                  <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    precision={2}
                    value={doAmMap[di] ?? null}
                    onChange={(val) =>
                      setDoAmMap((prev) => ({ ...prev, [di]: val }))
                    }
                    disabled={!editable}
                    style={{ width: "100%" }}
                    placeholder="%"
                  />
                </Table.Summary.Cell>
              );
            }
            return <Table.Summary.Cell key={`doam-empty-${colIndex}`} index={colIndex} />;
          })}
        </Table.Summary.Row>

        {/* Hàng khối lượng quy khô */}
        <Table.Summary.Row style={{ backgroundColor: "#f6ffed", fontWeight: "bold" }}>
          {flatCols.map((col: any, colIndex: number) => {
            if (colIndex === 0) {
              return (
                <Table.Summary.Cell key="quykho-label" index={0} align="center">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#389e0d" }}>Quy khô</span>
                </Table.Summary.Cell>
              );
            }
            const di = col?.dataIndex;
            if (di && summaryDataIndexes.includes(di)) {
              const doAm = doAmMap[di] ?? 0;
              const quyKho = totals[di] * (100 - doAm) / 100;
              return (
                <Table.Summary.Cell key={`quykho-${di}`} index={colIndex} align="right">
                  {quyKho.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </Table.Summary.Cell>
              );
            }
            return <Table.Summary.Cell key={`quykho-empty-${colIndex}`} index={colIndex} />;
          })}
        </Table.Summary.Row>
      </Table.Summary>
    );
  };

  return (
    <CustomFormTable
      columns={mergedColumns}
      initialData={initialData}
      onDataChange={onDataChange}
      addRowButtonText="+ Thêm dòng"
      minRows={minRows ?? 0}
      loading={loading || columnsLoading}
      editable={editable}
      showAddButton={showAddButton}
      showDeleteButton={showDeleteButton}
      summary={summaryDataIndexes.length > 0 ? summaryRenderer : undefined}
      stickyHeader
      scrollY={500}
    />
  );
});

export default CustomTableLG;
