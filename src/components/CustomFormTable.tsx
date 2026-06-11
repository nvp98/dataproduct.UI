import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";

export interface FormColumnDef {
  title: string;
  dataIndex?: string;
  isLabel?: boolean;
  width?: number | string;
  fixed?: "left" | "right";
  format?: string;
  type?: "text" | "number" | "float" | "index" | string;
  readonly?: boolean;
  editable?: boolean;
  sum?: boolean;
  align?: "left" | "center" | "right";
  options?: Array<{ label: string; value: string | number }>;
  /** Nested header groups — hỗ trợ đệ quy nhiều cấp */
  children?: FormColumnDef[];
}

interface CustomFormTableProps {
  columns: FormColumnDef[];
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
    row: any,
  ) => void;
  compactWhenEmpty?: boolean; // Nếu true, khi không có dòng sẽ không chiếm nhiều chiều cao
  summary?: (data: readonly any[]) => React.ReactNode;
  onRow?: (record: any, index?: number) => any;
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
  onRow,
}: CustomFormTableProps) {
  // Validate và filter input theo type
  const validateAndFormatInput = (
    value: string,
    type?: "text" | "number" | "float",
  ): string => {
    if (!type || type === "text") return value;

    if (type === "number") {
      // Chỉ cho phép số nguyên dương, dấu âm ở đầu, không cho dấu thập phân
      return value
        .replace(/[^0-9-]/g, "")
        .replace(/^-+/, (m) => (m.length === 1 ? "-" : "-"));
    }

    if (type === "float") {
      // Cho phép số với dấu thập phân, dấu âm, và dấu cách (sẽ xóa sau)
      const normalized = value.replace(/\s+/g, ""); // Xóa dấu cách
      const match = normalized.match(/^-?[\d.]*$/);
      if (!match) return normalized.replace(/[^0-9.-]/g, "");

      // Chỉ cho phép một dấu chấm
      const parts = normalized.split(".");
      if (parts.length > 2) {
        return (parts[0] || "0") + "." + parts.slice(1).join("");
      }

      return normalized;
    }

    return value;
  };

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
    row?: any,
    readonly?: boolean,
  ) => {
    const style: any = {};
    style.textAlign = "right";
    if (readonly || !editable) style.backgroundColor = "#fffbe6";
    if (String(dataIndex) === "stChuaChuyen" && Number(value) > 0) {
      style.backgroundColor = "#fff1f0";
      style.borderColor = "#ff4d4f";
    }

    const key = String(dataIndex || "");
    if (key.toLowerCase().startsWith("stdachuyen")) {
      const suffix = key.substring("stDachuyen".length);
      const sourceKey = `st${suffix}`;
      const sourceVal = Number(row?.[sourceKey] ?? 0);
      const transferredVal = Number(value ?? 0);

      if (
        !Number.isNaN(sourceVal) &&
        !Number.isNaN(transferredVal) &&
        sourceVal !== transferredVal
      ) {
        style.backgroundColor = "#fff1f0";
        style.borderColor = "#ff4d4f";
      }
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
  const handleDeleteRow = (rowIndex: number) => {
    if (rows.length <= minRows) {
      return; // Không cho xóa nếu đã đạt số dòng tối thiểu
    }
    const newRows = rows.filter((_, idx) => idx !== rowIndex);
    setRows(newRows);
    onDataChange?.(newRows);
  };

  // Lấy tất cả field keys từ columns (đệ quy, hỗ trợ nhiều cấp children)
  const getAllFieldKeys = (cols: FormColumnDef[]): string[] => {
    const keys: string[] = [];
    cols.forEach((col) => {
      if (col.children?.length) {
        keys.push(...getAllFieldKeys(col.children));
      } else if (col.dataIndex) {
        keys.push(col.dataIndex);
      }
    });
    return keys;
  };

  // Xử lý thay đổi dữ liệu trong ô
  const handleCellChange = (
    value: string,
    rowIndex: number,
    dataIndex: string,
  ) => {
    const newData = [...rows];
    newData[rowIndex][dataIndex] = value;
    setRows(newData);
    onDataChange?.(newData);
    onCellChange?.(rowIndex, dataIndex, value, newData[rowIndex]);
  };

  // Đệ quy xây dựng cột — hỗ trợ nested children tùy ý cấp
  const buildColumn = (col: FormColumnDef): any => {
    // Cột nhóm (có children) → đệ quy vào children
    if (col.children?.length) {
      return {
        title: col.title,
        width: col.width,
        fixed: col.fixed,
        children: col.children.map((child: any) => buildColumn(child)),
      };
    }

    // Cột label (chỉ hiển thị, không input)
    if (col.isLabel) {
      return {
        title: col.title,
        dataIndex: col.dataIndex,
        width: col.width,
        render: (_: any, record: any) => (
          <div style={{ paddingLeft: 8, backgroundColor: !editable ? "#fffbe6" : undefined }}>
            {record[col.dataIndex || ""]}
          </div>
        ),
      };
    }

    // Cột index tùy chỉnh (có render riêng)
    if ((col as any).type === "index") {
      return {
        title: col.title,
        dataIndex: col.dataIndex,
        width: col.width,
        fixed: col.fixed,
        render: (col as any).render,
      };
    }

    // Cột lá (leaf) — render Input / Select
    const dataIndex = col.dataIndex as string;
    const isReadonly = col.readonly === true || col.editable === false || readonlyFields.includes(String(dataIndex));

    return {
      title: col.title,
      dataIndex,
      width: col.width,
      fixed: col.fixed,
      render: (_: any, record: any, idx: number) => {
        if (isReadonly) {
          return (
            <Input
              placeholder={col.title}
              value={formatIfNeeded(col.format, record[dataIndex])}
              readOnly
              style={getCellStyle(dataIndex, record[dataIndex], record, true)}
            />
          );
        }
        if (col.options) {
          return (
            <Select
              placeholder={col.title}
              value={record[dataIndex] ?? undefined}
              onChange={(value) => handleCellChange(value, idx, dataIndex)}
              options={col.options}
              disabled={!editable}
              style={{ width: "100%" }}
            />
          );
        }
        return (
          <Input
            placeholder={col.title}
            value={record[dataIndex] ?? ""}
            onChange={(e) => {
              const validated = validateAndFormatInput(e.target.value, col.type as "number" | "text" | "float" | undefined);
              handleCellChange(validated, idx, dataIndex);
            }}
            disabled={!editable}
            style={getCellStyle(dataIndex, record[dataIndex], record, false)}
          />
        );
      },
    };
  };

  // Sinh cột động từ config
  const tableColumns = [
    ...columns.map((col) => buildColumn(col)),
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
            render: (_: any, _record: any, rowIndex: number) => (
              <Space>
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa dòng này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => handleDeleteRow(rowIndex)}
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
              rowKey={(record, index) => record?.key ?? record?.id ?? index}
              style={{ marginTop: 12 }}
              scroll={{ x: "max-content", y: scrollY }}
              sticky={stickyHeader}
              summary={summary}
              onRow={onRow}
              rowSelection={
                selectionEnabled
                  ? {
                      selectedRowKeys: selectedRowKeys as any,
                      onChange: (keys, selected) => {
                        // Keep selected keys in the original data type (number/string)
                        const typedKeys = (selected as any[]).map(
                          (record, idx) =>
                            record?.key ?? record?.id ?? keys[idx],
                        );
                        onSelectionChange?.(typedKeys as any, selected as any);
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
