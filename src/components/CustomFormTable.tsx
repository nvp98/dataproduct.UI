import { useState, useEffect } from "react";
import { Table, Button, Input, Popconfirm, Space, Spin, Tag } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

interface CustomFormTableProps {
  columns: Array<{
    title: string;
    dataIndex?: string;
    isLabel?: boolean; // Xác định cột này là cột label
    width?: number | string;
    fixed?: "left" | "right";
    format?: string; // ví dụ: "number-group"
    children?: Array<{
      title: string;
      dataIndex: string | number;
      format?: string; // ví dụ: "number-group"
    }>;
  }>;
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  className?: string;
  addRowButtonText?: string;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number; // Số dòng tối thiểu
  editable?: boolean; // Cho phép nhập tay hay không
  // Parent control
  loading?: boolean; // Loading state từ parent
  onRefresh?: () => void; // Callback để refresh data từ parent
  selectionEnabled?: boolean;
  selectedRowKeys?: Array<string | number>;
  onSelectionChange?: (keys: Array<string | number>, rows: any[]) => void;
  isRowSelectable?: (row: any) => boolean;
  showStatus?: boolean;
  readonlyFields?: string[];
  scrollY?: number;
  stickyHeader?: boolean;
  onCellChange?: (
    rowIndex: number,
    dataIndex: string,
    value: any,
    row: any
  ) => void;
  compactWhenEmpty?: boolean; // Nếu true, khi không có dòng sẽ không chiếm nhiều chiều cao
  summary?: (data: readonly any[]) => React.ReactNode;
}

export default function CustomFormTable({
  columns,
  initialData = [{ key: 1 }],
  onDataChange,
  className = "",
  addRowButtonText = "+ Thêm dòng",
  showAddButton = true,
  showDeleteButton = true,
  minRows = 1,
  editable = true,
  loading = false,
  onRefresh,

  selectionEnabled = false,
  selectedRowKeys,
  onSelectionChange,
  isRowSelectable,
  showStatus = false,
  readonlyFields = [],
  scrollY,
  stickyHeader = false,
  onCellChange,
  compactWhenEmpty = false,
  summary,
}: CustomFormTableProps) {
  const formatNumberGroup = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    const raw = String(value).trim();
    if (!raw) return "";
    const normalized = raw.replace(/\s+/g, "").replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n)) return raw;
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(n);
    const [intPartRaw, fracRaw] = String(abs).split(".");
    const intPart = intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return fracRaw ? `${sign}${intPart}.${fracRaw}` : `${sign}${intPart}`;
  };

  const formatIfNeeded = (format: unknown, value: unknown): string => {
    if (format === "number-group") return formatNumberGroup(value);
    return value === null || value === undefined ? "" : String(value);
  };

  const [rows, setRows] = useState(initialData);

  const getCellStyle = (
    dataIndex: string | number,
    value: any,
    readonly?: boolean
  ) => {
    const style: any = {};
    style.textAlign = "right";
    if (readonly || !editable) style.backgroundColor = "#fffbe6";
    if (String(dataIndex) === "stChuaChuyen" && Number(value) > 0) {
      style.backgroundColor = "#fff1f0";
      style.borderColor = "#ff4d4f";
    }
    return style;
  };

  // Sync với initialData khi có thay đổi
  useEffect(() => {
    setRows(initialData || []);
  }, [initialData]);

  // Xử lý thêm dòng trong bảng
  const handleAddRow = () => {
    // Lấy danh sách các field của cột
    const fieldKeys = getAllFieldKeys(columns);

    // Tạo object mới
    const newRow: any = { key: Date.now() };
    fieldKeys.forEach((k: any) => {
      newRow[k] = ""; // hoặc null
    });

    const newRows = [...rows, newRow];
    setRows(newRows);
    onDataChange?.(newRows);
  };

  // Xử lý xóa dòng
  const handleDeleteRow = (key: string | number) => {
    if (rows.length <= minRows) {
      return; // Không cho xóa nếu đã đạt số dòng tối thiểu
    }
    console.log("rows:", rows, key);
    const newRows = rows.filter((row) => row.key !== key);
    setRows(newRows);
    onDataChange?.(newRows);
  };

  // Lấy tất cả field keys từ columns (bao gồm cả children)
  const getAllFieldKeys = (cols: any[]): string[] => {
    const keys: string[] = [];
    cols.forEach((col) => {
      if (col.dataIndex) {
        keys.push(col.dataIndex);
      }
      if (col.children) {
        col.children.forEach((child: any) => {
          if (child.dataIndex) {
            keys.push(child.dataIndex);
          }
        });
      }
    });
    return keys;
  };

  // Xử lý thay đổi dữ liệu trong ô
  const handleCellChange = (
    value: string,
    rowIndex: number,
    dataIndex: string
  ) => {
    const newData = [...rows];
    newData[rowIndex][dataIndex] = value;
    setRows(newData);
    onDataChange?.(newData);
    onCellChange?.(rowIndex, dataIndex, value, newData[rowIndex]);
  };

  // Sinh cột động từ config
  const tableColumns = [
    ...columns.map((col) => {
      if (col.children) {
        // Merge header: cột cha có con
        return {
          title: col.title,
          width: col.width,
          fixed: col.fixed,
          children: col.children.map(
            (child: {
              title: string | undefined;
              dataIndex: string | number;
              width?: number | string;
            }) => ({
              title: child.title,
              dataIndex: child.dataIndex,
              width: child.width,
              render: (_: any, record: any, idx: number) =>
                readonlyFields.includes(String(child.dataIndex)) ? (
                  <Input
                    placeholder={child.title}
                    value={formatIfNeeded((child as any)?.format, record[child.dataIndex])}
                    readOnly
                    style={getCellStyle(
                      child.dataIndex,
                      record[child.dataIndex],
                      true
                    )}
                  />
                ) : (
                  <Input
                    placeholder={child.title}
                    value={record[child.dataIndex] ?? ""}
                    onChange={(e) => {
                      handleCellChange(
                        e.target.value,
                        idx,
                        child.dataIndex as string
                      );
                    }}
                    disabled={!editable}
                    style={getCellStyle(
                      child.dataIndex,
                      record[child.dataIndex],
                      false
                    )}
                  />
                ),
            })
          ),
        };
      } else {
        // Check if this is a label column
        if (col.isLabel) {
          return {
            title: col.title,
            dataIndex: col.dataIndex,
            width: col.width,
            render: (_: any, record: any) => (
              <div
                style={{
                  paddingLeft: 8,
                  backgroundColor: !editable ? "#fffbe6" : undefined,
                }}
              >
                {record[col.dataIndex || ""]}
              </div>
            ),
          };
        }

        // Cột bình thường
        return {
          title: col.title,
          dataIndex: col.dataIndex,
          width: col.width,
          fixed: col.fixed,
          render: (_: any, record: any, idx: number) =>
            readonlyFields.includes(String(col.dataIndex)) ? (
              <Input
                placeholder={col.title}
                value={formatIfNeeded((col as any)?.format, record[col.dataIndex || ""])}
                readOnly
                style={getCellStyle(
                  col.dataIndex as string,
                  record[col.dataIndex || ""],
                  true
                )}
              />
            ) : (
              <Input
                placeholder={col.title}
                value={record[col.dataIndex ?? ""] ?? ""}
                onChange={(e) => {
                  handleCellChange(
                    e.target.value,
                    idx,
                    col.dataIndex as string
                  );
                }}
                disabled={!editable}
                style={getCellStyle(
                  col.dataIndex as string,
                  record[col.dataIndex ?? ""],
                  false
                )}
              />
            ),
        };
      }
    }),
    ...(showStatus
      ? [
          {
            title: "Tình trạng",
            key: "status",
            width: 160,
            render: (_: any, record: any) => {
              const t = record.tinhTrang;
              const text =
                t === 1
                  ? "Đã chuyển hết"
                  : t === 2
                  ? "Đã chuyển 1 phần"
                  : "Chưa chuyển";
              const color = t === 1 ? "green" : t === 2 ? "orange" : "default";
              return <Tag color={color}>{text}</Tag>;
            },
          },
        ]
      : []),
    // Thêm cột thao tác nếu showDeleteButton = true
    ...(showDeleteButton
      ? [
          {
            title: "Thao tác",
            key: "action",
            width: 80,
            render: (_: any, record: any) => (
              <Space>
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa dòng này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => handleDeleteRow(record.key)}
                  disabled={rows.length <= minRows}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    disabled={rows.length <= minRows}
                  />
                </Popconfirm>
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
          {!(compactWhenEmpty && (!rows || rows.length === 0)) && (
            <Table
              bordered
              pagination={false}
              className={className}
              size="small"
              columns={tableColumns}
              dataSource={rows}
              style={{ marginTop: 12 }}
              scroll={{ x: "max-content", y: scrollY }}
              sticky={stickyHeader}
              summary={summary}
              rowSelection={
                selectionEnabled
                  ? {
                      selectedRowKeys: selectedRowKeys as any,
                      onChange: (keys, selected) => {
                        onSelectionChange?.(keys as any, selected as any);
                      },
                      getCheckboxProps: (record: any) => ({
                        disabled: isRowSelectable
                          ? !isRowSelectable(record)
                          : false,
                      }),
                    }
                  : undefined
              }
            />
          )}
          {showAddButton && editable && (
            <Button onClick={handleAddRow} type="dashed" className="my-2">
              {addRowButtonText}
            </Button>
          )}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              style={{ marginLeft: 8 }}
              loading={loading}
            >
              Tải lại dữ liệu
            </Button>
          )}
        </>
      )}
    </div>
  );
}
