import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Hrc1PhuLieuNm } from "../services/Hrc1PhuLieuNmServiceApi";
import { Hrc1PhuLieuNmServiceApi } from "../services/Hrc1PhuLieuNmServiceApi";

type Hrc1PhuLieuNmSelectOption = Hrc1PhuLieuNm & {
  value: number;
  label: string;
};

export interface Hrc1PhuLieuNmAutocompleteProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  onSelectOption?: (option: Hrc1PhuLieuNm | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  size?: "small" | "middle" | "large";
  defaultLabel?: string;
  dropdownMatchSelectWidth?: number | boolean;
  /** Reset options về danh sách ban đầu khi blur (giống HeaderKeyAutocomplete) */
  resetOnBlur?: boolean;
  onBlur?: () => void;
}

const buildOptionLabel = (item: Hrc1PhuLieuNm) => item.tenPhuLieu || `Phụ liệu #${item.id}`;

/**
 * Autocomplete chọn phụ liệu HRC1 (bảng HRC1_PhuLieuNM) — dùng cho trang Sổ Xuất-Nhập-Tồn HRC1
 * (GroupedTableSTD_HRC1) thay cho HeaderKeyAutocomplete của HRC2 (Header_Key). Đơn giản hơn hẳn
 * HeaderKeyAutocomplete: không có "tạo mới từ ô tìm kiếm" — danh mục 13 phụ liệu cố định của HRC1
 * được quản lý riêng ở trang KhoDuLieu/NM.HRC1/PhuLieuHRC1.tsx.
 */
const Hrc1PhuLieuNmAutocomplete = ({
  value,
  onChange,
  onSelectOption,
  placeholder = "Chọn phụ liệu",
  allowClear = true,
  disabled = false,
  style,
  size = "middle",
  defaultLabel,
  dropdownMatchSelectWidth = 260,
  resetOnBlur = false,
  onBlur,
}: Hrc1PhuLieuNmAutocompleteProps) => {
  const [options, setOptions] = useState<Hrc1PhuLieuNmSelectOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedValue, setSelectedValue] = useState<SelectProps["value"]>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialOptionsRef = useRef<Hrc1PhuLieuNmSelectOption[]>([]);

  const mappedValue = useMemo(() => {
    if (value === null || value === undefined) return undefined;
    const matched = options.find((opt) => opt.value === value);
    if (matched) return { value: matched.value, label: matched.label };
    if (defaultLabel) return { value, label: defaultLabel };
    return { value, label: `Phụ liệu #${value}` };
  }, [value, options, defaultLabel]);

  useEffect(() => {
    setSelectedValue(mappedValue);
  }, [mappedValue]);

  const fetchOptions = useCallback(async (searchKey?: string) => {
    setFetching(true);
    try {
      const rawList = await Hrc1PhuLieuNmServiceApi.getAll({ dangSuDung: true, searchKey });
      const items = rawList.map((item) => ({
        ...item,
        value: item.id,
        label: buildOptionLabel(item),
      }));
      setOptions(items);
      if (!searchKey) {
        initialOptionsRef.current = items;
      }
    } catch (error) {
      console.error("Failed to fetch HRC1_PhuLieuNM:", error);
    } finally {
      setFetching(false);
    }
  }, []);

  const handleSearch = useCallback(
    (keyword: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchOptions(keyword);
      }, 300);
    },
    [fetchOptions]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const dropdownOptions = useMemo(
    () => options.map((item) => ({ label: item.label, value: item.value })),
    [options]
  );

  const handleChange = (val: unknown) => {
    if (!val) {
      setSelectedValue(undefined);
      onChange?.(null);
      onSelectOption?.(null);
      return;
    }
    const optionValue = Array.isArray(val) ? val[0] : val;
    const rawVal = (optionValue as { value?: unknown })?.value ?? optionValue;
    const numericValue = typeof rawVal === "number" ? rawVal : Number(rawVal);
    const matched = options.find((opt) => opt.value === numericValue);
    const label = (optionValue as { label?: string }).label ?? matched?.label ?? defaultLabel ?? undefined;
    setSelectedValue({ value: numericValue, label });
    onChange?.(Number.isNaN(numericValue) ? null : numericValue);
    onSelectOption?.(matched ?? null);
  };

  const handleBlur = () => {
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
      disabled={disabled}
      style={style}
      size={size}
      filterOption={false}
      options={dropdownOptions}
      loading={fetching}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      onDropdownVisibleChange={(open) => {
        if (open && !options.length) fetchOptions();
      }}
      onSearch={handleSearch}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

export default Hrc1PhuLieuNmAutocomplete;
