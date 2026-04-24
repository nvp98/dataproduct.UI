/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { InputNumber, Table } from "antd";
import CustomFormTable from "./CustomFormTable";

// ─── Config types (khớp với cấu trúc JSON) ───────────────────────────────────

export interface TableColumnDef {
  title: string;
  dataIndex?: string;
  width?: number;
  format?: string;
  align?: "left" | "right" | "center";
  editable?: boolean;
  children?: TableColumnDef[];
  [key: string]: any;
}

export interface TableDataSource {
  type: "api" | "static";
  endpoint?: string;
  paramsMap?: Record<string, string>;
}

export interface TableSectionConfig {
  key: string;
  sectionType: "table";
  dataSource?: TableDataSource;
  prefixColumns: TableColumnDef[];
  suffixColumns: TableColumnDef[];
  fallbackColumns?: TableColumnDef[];
  columnDefaults?: Partial<TableColumnDef>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomTableLGProps {
  tableConfig: TableSectionConfig;
  materialColumnsOverride?: TableColumnDef[] | null;
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  loading?: boolean;
  editable?: boolean;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenColumns(cols: TableColumnDef[]): TableColumnDef[] {
  return cols.flatMap((c) =>
    Array.isArray(c.children) && c.children.length > 0
      ? flattenColumns(c.children)
      : [c]
  );
}

function applyDefaults(
  cols: TableColumnDef[],
  defaults: Partial<TableColumnDef>
): TableColumnDef[] {
  return cols.map((col) => {
    if (Array.isArray(col.children) && col.children.length > 0) {
      return { ...col, children: applyDefaults(col.children, defaults) };
    }
    return { ...defaults, ...col };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const CustomTableLG = forwardRef<unknown, CustomTableLGProps>(
  function CustomTableLG(
    {
      tableConfig,
      materialColumnsOverride,
      initialData,
      onDataChange,
      loading,
      editable,
      showAddButton,
      showDeleteButton,
      minRows,
    },
    ref
  ) {
    useImperativeHandle(ref, () => ({}), []);

    const {
      prefixColumns,
      suffixColumns,
      fallbackColumns = [],
      columnDefaults = {},
    } = tableConfig;

    const rawMaterialCols =
      materialColumnsOverride != null && materialColumnsOverride.length > 0
        ? materialColumnsOverride
        : fallbackColumns;

    const materialCols = useMemo(
      () => applyDefaults(rawMaterialCols, columnDefaults),
      [rawMaterialCols, columnDefaults]
    );

    const prefixKeys = useMemo(
      () => new Set(prefixColumns.map((c) => c.dataIndex).filter(Boolean)),
      [prefixColumns]
    );
    const suffixKeys = useMemo(
      () => new Set(suffixColumns.map((c) => c.dataIndex).filter(Boolean)),
      [suffixColumns]
    );

    const dedupedMaterial = useMemo(
      () =>
        materialCols.filter((c) => {
          if (c.children) return true;
          return !prefixKeys.has(c.dataIndex) && !suffixKeys.has(c.dataIndex);
        }),
      [materialCols, prefixKeys, suffixKeys]
    );

    const mergedColumns = useMemo(
      () => [...prefixColumns, ...dedupedMaterial, ...suffixColumns],
      [prefixColumns, dedupedMaterial, suffixColumns]
    );

    const summaryIndexes = useMemo(
      () =>
        flattenColumns(mergedColumns)
          .filter((c) => c.dataIndex && c.format != null && c.format !== "")
          .map((c) => c.dataIndex as string),
      [mergedColumns]
    );

    const flatCols = useMemo(
      () => flattenColumns(mergedColumns),
      [mergedColumns]
    );

    const [doAmMap, setDoAmMap] = useState<Record<string, number>>({});

    useEffect(() => {
      setDoAmMap({});
    }, [summaryIndexes]);

    const summaryRenderer = (pageData: readonly any[]) => {
      if (summaryIndexes.length === 0) return null;

      const totals: Record<string, number> = {};
      summaryIndexes.forEach((k) => (totals[k] = 0));
      pageData.forEach((row: any) => {
        summaryIndexes.forEach((k) => {
          totals[k] += Number(row[k]) || 0;
        });
      });

      return (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
            {flatCols.map((col, colIndex) => {
              if (colIndex === 0) {
                return (
                  <Table.Summary.Cell key="summary-label" index={0} align="center">
                    TỔNG CỘNG
                  </Table.Summary.Cell>
                );
              }
              const di = col?.dataIndex;
              if (di && summaryIndexes.includes(di)) {
                return (
                  <Table.Summary.Cell key={`sum-${di}`} index={colIndex} align="right">
                    {totals[di].toLocaleString("en-US")}
                  </Table.Summary.Cell>
                );
              }
              return <Table.Summary.Cell key={`sum-empty-${colIndex}`} index={colIndex} />;
            })}
          </Table.Summary.Row>

          <Table.Summary.Row style={{ backgroundColor: "#f0f5ff" }}>
            {flatCols.map((col, colIndex) => {
              if (colIndex === 0) {
                return (
                  <Table.Summary.Cell key="doam-label" index={0} align="center">
                    <b>Độ ẩm</b>
                  </Table.Summary.Cell>
                );
              }
              const di = col?.dataIndex;
              if (di && summaryIndexes.includes(di)) {
                return (
                  <Table.Summary.Cell key={`doam-${di}`} index={colIndex} align="center">
                    <InputNumber
                      min={0}
                      max={100}
                      precision={2}
                      value={doAmMap[di] ?? undefined}
                      onChange={(val) =>
                        setDoAmMap((prev) => ({ ...prev, [di]: val ?? 0 }))
                      }
                      style={{ width: "100%" }}
                      size="small"
                      addonAfter="%"
                    />
                  </Table.Summary.Cell>
                );
              }
              return <Table.Summary.Cell key={`doam-empty-${colIndex}`} index={colIndex} />;
            })}
          </Table.Summary.Row>

          <Table.Summary.Row style={{ backgroundColor: "#f6ffed", fontWeight: "bold" }}>
            {flatCols.map((col, colIndex) => {
              if (colIndex === 0) {
                return (
                  <Table.Summary.Cell key="quykho-label" index={0} align="center">
                    Quy khô
                  </Table.Summary.Cell>
                );
              }
              const di = col?.dataIndex;
              if (di && summaryIndexes.includes(di)) {
                const pct = doAmMap[di] ?? 0;
                const quyKho = totals[di] * (100 - pct) / 100;
                return (
                  <Table.Summary.Cell key={`quykho-${di}`} index={colIndex} align="right">
                    {quyKho.toLocaleString("en-US", { maximumFractionDigits: 3 })}
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
        columns={mergedColumns as any}
        initialData={initialData}
        onDataChange={onDataChange}
        addRowButtonText="+ Thêm dòng"
        minRows={minRows ?? 0}
        loading={loading}
        editable={editable}
        showAddButton={showAddButton}
        showDeleteButton={showDeleteButton}
        summary={summaryIndexes.length > 0 ? summaryRenderer : undefined}
        stickyHeader
        scrollY={500}
      />
    );
  }
);

export default CustomTableLG;
