/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Grid, Input, InputNumber, Popconfirm, Select, Table, message } from "antd";
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
  macThep?: string | null;
  thungSo?: string | null;
  thoiGian?: string | null;   // "HH:mm"
  klLan1?: number | null;
  klLan2?: number | null;
  klLan3?: number | null;
  klThepLong?: number | null; // tự tính = klLan1 - klLan2
  ghiChu?: string | null;
  tinhLuyenLenThang?: string | null;
  phanLoai?: string | null;
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
      byMe.set(me, {
        me,
        phanLoai: phanLoaiRaw == null ? null : String(phanLoaiRaw),
      });
    }
  });

  return Array.from(byMe.values());
};

const computeKlThepLong = (
  klLan1?: number | null,
  klLan2?: number | null
): number | null => {
  if (klLan1 != null && klLan2 != null) {
    return Math.round((klLan1 - klLan2) * 1000) / 1000;
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

  // Cache kết quả fetch mẻ, tránh gọi API lại mỗi lần mở dropdown
  const meOptionsCacheRef = useRef<MeOption[]>([]);
  const meFetchRunningRef = useRef(false);
  const [meOptions, setMeOptions] = useState<MeOption[]>([]);
  const [meLoading, setMeLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Xóa cache khi params thay đổi
  useEffect(() => {
    meOptionsCacheRef.current = [];
    setMeOptions([]);
    setMeLoading(false);
  }, [ngaySX, ca, nhaMay]);

  const ensureMeOptionsLoaded = useCallback(
    async () => {
      if (!ngaySX || !ca) return;
      if (meOptionsCacheRef.current.length > 0 || meFetchRunningRef.current) return;
      meFetchRunningRef.current = true;
      setMeLoading(true);
      try {
        const res = await bbgbThepLongApi.fetch({
          ngaySX,
          ca: Number(ca),
          nhaMay,
        });
        const normalized = normalizeMeOptions((res as { data?: unknown }).data ?? res);
        meOptionsCacheRef.current = normalized;
        setMeOptions(normalized);
      } finally {
        meFetchRunningRef.current = false;
        setMeLoading(false);
      }
    },
    [ngaySX, ca, nhaMay]
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
        page: 1,
        pageSize: params.pageSize ?? 50,
      });
      return { data: res.data, totalRecords: res.totalRecords };
    },
    [nhaMay]
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
              onDropdownVisibleChange={(open) => {
                if (open) void ensureMeOptionsLoaded();
              }}
              options={meOptions.map((item) => ({
                value: item.me,
                label: item.me,
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(newVal) =>
                updateRow(record.key, {
                  me: (newVal as string | undefined) ?? null,
                  phanLoai:
                    meOptionsCacheRef.current.find((x) => x.me === newVal)?.phanLoai ?? null,
                })
              }
              placeholder="Chọn mẻ..."
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
            value={val}
            searchApi={macThepSearchApi}
            mapOption={(item) => ({ value: item.tenMacThep, label: item.tenMacThep })}
            fallbackLabelBuilder={(v) => String(v)}
            onChange={(newVal) => updateRow(record.key, { macThep: (newVal as string | null) })}
            placeholder="Chọn mác thép..."
            style={{ width: "100%" }}
            size="small"
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
    {
      title: "KL lần 1 (tấn)",
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
                klThepLong: computeKlThepLong(v, record.klLan2),
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
      title: "KL lần 2 (tấn)",
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
                klThepLong: computeKlThepLong(record.klLan1, v),
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
      title: "KL lần 3 (tấn)",
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
        return (
          <Select
            value={val}
            options={TINH_LUYEN_OPTIONS}
            onChange={(v) => updateRow(record.key, { tinhLuyenLenThang: v ?? null })}
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
      // Readonly – tự điền khi chọn mẻ hoặc từ dữ liệu đã có
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
