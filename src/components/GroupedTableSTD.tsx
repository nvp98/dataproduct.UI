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
import HeaderMappingModal from "./HeaderMapping";
import type { HeaderMappingRecord } from "./HeaderMapping";
import HeaderKeyAutocomplete from "./HeaderKeyAutocomplete";
import { CommonAutocomplete } from "./CommonAutocomplete";
import { SiloServiceApi } from "../services/SiloServiceApi";
import type { SiloByHeaderKey } from "../models/SiloModel";
import dayjs from "dayjs";

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
  ngaySX, // Ngày sản xuất để load silo
  khuVucConfig, // Config khu vực để lấy BieuMau: [{label, bieuMau, scope}]
  nhaMay = 2, // HRC2 = 2, HRC1 = 1
}: any) {
  const [rows, setRows] = useState<any[]>([]);
  const rowsRef = useRef<any[]>([]);
  const rowIdRef = useRef(0);

  // ⭐ Không cần cache và options nữa vì đã dùng HeaderKeyAutocomplete

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

  // ⭐ Không cần load header keys nữa vì HeaderKeyAutocomplete tự xử lý

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

  /* ================= HELPER: GET BIEUMAU FROM KHU VUC ================= */
  const getBieuMauFromKhuVuc = useCallback((khuVuc: string): string | null => {
    if (!khuVucConfig || !Array.isArray(khuVucConfig)) return null;
    const kv = khuVucConfig.find((k: any) => k?.label === khuVuc);
    return kv?.bieuMau ?? null;
  }, [khuVucConfig]);

  /* ================= LOAD SILOS FOR HEADERKEY ================= */
  const loadSilosForHeaderKey = useCallback(
    async (rowKey: string, headerKeyId: number, khuVuc?: string) => {
      if (!ngaySX || !headerKeyId) {
        console.log("loadSilosForHeaderKey: missing ngaySX or headerKeyId", { ngaySX, headerKeyId });
        return;
      }

      try {
        const ngaySXStr = dayjs(ngaySX).format("YYYY-MM-DD");
        const bieuMau = khuVuc ? getBieuMauFromKhuVuc(khuVuc) : null;
        console.log("loadSilosForHeaderKey: calling API", { rowKey, headerKeyId, ngaySXStr, nhaMay, bieuMau, khuVuc });
        
        const silos = await SiloServiceApi.getSilosByHeaderKey({
          headerKeyId,
          ngaySX: ngaySXStr,
          nhaMay,
          bieuMau,
        });

        console.log("loadSilosForHeaderKey: received silos", silos);

        // Nếu chỉ có 1 silo, tự động chọn
        if (silos.length === 1) {
          const silo = silos[0];
          console.log("loadSilosForHeaderKey: auto-selecting silo", silo);
          commitCell(rowKey, "siloId", silo.siloId);
          commitCell(rowKey, "tenSilo", silo.tenSilo);
          if (silo.theTich !== undefined && silo.theTich !== null) {
            commitCell(rowKey, "theTich", silo.theTich);
          }
        } else if (silos.length > 1) {
          console.log("loadSilosForHeaderKey: multiple silos found, user needs to select", silos.length);
        } else {
          console.log("loadSilosForHeaderKey: no silos found");
        }
      } catch (error) {
        console.error("Failed to load silos for headerkey:", error);
      }
    },
    [ngaySX, commitCell, nhaMay, getBieuMauFromKhuVuc]
  );

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
                width: child.dataIndex?.includes("tuongQuan") ? 90 : 100,
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
            width: c.dataIndex === "nguyenNhienLieu" ? 160 : 
                   c.dataIndex === "tenSilo" ? 150 :
                   c.dataIndex === "viTri" ? 120 :
                   c.dataIndex === "tongThucTe" ? 120 : 100,
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

                // Nếu đã được map (isUnmapped === false hoặc undefined), hiển thị HeaderKeyAutocomplete
                return (
                  <HeaderKeyAutocomplete
                    value={r.idNguyenNhienLieu ?? null}
                    size="small"
                    style={{ width: "100%" }}
                    disabled={!editable}
                    placeholder="Chọn phụ liệu"
                    resetOnBlur={true} // ⭐ Reset options sau khi blur/change
                    defaultLabel={r.nguyenNhienLieu || undefined}
                    onChange={(id) => {
                      // Wrap trong setTimeout để tránh setState trong render
                      setTimeout(() => {
                        if (id === null || id === undefined) {
                          // Clear action
                          commitCell(r.key, "idNguyenNhienLieu", null);
                          commitCell(r.key, "nguyenNhienLieu", "");
                          commitCell(r.key, "tyTrong", null);
                          // Clear silo khi clear headerkey
                          commitCell(r.key, "siloId", null);
                          commitCell(r.key, "tenSilo", "");
                          commitCell(r.key, "theTich", null);
                          return;
                        }
                        commitCell(r.key, "idNguyenNhienLieu", id);
                        // Load silo khi chọn headerkey
                        if (ngaySX && id) {
                          loadSilosForHeaderKey(r.key, id, r.khuVuc);
                        }
                      }, 0);
                    }}
                    onSelectOption={(option) => {
                      // Wrap trong setTimeout để tránh setState trong render
                      setTimeout(() => {
                        if (option) {
                          commitCell(r.key, "nguyenNhienLieu", option.tenHienThi || option.mota || "");
                          // Tự động fill tyTrong khi chọn HeaderKey
                          if (option.tyTrong !== undefined && option.tyTrong !== null) {
                            commitCell(r.key, "tyTrong", option.tyTrong);
                          }
                          // Load silo khi chọn headerkey
                          if (ngaySX && option.id) {
                            loadSilosForHeaderKey(r.key, option.id, r.khuVuc);
                          }
                        } else {
                          commitCell(r.key, "nguyenNhienLieu", "");
                          commitCell(r.key, "tyTrong", null);
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
                // Render cột Silo với CommonAutocomplete
                const bieuMau = getBieuMauFromKhuVuc(r.khuVuc);
                return (
                  <CommonAutocomplete<SiloByHeaderKey>
                    value={r.siloId ?? null}
                    searchApi={async () => {
                      // Nếu có headerkeyId, load silo từ API
                      if (r.idNguyenNhienLieu && ngaySX) {
                        const silos = await SiloServiceApi.getSilosByHeaderKey({
                          headerKeyId: r.idNguyenNhienLieu,
                          ngaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
                          nhaMay,
                          bieuMau,
                        });
                        return {
                          data: silos,
                          totalRecords: silos.length,
                          page: 1,
                          pageSize: silos.length,
                        };
                      }
                      return { data: [], totalRecords: 0, page: 1, pageSize: 0 };
                    }}
                    mapOption={(item) => ({
                      value: item.siloId,
                      label: item.tenSilo,
                    })}
                    placeholder="Chọn silo"
                    pageSize={50}
                    disabled={!editable || !r.idNguyenNhienLieu}
                    allowClear
                    style={{ width: "100%" }}
                    size="small"
                    fallbackLabelBuilder={(value) => `Silo ID: ${value}`}
                    onChange={(siloId, option) => {
                      // Wrap trong setTimeout để tránh setState trong render
                      setTimeout(() => {
                        commitCell(r.key, "siloId", siloId);
                        if (option) {
                          commitCell(r.key, "tenSilo", option.tenSilo);
                          // Tự động fill theTich khi chọn silo
                          if (option.theTich !== undefined && option.theTich !== null) {
                            commitCell(r.key, "theTich", option.theTich);
                          }
                        } else {
                          commitCell(r.key, "tenSilo", "");
                          commitCell(r.key, "theTich", null);
                        }
                      }, 0);
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
      width: 80,
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
  }, [columns, editable, defaultViTri, commitCell, deleteRow, openMappingModal, updateCell, ngaySX, loadSilosForHeaderKey, nhaMay, getBieuMauFromKhuVuc]);

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
