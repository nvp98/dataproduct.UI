/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { Table, Input, Button } from "antd";
import type { STD_NXT_HRC2_PhanBoDto } from "../models/STD_NXT_Model";

interface SummaryTableSTDProps {
  columns: Array<{
    title: string;
    dataIndex?: string;
    isLabel?: boolean;
    width?: number | string;
  }>;
  table1Data: any[]; // Dữ liệu từ bảng 1
  initialData?: any[];
  onDataChange?: (data: any[]) => void;
  onPhanBo?: (data: STD_NXT_HRC2_PhanBoDto) => void; // Callback khi click button Phân bổ
  editable?: boolean;
  loading?: boolean;
  className?: string;
}

export default function SummaryTableSTD({
  columns,
  table1Data = [],
  onDataChange,
  onPhanBo,
  editable = true,
  loading = false,
  className = "",
}: SummaryTableSTDProps) {
  // Tính tổng theo nguyên nhiên liệu duy nhất (theo thứ tự xuất hiện ở bảng trên)
  const summaryData = useMemo(() => {
    if (!table1Data || table1Data.length === 0) return [];

    const materialOrder: string[] = [];
    const grouped: Record<string, any[]> = {};

    table1Data.forEach((row) => {
      const material = row.nguyenNhienLieu || "";
      if (!material) return;
      if (!grouped[material]) {
        grouped[material] = [];
        materialOrder.push(material); // giữ thứ tự xuất hiện đầu tiên
      }
      grouped[material].push(row);
    });

    const summaryRows: any[] = [];
    materialOrder.forEach((material, index) => {
      const rows = grouped[material] || [];

      const totalTonDauCa = rows.reduce((sum, r) => sum + (parseFloat(String(r.tonDauCa || 0)) || 0), 0);
      const totalNhapTrongCa = rows.reduce((sum, r) => sum + (parseFloat(String(r.nhapTrongCa || 0)) || 0), 0);
      const totalTonCuoiCa = rows.reduce((sum, r) => sum + (parseFloat(String(r.tonCuoiCa || 0)) || 0), 0);
      const totalSDTrongSoSach = rows.reduce((sum, r) => sum + (parseFloat(String(r.tongThucTe || 0)) || 0), 0);
      const totalSuDung = totalTonDauCa + totalNhapTrongCa - totalTonCuoiCa;
      const totalChenhLech = Math.abs(totalSuDung - totalSDTrongSoSach);
      summaryRows.push({
        key: `summary_${material}`,
        totalText: index === 0 ? "Tổng cộng (cả trong và ngoài silo)" : "",
        totalNguyenNhienLieu: material,
        totalTonDauCa: totalTonDauCa ,
        totalNhapTrongCa: totalNhapTrongCa,
        totalTonCuoiCa: totalTonCuoiCa ,
        totalSuDung: totalSuDung,
        totalSDTrongSoSach: totalSDTrongSoSach,
        totalChenhLech: totalChenhLech,
        _isFirstMaterialRow: index === 0,
        _materialRowCount: materialOrder.length,
      });
    });


    return summaryRows;
  }, [table1Data]);

  // Tính chênh lệch khi có thay đổi
  const dataWithChenhLech = useMemo(() => {
    return summaryData.map((row) => {
      if (row._isTotalRow) return row;
      
      const suDung = typeof row.totalSuDung === "number" ? row.totalSuDung : parseFloat(String(row.totalSuDung || 0));
      const sdTrongSoSach = parseFloat(String(row.totalSDTrongSoSach || 0)) || 0;
      const chenhLech = suDung - sdTrongSoSach;
      
      return {
        ...row,
        totalChenhLech: Math.abs(chenhLech),
      };
    });
  }, [summaryData]);

  const handleCellChange = (key: string, dataIndex: string, value: any) => {
    // Cập nhật dữ liệu và tính lại chênh lệch
    const updatedData = dataWithChenhLech.map((row) => {
      if (row.key === key) {
        const updated = { ...row, [dataIndex]: value };
        // Tính lại chênh lệch nếu thay đổi totalSDTrongSoSach
        if (dataIndex === "totalSDTrongSoSach") {
          const suDung = typeof updated.totalSuDung === "number" 
            ? updated.totalSuDung 
            : parseFloat(String(updated.totalSuDung || 0));
          const sdTrongSoSach = parseFloat(String(value || 0)) || 0;
          updated.totalChenhLech = suDung - sdTrongSoSach;
        }
        return updated;
      }
      return row;
    });
    onDataChange?.(updatedData);
  };

  // Format số với dấu chấm ngăn cách hàng nghìn và dấu phẩy cho phần thập phân
  const formatNumber = (value: string | number, showNegativeInParentheses = false) => {
    if (value === null || value === undefined || value === "") return "";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return value.toString();
    
    // Xử lý số âm
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    
    // Format với dấu chấm ngăn cách hàng nghìn, dấu phẩy cho thập phân
    const formatted = absNum.toLocaleString("de-DE", { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
    
    if (showNegativeInParentheses && isNegative) {
      return `(${formatted})`;
    }
    return isNegative ? `-${formatted}` : formatted;
  };

  const renderCell = (record: any, col: any) => {
    const dataIndex = col.dataIndex;
    const isReadonly = col.isLabel === true || dataIndex === "totalChenhLech" || dataIndex === "totalText";
    const value = record[dataIndex] ?? "";
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech"].includes(dataIndex);
    const isChenhLechColumn = dataIndex === "totalChenhLech";
    const isTotalTextColumn = dataIndex === "totalText";

    // Xử lý merge cho cột totalText
    if (isTotalTextColumn) {
      if (record._isFirstMaterialRow) {
        return {
          children: <span>{record.totalText || ""}</span>,
          props: {
            rowSpan: record._materialRowCount || 1,
          },
        };
      }
      if (!record._isTotalRow && record.totalText === "") {
        return {
          children: null,
          props: {
            rowSpan: 0,
          },
        };
      }
    }

    if (isReadonly) {
      if (isNumberColumn && (value || value === 0)) {
        const formatted = formatNumber(value, isChenhLechColumn);
        return <span style={{ textAlign: "right", display: "block" }}>{formatted}</span>;
      }
      return <span>{value}</span>;
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleCellChange(record.key, dataIndex, e.target.value)}
        disabled={!editable}
        style={{ border: "none", padding: 0, textAlign: isNumberColumn ? "right" : "left" }}
      />
    );
  };

  const tableColumns = columns.map((col) => {
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech"].includes(col.dataIndex || "");
    const isTotalTextColumn = col.dataIndex === "totalText";
    return {
      title: col.title,
      dataIndex: col.dataIndex,
      width: col.width || (isTotalTextColumn ? 200 : isNumberColumn ? 180 : 150),
      align: isNumberColumn ? "right" as const : (isTotalTextColumn ? "left" as const : "center" as const),
      render: (value: any, record: any) => renderCell(record, col),
    };
  });

  // Thêm cột "Phân bổ" ở cuối
  tableColumns.push({
    title: "Phân bổ",
    dataIndex: "phanBo",
    width: 100,
    align: "center" as const,
    fixed: "right" as const,
    render: (_: any, record: any) => {
      // Không hiển thị button cho dòng total (nếu có)
      if (record._isTotalRow) {
        return <span></span>;
      }
      return (
        <Button
          type="primary"
          size="small"
          onClick={() => onPhanBo?.({
            NgaySX: record.NgaySX,
            Ca: record.Ca,
            Id_HeaderKey: record.Id_HeaderKey,
            ChenhLech: Number(record.totalChenhLech || 0),
          })}
          disabled={!editable}
        >
          Phân bổ
        </Button>
      );
    },
  } as any);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className={className}>
      <Table
        bordered
        size="small"
        columns={tableColumns}
        dataSource={dataWithChenhLech}
        pagination={false}
        scroll={{ x: "max-content" }}
        rowKey="key"
      />
    </div>
  );
}

