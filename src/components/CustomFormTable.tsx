import { useState, useEffect } from "react";
import { Table, Button, Input, Popconfirm, Space, Spin, Checkbox } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

interface CustomFormTableProps {
  columns: Array<{
    title: string;
    dataIndex?: string;
    children?: Array<{
      title: string;
      dataIndex: string | number;
    }>;
  }>;
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  addRowButtonText?: string;
  showAddButton?: boolean;
  showDeleteButton?: boolean;
  minRows?: number; // Số dòng tối thiểu
  editable?: boolean; // Cho phép nhập tay hay không
  // Parent control
  loading?: boolean; // Loading state từ parent
  onRefresh?: () => void; // Callback để refresh data từ parent
  transferEnabled?: boolean;
  transferTitle?: string;
  onTransfer?: (rowKey: string | number, row: any, checked: boolean) => void;
  selectionEnabled?: boolean;
  selectedRowKeys?: Array<string | number>;
  onSelectionChange?: (keys: Array<string | number>, rows: any[]) => void;
  isRowSelectable?: (row: any) => boolean;
  rowTransferEnabled?: boolean;
  onRowTransferAll?: (rowKey: string | number, row: any) => void;
  onRowTransferPartial?: (rowKey: string | number, row: any) => void;
  isRowTransferable?: (row: any) => boolean;
}

export default function CustomFormTable({
  columns,
  initialData = [{ key: 1 }],
  onDataChange,
  addRowButtonText = "+ Thêm dòng",
  showAddButton = true,
  showDeleteButton = true,
  minRows = 1,
  editable = true,
  loading = false,
  onRefresh,
  transferEnabled = false,
  transferTitle = "Chuyển thùng",
  onTransfer,
  selectionEnabled = false,
  selectedRowKeys,
  onSelectionChange,
  isRowSelectable,
  rowTransferEnabled = false,
  onRowTransferAll,
  onRowTransferPartial,
  isRowTransferable,
}: CustomFormTableProps) {
  const [rows, setRows] = useState(initialData);

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
  };

  // Sinh cột động từ config
  const tableColumns = [
    ...columns.map((col) => {
      if (col.children) {
        // Merge header: cột cha có con
        return {
          title: col.title,
          children: col.children.map(
            (child: {
              title: string | undefined;
              dataIndex: string | number;
            }) => ({
              title: child.title,
              dataIndex: child.dataIndex,
              render: (_: any, record: any, idx: number) => (
                <Input
                  placeholder={child.title}
                  value={record[child.dataIndex] || ""}
                  onChange={(e) => {
                    handleCellChange(
                      e.target.value,
                      idx,
                      child.dataIndex as string
                    );
                  }}
                  disabled={!editable}
                />
              ),
            })
          ),
        };
      } else {
        // Cột bình thường
        return {
          title: col.title,
          dataIndex: col.dataIndex,
          render: (_: any, record: any, idx: number) => (
            <Input
              placeholder={col.title}
              value={record[col.dataIndex || ""] || ""}
              onChange={(e) => {
                handleCellChange(e.target.value, idx, col.dataIndex as string);
              }}
              disabled={!editable}
            />
          ),
        };
      }
    }),
    ...(transferEnabled
      ? [
          {
            title: transferTitle,
            key: "transfer",
            width: 120,
            render: (_: any, record: any, idx: number) => (
              <Checkbox
                checked={!!record.isThung}
                onChange={(e) => {
                  const newRows = [...rows];
                  newRows[idx].isThung = e.target.checked;
                  setRows(newRows);
                  onDataChange?.(newRows);
                  onTransfer?.(record.key, newRows[idx], e.target.checked);
                }}
              />
            ),
          },
        ]
      : []),
    ...(rowTransferEnabled
      ? [
          {
            title: "Chuyển",
            key: "row-transfer",
            width: 180,
            render: (_: any, record: any) => (
              <Space>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => onRowTransferAll?.(record.key, record)}
                  disabled={isRowTransferable ? !isRowTransferable(record) : false}
                >
                  Chuyển hết
                </Button>
                <Button
                  size="small"
                  onClick={() => onRowTransferPartial?.(record.key, record)}
                  disabled={isRowTransferable ? !isRowTransferable(record) : false}
                >
                  Chuyển 1 phần
                </Button>
              </Space>
            ),
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
          <Table
            bordered
            pagination={false}
            size="small"
            columns={tableColumns}
            dataSource={rows}
            style={{ marginTop: 20 }}
            rowSelection={
              selectionEnabled
                ? {
                    selectedRowKeys: selectedRowKeys as any,
                    onChange: (keys, selected) => {
                      onSelectionChange?.(keys as any, selected as any);
                    },
                    getCheckboxProps: (record: any) => ({
                      disabled: isRowSelectable ? !isRowSelectable(record) : false,
                    }),
                  }
                : undefined
            }
          />
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
