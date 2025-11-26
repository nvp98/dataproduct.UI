import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { Table, Input, Button, Space, Spin, message, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowRightOutlined, DeleteOutlined } from "@ant-design/icons";
import type { HeaderMappingRecord } from "./HeaderMapping";
import { dlnmHRC2Api } from "../services/DLNMHRC2Api";

type MappingPayload = HeaderMappingRecord;

export interface HRCChildColumn {
  title: ReactNode;
  dataIndex: string;
  width?: number;
  placeholder?: string;
  highlight?: boolean;
  editable?: boolean;
  metaLabel?: string;
  metaGroup?: string;
  allowMapping?: boolean;
  mappingPayload?: MappingPayload | null;
  variant?: "source" | "adjust" | "default";
  headerKeyId?: number | null;
}

export interface HRCParentColumn {
  title: string;
  dataIndex?: string;
  isLabel?: boolean;
  width?: number;
  children?: HRCChildColumn[];
  editable?: boolean;
  highlight?: boolean;
  metaLabel?: string;
  allowMapping?: boolean;
  mappingPayload?: MappingPayload | null;
  variant?: "source" | "adjust" | "default";
}

export interface HRCTableRow {
  key: string | number;
  IsNM?: boolean; // Flag để đánh dấu dòng từ NM (true) hay thêm tay (false)
  [key: string]: string | number | boolean | undefined;
}

interface CustomTableHRCProps {
  isHasExistingPhieu?: boolean;
  columns: HRCParentColumn[];
  initialData?: HRCTableRow[];
  onDataChange?: (data: HRCTableRow[]) => void;
  className?: string;
  addRowButtonText?: string;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number;
  editable?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  scrollX?: number | string;
  scrollY?: number;
  stickyHeaders?: boolean;
  stickyFirstColumn?: boolean;
  stickyColumnKeys?: string[];
}

const getAllFieldKeys = (cols: HRCParentColumn[]): string[] => {
  const keys: string[] = [];
  cols.forEach((col) => {
    if (col.dataIndex) {
      keys.push(col.dataIndex);
    }
    if (col.children) {
      col.children.forEach((child) => {
        if (child.dataIndex) {
          keys.push(child.dataIndex);
        }
      });
    }
  });
  return keys;
};

const CustomTableHRC = ({
  isHasExistingPhieu = false,
  columns,
  initialData = [{ key: "1" } as HRCTableRow],
  onDataChange,
  className = "",
  addRowButtonText = "+ Thêm dòng",
  showAddButton = true,
  showDeleteButton = true,
  minRows = 1,
  editable = true,
  loading = false,
  onRefresh,
  scrollX = "max-content",
  scrollY,
  stickyHeaders = true,
  stickyFirstColumn = false,
  stickyColumnKeys = [],
}: CustomTableHRCProps) => {
  const [rows, setRows] = useState<HRCTableRow[]>(initialData as HRCTableRow[]);

  // Tính toán chiều cao cho 10 dòng dữ liệu
  // Row height (size="small"): ~32px, Header: ~40px
  // 10 rows = 10 * 32 = 320px + header = ~360px
  const defaultScrollY = scrollY ?? 750;

  useEffect(() => {
    if (initialData) {
      setRows(initialData);
    }
  }, [initialData]);

  const handleAddRow = () => {
    const fieldKeys = getAllFieldKeys(columns);
    const newRow: HRCTableRow = { 
      key: Date.now().toString(),
      IsNM: false // Đánh dấu đây là dòng được thêm tay
    };
    fieldKeys.forEach((key) => {
      newRow[key] = "";
    });
    const newRows = [...rows, newRow];
    setRows(newRows);
    onDataChange?.(newRows);
  };

  const handleDeleteRow = (key: string | number) => {
    if (rows.length <= minRows) return;
    const newRows = rows.filter((row) => row.key !== key);
    setRows(newRows);
    onDataChange?.(newRows);
  };

  const handleChuyenMeThoi = async (meThoi: string) => {
    if (!meThoi) return;
    try {
      const response = await dlnmHRC2Api.chuyenMeThoi(meThoi);
      if (response.status === 200) {
        message.success("Chuyển mã thời gian thành công");
      }
    } catch (error) {
      console.error(error);
      message.error("Chuyển mã thời gian thất bại");
    }
  };

  const handleCellChange = (value: string, rowIndex: number, dataIndex: string) => {
    const newData = [...rows];
    newData[rowIndex][dataIndex] = value;
    setRows(newData);
    onDataChange?.(newData);
  };

  const stickyKeysSet = useMemo(() => new Set(stickyColumnKeys), [stickyColumnKeys]);

  const tableColumns: ColumnsType<HRCTableRow> = [
    ...columns.map((col, colIndex) => {
      const baseTitle = col.title;
      const isStickyKey =
        !!col.dataIndex && stickyColumnKeys?.length
          ? stickyKeysSet.has(col.dataIndex)
          : false;
      const shouldStickyFirst =
        stickyFirstColumn && colIndex === 0 && !col.dataIndex;
      const baseFixed =
        stickyHeaders || stickyFirstColumn || stickyColumnKeys.length
          ? (isStickyKey || shouldStickyFirst ? ("left" as const) : undefined)
          : undefined;

      if (col.children) {
        let hasStickyChild = false;
        return {
          title: baseTitle,
          width: col.width,
          children: col.children.map((child) => {
            const isColumnEditable =
              (child.editable ?? true) && (col.editable ?? true);
            const childSticky =
              (child.dataIndex && stickyKeysSet.has(child.dataIndex)) ||
              shouldStickyFirst;
            if (childSticky) {
              hasStickyChild = true;
            }

            return {
              title: child.title,
              dataIndex: child.dataIndex,
              width: child.width,
              fixed: childSticky ? ("left" as const) : undefined,
              render: (_: unknown, record: HRCTableRow, idx: number) => {
                const isManualRow = record.IsNM === false;
                const canEditThisCell =
                  editable && (isManualRow || isColumnEditable);
                const cellValue = record[child.dataIndex];
                const displayValue = cellValue !== undefined && cellValue !== null 
                  ? String(cellValue) 
                  : "";
                const manualRowStyle = isManualRow
                  ? { backgroundColor: "#fffbe6" }
                  : {};
                
                return (
                  <Input
                    placeholder={
                      child.placeholder ??
                      (typeof child.title === "string" ? child.title : undefined)
                    }
                    value={displayValue}
                    onChange={
                      canEditThisCell
                        ? (e) => handleCellChange(e.target.value, idx, child.dataIndex)
                        : undefined
                    }
                    disabled={!editable}
                    readOnly={!canEditThisCell}
                    style={{
                      ...(child.variant === "source"
                        ? { backgroundColor: "#f5f5f5" }
                        : {}),
                      ...(child.variant === "adjust"
                        ? { backgroundColor: "#fffbe6" }
                        : {}),
                      ...(child.highlight ? { backgroundColor: "#fff1f0" } : {}),
                      ...manualRowStyle,
                      ...(!canEditThisCell ? { cursor: "not-allowed" } : {}),
                    }}
                  />
                );
              },
            };
          }),
          fixed: baseFixed || (hasStickyChild ? ("left" as const) : undefined),
        };
      }

      if (col.isLabel) {
        return {
          title: baseTitle,
          dataIndex: col.dataIndex,
          width: col.width,
          fixed: baseFixed,
          render: (_: unknown, record: HRCTableRow) => {
            const isManualRow = record.IsNM === false;
            const manualRowStyle = isManualRow
              ? { backgroundColor: "#fffbe6" }
              : {};
            return (
              <div style={{ paddingLeft: 8, ...manualRowStyle }}>
                {record[col.dataIndex || ""]}
              </div>
            );
          },
        };
      }

      const isColumnEditable = col.editable ?? true;

      return {
        title: baseTitle,
        dataIndex: col.dataIndex,
        width: col.width,
        fixed: baseFixed,
        render: (_: unknown, record: HRCTableRow, idx: number) => {
          const isManualRow = record.IsNM === false;
          const canEditThisCell =
            editable && (isManualRow || isColumnEditable);
          const cellValue = record[col.dataIndex || ""];
          const displayValue =
            cellValue !== undefined && cellValue !== null
              ? String(cellValue)
              : "";
          const manualRowStyle = isManualRow
            ? { backgroundColor: "#fffbe6" }
            : {};
          
          return (
            <Input
              placeholder={typeof baseTitle === "string" ? baseTitle : undefined}
              value={displayValue}
              onChange={
                canEditThisCell && col.dataIndex
                  ? (e) => handleCellChange(e.target.value, idx, col.dataIndex as string)
                  : undefined
              }
              disabled={!editable}
              readOnly={!canEditThisCell}
              style={{
                ...(col.highlight ? { backgroundColor: "#fff1f0" } : {}),
                ...(col.variant === "source"
                  ? { backgroundColor: "#f5f5f5" }
                  : {}),
                ...(col.variant === "adjust"
                  ? { backgroundColor: "#fffbe6" }
                  : {}),
              ...manualRowStyle,
                ...(!canEditThisCell ? { cursor: "not-allowed" } : {}),
              }}
            />
          );
        },
      };
    }),
    ...(showDeleteButton
      ? [
          {
            title: "Thao tác",
            key: "action",
            width: 80,
            render: (_: unknown, record: HRCTableRow) => (
              <Space>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => handleDeleteRow(record.key)}
                  disabled={rows.length <= minRows}
                />
                
                {isHasExistingPhieu ? (
                  <Tooltip title="Chuyển mẻ sang ca sau">
                    <Button
                    type="text"
                      icon={<ArrowRightOutlined />}
                      size="small"
                      onClick={() => handleChuyenMeThoi(record.meThoi as string)}
                      disabled={rows.length <= minRows}
                    />
                  </Tooltip>
                ) : null}
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          <Spin size="large" tip="Đang tải dữ liệu từ API..." />
        </div>
      ) : (
        <>
          <Table
            bordered
            pagination={false}
            className={className}
            size="small"
            columns={tableColumns}
            dataSource={rows}
            style={{ marginTop: 20 }}
            scroll={{ x: scrollX, y: defaultScrollY }}
            sticky={stickyHeaders ? { offsetHeader: 0 } : undefined}
          />
          {showAddButton && editable && (
            <Button onClick={handleAddRow} type="dashed" className="my-2">
              {addRowButtonText}
            </Button>
          )}
          {onRefresh && (
            <Button onClick={onRefresh} style={{ marginLeft: 8 }} loading={loading}>
              Tải lại dữ liệu
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default CustomTableHRC;

