/* eslint-disable @typescript-eslint/no-explicit-any */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Table } from "antd";
import CustomFormTable from "./CustomFormTable";

interface CustomTableLGProps {
  loCao: number | null | undefined;
  prefixColumns: any[];
  suffixColumns: any[];
  fallbackMaterialColumns?: any[];
  materialColumnsOverride?: any[] | null;
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  loading?: boolean;
  editable?: boolean;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number;
}

function flattenColumns(cols: any[]): any[] {
  return cols.flatMap((c) =>
    Array.isArray(c.children) && c.children.length > 0
      ? flattenColumns(c.children)
      : [c]
  );
}

const CustomTableLG = forwardRef<unknown, CustomTableLGProps>(function CustomTableLG(
  {
    prefixColumns,
    suffixColumns,
    fallbackMaterialColumns = [],
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

  const mergedColumns = useMemo(() => {
    const prefixKeys = new Set(prefixColumns.map((c) => c.dataIndex).filter(Boolean));
    const suffixKeys = new Set(suffixColumns.map((c) => c.dataIndex).filter(Boolean));

    const dedup = (cols: any[]) =>
      cols.filter((c) => {
        if (c.children) return true;
        return !prefixKeys.has(c.dataIndex) && !suffixKeys.has(c.dataIndex);
      });

    // Ưu tiên override từ API mới, fallback về cột tĩnh từ JSON config
    const rawMiddle =
      materialColumnsOverride != null && materialColumnsOverride.length > 0
        ? materialColumnsOverride
        : fallbackMaterialColumns;

    const normalizeWidth = (cols: any[]): any[] =>
      cols.map((col) => ({
        ...col,
        children: col.children
          ? col.children.map((child: any) => ({ ...child, width: child.width ?? 100 }))
          : undefined,
      }));

    return [...prefixColumns, ...normalizeWidth(dedup(rawMiddle)), ...suffixColumns];
  }, [prefixColumns, suffixColumns, fallbackMaterialColumns, materialColumnsOverride]);

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
      loading={loading}
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
