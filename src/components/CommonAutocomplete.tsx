import { Select, Spin } from "antd";
import type { SelectProps } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface AutocompleteSearchParams {
  searchKey?: string;
  page?: number;
  pageSize?: number;
}

export interface AutocompleteSearchResult<T> {
  data: T[];
  totalRecords?: number;
  page?: number;
  pageSize?: number;
}

export type AutocompleteSearchApi<T> = (
  params: AutocompleteSearchParams
) => Promise<AutocompleteSearchResult<T>>;

export interface CommonAutocompleteProps<T> {
  /** Giá trị được chọn (id/value) */
  value?: number | string | null;
  /** Callback khi đổi giá trị, trả ra value và option raw */
  onChange?: (value: number | string | null, option: T | null) => void;
  /** Hàm gọi API search, cho phép truyền searchKey, pageSize */
  searchApi: AutocompleteSearchApi<T>;
  /** Map model trả về thành option cho Select */
  mapOption: (item: T) => { value: number | string; label: string };

  /** Page size cho API, default = 50 */
  pageSize?: number;
  /** Placeholder cho input */
  placeholder?: string;
  /** Cho phép clear */
  allowClear?: boolean;
  /** Disable input */
  disabled?: boolean;
  /** Style của Select */
  style?: React.CSSProperties;
  /** Kích thước Select */
  size?: "small" | "middle" | "large";
  /** Nhãn fallback khi đã có value nhưng chưa load được option */
  fallbackLabelBuilder?: (value: number | string) => string;
  /** Giữ lại danh sách ban đầu và reset khi blur */
  resetOnBlur?: boolean;
  /** Prop khác cho Select nếu cần custom thêm */
  selectProps?: Omit<SelectProps, "value" | "onChange" | "options" | "onSearch">;
}

interface InternalOption<T> {
  raw: T;
  value: number | string;
  label: string;
}

function CommonAutocompleteInner<T>({
  value,
  onChange,
  searchApi,
  mapOption,
  pageSize = 50,
  placeholder = "Chọn...",
  allowClear = true,
  disabled = false,
  style,
  size = "middle",
  fallbackLabelBuilder,
  resetOnBlur = false,
  selectProps,
}: CommonAutocompleteProps<T>) {
  const [options, setOptions] = useState<InternalOption<T>[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedValue, setSelectedValue] = useState<SelectProps["value"]>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialOptionsRef = useRef<InternalOption<T>[]>([]);

  const mappedValue = useMemo(() => {
    if (value === null || value === undefined) {
      return undefined;
    }
    const matched = options.find((opt) => opt.value === value);
    if (matched) {
      return { value: matched.value, label: matched.label };
    }
    if (fallbackLabelBuilder) {
      return { value, label: fallbackLabelBuilder(value) };
    }
    return { value, label: String(value) };
  }, [value, options, fallbackLabelBuilder]);

  useEffect(() => {
    setSelectedValue(mappedValue);
  }, [mappedValue]);

  const fetchOptions = useCallback(
    async (searchKey?: string) => {
      setFetching(true);
      try {
        const res = await searchApi({
          searchKey,
          page: 1,
          pageSize,
        });
        const mappedItems = res.data?.map((item: T) => {
          const mapped = mapOption(item);
          return {
            raw: item,
            value: mapped.value,
            label: mapped.label,
          };
        }) ?? [];
        
        // Filter duplicate values để tránh warning về duplicate keys
        const seenValues = new Set<number | string>();
        const items: InternalOption<T>[] = [];
        for (const item of mappedItems) {
          // Skip items với value null, undefined, hoặc empty string
          if (item.value === null || item.value === undefined || item.value === "") {
            continue;
          }
          // Chỉ thêm item đầu tiên nếu value đã tồn tại
          if (!seenValues.has(item.value)) {
            seenValues.add(item.value);
            items.push(item);
          }
        }
        
        setOptions(items);
        if (!searchKey) {
          initialOptionsRef.current = items;
        }
      } catch (error) {
        console.error("CommonAutocomplete fetchOptions error:", error);
      } finally {
        setFetching(false);
      }
    },
    [searchApi, pageSize, mapOption]
  );

  const handleSearch = useCallback(
    (keyword: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        fetchOptions(keyword || undefined);
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

  const handleChange = (val: { value: number | string; label: string } | { value: number | string; label: string }[] | null) => {
    if (!val) {
      setSelectedValue(undefined);
      onChange?.(null, null);
      return;
    }
    const optionValue = Array.isArray(val) ? val[0] : val;
    const rawValue = optionValue?.value ?? optionValue;
    const numericOrStringValue =
      typeof rawValue === "number" || typeof rawValue === "string"
        ? rawValue
        : Number(rawValue);

    const matched = options.find((opt) => opt.value === numericOrStringValue);
    const label =
      optionValue.label ?? matched?.label ?? fallbackLabelBuilder?.(numericOrStringValue) ?? undefined;

    setSelectedValue({ value: numericOrStringValue, label });
    onChange?.(
      typeof numericOrStringValue === "number" && Number.isNaN(numericOrStringValue)
        ? null
        : numericOrStringValue,
      matched?.raw ?? null
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (resetOnBlur && initialOptionsRef.current.length > 0) {
      setOptions(initialOptionsRef.current);
    }
    selectProps?.onBlur?.(e);
  };

  // Merge style từ prop và selectProps, loại bỏ style khỏi selectProps để tránh override
  const { style: selectPropsStyle, ...restSelectProps } = selectProps || {};
  const mergedStyle = {
    ...style,
    ...selectPropsStyle,
  };

  return (
    <Select
      showSearch
      labelInValue
      value={selectedValue}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      style={mergedStyle}
      size={size}
      filterOption={false}
      options={selectOptions}
      notFoundContent={fetching ? <Spin size="small" /> : null}
      dropdownMatchSelectWidth={selectProps?.dropdownMatchSelectWidth ?? 260}
      onDropdownVisibleChange={(open) => {
        if (open && !options.length) {
          fetchOptions();
        }
        selectProps?.onDropdownVisibleChange?.(open);
      }}
      onSearch={handleSearch}
      onChange={handleChange}
      onBlur={handleBlur}
      {...restSelectProps}
    />
  );
}

// Wrapper để giữ generic props khi import
export function CommonAutocomplete<T>(props: CommonAutocompleteProps<T>) {
  return <CommonAutocompleteInner {...props} />;
}



