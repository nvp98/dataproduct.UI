/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useCallback, memo, useRef, useEffect } from "react";
import { Table, Input, Button, InputNumber, message, Tag, Tooltip } from "antd";
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

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

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
    readOnly?: boolean;
    width?: number | string;
  }>;
  table1Data: any[]; // Dữ liệu từ bảng 1
  initialData?: any[]; // Dữ liệu summary từ BE (có HasPhanBo, Id_HeaderKey, NgaySX, Ca...)
  onDataChange?: (data: any[]) => void;
  onPhanBo?: (data: STD_NXT_HRC2_PhanBoDto) => void;
  onThuHoi?: (data: STD_NXT_HRC2_PhanBoDto) => void;
  onKhongPhanBo?: (data: STD_NXT_HRC2_PhanBoDto) => void;
  /** Chỉ cho phép bấm "Phân bổ" khi tất cả phiếu ở tab nấu luyện đã Hoàn thành */
  canPhanBo?: boolean;
  idPhieu?: string | null; // Phiếu đang mở (để gửi kèm payload phân bổ/thu hồi)
  editable?: boolean;
  loading?: boolean;
  className?: string;
  /** Khi set, toàn bộ action buttons bị disable + hiện tooltip này khi hover */
  lockedTooltip?: string;
}

export default function SummaryTableSTD({
  columns,
  table1Data = [],
  initialData = [],
  onDataChange,
  onPhanBo,
  onThuHoi,
  onKhongPhanBo,
  canPhanBo = true,
  idPhieu,
  editable = true,
  loading = false,
  className = "",
  lockedTooltip,
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
        // IsPhanBo: null=chưa xử lý | true=đã phân bổ | false=không phân bổ
        baseRow.IsPhanBo = meta.isPhanBo ?? meta.IsPhanBo ?? meta.hasPhanBo ?? meta.HasPhanBo ?? null;
        baseRow.NgaySX = meta.ngaySX ?? meta.NgaySX ?? undefined;
        baseRow.Ca = meta.ca ?? meta.Ca ?? undefined;
        baseRow.tyLeBOF = meta.tyLeBOF ?? meta.TyLeBOF ?? null;
        baseRow.tyLeTinhLuyen = meta.tyLeTinhLuyen ?? meta.TyLeTinhLuyen ?? null;
        // Luồng tương tự tyLeBOF: lấy trực tiếp từ initialData (BE) đưa vào row render
        baseRow.KLPB_BOF = meta.klpB_BOF ?? meta.klpb_BOF ?? meta.KLPB_BOF ?? null;
        baseRow.KLPB_TL = meta.klpB_TL ?? meta.klpb_TL ?? meta.KLPB_TL ?? null;

        // Ưu tiên chênh lệch từ BE (sau khi phân bổ/thu hồi BE có thể cập nhật lại)
        const chenhLechFromServer =
          meta.totalChenhLech ??
          meta.TotalChenhLech ??
          meta.chenhLech ??
          meta.ChenhLech ??
          null;
        if (chenhLechFromServer !== null && chenhLechFromServer !== undefined && chenhLechFromServer !== "") {
          baseRow.totalChenhLech = chenhLechFromServer;
          baseRow._chenhLechFromServer = true;
        }
      }

      summaryRows.push(baseRow);
    });


    return summaryRows;
  }, [table1Data, initialData]);

  // Tính chênh lệch khi có thay đổi
  const dataWithChenhLech = useMemo(() => {
    return summaryData.map((row) => {
      if (row._isTotalRow) return row;
      // Nếu BE đã trả chênh lệch (đã chuẩn hoá), không tự tính lại để tránh lệch dữ liệu sau phân bổ
      if (row._chenhLechFromServer === true) {
        const num = parseFloat(String(row.totalChenhLech ?? 0)) || 0;
        return { ...row, totalChenhLech: Math.abs(num) };
      }
      
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

  const tyLeDebounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleTyLeChange = useCallback((key: string, field: "tyLeBOF" | "tyLeTinhLuyen", value: number | null) => {
    const other = field === "tyLeBOF" ? "tyLeTinhLuyen" : "tyLeBOF";
    const timerKey = `${key}::${field}`;

    // Reset timer mỗi khi user thay đổi input để chỉ tính sau khi ngừng thao tác.
    const existingTimer = tyLeDebounceTimers.current[timerKey];
    if (existingTimer) clearTimeout(existingTimer);

    setTyLeMap((prev) => {
      const currentRow = { ...prev[key] };

      // Khi xóa input (null), chỉ xóa field hiện tại và KHÔNG tự tính field còn lại.
      if (value === null) {
        const nextRow = { ...currentRow, [field]: null };
        const next = { ...prev, [key]: nextRow };
        const updatedRows = dataWithChenhLech.map((row) =>
          row.key === key ? { ...row, ...next[key] } : row
        );
        onDataChange?.(updatedRows);
        return next;
      }

      // Khi đang nhập (value != null): chỉ cập nhật field hiện tại.
      // Field còn lại sẽ được auto-tính sau 300ms (nếu user không tiếp tục sửa).
      const nextRow = { ...currentRow, [field]: value };
      const next = { ...prev, [key]: nextRow };
      const updatedRows = dataWithChenhLech.map((row) =>
        row.key === key ? { ...row, ...next[key] } : row
      );
      onDataChange?.(updatedRows);
      return next;
    });

    if (value === null) return;

    // Sau 300ms không đổi nữa thì mới tính field còn lại = 100 - value.
    tyLeDebounceTimers.current[timerKey] = setTimeout(() => {
      const otherVal = Math.max(
        0,
        Math.min(
          100,
          parseFloat(((100 - value).toFixed(10)).replace(/\.?0+$/, ""))
        )
      );

      setTyLeMap((prev) => {
        const currentRow = { ...prev[key] };
        const nextRow = { ...currentRow, [other]: otherVal, [field]: value };
        const next = { ...prev, [key]: nextRow };
        const updatedRows = dataWithChenhLech.map((row) =>
          row.key === key ? { ...row, ...next[key] } : row
        );
        onDataChange?.(updatedRows);
        return next;
      });
    }, 300);
  }, [dataWithChenhLech, onDataChange]);

  // State local cho IsPhanBo sau mock API
  const [phanBoMap, setPhanBoMap] = useState<Record<string, boolean | null>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, string | null>>({});

  // Reset phanBoMap khi initialData thay đổi (filter reload) để đọc lại từ BE
  useEffect(() => {
    setPhanBoMap({});
  }, [initialData]);

  const getIsPhanBo = useCallback((record: any): boolean | null => {
    if (Object.prototype.hasOwnProperty.call(phanBoMap, record.key)) return phanBoMap[record.key];
    return record.IsPhanBo ?? null;
  }, [phanBoMap]);

  const mockApiCall = useCallback((_action: string): Promise<boolean | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (_action === 'phan-bo') resolve(true);
        else if (_action === 'khong-phan-bo') resolve(false);
        else resolve(null); // huy-phan-bo, thu-hoi, huy-khong-phan-bo
      }, 600);
    });
  }, []);

  const handlePhanBoClick = useCallback(async (record: any) => {
    const current = getIsPhanBo(record);
    const action = current === true ? 'huy-phan-bo' : 'phan-bo';
    setLoadingMap(prev => ({ ...prev, [record.key]: action }));
    try {
      const next = await mockApiCall(action);
      setPhanBoMap(prev => ({ ...prev, [record.key]: next }));
      if (action === 'phan-bo') {
        const rowTyLe = tyLeMap[record.key] ?? {};
        const tyLeBOF = rowTyLe.tyLeBOF ?? record.tyLeBOF ?? 0;
        const tyLeTinhLuyen = rowTyLe.tyLeTinhLuyen ?? record.tyLeTinhLuyen ?? 0;
        onPhanBo?.({ NgaySX: record.NgaySX, Ca: record.Ca, Id_HeaderKey: record.Id_HeaderKey, ChenhLech: Number(record.totalChenhLech ?? 0), IdPhieu: idPhieu ?? "", TyLeBOF: tyLeBOF, TyLeTinhLuyen: tyLeTinhLuyen });
      } else {
        onThuHoi?.({ NgaySX: record.NgaySX, Ca: record.Ca, Id_HeaderKey: record.Id_HeaderKey, ChenhLech: Number(record.totalChenhLech ?? 0), IdPhieu: idPhieu ?? "", TyLeBOF: 0, TyLeTinhLuyen: 0 });
      }
    } catch {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoadingMap(prev => ({ ...prev, [record.key]: null }));
    }
  }, [getIsPhanBo, mockApiCall, tyLeMap, idPhieu, onPhanBo, onThuHoi]);

  const handleThuHoiClick = useCallback(async (record: any) => {
    setLoadingMap(prev => ({ ...prev, [record.key]: 'thu-hoi' }));
    try {
      await mockApiCall('thu-hoi');
      setPhanBoMap(prev => ({ ...prev, [record.key]: null }));
      onThuHoi?.({ NgaySX: record.NgaySX, Ca: record.Ca, Id_HeaderKey: record.Id_HeaderKey, ChenhLech: Number(record.totalChenhLech ?? 0), IdPhieu: idPhieu ?? "", TyLeBOF: 0, TyLeTinhLuyen: 0 });
    } catch {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoadingMap(prev => ({ ...prev, [record.key]: null }));
    }
  }, [mockApiCall, idPhieu, onThuHoi]);

  const handleKhongPhanBoClick = useCallback(async (record: any) => {
    const current = getIsPhanBo(record);
    const action = current === false ? 'huy-khong-phan-bo' : 'khong-phan-bo';
    setLoadingMap(prev => ({ ...prev, [record.key]: action }));
    try {
      const next = await mockApiCall(action);
      setPhanBoMap(prev => ({ ...prev, [record.key]: next }));
      onKhongPhanBo?.({ NgaySX: record.NgaySX, Ca: record.Ca, Id_HeaderKey: record.Id_HeaderKey, ChenhLech: Number(record.totalChenhLech ?? 0), IdPhieu: idPhieu ?? "" });
    } catch {
      message.error("Có lỗi xảy ra");
    } finally {
      setLoadingMap(prev => ({ ...prev, [record.key]: null }));
    }
  }, [getIsPhanBo, mockApiCall, idPhieu, onKhongPhanBo]);

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
    const isReadonly = col.readOnly === true || col.isLabel === true;
    const value = record[dataIndex] ?? "";
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech", "KLPB_BOF", "KLPB_TL"].includes(dataIndex);
    const isTyLeColumn = dataIndex === "tyLeBOF" || dataIndex === "tyLeTinhLuyen";

    if (isTyLeColumn && !record._isTotalRow) {
      const hasPhanBo = getIsPhanBo(record) === true;
      const tyLeVal = tyLeMap[record.key]?.[dataIndex as "tyLeBOF" | "tyLeTinhLuyen"] ?? (record[dataIndex] ?? null);
      return (
        <InputNumber
          value={tyLeVal}
          min={0}
          max={100}
          disabled={!editable || hasPhanBo}
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
    const isNumberColumn = ["totalTonDauCa", "totalNhapTrongCa", "totalTonCuoiCa", "totalSuDung", "totalSDTrongSoSach", "totalChenhLech", "KLPB_BOF", "KLPB_TL"].includes(col.dataIndex || "");
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

  tableColumns.push(
    {
      title: "KL PB Lò thổi",
      dataIndex: "KLPB_BOF",
      width: 85,
      align: "right" as const,
      render: (_: any, record: any) => {
        if (record._isTotalRow) return null;
        const v =
          record.KLPB_BOF ??
          (record as any).klpB_BOF ??
          (record as any).klpb_BOF ??
          (record as any).KLPB_BOF ??
          "";
        return <span style={{ textAlign: "right", display: "block" }}>{v === "" ? "" : formatNumber(v)}</span>;
      },
    } as any,
    {
      title: "KL PB TL",
      dataIndex: "KLPB_TL",
      width: 85,
      align: "right" as const,
      render: (_: any, record: any) => {
        if (record._isTotalRow) return null;
        const v =
          record.KLPB_TL ??
          (record as any).klpB_TL ??
          (record as any).klpb_TL ??
          (record as any).KLPB_TL ??
          "";
        return <span style={{ textAlign: "right", display: "block" }}>{v === "" ? "" : formatNumber(v)}</span>;
      },
    } as any
  );

  // Cột "Tình trạng"
  tableColumns.push({
    title: "Tình trạng",
    dataIndex: "tinhTrang",
    width: 110,
    align: "center" as const,
    render: (_: any, record: any) => {
      if (record._isTotalRow) return null;
      const isPhanBo = getIsPhanBo(record);
      if (isPhanBo === true) return <Tag color="success">Đã phân bổ</Tag>;
      if (isPhanBo === false) return <Tag color="error">Không phân bổ</Tag>;
      return <Tag color="default">Chưa xử lý</Tag>;
    },
  } as any);

  // Cột "Thao tác" — gộp Phân bổ + Không phân bổ
  tableColumns.push({
    title: "Thao tác",
    dataIndex: "thaotac",
    width: 220,
    align: "center" as const,
    render: (_: any, record: any) => {
      if (record._isTotalRow) return null;
      const isPhanBo = getIsPhanBo(record);
      const isLoading = loadingMap[record.key];
      const isLocked = !!lockedTooltip;

      const wrapLocked = (btn: React.ReactNode) =>
        isLocked ? <Tooltip title={lockedTooltip}><span style={{ display: "inline-block" }}>{btn}</span></Tooltip> : btn;

      // Nút Phân bổ / Đã phân bổ + Thu hồi
      let btnPhanBo: React.ReactNode;
      if (isPhanBo === true) {
        btnPhanBo = wrapLocked(
          <Button
            size="small"
            loading={isLoading === 'thu-hoi'}
            disabled={!editable || isLocked}
            onClick={() => handleThuHoiClick(record)}
          >
            Thu hồi
          </Button>
        );
      } else {
        btnPhanBo = wrapLocked(
          <Button
            type="primary"
            size="small"
            loading={isLoading === 'phan-bo'}
            disabled={isPhanBo === false || !editable || isLocked || (canPhanBo === false && isPhanBo === null)}
            onClick={() => {
              const rowTyLe = tyLeMap[record.key] ?? {};
              const tyLeBOF = rowTyLe.tyLeBOF ?? record.tyLeBOF ?? null;
              const tyLeTinhLuyen = rowTyLe.tyLeTinhLuyen ?? record.tyLeTinhLuyen ?? null;
              if (tyLeBOF === null || tyLeBOF === undefined || tyLeTinhLuyen === null || tyLeTinhLuyen === undefined) {
                message.warning("Vui lòng nhập tỷ lệ phân bổ trước khi thực hiện phân bổ.");
                return;
              }
              handlePhanBoClick(record);
            }}
          >
            Phân bổ
          </Button>
        );
      }

      // Nút Không phân bổ
      const btnKhongPhanBo = isPhanBo === false
        ? wrapLocked(
            <Button
              danger
              type="primary"
              size="small"
              loading={isLoading === 'huy-khong-phan-bo'}
              disabled={!editable || isLocked}
              onClick={() => handleKhongPhanBoClick(record)}
            >
              Reset
            </Button>
          )
        : wrapLocked(
            <Button
              danger
              type="default"
              size="small"
              loading={isLoading === 'khong-phan-bo'}
              disabled={!editable || isLocked || isPhanBo === true}
              onClick={() => handleKhongPhanBoClick(record)}
            >
              Không PB
            </Button>
          );

      return (
        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
          {btnPhanBo}
          {btnKhongPhanBo}
        </div>
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

