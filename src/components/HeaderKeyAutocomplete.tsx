import { Select, Spin, message } from "antd";
import type { SelectProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HeaderKey, HeaderKeyPayload } from "../models/HeaderKeyModel";
import { headerKeyApi } from "../services/HeaderKeyApi";

type HeaderKeySelectOption = HeaderKey & {
  value: number;
  label: string;
};

/** Giá trị option giả để chọn "tạo mới" (GitHub-style), không trùng id thật */
const CREATE_OPTION_VALUE = "__header_key_create__";

export interface HeaderKeyAutocompleteProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  onSelectOption?: (option: HeaderKey | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: "small" | "middle" | "large";
  defaultLabel?: string;
  loaiPhieu?: string;
  dropdownMatchSelectWidth?: number | boolean;
  resetOnBlur?: boolean; // ⭐ Reset options về danh sách ban đầu khi blur
  onBlur?: () => void; // ⭐ Callback khi blur
  /** true: khi gõ tên chưa có trong list → thêm option tạo mới, POST /api/HeaderKey rồi chọn bản vừa tạo */
  allowCreateFromSearch?: boolean;
}

const buildOptionLabel = (item: HeaderKey) =>
  item.tenHienThi || item.mota || `Header Key #${item.id}`;

function normalizeCreatedHeaderKey(raw: unknown): HeaderKey {
  const r = raw as Record<string, unknown>;
  const id = Number(r.id ?? r.Id ?? 0);
  const kg = r.keyGuid ?? r.KeyGuid;
  return {
    id,
    keyGuid: typeof kg === "string" ? kg : String(kg ?? ""),
    tenHienThi: String(r.tenHienThi ?? r.TenHienThi ?? ""),
    mota: (r.mota ?? r.Mota) as string | null | undefined,
    loaiPhieu: (r.loaiPhieu ?? r.LoaiPhieu) as string | null | undefined,
    isActive: Boolean(r.isActive ?? r.IsActive ?? true),
    ngayTao: (r.ngayTao ?? r.NgayTao) as string | null | undefined,
    thuTu: (r.thuTu ?? r.ThuTu) as number | null | undefined,
    isUsedNXT: (r.isUsedNXT ?? r.IsUsedNXT) as boolean | null | undefined,
    tyTrong:
      r.tyTrong != null || r.TyTrong != null
        ? Number(r.tyTrong ?? r.TyTrong)
        : null,
  };
}

const HeaderKeyAutocomplete = ({
  value,
  onChange,
  onSelectOption,
  placeholder = "Chọn Header Key",
  allowClear = true,
  disabled = false,
  style,
  size = "middle",
  defaultLabel,
  loaiPhieu,
  dropdownMatchSelectWidth = 260,
  resetOnBlur = false,
  onBlur,
  allowCreateFromSearch = false,
}: HeaderKeyAutocompleteProps) => {
  const [options, setOptions] = useState<HeaderKeySelectOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Chuỗi search hiện tại (cập nhật ngay khi gõ) — dùng cho nhãn option "Tạo mới" và body POST */
  const [pendingSearch, setPendingSearch] = useState("");
  const [selectedValue, setSelectedValue] = useState<
    SelectProps["value"]
  >(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialOptionsRef = useRef<HeaderKeySelectOption[]>([]); // ⭐ Lưu danh sách ban đầu để reset

  const mappedValue = useMemo(() => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const matched = options.find((opt) => opt.value === value);
    if (matched) {
      return { value: matched.value, label: matched.label };
    }
    if (defaultLabel) {
      return { value, label: defaultLabel };
    }
    return { value, label: `Header Key #${value}` };
  }, [value, options, defaultLabel]);

  useEffect(() => {
    setSelectedValue(mappedValue);
  }, [mappedValue]);

  const fetchOptions = useCallback(
    async (searchKey?: string) => {
      setFetching(true);
      try {
        const res: { data?: unknown[] } = await headerKeyApi.searchAutocomplete({
          searchKey,
          // LoaiPhieu: loaiPhieu,
          pageSize: searchKey ? 20 : 50, // ⭐ Load 50 items ban đầu, 20 items khi search
        });
        const rawList = (res.data ?? []) as HeaderKey[];
        const items = rawList.map((item) => ({
          ...item,
          value: item.id,
          label: buildOptionLabel(item),
        }));
        setOptions(items as HeaderKeySelectOption[]);
        // ⭐ Lưu danh sách ban đầu (khi không có searchKey) để reset sau này
        if (!searchKey) {
          initialOptionsRef.current = items as HeaderKeySelectOption[];
        }
      } catch (error) {
        console.error("Failed to fetch header keys:", error);
      } finally {
        setFetching(false);
      }
    },
    [loaiPhieu]
  );

  const handleSearch = useCallback(
    (keyword: string) => {
      setPendingSearch(keyword);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchOptions(keyword);
      }, 300);
    },
    [fetchOptions]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const dropdownOptions = useMemo(() => {
    const base = options.map((item) => ({
      label: item.label,
      value: item.value,
    }));
    const t = pendingSearch.trim();
    if (!allowCreateFromSearch || !t) return base;
    const dup = options.some(
      (o) => (o.tenHienThi || "").trim().toLowerCase() === t.toLowerCase()
    );
    if (dup) return base;
    return [
      ...base,
      {
        label: `+ Tạo mới: "${t}"`,
        value: CREATE_OPTION_VALUE,
      },
    ];
  }, [options, pendingSearch, allowCreateFromSearch]);

  const handleChange = (val: unknown) => {
    if (!val) {
      setSelectedValue(undefined);
      onChange?.(null);
      onSelectOption?.(null);
      setPendingSearch("");
      return;
    }
    const optionValue = Array.isArray(val) ? val[0] : val;
    const rawVal = (optionValue as { value?: unknown })?.value ?? optionValue;

    if (allowCreateFromSearch && rawVal === CREATE_OPTION_VALUE) {
      const name = pendingSearch.trim();
      if (!name) return;
      void (async () => {
        setCreating(true);
        try {
          const payload: HeaderKeyPayload = {
            tenHienThi: name,
            isActive: true,
            // loaiPhieu: loaiPhieu ?? null,
          };
          const created = await headerKeyApi.create(payload);
          const hk = normalizeCreatedHeaderKey(created);
          const row: HeaderKeySelectOption = {
            ...hk,
            value: hk.id,
            label: buildOptionLabel(hk),
          };
          setOptions((prev) => {
            if (prev.some((p) => p.id === hk.id)) return prev;
            return [row, ...prev];
          });
          setSelectedValue({ value: hk.id, label: row.label });
          onChange?.(hk.id);
          onSelectOption?.(hk);
          setPendingSearch("");
          message.success("Đã tạo Header Key mới");
        } catch (e: unknown) {
          const msg =
            typeof e === "object" &&
            e !== null &&
            "message" in e &&
            typeof (e as { message?: unknown }).message === "string"
              ? (e as { message: string }).message
              : "Không tạo được Header Key";
          message.error(msg);
        } finally {
          setCreating(false);
        }
      })();
      return;
    }

    const numericValue =
      typeof rawVal === "number"
        ? rawVal
        : Number(rawVal);
    const matched = options.find((opt) => opt.value === numericValue);
    const label =
      (optionValue as { label?: string }).label ??
      matched?.label ??
      defaultLabel ??
      undefined;
    setSelectedValue({ value: numericValue, label });
    onChange?.(Number.isNaN(numericValue) ? null : numericValue);
    onSelectOption?.(matched ?? null);
    setPendingSearch("");
    // ⭐ KHÔNG reset options ngay sau khi chọn, chỉ reset khi blur để UX tốt hơn
  };

  const handleBlur = () => {
    // ⭐ Reset options về danh sách ban đầu khi blur
    if (resetOnBlur && initialOptionsRef.current.length > 0) {
      setOptions(initialOptionsRef.current);
    }
    onBlur?.();
  };

  return (
    <Select
      showSearch
      labelInValue
      value={selectedValue as SelectProps["value"]}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled || creating}
      style={style}
      size={size}
      filterOption={false}
      options={dropdownOptions}
      loading={fetching || creating}
      notFoundContent={fetching || creating ? <Spin size="small" /> : null}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      onDropdownVisibleChange={(open) => {
        // ⭐ Khi mở dropdown: nếu chưa có options thì fetch, nếu có rồi thì giữ nguyên
        if (open) {
          if (!options.length) {
            fetchOptions();
          }
        }
      }}
      onSearch={handleSearch}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default HeaderKeyAutocomplete;

