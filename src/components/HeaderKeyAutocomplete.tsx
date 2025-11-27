import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HeaderKey } from "../models/HeaderKeyModel";
import { headerKeyApi } from "../services/HeaderKeyApi";

type HeaderKeySelectOption = HeaderKey & {
  value: number;
  label: string;
};

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
}

const buildOptionLabel = (item: HeaderKey) =>
  item.tenHienThi || item.mota || `Header Key #${item.id}`;

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
}: HeaderKeyAutocompleteProps) => {
  const [options, setOptions] = useState<HeaderKeySelectOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedValue, setSelectedValue] = useState<
    SelectProps["value"]
  >(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const res = await headerKeyApi.search({
          searchKey,
          LoaiPhieu: loaiPhieu,
          pageSize: 20,
        });
        const items =
          res.data?.map((item) => ({
            ...item,
            value: item.id,
            label: buildOptionLabel(item),
          })) ?? [];
        setOptions(items);
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

  const selectOptions = useMemo(
    () =>
      options.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [options]
  );

  const handleChange = (val: any) => {
    if (!val) {
      setSelectedValue(undefined);
      onChange?.(null);
      onSelectOption?.(null);
      return;
    }
    const optionValue = Array.isArray(val) ? val[0] : val;
    const numericValue =
      typeof optionValue.value === "number"
        ? optionValue.value
        : Number(optionValue.value);
    const matched = options.find((opt) => opt.value === numericValue);
    const label =
      optionValue.label ?? matched?.label ?? defaultLabel ?? undefined;
    setSelectedValue({ value: numericValue, label });
    onChange?.(Number.isNaN(numericValue) ? null : numericValue);
    onSelectOption?.(matched ?? null);
  };

  return (
    <Select
      showSearch
      labelInValue
      value={selectedValue as any}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      style={style}
      size={size}
      filterOption={false}
      options={selectOptions}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      onDropdownVisibleChange={(open) => {
        if (open && !options.length) {
          fetchOptions();
        }
      }}
      onSearch={handleSearch}
      onChange={handleChange}
    />
  );
};

export default HeaderKeyAutocomplete;


