import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { Table, Input, Button, Space, Spin, message, Tooltip, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, ArrowRightOutlined} from "@ant-design/icons";
import type { HeaderMappingRecord } from "./HeaderMapping";
import { dlnmHRC2Api } from "../services/DLNMHRC2Api";
import type { ChuyenMeThoiRequest } from "../models/DLMN_HRC2Model";
import dayjs from "dayjs";
import { formatByKind } from "../utils/formatters/numberFormat";

type MappingPayload = HeaderMappingRecord;

// ─── EditableCellInput ───────────────────────────────────────────────────────
// Component tách biệt để cô lập state nhập liệu, tránh parent re-render
// khi đang gõ dẫn đến mất con trỏ chuột.
// Giá trị chỉ sync lên parent khi blur (onCommit).
interface EditableCellInputProps {
  initialValue: string;
  onCommit: (value: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
}

type HRCRowWithManualFlags = HRCTableRow & Record<string, unknown>;

const EditableCellInput = ({ initialValue, onCommit, style, placeholder }: EditableCellInputProps) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Sync khi giá trị bên ngoài thay đổi (ví dụ: load dữ liệu mới, reset form)
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onCommit(localValue)}
      onDoubleClick={(e) => {
        const target = e.target as HTMLInputElement;
        target.focus();
        target.select();
      }}
      style={style}
      placeholder={placeholder}
    />
  );
};
// ────────────────────────────────────────────────────────────────────────────

export interface HRCChildColumn {
  title: ReactNode;
  dataIndex: string;
  width?: number;
  placeholder?: string;
  highlight?: boolean;
  editable?: boolean;
  format?: string; // ví dụ: "number-group"
  align?: "left" | "center" | "right";
  metaLabel?: string;
  metaGroup?: string;
  allowMapping?: boolean;
  mappingPayload?: MappingPayload | null;
  variant?: "source" | "adjust" | "default";
  headerKeyId?: number | null;
  thuTu?: number | null; // Thứ tự để sắp xếp
}

export interface HRCParentColumn {
  title: string;
  dataIndex?: string;
  isLabel?: boolean;
  width?: number;
  children?: HRCChildColumn[];
  editable?: boolean;
  highlight?: boolean;
  format?: string; // ví dụ: "number-group"
  align?: "left" | "center" | "right";
  metaLabel?: string;
  allowMapping?: boolean;
  mappingPayload?: MappingPayload | null;
  variant?: "source" | "adjust" | "default";
}

export interface HRCTableRow {
  key: string | number;
  IsNM?: boolean; // Flag để đánh dấu dòng từ NM (true) hay thêm tay (false)
  _isNewRow?: boolean; // Flag UI: dòng thêm mới bằng button (highlight cả hàng + xếp cuối)
  id?: number; // ID bản ghi DLNM_HRC2 (nếu có)
  isTrungMeThoi?: boolean; // Flag để đánh dấu mẻ thổi bị trùng
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
  // onRefresh?: () => void; // hiện tại không dùng
  scrollX?: number | string;
  scrollY?: number;
  stickyHeaders?: boolean;
  stickyFirstColumn?: boolean;
  stickyColumnKeys?: string[];
  maBm?: string;
  ngaySX?: Date;
  ca?: number;
  scope?: number;
  bieuMau?: string;
}

const CHUYEN_TOI_CA = {
  CATRUOC: 1,
  CASAU: 2,
};

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
  // onRefresh,
  scrollX = "max-content",
  scrollY,
  stickyHeaders = true,
  stickyFirstColumn = false,
  stickyColumnKeys = [],
  maBm = "",
  ngaySX = new Date(),
  ca = 0,
  scope = 0,
  bieuMau = "",
}: CustomTableHRCProps) => {
  const [rows, setRows] = useState<HRCTableRow[]>(initialData as HRCTableRow[]);
  const rowsRef = useRef<HRCTableRow[]>(rows);

  // Tính toán chiều cao cho 10 dòng dữ liệu
  // Row height (size="small"): ~32px, Header: ~40px
  // 10 rows = 10 * 32 = 320px + header = ~360px
  const defaultScrollY = scrollY ?? 750;

  useEffect(() => {
    if (initialData) {
      setRows(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Helper: emit thay đổi ra ngoài (được gọi từ các event handler / onBlur)
  const emitDataChange = useCallback(
    (data: HRCTableRow[]) => {
      if (!onDataChange) return;
      onDataChange(data);
    },
    [onDataChange]
  );

  // Sắp xếp: dòng nhập tay (IsNM === false) xếp cuối, không di chuyển dòng NM khi edit ô
  const sortedRows = useMemo(() => {
    const cloned = [...rows];
    cloned.sort((a, b) => {
      const aManual = a.IsNM === false;
      const bManual = b.IsNM === false;
      if (aManual === bManual) return 0;
      return aManual ? 1 : -1;
    });
    return cloned;
  }, [rows]);
  const handleAddRow = () => {
    const fieldKeys = getAllFieldKeys(columns);
    const newRow: HRCTableRow = {
      key: Date.now().toString(),
      IsNM: false,      // Đánh dấu cho BE: dòng nhập tay
      _isNewRow: true,  // Đánh dấu cho UI: dòng thêm mới bằng button (highlight cả hàng + xếp cuối)
    };
    fieldKeys.forEach((key) => {
      newRow[key] = "";
    });
    const newRows = [...rows, newRow];
    setRows(newRows);
    emitDataChange(newRows);
  };

  // const handleDeleteRow = (key: string | number) => {
  //   if (rows.length <= minRows) return;
  //   const newRows = rows.filter((row) => row.key !== key);
  //   setRows(newRows);
  //   onDataChange?.(newRows);
  // };

  const handleChuyenMeThoi = async (chuyenToiCa: number, meThoi: string) => {
    if (!meThoi) return;
    try {
      const payload : ChuyenMeThoiRequest = {
        MaBM: maBm,
        NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
        Ca: ca,
        Scope: scope,
        ChuyenToiCa: chuyenToiCa,
        MeThoi: meThoi,
        BieuMau: bieuMau,
      };
      const response = await dlnmHRC2Api.chuyenMeThoi(payload);
      if(response.data.message){
        message.success(response.data.message);
        // Sau khi chuyển mẻ thành công, xóa luôn dòng tương ứng trong bảng
        const newRows = rows.filter((row) => row.meThoi !== meThoi);
        setRows(newRows);
        emitDataChange(newRows);
      }
    } catch (error: unknown) {
      console.error(error);
      const errMsg =
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        (error as { data?: { message?: string } }).data?.message
          ? (error as { data?: { message?: string } }).data!.message!
          : "Có lỗi xảy ra khi chuyển mẻ";
      message.error(errMsg);
    }
  };

  const handleDeleteRow = async (record: HRCTableRow) => {
    if (rows.length <= minRows) return;

    const id = record.id;
    if (typeof id === "number") {
      try {
        await dlnmHRC2Api.deleteRowByKey(id);
        message.success("Xóa dòng thành công");
      } catch (error) {
        console.error("Delete row error:", error);
        message.error("Không thể xóa dòng trên server");
        return;
      }
    }

    setRows((prev) => {
      const newRows = prev.filter((row) => row.key !== record.key);
      emitDataChange(newRows);
      return newRows;
    });
  };

  // Áp dụng thay đổi cell và emit ra ngoài - chỉ gọi khi blur (từ EditableCellInput.onCommit)
  const applyAndEmitCellChange = useCallback(
    (value: string, rowKey: string | number, dataIndex: string) => {
      const origKey = `${dataIndex}__orig`;
      const manualKey = `${dataIndex}__IsManual`;
      const newData = rowsRef.current.map((row) => {
        if (row.key !== rowKey) return row;
        const isManualAddedColumn = dataIndex.startsWith("manual_col_");
        const hasOrig = row[origKey] !== undefined;
        const prevValue = row[dataIndex];
        const origValue = hasOrig ? row[origKey] : (prevValue ?? "");

        // manual_col_*: không tạo/gửi __orig. Giá trị nhập luôn được hiểu là manual.
        const next: HRCTableRow = isManualAddedColumn
          ? {
              ...row,
              [dataIndex]: value,
            }
          : {
              ...row,
              ...(hasOrig ? null : { [origKey]: prevValue ?? "" }),
              [dataIndex]: value,
            };

        // IsNM = false chỉ cho dòng thêm bằng tay (Thêm dòng). Sửa ô phụ liệu trên dòng từ NM (IsNM = true) không đổi IsNM.
        // Với ô phụ liệu: set cờ manual theo từng ô để BE/FE nhận biết (không dùng IsManual ở cấp dòng).
        if (isManualAddedColumn) {
          // manual_col_*: có giá trị thì coi là manual
          (next as HRCRowWithManualFlags)[manualKey] = String(value ?? "").trim() !== "";
        } else if (dataIndex.startsWith("phuLieu_") || dataIndex.startsWith("others_")) {
          const isManualCell = String(value ?? "") !== String(origValue ?? "");
          (next as HRCRowWithManualFlags)[manualKey] = isManualCell;
        }
        return next;
      });
      setRows(newData);
      emitDataChange(newData);
    },
    [emitDataChange]
  );

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
            // bỏ logic disable theo config, chỉ giữ variant="adjust" là read-only
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
              align: child.align,
              fixed: childSticky ? ("left" as const) : undefined,
              render: (_: unknown, record: HRCTableRow) => {
                // ⚠️ Cột phân bổ (variant="adjust") luôn read-only, không cho phép chỉnh sửa thủ công
                const isAdjustColumn = child.variant === "adjust";
                const isMeThoiColumn = child.dataIndex === "meThoi";
                const isMacThepColumn = child.dataIndex === "macThep";
                // Dòng từ NM (IsNM !== false): disable meThoi và macThep
                // Dòng thêm mới bằng button (IsNM === false): cho nhập tất cả các cột
                const isNMRow = record.IsNM !== false;
                const canEditThisCell =
                  !isAdjustColumn &&
                  editable &&
                  (!isNMRow || (!isMeThoiColumn && !isMacThepColumn));

                const origKey = `${child.dataIndex}__orig`;
                const manualKey = `${child.dataIndex}__IsManual`;
                const origValue = record[origKey];
                const currentValue = record[child.dataIndex];
                const isManualFlag = (record as HRCRowWithManualFlags)[manualKey] === true;
                const isCellChanged =
                  isManualFlag ||
                  (origValue !== undefined && String(currentValue ?? "") !== String(origValue ?? ""));

                const cellValue = record[child.dataIndex];
                const displayValue = !canEditThisCell
                  ? formatByKind(child.format, cellValue)
                  : cellValue !== undefined && cellValue !== null
                    ? String(cellValue)
                    : "";
                const isTrungMeThoi = record.isTrungMeThoi === true;

                const tooltipTitle =
                  isCellChanged
                    ? `Tự động: ${String(origValue ?? "")} | Chỉnh sửa: ${String(currentValue ?? "")}`
                    : undefined;

                const isKeyColumn = isMeThoiColumn || isMacThepColumn;

                // Style chung cho ô editable (highlight vàng sau khi blur)
                const editableStyle: React.CSSProperties = {
                  textAlign: child.align ?? "right",
                  ...(isKeyColumn && record.IsNM === false ? { backgroundColor: "#fffbe6" } : {}),
                  ...(isMeThoiColumn && isTrungMeThoi ? { backgroundColor: "tomato" } : {}),
                  ...(!(isMeThoiColumn && isTrungMeThoi) && isCellChanged
                    ? { backgroundColor: "#fff7b3" }
                    : {}),
                  ...(!(isMeThoiColumn && isTrungMeThoi) && child.highlight
                    ? { backgroundColor: "#fff1f0" }
                    : {}),
                };

                const inputNode = canEditThisCell ? (
                  <EditableCellInput
                    initialValue={displayValue}
                    onCommit={(v) => applyAndEmitCellChange(v, record.key, child.dataIndex)}
                    style={editableStyle}
                    placeholder={
                      child.placeholder ??
                      (typeof child.title === "string" ? child.title : undefined)
                    }
                  />
                ) : (
                  <Input
                    value={displayValue}
                    readOnly
                    disabled={isAdjustColumn}
                    style={{
                      textAlign: child.align ?? "right",
                      backgroundColor: "#f5f5f5",
                      cursor: "not-allowed",
                    }}
                  />
                );

                return tooltipTitle ? (
                  <Tooltip title={tooltipTitle}>
                    <span style={{ display: "block" }}>{inputNode}</span>
                  </Tooltip>
                ) : (
                  inputNode
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
            return (
              <div
                style={{
                  paddingLeft: 8,
                  // Cột label luôn không chỉnh sửa → highlight xám nhạt
                  backgroundColor: "#f5f5f5",
                }}
              >
                {record[col.dataIndex || ""]}
              </div>
            );
          },
        };
      }

      // bỏ logic disable theo config, chỉ giữ variant="adjust" là read-only

      return {
        title: baseTitle,
        dataIndex: col.dataIndex,
        width: col.width,
        align: col.align,
        fixed: baseFixed,
        render: (_: unknown, record: HRCTableRow) => {
          // ⚠️ Cột phân bổ (variant="adjust") luôn read-only, không cho phép chỉnh sửa thủ công
          const isAdjustColumn = col.variant === "adjust";
          const isMeThoiColumn = col.dataIndex === "meThoi";
          const isMacThepColumn = col.dataIndex === "macThep";
          // Dòng từ NM (IsNM !== false): disable meThoi và macThep
          // Dòng thêm mới bằng button (IsNM === false): cho nhập tất cả các cột
          const isNMRow = record.IsNM !== false;
          const canEditThisCell =
            !isAdjustColumn &&
            editable &&
            (!isNMRow || (!isMeThoiColumn && !isMacThepColumn));
          const dataIndex = col.dataIndex || "";
          const origKey = `${dataIndex}__orig`;
          const manualKey = `${dataIndex}__IsManual`;
          const origValue = record[origKey];
          const currentValue = record[dataIndex];
          const isManualFlag = (record as HRCRowWithManualFlags)[manualKey] === true;
          const isCellChanged =
            isManualFlag ||
            (origValue !== undefined && String(currentValue ?? "") !== String(origValue ?? ""));

          const cellValue = record[dataIndex];
          const displayValue = !canEditThisCell
            ? formatByKind(col.format, cellValue)
            : cellValue !== undefined && cellValue !== null
              ? String(cellValue)
              : "";
          const isTrungMeThoi = record.isTrungMeThoi === true;

          const isKeyColumn = isMeThoiColumn || isMacThepColumn;

          const editableStyle: React.CSSProperties = {
            textAlign: col.align ?? "right",
            ...(isKeyColumn && record.IsNM === false ? { backgroundColor: "#fffbe6" } : {}),
            ...(isMeThoiColumn && isTrungMeThoi ? { backgroundColor: "tomato" } : {}),
            ...(!(isMeThoiColumn && isTrungMeThoi) && isCellChanged
              ? { backgroundColor: "#fff7b3" }
              : {}),
            ...(!(isMeThoiColumn && isTrungMeThoi) && col.highlight
              ? { backgroundColor: "#fff1f0" }
              : {}),
          };

          const inputNode = canEditThisCell ? (
            <EditableCellInput
              initialValue={displayValue}
              onCommit={(v) => applyAndEmitCellChange(v, record.key, dataIndex)}
              style={editableStyle}
              placeholder={typeof baseTitle === "string" ? baseTitle : undefined}
            />
          ) : (
            <Input
              value={displayValue}
              readOnly
              disabled={isAdjustColumn}
              style={{
                textAlign: col.align ?? "right",
                backgroundColor: "#f5f5f5",
                cursor: "not-allowed",
              }}
            />
          );

          return isCellChanged ? (
            <Tooltip title={`Cũ: ${String(origValue ?? "")} | Mới: ${String(currentValue ?? "")}`}>
              <span style={{ display: "block" }}>{inputNode}</span>
            </Tooltip>
          ) : (
            inputNode
          );
        },
      };
    }),
    ...(showDeleteButton
      ? [
          {
            title: "Chuyển / Xóa mẻ",
            key: "action",
            width: 140,
            render: (_: unknown, record: HRCTableRow) => (
              <Space>
                {isHasExistingPhieu ? (
                  <div className="flex gap-2">
                    <Tooltip title="Chuyển mẻ sang ca trước">
                      <Popconfirm
                        title="Xác nhận chuyển mẻ"
                        description={`Bạn có chắc muốn chuyển mẻ ${record.meThoi} sang ca TRƯỚC không?`}
                        okText="Đồng ý"
                        cancelText="Hủy"
                        onConfirm={() =>
                          handleChuyenMeThoi(
                            CHUYEN_TOI_CA.CATRUOC,
                            record.meThoi as string
                          )
                        }
                      >
                        <Button
                          type="text"
                          icon={<ArrowLeftOutlined />}
                          size="small"
                          disabled={rows.length <= minRows}
                        />
                      </Popconfirm>
                    </Tooltip>
                    <Tooltip title="Chuyển mẻ sang ca sau">
                      <Popconfirm
                        title="Xác nhận chuyển mẻ"
                        description={`Bạn có chắc muốn chuyển mẻ ${record.meThoi} sang ca SAU không?`}
                        okText="Đồng ý"
                        cancelText="Hủy"
                        onConfirm={() =>
                          handleChuyenMeThoi(
                            CHUYEN_TOI_CA.CASAU,
                            record.meThoi as string
                          )
                        }
                      >
                        <Button
                          type="text"
                          icon={<ArrowRightOutlined />}
                          size="small"
                          disabled={rows.length <= minRows}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </div>
                ) : null}
                {record.IsNM === false && (
                  <Popconfirm
                    title="Xác nhận xóa dòng"
                    description={`Bạn có chắc muốn xóa dòng mẻ ${record.meThoi || ""}?`}
                    okText="Đồng ý"
                    cancelText="Hủy"
                    onConfirm={() => handleDeleteRow(record)}
                  >
                    <Tooltip title="Xóa dòng nhập tay">
                      <Button
                        type="text"
                        danger
                        size="small"
                        disabled={rows.length <= minRows}
                      >
                        Xóa
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                )}
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
            dataSource={sortedRows}
            rowKey={(record, index) => String(record?.key ?? record?.id ?? index)}
            style={{ marginTop: 20 }}
            scroll={{ x: scrollX, y: defaultScrollY }}
            sticky={stickyHeaders ? { offsetHeader: 0 } : undefined}
            // Highlight cả dòng nhập tay (IsNM === false) — cả dòng thêm mới lẫn load từ backend
            onRow={(record) => ({
              style:
                record.IsNM === false
                  ? { backgroundColor: "#fffbe6" } // vàng nhạt
                  : {},
            })}
          />
          {showAddButton && editable && (
            <Button onClick={handleAddRow} type="dashed" className="my-2">
              {addRowButtonText}
            </Button>
          )}
          {/* {onRefresh && (
            <Button onClick={onRefresh} style={{ marginLeft: 8 }} loading={loading}>
              Tải lại dữ liệu
            </Button>
          )} */}
        </>
      )}
    </div>
  );
};

export default CustomTableHRC;

