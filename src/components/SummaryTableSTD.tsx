/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useCallback, memo } from "react";
import { Table, Input, Button, InputNumber } from "antd";
import type { STD_NXT_HRC2_PhanBoDto } from "../models/STD_NXT_Model";

const formatVi = (val: any): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = parseFloat(String(val));
  if (isNaN(num)) return String(val);
  return num.toLocaleString("fr-FR", { maximumFractionDigits: 10 });
};

const EditableCell = memo(({ value, disabled, onChange }: { value: any; disabled: boolean; onChange: (v: string) => void }) => {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState(value ?? "");

  useState(() => { setLocal(value ?? ""); });

  return (
    <Input
      value={focused ? local : formatVi(local)}
      disabled={disabled}
      style={{ border: "none", padding: 0, textAlign: "right" }}
      onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
});

interface SummaryTableSTDProps {
  columns: Array<{
    title: string;
    dataIndex?: string;
    isLabel?: boolean;
    width?: number | string;
  }>;
  table1Data: any[]; // Dữ liệu từ bảng 1
  initialData?: any[]; // Dữ liệu summary từ BE (có HasPhanBo, Id_HeaderKey, NgaySX, Ca...)
  onDataChange?: (data: any[]) => void;
  onPhanBo?: (data: STD_NXT_HRC2_PhanBoDto) => void;
  onThuHoi?: (data: STD_NXT_HRC2_PhanBoDto) => void;
  idPhieu?: string | null; // Phiếu đang mở (để gửi kèm payload phân bổ/thu hồi)
  editable?: boolean;
  loading?: boolean;
  className?: string;
}

export default function SummaryTableSTD({
  columns,
  table1Data = [],
  initialData = [],
  onDataChange,
  onPhanBo,
  onThuHoi,
  idPhieu,
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
        materialOrder.push(material); 
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

      // Lấy Id_HeaderKey từ bảng 1 (giả định mỗi nguyên liệu chỉ có 1 HeaderKey)
      const anyWithId = rows.find((r) => r.idNguyenNhienLieu != null);
      const idHeaderKey = anyWithId?.idNguyenNhienLieu ?? null;

      const baseRow: any = {
        key: `summary_${material}`,
        totalText: index === 0 ? "Tổng cộng (cả trong và ngoài silo)" : "",
        totalNguyenNhienLieu: material,
        totalTonDauCa: totalTonDauCa ,
        totalNhapTrongCa: totalNhapTrongCa,
        totalTonCuoiCa: totalTonCuoiCa ,
        totalSuDung: totalSuDung,
        totalSDTrongSoSach: totalSDTrongSoSach,
        totalChenhLech: totalChenhLech,
        Id_HeaderKey: idHeaderKey,
        _isFirstMaterialRow: index === 0,
        _materialRowCount: materialOrder.length,
      };

      // Gắn thêm meta từ initialData (nếu có): Id_HeaderKey, HasPhanBo, NgaySX, Ca
      const meta = Array.isArray(initialData)
        ? initialData.find((x: any) => {
            const name =
              x.tenNguyenLieu ??
              x.TenNguyenLieu ??
              x.totalNguyenNhienLieu ??
              x.TotalNguyenNhienLieu ??
              "";
            return String(name).trim().toLowerCase() === material.toLowerCase();
          })
        : undefined;
      if (meta) {
        baseRow.HasPhanBo =
          meta.hasPhanBo ??
          meta.HasPhanBo ??
          null;
        baseRow.NgaySX = meta.ngaySX ?? meta.NgaySX ?? undefined;
        baseRow.Ca = meta.ca ?? meta.Ca ?? undefined;
        baseRow.tyLeBOF = meta.tyLeBOF ?? meta.TyLeBOF ?? null;
        baseRow.tyLeTinhLuyen = meta.tyLeTinhLuyen ?? meta.TyLeTinhLuyen ?? null;
      }

      summaryRows.push(baseRow);
    });


    return summaryRows;
  }, [table1Data, initialData]);

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

  // State riêng cho tyLeBOF / tyLeTinhLuyen vì không derive từ table1Data
  const [tyLeMap, setTyLeMap] = useState<Record<string, { tyLeBOF?: number | null; tyLeTinhLuyen?: number | null }>>({});

  const handleTyLeChange = useCallback((key: string, field: "tyLeBOF" | "tyLeTinhLuyen", value: number | null) => {
    setTyLeMap((prev) => {
      const other = field === "tyLeBOF" ? "tyLeTinhLuyen" : "tyLeBOF";
      const otherVal = Math.max(0, Math.min(100, parseFloat(((100 - (value ?? 0)).toFixed(10)).replace(/\.?0+$/, ""))));
      const next = { ...prev, [key]: { ...prev[key], [field]: value, [other]: otherVal } };
      const updatedRows = dataWithChenhLech.map((row) =>
        row.key === key ? { ...row, ...next[key] } : row
      );
      onDataChange?.(updatedRows);
      return next;
    });
  }, [dataWithChenhLech, onDataChange]);

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

  const formatNumber = (value: string | number, showNegativeInParentheses = false) => {
    const formatted = formatVi(value);
    if (!formatted) return "";
    if (showNegativeInParentheses && String(value).startsWith("-")) {
      return `(${formatted.replace("-", "")})`;
    }
    return formatted;
  };

  const renderCell = (record: any, col: any) => {
    const dataIndex = col.dataIndex;
    const isReadonly = col.isLabel === true || dataIndex === "totalChenhLech" || dataIndex === "totalText";
    const value = record[dataIndex] ?? "";
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech"].includes(dataIndex);
    const isTyLeColumn = dataIndex === "tyLeBOF" || dataIndex === "tyLeTinhLuyen";

    if (isTyLeColumn && !record._isTotalRow) {
      const tyLeVal = tyLeMap[record.key]?.[dataIndex as "tyLeBOF" | "tyLeTinhLuyen"] ?? (record[dataIndex] ?? null);
      return (
        <InputNumber
          value={tyLeVal}
          min={0}
          max={100}
          disabled={!editable}
          style={{ width: "100%" }}
          onChange={(v) => handleTyLeChange(record.key, dataIndex as "tyLeBOF" | "tyLeTinhLuyen", v)}
        />
      );
    }
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
      <EditableCell
        value={value}
        disabled={!editable}
        onChange={(v) => handleCellChange(record.key, dataIndex, v)}
      />
    );
  };

  const tableColumns = columns.map((col) => {
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech"].includes(col.dataIndex || "");
    const isTotalTextColumn = col.dataIndex === "totalText";
    const isTyLeCol = col.dataIndex === "tyLeBOF" || col.dataIndex === "tyLeTinhLuyen";
    const isMaterialCol = col.dataIndex === "totalNguyenNhienLieu";
    return {
      title: col.title,
      dataIndex: col.dataIndex,
      width: col.width || (
        isTotalTextColumn ? 140 :
        isMaterialCol ? 110 :
        isTyLeCol ? 70 :
        isNumberColumn ? 100 : 90
      ),
      align: isNumberColumn ? "right" as const : (isTotalTextColumn ? "left" as const : "center" as const),
      render: (value: any, record: any) => renderCell(record, col),
    };
  });

  // Thêm cột "Phân bổ / Thu hồi" ở cuối
  tableColumns.push({
    title: "Phân bổ",
    dataIndex: "phanBo",
    width: 72,
    align: "center" as const,
    render: (_: any, record: any) => {
      if (record._isTotalRow) {
        return <span></span>;
      }
      // console.log(record)
      // BE trả về HasPhanBo (PascalCase), meta gán baseRow.HasPhanBo — cần đọc cả hai kiểu
      const hasPhanBo = record.hasPhanBo === true || record.HasPhanBo === true;
      const label = hasPhanBo ? "Thu hồi" : "Phân bổ";
      return (
        <Button
          type={hasPhanBo ? "default" : "primary"}
          size="small"
          onClick={() => {
            const rowTyLe = tyLeMap[record.key] ?? {};
            const payload: STD_NXT_HRC2_PhanBoDto = {
              NgaySX: record.NgaySX ?? record.ngaySX,
              Ca: record.Ca ?? record.ca,
              Id_HeaderKey: record.Id_HeaderKey ?? record.id_HeaderKey,
              ChenhLech: Number(record.totalChenhLech ?? 0),
              IdPhieu: idPhieu ?? "",
              TyLeBOF: rowTyLe.tyLeBOF ?? record.tyLeBOF ?? 0,
              TyLeTinhLuyen: rowTyLe.tyLeTinhLuyen ?? record.tyLeTinhLuyen ?? 0,
            };
            if (hasPhanBo) {
              onThuHoi?.(payload);
            } else {
              onPhanBo?.(payload);
            }
          }}
          disabled={!editable}
        >
          {label}
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
        tableLayout="fixed"
        rowKey="key"
      />
    </div>
  );
}

