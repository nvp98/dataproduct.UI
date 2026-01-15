/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
  startTransition,
} from "react";
import { Table, Button, Input, Popconfirm, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { headerKeyApi } from "../services/HeaderKeyApi";
import HeaderMappingModal from "./HeaderMapping";
import type { HeaderMappingRecord } from "./HeaderMapping";

/* ======================= UTILITY FUNCTIONS ======================= */

/**
 * Kiểm tra xem có cho phép unlock (nhập liệu) trong khung giờ 8:00-20:00 ngày 1 hằng tháng không
 */
export const canUnlockMonthly = (date = new Date()) => {
  const day = date.getDate();
  const hour = date.getHours();

  return day === 1 && hour >= 8 && hour < 20;
};

/* ======================= EDITABLE CELLS ======================= */

const EditableInput = memo(
  ({ value, disabled, onChange, onBlur, readOnly = false }: any) => {
    const [local, setLocal] = useState(value ?? "");

    useEffect(() => {
      setLocal(value ?? "");
    }, [value]);

    return (
      <Input
        value={local}
        disabled={disabled}
        bordered={true}
        readOnly={readOnly}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => onBlur(local)}
      />
    );
  }
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
  )
);

/* ======================= MAIN COMPONENT ======================= */

export default function GroupedTableSTD({
  columns,
  initialData = [],
  onDataChange,
  khuVucList,
  defaultNguyenNhienLieu = [],
  defaultViTri = 1,
  editable = true,
  loading = false,
}: any) {
  const [rows, setRows] = useState<any[]>([]);
  const rowsRef = useRef<any[]>([]);
  const rowIdRef = useRef(0);

  /* ===== HeaderKey ===== */
  const headerKeyCache = useRef<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const searchTimer = useRef<any>(null);

  /* ===== HeaderMapping Modal ===== */
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingRecord, setMappingRecord] =
    useState<HeaderMappingRecord | null>(null);

  /* ================= INIT DATA ================= */
  useEffect(() => {
    if (initialData.length) {
      setRows(initialData);
      rowsRef.current = initialData;
      return;
    }

    const init: any[] = [];
    khuVucList.forEach((kv: string) => {
      (defaultNguyenNhienLieu.length
        ? defaultNguyenNhienLieu
        : [""]
      ).forEach((nl: string) => {
        init.push({
          key: `${kv}_${rowIdRef.current++}`,
          khuVuc: kv,
          viTri: defaultViTri,
          nguyenNhienLieu: nl,
        });
      });
    });

    setRows(init);
    rowsRef.current = init;
  }, [initialData, khuVucList, defaultNguyenNhienLieu, defaultViTri]);

  /* ================= EMIT DATA ================= */
  const emitData = useCallback(
    (data: any[]) => {
      onDataChange?.(data);
    },
    [onDataChange]
  );

  /* ================= LOAD HEADER KEYS ================= */
  useEffect(() => {
    headerKeyApi.searchAutocomplete({ pageSize: 50 }).then((res) => {
      headerKeyCache.current = res.data || [];
      setOptions(
        (res.data || []).map((x: any) => ({
          label: x.tenHienThi || x.mota || x.tenNguonDuLieu,
          value: x.id || x.ID_HeaderKey,
        }))
      );
    });
  }, []);

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
            },
          ];
          rowsRef.current = next;
          emitData(next);
          return next;
        });
      });
    },
    [defaultViTri, emitData]
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
    [emitData]
  );

  /* ================= UPDATE CELL ================= */
  const updateCell = useCallback((key: string, field: string, value: any) => {
    rowsRef.current = rowsRef.current.map((r) =>
      r.key === key ? { ...r, [field]: value } : r
    );
  }, []);

  const commitCell = useCallback((key: string, field: string, value: any) => {
    setRows((prev) => {
      const next = prev.map((r) =>
        r.key === key ? { ...r, [field]: value } : r
      );
      rowsRef.current = next;
      emitData(next);
      return next;
    });
  }, [emitData]);

  /* ================= GROUP ================= */
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    rows.forEach((r) => {
      if (!map.has(r.khuVuc)) map.set(r.khuVuc, []);
      map.get(r.khuVuc)!.push(r);
    });
    return map;
  }, [rows]);

  /* ================= OPEN MAPPING MODAL ================= */
  const openMappingModal = useCallback((row: any) => {
    const payload: HeaderMappingRecord = {
      idPhuLieu: row.idPhuLieu ?? null,
      tenPhuLieu: row.rawTenPhuLieu || row.nguyenNhienLieu || "",
      tenNguonDuLieu: row.rawTenPhuLieu || row.nguyenNhienLieu || "",
      idHeaderKey: row.idNguyenNhienLieu ?? null,
      mappingId: null,
      headerKeyName: row.nguyenNhienLieu,
    };
    setMappingRecord(payload);
    setMappingOpen(true);
  }, []);

  /* ================= COLUMNS ================= */
  const tableColumns = useMemo(() => {
    // Build columns từ config với grouped columns
    const buildColumns = (cols: any[]): any[] => {
      return cols
        .filter((c: any) => c.dataIndex !== "khuVuc") // Filter bỏ khuVuc từ config vì sẽ thêm riêng
        .map((c: any) => {
          const colReadOnly = c.readOnly === true;

          // Nếu có children (grouped columns)
          if (c.children && Array.isArray(c.children)) {
            return {
              title: c.title,
              align: "center",
              children: c.children.map((child: any) => ({
                title: child.title,
                dataIndex: child.dataIndex,
                align: "center",
                width: child.dataIndex?.includes("tuongQuan") ? 100 : 120,
                render: (_: any, r: any) => {
                  const childReadOnlyBase = child.readOnly === true;
                  // Đối với cột tonDauCa, ưu tiên kiểm tra canUnlockMonthly
                  // Nếu không trong khung giờ cho phép (8:00-20:00 ngày 1) thì readOnly (override readOnly từ config)
                  const childReadOnly = child.dataIndex === "tonDauCa"
                    ? !canUnlockMonthly()
                    : childReadOnlyBase;
                  return (
                    <EditableInput
                      value={r[child.dataIndex]}
                      disabled={!editable || child.editable === false}
                      readOnly={childReadOnly}
                      onChange={(v: any) => updateCell(r.key, child.dataIndex, v)}
                      onBlur={(v: any) => commitCell(r.key, child.dataIndex, v)}
                    />
                  );
                },
              })),
            };
          }

          // Cột đơn
          return {
            title: c.title,
            dataIndex: c.dataIndex,
            align: "center",
            width: c.dataIndex === "nguyenNhienLieu" ? 200 : 
                   c.dataIndex === "viTri" ? 120 :
                   c.dataIndex === "tongThucTe" ? 150 : 120,
            render: (_: any, r: any) => {
              // Đối với cột tonDauCa, ưu tiên kiểm tra canUnlockMonthly
              // Nếu không trong khung giờ cho phép (8:00-20:00 ngày 1) thì readOnly (override readOnly từ config)
              const inputReadOnly = c.dataIndex === "tonDauCa" 
                ? !canUnlockMonthly()
                : colReadOnly;

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
                // Nếu là unmapped (chưa móc nối), chỉ hiển thị tên phụ liệu và button "Móc nối", ẩn Select
                if (r.isUnmapped === true) {
                  return (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ color: "#faad14", fontSize: "12px", fontWeight: 500 }}>
                        {r.rawTenPhuLieu || r.nguyenNhienLieu || ""}
                      </span>
                      {r.idPhuLieu && editable && (
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, height: "auto" }}
                          onClick={() => openMappingModal(r)}
                        >
                          Móc nối
                        </Button>
                      )}
                    </div>
                  );
                }

                // Nếu đã được map (isUnmapped === false hoặc undefined), hiển thị Select bình thường
                return (
                  <Select
                    showSearch
                    allowClear
                    size="small"
                    style={{ width: "100%" }}
                    disabled={!editable}
                    value={r.idNguyenNhienLieu}
                    options={options}
                    loading={loadingOptions}
                    filterOption={false}
                    onSearch={(kw) => {
                      clearTimeout(searchTimer.current);
                      searchTimer.current = setTimeout(() => {
                        setLoadingOptions(true);
                    headerKeyApi
                      .search({ searchKey: kw, pageSize: 20 })
                      .then((res) =>
                        setOptions(
                          (res.data || []).map((x: any) => ({
                            label: x.tenHienThi || x.mota || x.tenNguonDuLieu,
                            value: x.id || x.ID_HeaderKey,
                          }))
                        )
                      )
                          .finally(() => setLoadingOptions(false));
                      }, 300);
                    }}
                    onChange={(id) => {
                      const hk = headerKeyCache.current.find((x: any) => (x.id || x.ID_HeaderKey) === id);
                      commitCell(r.key, "idNguyenNhienLieu", id);
                      commitCell(r.key, "nguyenNhienLieu", hk?.tenHienThi || hk?.tenNguonDuLieu || "");
                    }}
                  />
                );
              }

              // Các cột input khác
              return (
                <EditableInput
                  value={r[c.dataIndex]}
                  disabled={!editable || c.editable === false}
                  readOnly={inputReadOnly}
                  onChange={(v: any) => updateCell(r.key, c.dataIndex, v)}
                  onBlur={(v: any) => commitCell(r.key, c.dataIndex, v)}
                />
              );
            },
          };
        });
    };

    const base = buildColumns(columns || []);

    // Thêm cột "Khu vực" - mỗi table sẽ render label của khu vực đó
    // Không cần rowSpan vì mỗi table chỉ có 1 khu vực
    const khuVucColumn = {
      title: "Khu vực",
      dataIndex: "khuVuc",
      align: "center",
      width: 100,
      fixed: "left" as const,
      render: (_: any, r: any) => {
        return r.khuVuc || "";
      },
    };

    // Thêm cột Xóa nếu editable
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
  }, [columns, editable, options, loadingOptions, defaultViTri, commitCell, deleteRow, openMappingModal, updateCell]);

  if (loading) return <div>Đang tải...</div>;

  return (
    <>
      <div style={{ border: "1px solidrgb(39, 39, 39)", borderRadius: "4px 4px 0 0" }}>
        {khuVucList.map((kv: string, idx: number) => {
          const isFirst = idx === 0;
          const isLast = idx === khuVucList.length - 1;
          const kvRows = grouped.get(kv) || [];

          // Mỗi table chỉ có 1 khu vực, hiển thị label ở tất cả các dòng

          const columnsForThisTable = tableColumns.map((col: any) => {
            if (col.dataIndex === "khuVuc") {
              return {
                ...col,
                onCell: (_: any, rowIndex: number) => {
                  // rowIndex là index của row trong kvRows
                  if (rowIndex === 0) {
                    return { rowSpan: kvRows.length };
                  }
                  return { rowSpan: 0 };
                },
                render: (_: any, __: any, rowIndex: number) => {
                  // Chỉ render text ở dòng đầu tiên
                  if (rowIndex === 0) {
                    return (
                      <span style={{ fontWeight: 600 }}>
                        {kv}
                      </span>
                    );
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
                <div style={{ padding: "8px 16px", borderTop: "1px solid #d9d9d9" }}>
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

              {!isLast && <div style={{ height: 0, borderBottom: "1px solid #d9d9d9" }} />}
            </div>
          );
        })}
      </div>

      <HeaderMappingModal
        open={mappingOpen}
        record={mappingRecord}
        onCancel={() => {
          setMappingOpen(false);
          setMappingRecord(null);
        }}
        onSuccess={() => {
          setMappingOpen(false);
          setMappingRecord(null);
        }}
      />
    </>
  );
}
