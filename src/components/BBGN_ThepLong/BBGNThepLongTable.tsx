/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AutoComplete, Button, Grid, Input, InputNumber, Popconfirm, Select, Table, message } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { bbgbThepLongApi } from "../../services/BBGNThepLongApi";
import { CommonAutocomplete } from "../CommonAutocomplete";
import type { AutocompleteSearchParams } from "../CommonAutocomplete";
import { MacThepServiceApi } from "../../services/MacThepServiceApi";
import type { MacThep } from "../../services/MacThepServiceApi";
import { NhaMayEnum } from "../../models/SiloModel";

export interface BBGNRow {
  key: string;
  id?: number;
  isTrungMeThoi?: boolean | null;
  mayDuc?: string | null;
  me?: string | null;
  idMacThep?: number | null;
  macThep?: string | null;
  thungSo?: string | null;
  thoiGian?: string | null;   // "HH:mm"
  klLFSauThep?: number | null;
  klLan1?: number | null;
  klLan2?: number | null;
  klLan3?: number | null;
  klThepLong?: number | null; // tự tính = klLan1 - klLan2
  ghiChu?: string | null;
  tinhLuyenLenThang?: string | null;
  phanLoai?: string | null;
  phanLoaiNhom?: string | null;
  [key: string]: unknown;
}

interface BBGNThepLongTableProps {
  value?: BBGNRow[];
  onChange?: (rows: BBGNRow[]) => void;
  /** true = chỉ xem (ChiTietGN), false = có thể sửa (TaoPhieuGN) */
  disabled?: boolean;
  /** Giá trị scope (máy đúc) từ form header – dùng để điền cột Máy đúc */
  scopeValue?: number | null;
  /** Tên máy đúc đã chọn trên form header */
  scopeLabel?: string | null;
  /** Để fetch danh sách mẻ */
  ngaySX?: string | null;
  ca?: number | null;
  nhaMay: number;
  loading?: boolean;
}

const TINH_LUYEN_OPTIONS = [
  { label: "Tinh luyện", value: "Tinh luyện" },
  { label: "Lên thẳng", value: "Lên thẳng" },
];

type MeOption = {
  me: string;
  phanLoai?: string | null;
  phanLoaiNhom?: string | null;
};

const normalizeMeOptions = (raw: unknown): MeOption[] => {
  if (!Array.isArray(raw)) return [];

  const byMe = new Map<string, MeOption>();
  raw.forEach((item) => {
    if (typeof item === "string") {
      const me = item.trim();
      if (!me) return;
      if (!byMe.has(me)) byMe.set(me, { me, phanLoai: null });
      return;
    }
    if (item && typeof item === "object") {
      const me = String((item as { me?: unknown }).me ?? "").trim();
      if (!me) return;
      const phanLoaiRaw = (item as { phanLoai?: unknown }).phanLoai;
      const phanLoaiNhomRaw = (item as { phanLoaiNhom?: unknown }).phanLoaiNhom;
      byMe.set(me, {
        me,
        phanLoai: phanLoaiRaw == null ? null : String(phanLoaiRaw),
        phanLoaiNhom: phanLoaiNhomRaw == null ? null : String(phanLoaiNhomRaw),
      });
    }
  });

  return Array.from(byMe.values());
};

const computeKlThepLong = (
  klLan1?: number | null,
  klLan2?: number | null,
  klLFSauThep?: number | null
): number | null => {
  const base = klLFSauThep != null ? klLFSauThep : klLan1;
  if (base != null && klLan2 != null) {
    return Math.round((base - klLan2) * 1000) / 1000;
  }
  return null;
};

const toHHmm = (value: unknown): string | null => {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  // Đã là HH:mm
  if (/^\d{2}:\d{2}$/.test(s)) return s;

  // Trường hợp API trả datetime ISO hoặc format khác
  const parsed = dayjs(s);
  if (parsed.isValid()) return parsed.format("HH:mm");

  return null;
};

const BBGNThepLongTable: React.FC<BBGNThepLongTableProps> = ({
  value = [],
  onChange,
  disabled = false,
  scopeValue,
  scopeLabel,
  ngaySX,
  ca,
  nhaMay,
  loading = false,
}) => {
  const screens = Grid.useBreakpoint();
  const shouldScrollX = !screens.xl;

  const [meOptions, setMeOptions] = useState<MeOption[]>([]);
  const [meLoading, setMeLoading] = useState(false);
  const meDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [phanLoaiNhomOptions, setPhanLoaiNhomOptions] = useState<{ value: string }[]>([]);
  const [phanLoaiNhomLoading, setPhanLoaiNhomLoading] = useState(false);
  const phanLoaiNhomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPhanLoaiNhom = useCallback(
    (searchText?: string) => {
      if (phanLoaiNhomDebounceRef.current) clearTimeout(phanLoaiNhomDebounceRef.current);
      phanLoaiNhomDebounceRef.current = setTimeout(async () => {
        const bieuMau = nhaMay === 1 ? "HRC1_BBGN_ThepLong" : "HRC2_BBGN_ThepLong";
        setPhanLoaiNhomLoading(true);
        try {
          
          const res = await bbgbThepLongApi.getPhanLoaiNhomOptions(bieuMau, searchText || undefined);
          const raw = (res as { data?: unknown }).data ?? res;
          setPhanLoaiNhomOptions(Array.isArray(raw) ? (raw as string[]).map((v) => ({ value: v })) : []);
        } finally {
          setPhanLoaiNhomLoading(false);
        }
      }, 300);
    },
    [nhaMay]
  );

  const searchMeThoi = useCallback(
    (searchText?: string) => {
      if (meDebounceRef.current) clearTimeout(meDebounceRef.current);
      meDebounceRef.current = setTimeout(async () => {
        setMeLoading(true);
        try {
          let idLoThois: number[] | undefined;
          if (nhaMay === 1) {
            const info = (() => { try { return JSON.parse(localStorage.getItem("userinfo") ?? "{}"); } catch { return {}; } })();
            const quyenTheoLo = Array.isArray(info.quyenTheoLo) ? info.quyenTheoLo as { maLo?: unknown; iD_BoPhan?: unknown }[] : [];
            const maLos = quyenTheoLo.filter((x) => x.iD_BoPhan === 60).map((x) => x.maLo).filter((x): x is number => typeof x === "number" && Number.isFinite(x));
            if (maLos.length > 0) idLoThois = maLos;
          }
          const res = await bbgbThepLongApi.searchMeThoi(nhaMay, searchText || undefined, idLoThois);
          const data = (res as { data?: unknown }).data ?? res;
          setMeOptions(normalizeMeOptions(Array.isArray(data) ? data : []));
        } finally {
          setMeLoading(false);
        }
      }, 500);
    },
    [nhaMay]
  );

  // Cache danh sách MayDuc (chỉ phụ thuộc nhaMay, không cần invalidate theo ngày/ca)
  const mayDucFetchRunningRef = useRef(false);

  useEffect(() => {
    mayDucFetchRunningRef.current = false;
  }, [nhaMay]);

  const macThepSearchApi = useCallback(
    async (params: AutocompleteSearchParams) => {
      const res = await MacThepServiceApi.search({
        searchKey: params.searchKey || undefined,
        nhaMay: nhaMay as NhaMayEnum,
        isLock: false,
        idMayDucs: scopeValue != null ? [scopeValue] : undefined,
        page: 1,
        pageSize: params.pageSize ?? 50,
      });
      return { data: res.data, totalRecords: res.totalRecords };
    },
    [nhaMay, scopeValue]
  );

  const handleCreateMacThep = useCallback(
    async (searchText: string): Promise<MacThep | null> => {
      try {
        const created = await MacThepServiceApi.create({
          tenMacThep: searchText,
          nhaMay: nhaMay as NhaMayEnum,
          isLock: false,
          idMayDucs: scopeValue != null ? [scopeValue] : null,
        });
        message.success(`Đã tạo mác thép "${created.tenMacThep}"`);
        return created;
      } catch (e) {
        console.error(e);
        message.error("Không tạo được mác thép");
        return null;
      }
    },
    [nhaMay, scopeValue]
  );

  const updateRow = useCallback(
    (key: string, updates: Partial<BBGNRow>) => {
      onChange?.(value.map((r) => (r.key === key ? { ...r, ...updates } : r)));
    },
    [value, onChange]
  );

  const addRow = useCallback(() => {
    const newRow: BBGNRow = {
      key: `new-${Date.now()}`,
      mayDuc: scopeLabel ?? (scopeValue != null ? `Máy đúc ${scopeValue}` : null),
    };
    onChange?.([...value, newRow]);
  }, [value, onChange, scopeLabel, scopeValue]);

  const removeRowLocal = useCallback(
    (key: string) => onChange?.(value.filter((r) => r.key !== key)),
    [value, onChange]
  );

  const deleteRow = useCallback(
    async (record: BBGNRow) => {
      const persistedId = typeof record.id === "number" ? record.id : NaN;

      if (!Number.isFinite(persistedId) || persistedId <= 0) {
        removeRowLocal(record.key);
        return;
      }

      try {
        setDeletingKey(record.key);
        await bbgbThepLongApi.deleteRow(persistedId);
        removeRowLocal(record.key);
        message.success("Đã xóa dòng dữ liệu");
      } catch (e) {
        console.error(e);
        message.error("Xóa dòng dữ liệu thất bại");
      } finally {
        setDeletingKey(null);
      }
    },
    [removeRowLocal]
  );

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 50,
      align: "center" as const,
      render: (_: any, __: BBGNRow, index: number) => index + 1,
    },
    {
      title: "Máy đúc",
      dataIndex: "mayDuc",
      key: "mayDuc",
      width: 100,
      align: "center" as const,
      render: () =>
        scopeLabel ?? (scopeValue != null ? `Máy đúc ${scopeValue}` : "-"),
    },
    {
      title: "Mẻ",
      dataIndex: "me",
      key: "me",
      width: 120,
      render: (val: string | null, record: BBGNRow) => {
        const meStyle = record.isTrungMeThoi === true ? { color: "red", fontWeight: 600 } : undefined;
        if (disabled) return <span style={meStyle}>{val ?? "-"}</span>;
        return (
          <div style={meStyle}>
            <Select
              value={val ?? undefined}
              showSearch
              allowClear
              filterOption={false}
              onDropdownVisibleChange={(open) => { if (open) searchMeThoi(""); }}
              onSearch={searchMeThoi}
              options={meOptions.map((item) => ({
                value: item.me,
                label: item.me,
              }))}
              onChange={(newVal) => {
                const found = meOptions.find((x) => x.me === newVal);
                updateRow(record.key, {
                  me: (newVal as string | undefined) ?? null,
                  phanLoai: found?.phanLoai ?? null,
                  phanLoaiNhom: found?.phanLoaiNhom ?? null,
                });
              }}
              placeholder="Nhập để tìm mẻ..."
              style={{ width: "100%" }}
              size="small"
              loading={meLoading}
              notFoundContent={meLoading ? "Đang tải..." : "Không có mẻ"}
            />
          </div>
        );
      },
    },
    {
      title: "Mác thép",
      dataIndex: "macThep",
      key: "macThep",
      width: 150,
      render: (val: string | null, record: BBGNRow) => {
        if (disabled) return <span>{val ?? "-"}</span>;
        return (
          <CommonAutocomplete<MacThep>
            value={record.idMacThep}
            searchApi={macThepSearchApi}
            mapOption={(item) => ({ value: item.id, label: item.tenMacThep })}
            fallbackLabelBuilder={() => record.macThep ?? ""}
            onChange={(newVal, option) =>
              updateRow(record.key, {
                idMacThep: newVal as number | null,
                macThep: option ? (option as MacThep).tenMacThep : null,
              })
            }
            placeholder="Chọn mác thép..."
            style={{ width: "100%" }}
            size="small"
            allowCreate
            onCreate={handleCreateMacThep}
          />
        );
      },
    },
    {
      title: "Thùng số",
      dataIndex: "thungSo",
      key: "thungSo",
      width: 60,
      render: (val: string | null, record: BBGNRow) => {
        if (disabled) return <span>{val ?? "-"}</span>;
        return (
          <Input
            value={val ?? ""}
            onChange={(e) => updateRow(record.key, { thungSo: e.target.value || null })}
            placeholder="Nhập thùng số..."
            style={{ width: "100%" }}
            size="small"
          />
        );
      },
    },
    {
      title: "Thời gian",
      dataIndex: "thoiGian",
      key: "thoiGian",
      width: 100,
      render: (val: string | null, record: BBGNRow) => {
        const timeHHmm = toHHmm(val);
        if (disabled) return <span>{timeHHmm ?? "-"}</span>;
        return (
          <Input
            type="time"
            value={timeHHmm ?? ""}
            onChange={(e) =>
              updateRow(record.key, {
                thoiGian: e.target.value || null,
              })
            }
            style={{ width: "100%" }}
            size="small"
          />
        );
      },
    },
    ...(nhaMay === 1
      ? [
          {
            title: "KL thùng LF sau khi ra thép",
            dataIndex: "klLFSauThep",
            key: "klLFSauThep",
            width: 130,
            render: (val: number | null, record: BBGNRow) => {
              if (disabled) return <span>{val ?? "-"}</span>;
              const isLenThang = record.tinhLuyenLenThang === "Lên thẳng";
              return (
                <InputNumber
                  value={val}
                  disabled={isLenThang}
                  onChange={(v) =>
                    updateRow(record.key, {
                      klLFSauThep: v,
                      klThepLong: computeKlThepLong(record.klLan1, record.klLan2, v),
                    })
                  }
                  style={{ width: "100%" }}
                  size="small"
                />
              );
            },
          },
        ]
      : []),
    {
      title: "KL thùng & thép lỏng vào bệ xoay (tấn) - lần 1",
      dataIndex: "klLan1",
      key: "klLan1",
      width: 100,
      render: (val: number | null, record: BBGNRow) => {
        const isNeg = val != null && val < 0;
        if (disabled)
          return (
            <span style={isNeg ? { color: "red", fontWeight: 600 } : undefined}>
              {val ?? "-"}
            </span>
          );
        return (
          <InputNumber
            value={val}
            onChange={(v) =>
              updateRow(record.key, {
                klLan1: v,
                klThepLong: computeKlThepLong(v, record.klLan2, record.klLFSauThep),
              })
            }
            style={{ width: "100%" }}
            status={isNeg ? "error" : undefined}
            size="small"
          />
        );
      },
    },
    {
      title: "KL thùng (tấn) - lần 2",
      dataIndex: "klLan2",
      key: "klLan2",
      width: 100,
      render: (val: number | null, record: BBGNRow) => {
        const isNeg = val != null && val < 0;
        if (disabled)
          return (
            <span style={isNeg ? { color: "red", fontWeight: 600 } : undefined}>
              {val ?? "-"}
            </span>
          );
        return (
          <InputNumber
            value={val}
            onChange={(v) =>
              updateRow(record.key, {
                klLan2: v,
                klThepLong: computeKlThepLong(record.klLan1, v, record.klLFSauThep),
              })
            }
            style={{ width: "100%" }}
            status={isNeg ? "error" : undefined}
            size="small"
          />
        );
      },
    },
    {
      title: "KL thùng thép lần 3 (nếu có)",
      dataIndex: "klLan3",
      key: "klLan3",
      width: 100,
      render: (val: number | null, record: BBGNRow) => {
        const isNeg = val != null && val < 0;
        if (disabled)
          return (
            <span style={isNeg ? { color: "red", fontWeight: 600 } : undefined}>
              {val ?? "-"}
            </span>
          );
        return (
          <InputNumber
            value={val}
            onChange={(v) => updateRow(record.key, { klLan3: v })}
            style={{ width: "100%" }}
            status={isNeg ? "error" : undefined}
            size="small"
          />
        );
      },
    },
    {
      title: "KL thép lỏng (tấn)",
      dataIndex: "klThepLong",
      key: "klThepLong",
      width: 80,
      render: (val: number | null) => {
        const isNeg = val != null && val < 0;
        return (
          <span style={isNeg ? { color: "red", fontWeight: 600 } : { fontWeight: 600 }}>
            {val != null ? val.toFixed(3) : "-"}
          </span>
        );
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "ghiChu",
      key: "ghiChu",
      width: 130,
      render: (val: string | null, record: BBGNRow) => {
        if (disabled) return <span>{val ?? "-"}</span>;
        return (
          <Input
            value={val ?? ""}
            onChange={(e) =>
              updateRow(record.key, { ghiChu: e.target.value || null })
            }
            size="small"
          />
        );
      },
    },
    {
      title: "Tinh luyện / Lên thẳng",
      dataIndex: "tinhLuyenLenThang",
      key: "tinhLuyenLenThang",
      width: 120,
      render: (val: string | null, record: BBGNRow) => {
        if (disabled) return <span>{val ?? "-"}</span>;
        const hasKlLF = record.klLFSauThep != null;
        const options = TINH_LUYEN_OPTIONS.map((opt) =>
          opt.value === "Lên thẳng" && hasKlLF ? { ...opt, disabled: true } : opt
        );
        return (
          <Select
            value={val}
            options={options}
            onChange={(v) => {
              const isLenThang = v === "Lên thẳng";
              updateRow(record.key, {
                tinhLuyenLenThang: v ?? null,
                ...(isLenThang && {
                  klLFSauThep: null,
                  klThepLong: computeKlThepLong(record.klLan1, record.klLan2, null),
                }),
              });
            }}
            style={{ width: "100%" }}
            size="small"
            allowClear
          />
        );
      },
    },
    {
      title: "Phân loại",
      dataIndex: "phanLoai",
      key: "phanLoai",
      width: 100,
      render: (val: string | null) => <span>{val ?? "-"}</span>,
    },
    {
      title: "Phân loại nhóm",
      dataIndex: "phanLoaiNhom",
      key: "phanLoaiNhom",
      width: 140,
      render: (val: string | null, record: BBGNRow) => {
        if (disabled) return <span>{val ?? "-"}</span>;
        return (
          <AutoComplete
            value={val ?? undefined}
            options={phanLoaiNhomOptions}
            filterOption={false}
            onDropdownVisibleChange={(open) => { if (open) searchPhanLoaiNhom(""); }}
            onSearch={searchPhanLoaiNhom}
            onChange={(newVal: string | undefined) =>
              updateRow(record.key, { phanLoaiNhom: newVal || null })
            }
            notFoundContent={phanLoaiNhomLoading ? "Đang tải..." : "Không có kết quả"}
            placeholder="Nhập hoặc chọn..."
            style={{ width: "100%" }}
            size="small"
            allowClear
          />
        );
      },
    },
    {
      title: "Mác thép BKMIS",
      dataIndex: "macThepBKMIS",
      key: "macThepBKMIS",
      width: 100,
      render: (val: string | null) => <span>{val ?? "-"}</span>,
    },
    // Cột xóa – chỉ hiện khi đang chỉnh sửa
    ...(!disabled
      ? [
          {
            title: "",
            key: "_del",
            width: 30,
            fixed: "right" as const,
            render: (_: any, record: BBGNRow) => (
              <Popconfirm
                title="Xác nhận xóa dòng?"
                description="Dữ liệu dòng này sẽ bị xóa."
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: deletingKey === record.key }}
                onConfirm={() => void deleteRow(record)}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deletingKey === record.key}
                />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const totalKlThepLong = value.reduce((sum, row) => {
    const v = row.klThepLong;
    return v != null ? sum + v : sum;
  }, 0);
  const hasKlThepLong = value.some((row) => row.klThepLong != null);
  const klThepLongColIndex = columns.findIndex((col) => col.key === "klThepLong");

  return (
    <div>
      <Table
        columns={columns}
        dataSource={value.map((r, i) => ({ ...r, key: r.key ?? `row-${i}` }))}
        rowKey="key"
        onRow={(record) =>
          record.isTrungMeThoi === true
            ? {
                style: { backgroundColor: "#fff1f0" },
              }
            : {}
        }
        pagination={false}
        scroll={shouldScrollX ? { x: 1500 } : undefined}
        size="small"
        bordered
        loading={loading}
        summary={() => (
          <Table.Summary.Row>
            {columns.map((col, idx) => {
              if (idx === 0) {
                return (
                  <Table.Summary.Cell key="sum-label" index={idx}>
                    <b>Tổng</b>
                  </Table.Summary.Cell>
                );
              }

              if (idx === klThepLongColIndex) {
                const isNegTotal = hasKlThepLong && totalKlThepLong < 0;
                return (
                  <Table.Summary.Cell key="sum-klThepLong" index={idx}>
                    <b style={isNegTotal ? { color: "red" } : undefined}>
                      {hasKlThepLong ? totalKlThepLong.toFixed(3) : "-"}
                    </b>
                  </Table.Summary.Cell>
                );
              }

              return <Table.Summary.Cell key={`sum-empty-${col.key ?? idx}`} index={idx} />;
            })}
          </Table.Summary.Row>
        )}
      />
      {!disabled && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={addRow}
          style={{ marginTop: 8, width: "100%" }}
        >
          Thêm dòng
        </Button>
      )}
    </div>
  );
};

export default BBGNThepLongTable;
