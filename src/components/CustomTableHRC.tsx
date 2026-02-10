import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { Table, Input, Button, Space, Spin, message, Tooltip, Popconfirm } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, ArrowRightOutlined} from "@ant-design/icons";
import type { HeaderMappingRecord } from "./HeaderMapping";
import { dlnmHRC2Api } from "../services/DLNMHRC2Api";
import type { ChuyenMeThoiRequest } from "../models/DLMN_HRC2Model";
import dayjs from "dayjs";

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
  metaLabel?: string;
  allowMapping?: boolean;
  mappingPayload?: MappingPayload | null;
  variant?: "source" | "adjust" | "default";
}

export interface HRCTableRow {
  key: string | number;
  IsNM?: boolean; // Flag để đánh dấu dòng từ NM (true) hay thêm tay (false)
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

  // Sắp xếp: các dòng từ NM (IsNM !== false) ở trên, dòng nhập tay (IsNM === false) xuống dưới
  const sortedRows = useMemo(() => {
    const cloned = [...rows];
    cloned.sort((a, b) => {
      const aManual = a.IsNM === false;
      const bManual = b.IsNM === false;
      if (aManual === bManual) return 0;
      // Dòng nhập tay (IsNM === false) xếp sau
      return aManual ? 1 : -1;
    });
    return cloned;
  }, [rows]);
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

  const handleCellChange = (value: string, rowKey: string | number, dataIndex: string) => {
    setRows((prev) => {
      const newData = prev.map((row) =>
        row.key === rowKey ? { ...row, [dataIndex]: value } : row
      );
      return newData;
    });
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
              render: (_: unknown, record: HRCTableRow) => {
                const isManualRow = record.IsNM === false;
                // ⚠️ Cột phân bổ (variant="adjust") luôn read-only, không cho phép chỉnh sửa thủ công
                const isAdjustColumn = child.variant === "adjust";
                const canEditThisCell =
                  !isAdjustColumn && editable && (isManualRow || isColumnEditable);
                const cellValue = record[child.dataIndex];
                const displayValue = cellValue !== undefined && cellValue !== null 
                  ? String(cellValue) 
                  : "";
                // Ô không cho phép chỉnh sửa → highlight màu xám nhạt
                const readonlyStyle = !canEditThisCell
                  ? { backgroundColor: "#f5f5f5" }
                  : {};
                // Highlight ô mẻ thổi nếu bị trùng
                const isMeThoiColumn = child.dataIndex === "meThoi";
                const isTrungMeThoi = record.isTrungMeThoi === true;
                return (
                  <Input
                    placeholder={
                      child.placeholder ??
                      (typeof child.title === "string" ? child.title : undefined)
                    }
                    value={displayValue}
                    onChange={
                      canEditThisCell
                        ? (e) => handleCellChange(e.target.value, record.key, child.dataIndex)
                        : undefined
                    }
                    onBlur={
                      canEditThisCell
                        ? () => emitDataChange(rowsRef.current)
                        : undefined
                    }
                    disabled={!editable || isAdjustColumn}
                    readOnly={!canEditThisCell || isAdjustColumn}
                    style={{
                      ...readonlyStyle,
                      // Highlight mẻ thổi trùng (ưu tiên cao nhất)
                      ...(isMeThoiColumn && isTrungMeThoi ? { backgroundColor: "tomato" } : {}),
                      // Cột chưa được móc nối (highlight) - chỉ khi không phải mẻ thổi trùng
                      ...(!(isMeThoiColumn && isTrungMeThoi) && child.highlight ? { backgroundColor: "#fff1f0" } : {}),
                      // Cột phân bổ có style đặc biệt (xám nhạt, không cho chỉnh sửa)
                      ...(isAdjustColumn ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}),
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

      const isColumnEditable = col.editable ?? true;

      return {
        title: baseTitle,
        dataIndex: col.dataIndex,
        width: col.width,
        fixed: baseFixed,
        render: (_: unknown, record: HRCTableRow) => {
          const isManualRow = record.IsNM === false;
          // ⚠️ Cột phân bổ (variant="adjust") luôn read-only, không cho phép chỉnh sửa thủ công
          const isAdjustColumn = col.variant === "adjust";
          const canEditThisCell =
            !isAdjustColumn && editable && (isManualRow || isColumnEditable);
          const cellValue = record[col.dataIndex || ""];
          const displayValue =
            cellValue !== undefined && cellValue !== null
              ? String(cellValue)
              : "";
          const readonlyStyle = !canEditThisCell
            ? { backgroundColor: "#f5f5f5" }
            : {};
          // Highlight ô mẻ thổi nếu bị trùng
          const isMeThoiColumn = col.dataIndex === "meThoi";
          const isTrungMeThoi = record.isTrungMeThoi === true;
          
          return (
            <Input
              placeholder={typeof baseTitle === "string" ? baseTitle : undefined}
              value={displayValue}
              onChange={
                canEditThisCell && col.dataIndex
                  ? (e) => handleCellChange(
                      e.target.value,
                      record.key,
                      col.dataIndex as string
                    )
                  : undefined
              }
              onBlur={
                canEditThisCell
                  ? () => emitDataChange(rowsRef.current)
                  : undefined
              }
              disabled={!editable || isAdjustColumn}
              readOnly={!canEditThisCell || isAdjustColumn}
              style={{
                ...readonlyStyle,
                // Highlight mẻ thổi trùng (ưu tiên cao nhất)
                ...(isMeThoiColumn && isTrungMeThoi ? { backgroundColor: "tomato" } : {}),
                // Cột chưa được móc nối (highlight) - chỉ khi không phải mẻ thổi trùng
                ...(!(isMeThoiColumn && isTrungMeThoi) && col.highlight ? { backgroundColor: "#fff1f0" } : {}),
                // Cột phân bổ có style đặc biệt (xám nhạt, không cho chỉnh sửa)
                ...(isAdjustColumn ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}),
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
            style={{ marginTop: 20 }}
            scroll={{ x: scrollX, y: defaultScrollY }}
            sticky={stickyHeaders ? { offsetHeader: 0 } : undefined}
            // Highlight cả dòng cho dữ liệu nhập tay (IsNM === false)
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

