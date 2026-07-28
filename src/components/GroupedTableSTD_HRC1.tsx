/* eslint-disable @typescript-eslint/no-explicit-any */
// Fork của GroupedTableSTD.tsx cho Sổ Xuất-Nhập-Tồn HRC1 — thay HeaderKeyAutocomplete (Header_Key,
// dùng riêng cho HRC2) bằng Hrc1PhuLieuNmAutocomplete (HRC1_PhuLieuNM). Vì danh mục HRC1_PhuLieuNM
// cố định (không có khái niệm "phụ liệu chưa map"), bỏ hẳn nhánh isUnmapped/HeaderMappingModal —
// xem .claude/hrc1_xnt.md mục 8.2. Field "idNguyenNhienLieu" đổi tên thành "idPhuLieu".
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
  startTransition,
} from "react";
import { Table, Button, Input, Popconfirm, Select, Modal } from "antd";
import { DeleteOutlined, PlusOutlined, SnippetsOutlined } from "@ant-design/icons";
import Hrc1PhuLieuNmAutocomplete from "./Hrc1PhuLieuNmAutocomplete";
import { CommonAutocomplete } from "./CommonAutocomplete";
import { SiloServiceApi } from "../services/SiloServiceApi";
import type { Silo } from "../models/SiloModel";
import { isAdmin } from "../utils/helpers/checkAdminRole";

/* ======================= CONSTANTS ======================= */
const NGOAI_SILO_ID = -1;
const NGOAI_SILO_OPTION = { id: NGOAI_SILO_ID, tenSilo: "Ngoài silo" };
const PASTE_COLUMNS = ["nhapTrongCa", "tonCuoiCa"];

/* ======================= UTILITY FUNCTIONS ======================= */

export const canUnlockMonthly = (date = new Date()) => {
  const day = date.getDate();
  const hour = date.getHours();

  const lastDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();

  const isLastDayEvening = day === lastDayOfMonth && hour >= 20;
  const isFirstDayMorning = day === 1 && hour < 8;

  return isLastDayEvening || isFirstDayMorning || isAdmin;
};

/* ======================= EDITABLE CELLS ======================= */

const formatVi = (val: any): string => {
  if (val === null || val === undefined || val === "") return "";
  const num = parseFloat(String(val));
  if (isNaN(num)) return String(val);
  return num.toLocaleString("fr-FR", { maximumFractionDigits: 10 });
};

const EditableInput = memo(
  ({ value, disabled, onChange, onBlur, readOnly = false, style }: any) => {
    const [local, setLocal] = useState(value ?? "");
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      setLocal(value ?? "");
    }, [value]);

    return (
      <Input
        value={focused ? local : formatVi(local)}
        disabled={disabled}
        bordered={true}
        readOnly={readOnly}
        style={style}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur(local);
        }}
      />
    );
  },
);

const EditableSelect = memo(
  ({ value, disabled, onChange, defaultViTri }: any) => (
    <Select
      value={value ?? defaultViTri}
      disabled={disabled}
      bordered={true}
      style={{ width: "100%" }}
      onChange={onChange}
      options={[
        { value: 1, label: "Trong silo" },
        { value: 2, label: "Ngoài silo" },
      ]}
    />
  ),
);

/* ======================= MAIN COMPONENT ======================= */

export default function GroupedTableSTD_HRC1({
  columns,
  initialData = [],
  onDataChange,
  khuVucList,
  defaultNguyenNhienLieu = [],
  defaultViTri = 1,
  editable = true,
  loading = false,
  khuVucConfig, // Config khu vực để lấy BieuMau: [{label, bieuMau, scope}] — giữ lại cho tương lai, chưa dùng
  nhaMay = 1, // HRC1 = 1, HRC2 = 2
}: any) {
  const [rows, setRows] = useState<any[]>(initialData);
  const rowsRef = useRef<any[]>(initialData);
  const rowIdRef = useRef(0);

  /* ===== PasteModal ===== */
  const [pasteModal, setPasteModal] = useState<{
    open: boolean;
    columnKey: string;
    columnTitle: string;
  }>({ open: false, columnKey: "", columnTitle: "" });
  const [pasteText, setPasteText] = useState("");

  /* ================= INIT DATA ================= */
  const prevInitialDataRef = useRef<any[]>(initialData);

  useEffect(() => {
    const initialDataChanged = prevInitialDataRef.current !== initialData;
    prevInitialDataRef.current = initialData;

    if (initialData.length) {
      if (initialDataChanged) {
        setRows(initialData);
        rowsRef.current = initialData;
      }
      return;
    }

    if (!initialDataChanged) return;

    const init: any[] = [];
    khuVucList.forEach((kv: string) => {
      (defaultNguyenNhienLieu.length ? defaultNguyenNhienLieu : [""]).forEach(
        (nl: string) => {
          init.push({
            key: `${kv}_${rowIdRef.current++}`,
            khuVuc: kv,
            viTri: defaultViTri,
            nguyenNhienLieu: nl,
          });
        },
      );
    });

    setRows(init);
    rowsRef.current = init;
  }, [initialData, khuVucList, defaultNguyenNhienLieu, defaultViTri]);

  /* ================= EMIT DATA ================= */
  const emitData = useCallback(
    (data: any[]) => {
      onDataChange?.(data);
    },
    [onDataChange],
  );

  /* ================= ADD / DELETE ================= */
  const addRow = useCallback(
    (kv: string) => {
      startTransition(() => {
        setRows((prev) => {
          const next = [
            ...prev,
            {
              key: `${kv}_${rowIdRef.current++}`,
              khuVuc: kv,
              viTri: defaultViTri,
              nguyenNhienLieu: "",
              isManualNew: true,
            },
          ];
          rowsRef.current = next;
          emitData(next);
          return next;
        });
      });
    },
    [defaultViTri, emitData],
  );

  const deleteRow = useCallback(
    (key: string) => {
      setRows((prev) => {
        const next = prev.filter((r) => r.key !== key);
        rowsRef.current = next;
        emitData(next);
        return next;
      });
    },
    [emitData],
  );

  /* ================= UPDATE CELL ================= */
  const updateCell = useCallback((key: string, field: string, value: any) => {
    rowsRef.current = rowsRef.current.map((r) =>
      r.key === key ? { ...r, [field]: value } : r,
    );
  }, []);

  const KIEMKE_CALC_FIELDS = ["tonDauCa", "nhapTrongCa", "tonCuoiCa"];

  const isNegativeNumber = (val: any) =>
    val != null && val !== "" && !Number.isNaN(Number(val)) && Number(val) < 0;

  const commitCell = useCallback(
    (key: string, field: string, value: any) => {
      setRows((prev) => {
        const next = prev.map((r) => {
          if (r.key !== key) return r;
          const updated = { ...r, [field]: value };

          if (KIEMKE_CALC_FIELDS.includes(field)) {
            const rawTonDau = field === "tonDauCa" ? value : r.tonDauCa;
            const rawNhap = field === "nhapTrongCa" ? value : r.nhapTrongCa;
            const rawTonCuoi = field === "tonCuoiCa" ? value : r.tonCuoiCa;

            const hasTonDau =
              rawTonDau !== null && rawTonDau !== undefined && rawTonDau !== "";
            const hasTonCuoi =
              rawTonCuoi !== null &&
              rawTonCuoi !== undefined &&
              rawTonCuoi !== "";

            if (hasTonDau && hasTonCuoi) {
              const tonDau = Number(rawTonDau);
              const tonCuoi = Number(rawTonCuoi);

              const nhap =
                rawNhap === null || rawNhap === undefined || rawNhap === ""
                  ? 0
                  : Number(rawNhap);

              if (
                !Number.isNaN(tonDau) &&
                !Number.isNaN(nhap) &&
                !Number.isNaN(tonCuoi)
              ) {
                updated.luongSuDungKiemKe = tonDau + nhap - tonCuoi;
              }
            }
          }
          return updated;
        });
        rowsRef.current = next;
        emitData(next);
        return next;
      });
    },
    [emitData],
  );

  /* ================= PASTE FROM EXCEL ================= */
  const handlePasteConfirm = useCallback(() => {
    const { columnKey } = pasteModal;
    const currentRows = rowsRef.current;
    const lines = pasteText
      .split("\n")
      .map((line) => line.split("\t")[0].trim())
      .filter((line, index) => line !== "" || index < currentRows.length);

    setRows((prev) => {
      const next = prev.map((r, i) => {
        if (lines[i] === undefined || lines[i] === "") return r;
        const num = parseFloat(lines[i].replace(/,/g, ""));
        if (isNaN(num)) return r;
        const updated = { ...r, [columnKey]: num };
        if (KIEMKE_CALC_FIELDS.includes(columnKey)) {
          const rawTonDau = columnKey === "tonDauCa" ? num : r.tonDauCa;
          const rawNhap = columnKey === "nhapTrongCa" ? num : r.nhapTrongCa;
          const rawTonCuoi = columnKey === "tonCuoiCa" ? num : r.tonCuoiCa;
          const hasTonDau = rawTonDau != null && rawTonDau !== "";
          const hasTonCuoi = rawTonCuoi != null && rawTonCuoi !== "";
          if (hasTonDau && hasTonCuoi) {
            const tonDau = Number(rawTonDau);
            const tonCuoi = Number(rawTonCuoi);
            const nhap =
              rawNhap == null || rawNhap === "" ? 0 : Number(rawNhap);
            if (!isNaN(tonDau) && !isNaN(nhap) && !isNaN(tonCuoi)) {
              updated.luongSuDungKiemKe = tonDau + nhap - tonCuoi;
            }
          }
        }
        return updated;
      });
      rowsRef.current = next;
      emitData(next);
      return next;
    });
    setPasteModal({ open: false, columnKey: "", columnTitle: "" });
    setPasteText("");
  }, [pasteModal, pasteText, emitData]);

  /* ================= GROUP ================= */
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    rows.forEach((r) => {
      if (!map.has(r.khuVuc)) map.set(r.khuVuc, []);
      map.get(r.khuVuc)!.push(r);
    });
    return map;
  }, [rows]);

  /* ================= COLUMNS ================= */
  const tableColumns = useMemo(() => {
    const buildColumns = (cols: any[]): any[] => {
      return cols
        .filter((c: any) => c.dataIndex !== "khuVuc")
        .map((c: any) => {
          const colReadOnly = c.readOnly === true;

          if (c.children && Array.isArray(c.children)) {
            return {
              title: c.title,
              align: "center",
              children: c.children.map((child: any) => ({
                title:
                  PASTE_COLUMNS.includes(child.dataIndex) && editable ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <span>{child.title}</span>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<SnippetsOutlined />}
                        title="Paste từ Excel"
                        style={{ lineHeight: 1, padding: "0 6px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPasteModal({
                            open: true,
                            columnKey: child.dataIndex,
                            columnTitle: child.title,
                          });
                          setPasteText("");
                        }}
                      />
                    </div>
                  ) : (
                    child.title
                  ),
                dataIndex: child.dataIndex,
                align: "center",
                width: child.dataIndex?.includes("tuongQuan") ? 90 : 100,
                render: (_: any, r: any) => {
                  const childReadOnlyBase = child.readOnly === true;
                  const childReadOnly =
                    child.dataIndex === "tonDauCa"
                      ? !canUnlockMonthly()
                      : childReadOnlyBase;
                  const childVal = r[child.dataIndex];
                  const childIsNeg = isNegativeNumber(childVal);
                  return (
                    <EditableInput
                      value={childVal}
                      disabled={!editable || child.editable === false}
                      readOnly={childReadOnly}
                      style={
                        childIsNeg
                          ? {
                              borderColor: "#ff4d4f",
                              backgroundColor: "#fff2f0",
                              color: "#ff4d4f",
                            }
                          : undefined
                      }
                      onChange={(v: any) =>
                        updateCell(r.key, child.dataIndex, v)
                      }
                      onBlur={(v: any) => commitCell(r.key, child.dataIndex, v)}
                    />
                  );
                },
              })),
            };
          }

          return {
            title:
              PASTE_COLUMNS.includes(c.dataIndex) && editable ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <span>{c.title}</span>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<SnippetsOutlined />}
                    title="Paste từ Excel"
                    style={{ lineHeight: 1, padding: "0 6px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPasteModal({
                        open: true,
                        columnKey: c.dataIndex,
                        columnTitle: c.title,
                      });
                      setPasteText("");
                    }}
                  />
                </div>
              ) : (
                c.title
              ),
            dataIndex: c.dataIndex,
            align: "center",
            width:
              c.dataIndex === "nguyenNhienLieu"
                ? 160
                : c.dataIndex === "tenSilo"
                  ? 150
                  : c.dataIndex === "viTri"
                    ? 120
                    : c.dataIndex === "tongThucTe"
                      ? 120
                      : 100,
            render: (_: any, r: any) => {
              const inputReadOnly =
                c.dataIndex === "tonDauCa" ? !canUnlockMonthly() : colReadOnly;

              if (c.dataIndex === "viTri") {
                return (
                  <EditableSelect
                    value={r.viTri}
                    defaultViTri={defaultViTri}
                    disabled={!editable}
                    onChange={(v: any) => commitCell(r.key, "viTri", v)}
                    onBlur={() => {}}
                  />
                );
              }

              if (c.dataIndex === "nguyenNhienLieu") {
                // HRC1_PhuLieuNM là danh mục cố định — không có khái niệm "chưa map" như HRC2,
                // luôn hiển thị autocomplete để chọn.
                return (
                  <Hrc1PhuLieuNmAutocomplete
                    value={r.idPhuLieu ?? null}
                    size="small"
                    style={{ width: "100%" }}
                    disabled={!editable}
                    placeholder="Chọn phụ liệu"
                    resetOnBlur={true}
                    defaultLabel={r.nguyenNhienLieu || undefined}
                    onChange={(id) => {
                      setTimeout(() => {
                        if (id === null || id === undefined) {
                          commitCell(r.key, "idPhuLieu", null);
                          commitCell(r.key, "nguyenNhienLieu", "");
                          commitCell(r.key, "siloId", null);
                          commitCell(r.key, "tenSilo", "");
                          commitCell(r.key, "theTich", null);
                          return;
                        }
                        commitCell(r.key, "idPhuLieu", id);
                      }, 0);
                    }}
                    onSelectOption={(option) => {
                      setTimeout(() => {
                        if (option) {
                          commitCell(r.key, "nguyenNhienLieu", option.tenPhuLieu || "");
                        } else {
                          commitCell(r.key, "nguyenNhienLieu", "");
                          commitCell(r.key, "siloId", null);
                          commitCell(r.key, "tenSilo", "");
                          commitCell(r.key, "theTich", null);
                        }
                      }, 0);
                    }}
                  />
                );
              }

              if (c.dataIndex === "tenSilo") {
                const siloDisplayValue =
                  r.viTri === 2 ? NGOAI_SILO_ID : (r.siloId ?? null);
                return (
                  <CommonAutocomplete<Silo>
                    value={siloDisplayValue}
                    searchApi={async ({ searchKey } = {}) => {
                      const res = await SiloServiceApi.search({
                        nhaMay,
                        searchKey,
                        tinhTrang: true,
                      });
                      const keyword = (searchKey || "").toLowerCase();
                      const shouldPrepend =
                        !keyword || "ngoài silo".includes(keyword);
                      return {
                        ...res,
                        data: shouldPrepend
                          ? [
                              NGOAI_SILO_OPTION as unknown as Silo,
                              ...(res.data || []),
                            ]
                          : res.data,
                      };
                    }}
                    mapOption={(item) => ({
                      value: item.id,
                      label: item.tenSilo,
                    })}
                    placeholder="Tìm silo..."
                    pageSize={50}
                    disabled={!editable}
                    allowClear
                    style={{ width: "100%" }}
                    size="small"
                    fallbackLabelBuilder={(value) =>
                      value === NGOAI_SILO_ID
                        ? "Ngoài silo"
                        : r.tenSilo || `Silo ID: ${value}`
                    }
                    onChange={(siloId, option) => {
                      setTimeout(() => {
                        if (siloId === NGOAI_SILO_ID) {
                          commitCell(r.key, "viTri", 2);
                          commitCell(r.key, "siloId", null);
                          commitCell(r.key, "tenSilo", "Ngoài silo");
                        } else if (siloId !== null && option) {
                          commitCell(r.key, "viTri", defaultViTri);
                          commitCell(r.key, "siloId", siloId);
                          commitCell(r.key, "tenSilo", option.tenSilo);
                          if (
                            option.theTich !== undefined &&
                            option.theTich !== null
                          ) {
                            commitCell(r.key, "theTich", option.theTich);
                          }
                        } else {
                          commitCell(r.key, "viTri", defaultViTri);
                          commitCell(r.key, "siloId", null);
                          commitCell(r.key, "tenSilo", "");
                          commitCell(r.key, "theTich", null);
                        }
                      }, 0);
                    }}
                  />
                );
              }

              if (c.dataIndex === "luongSuDungKiemKe") {
                const kiemKeVal = r.luongSuDungKiemKe;
                const kiemKeNum =
                  kiemKeVal != null && kiemKeVal !== ""
                    ? Number(kiemKeVal)
                    : null;
                const thucTeNum = Number(r.tongThucTe);
                const isNegative = kiemKeNum !== null && kiemKeNum < 0;
                const isInconsistent =
                  !isNegative &&
                  ((thucTeNum === 0 && kiemKeNum !== null && kiemKeNum > 0) ||
                    (thucTeNum !== 0 &&
                      (kiemKeNum === null || kiemKeNum === 0)));
                const kiemKeStyle = isNegative
                  ? {
                      borderColor: "#ff4d4f",
                      backgroundColor: "#fff2f0",
                      color: "#ff4d4f",
                    }
                  : isInconsistent
                    ? {
                        borderColor: "#faad14",
                        backgroundColor: "#fffbe6",
                        color: "#d46b08",
                      }
                    : undefined;
                return (
                  <EditableInput
                    value={kiemKeVal}
                    disabled={!editable || c.editable === false}
                    readOnly={true}
                    style={kiemKeStyle}
                    onChange={() => {}}
                    onBlur={() => {}}
                  />
                );
              }

              const colVal = r[c.dataIndex];
              const colIsNeg = isNegativeNumber(colVal);
              return (
                <EditableInput
                  value={colVal}
                  disabled={!editable || c.editable === false}
                  readOnly={inputReadOnly}
                  style={
                    colIsNeg
                      ? {
                          borderColor: "#ff4d4f",
                          backgroundColor: "#fff2f0",
                          color: "#ff4d4f",
                        }
                      : undefined
                  }
                  onChange={(v: any) => updateCell(r.key, c.dataIndex, v)}
                  onBlur={(v: any) => commitCell(r.key, c.dataIndex, v)}
                />
              );
            },
          };
        });
    };

    const base = buildColumns(columns || []);

    const khuVucColumn = {
      title: "Khu vực",
      dataIndex: "khuVuc",
      align: "center",
      width: 80,
      fixed: "left" as const,
      render: (_: any, r: any) => {
        return r.khuVuc || "";
      },
    };

    if (editable) {
      base.push({
        title: "Xóa",
        width: 60,
        fixed: "right" as const,
        render: (_: any, r: any) => (
          <Popconfirm title="Xóa dòng?" onConfirm={() => deleteRow(r.key)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        ),
      });
    }

    return [khuVucColumn, ...base];
  }, [
    columns,
    editable,
    defaultViTri,
    commitCell,
    deleteRow,
    updateCell,
    nhaMay,
  ]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <>
      <div
        style={{
          border: "1px solidrgb(39, 39, 39)",
          borderRadius: "4px 4px 0 0",
        }}
      >
        {khuVucList.map((kv: string, idx: number) => {
          const isFirst = idx === 0;
          const isLast = idx === khuVucList.length - 1;
          const kvRows = grouped.get(kv) || [];

          const columnsForThisTable = tableColumns.map((col: any) => {
            if (col.dataIndex === "khuVuc") {
              return {
                ...col,
                onCell: (_: any, rowIndex: number) => {
                  if (rowIndex === 0) {
                    return { rowSpan: kvRows.length };
                  }
                  return { rowSpan: 0 };
                },
                render: (_: any, __: any, rowIndex: number) => {
                  if (rowIndex === 0) {
                    return <span style={{ fontWeight: 600 }}>{kv}</span>;
                  }
                  return null;
                },
              };
            }
            return col;
          });
          return (
            <div key={kv}>
              <Table
                bordered={true}
                size="small"
                tableLayout="fixed"
                pagination={false}
                columns={columnsForThisTable}
                dataSource={kvRows}
                rowKey="key"
                showHeader={isFirst}
                style={{
                  marginBottom: 0,
                  borderTop: isFirst ? "none" : "1px solidrgb(22, 22, 22)",
                }}
              />

              {editable && (
                <div
                  style={{
                    padding: "8px 16px",
                    borderTop: "1px solid #d9d9d9",
                  }}
                >
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addRow(kv)}
                    style={{ width: "100%" }}
                  >
                    Thêm dòng
                  </Button>
                </div>
              )}

              {!isLast && (
                <div style={{ height: 0, borderBottom: "1px solid #d9d9d9" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Chú thích màu sắc */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "6px 12px",
          marginTop: 4,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 28,
              height: 18,
              borderRadius: 3,
              border: "1px solid #ff4d4f",
              backgroundColor: "#fff2f0",
            }}
          />
          <span style={{ fontSize: 12, color: "#595959" }}>
            Giá trị âm (không hợp lệ)
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-block",
              width: 28,
              height: 18,
              borderRadius: 3,
              border: "1px solid #faad14",
              backgroundColor: "#fffbe6",
            }}
          />
          <span style={{ fontSize: 12, color: "#595959" }}>
            Lượng sử dụng kiểm kê không nhất quán với lượng thực tế sử dụng
          </span>
        </div>
      </div>

      <Modal
        title={`Paste dữ liệu - ${pasteModal.columnTitle}`}
        open={pasteModal.open}
        onOk={handlePasteConfirm}
        onCancel={() => {
          setPasteModal({ open: false, columnKey: "", columnTitle: "" });
          setPasteText("");
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        destroyOnClose
      >
        <Input.TextArea
          autoFocus
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste dữ liệu từ Excel vào đây..."
          rows={8}
        />
      </Modal>
    </>
  );
}
