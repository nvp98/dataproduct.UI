import { Button, Card, Col, DatePicker, Input, Row, Select } from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, useEffect } from "react";
import type { Dayjs } from "dayjs";

export interface PhieuFilterValues {
  soPhieu?: string;
  fromDate?: string;
  toDate?: string;
  ca?: number | string;
  scope?: number | string;
  tinhTrang?: number | string;
  nguoiTaoId?: number | string;
  maBm?: string;
  xuongId?: number | string;
  mayDuc?: number | string;
  [key: string]: string | number | (string | number)[] | undefined; // Cho phép thêm các filter tùy chỉnh
}

export type FilterFieldType = "text" | "number" | "select" | "multiselect" | "dateRange";

export interface FilterFieldConfig {
  key: string; // Key trong PhieuFilterValues
  label: string; // Label hiển thị
  type: FilterFieldType;
  placeholder?: string;
  // Cho select type
  options?: Array<{ label: string; value: string | number }>;
  // Cho number type
  min?: number;
  max?: number;
  // Col span (xs, sm, md)
  span?: { xs?: number; sm?: number; md?: number };
}

export interface PhieuFilterCardProps {
  title?: string;
  onFilter: (filters: PhieuFilterValues) => void;
  onClearFilter?: () => void;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  createButtonText?: string;
  extraFilters?: React.ReactNode; // Các filter tùy chỉnh thêm vào
  initialValues?: PhieuFilterValues; // Giá trị ban đầu
  mergeFilters?: PhieuFilterValues; // Các filter bổ sung sẽ được merge vào filter object
  filterFields?: FilterFieldConfig[]; // Config cho các filter fields động
  onFilterFieldChange?: (key: string, value: FilterStateValue) => void; // Callback khi field thay đổi
}

type FilterStateValue =
  | string
  | number
  | (string | number)[]
  | [Dayjs | null, Dayjs | null]
  | null
  | undefined;

const isDayjsRange = (value: FilterStateValue): value is [Dayjs | null, Dayjs | null] => {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [start, end] = value;
  const isDayjsLike = (v: unknown) =>
    v === null || (typeof v === "object" && v !== null && "format" in v);
  return isDayjsLike(start) && isDayjsLike(end);
};

const isMultiSelectValue = (value: FilterStateValue): value is (string | number)[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number");

const PhieuFilterCard: React.FC<PhieuFilterCardProps> = ({
  title,
  onFilter,
  onClearFilter,
  showCreateButton = false,
  onCreateClick,
  createButtonText = "Tạo phiếu mới",
  extraFilters,
  initialValues,
  mergeFilters,
  filterFields = [],
  onFilterFieldChange,
}) => {
  // State cho các filter fields động
  const [filterStates, setFilterStates] = useState<Record<string, FilterStateValue>>(() => {
    const states: Record<string, FilterStateValue> = {};
    filterFields.forEach((field) => {
      if (field.type === "dateRange") {
        states[field.key] = null;
      } else if (field.type === "multiselect") {
        states[field.key] = (initialValues?.[field.key] as (string | number)[] | undefined) ?? [];
      } else {
        states[field.key] = initialValues?.[field.key] || "";
      }
    });
    // Giữ lại soPhieu và dateRange cho backward compatibility
    states.soPhieu = initialValues?.soPhieu || "";
    states.dateRange = null;
    return states;
  });

  // When filterFields options change, drop any selected values that no longer exist in the options list.
  // useEffect(() => {
  //   setFilterStates((prev) => {
  //     let changed = false;
  //     const next = { ...prev };
  //     filterFields.forEach((field) => {
  //       if ((field.type === "multiselect" || field.type === "select") && field.options) {
  //         const curr = prev[field.key];
  //         if (Array.isArray(curr) && curr.length > 0) {
  //           const validSet = new Set(field.options.map((o) => String(o.value)));
  //           const filtered = curr.filter((v) => validSet.has(String(v)));
  //           if (filtered.length !== curr.length) {
  //             next[field.key] = filtered;
  //             onFilterFieldChange?.(field.key, filtered);
  //             changed = true;
  //           }
  //         }
  //       }
  //     });
  //     return changed ? next : prev;
  //   });
  // }, [filterFields]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
  setFilterStates((prev) => {
    let changed = false;
    const next = { ...prev };

    filterFields.forEach((field) => {
      if (
        (field.type === "multiselect" || field.type === "select") &&
        field.options
      ) {
        const curr = prev[field.key];

        if (Array.isArray(curr) && curr.length > 0) {
          const validSet = new Set(
            field.options.map((o) => String(o.value))
          );

          const filtered = (curr as (string | number | unknown)[]).filter(
            (v): v is string | number =>
              (typeof v === "string" || typeof v === "number") &&
              validSet.has(String(v))
          );

          if (filtered.length !== curr.length) {
            next[field.key] = filtered;
            onFilterFieldChange?.(field.key, filtered);
            changed = true;
          }
        }
      }
    });

    return changed ? next : prev;
  });
}, [filterFields]);

  const [soPhieu, setSoPhieu] = useState<string>(initialValues?.soPhieu || "");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(
    initialValues?.fromDate && initialValues?.toDate
      ? null // Có thể parse từ string nếu cần
      : null,
  );

  const handleFilter = () => {
    const filterObj: PhieuFilterValues = {};

    // Xử lý soPhieu (backward compatibility)
    if (soPhieu?.trim()) {
      filterObj.soPhieu = soPhieu.trim();
    }

    // Xử lý dateRange (backward compatibility)
    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      filterObj.fromDate = dateRange[0].format("YYYY-MM-DD");
      filterObj.toDate = dateRange[1].format("YYYY-MM-DD");
    }

    // Xử lý các filter fields động
    filterFields.forEach((field) => {
      const value = filterStates[field.key];
      if (value !== null && value !== undefined && value !== "") {
        if (
          field.type === "dateRange" &&
          isDayjsRange(value) &&
          value[0] &&
          value[1]
        ) {
          filterObj[`${field.key}From`] = value[0].format("YYYY-MM-DD");
          filterObj[`${field.key}To`] = value[1].format("YYYY-MM-DD");
        } else if (field.type === "multiselect") {
          if (isMultiSelectValue(value) && value.length > 0) {
            filterObj[field.key] = value as (string | number)[];
          }
        } else if (field.type !== "dateRange") {
          // Chỉ gán nếu không phải dateRange (dateRange đã được xử lý riêng)
          filterObj[field.key] =
            typeof value === "string" || typeof value === "number"
              ? value
              : undefined;
        }
      }
    });

    // Merge với các filter bổ sung nếu có
    if (mergeFilters) {
      Object.assign(filterObj, mergeFilters);
    }

    onFilter(filterObj);
  };

  const handleClearFilter = () => {
    setSoPhieu("");
    setDateRange(null);
    // Clear các filter fields động
    const clearedStates: Record<string, FilterStateValue> = {};
    filterFields.forEach((field) => {
      const emptyVal: FilterStateValue =
        field.type === "dateRange" ? null : field.type === "multiselect" ? [] : "";
      clearedStates[field.key] = emptyVal;
      // Notify parent about cleared fields
      if (onFilterFieldChange) {
        onFilterFieldChange(field.key, emptyVal);
      }
    });
    setFilterStates(clearedStates);

    if (onClearFilter) {
      onClearFilter();
    } else {
      // Nếu không có onClearFilter riêng, gọi onFilter với mergeFilters (nếu có)
      onFilter(mergeFilters || {});
    }
  };

  const updateFilterState = (
    key: string,
    value: FilterStateValue,
  ) => {
    setFilterStates((prev) => ({ ...prev, [key]: value }));
    // Notify parent component about field change
    if (onFilterFieldChange) {
      onFilterFieldChange(key, value);
    }
  };

  const renderFilterField = (field: FilterFieldConfig) => {
    const span = field.span || { xs: 24, sm: 12, md: 6 };
    const rawValue = filterStates[field.key];

    switch (field.type) {
      case "text":
        return (
          <Col key={field.key} xs={span.xs} sm={span.sm} md={span.md}>
            <Input
              placeholder={field.placeholder || field.label}
              allowClear
              value={typeof rawValue === "string" ? rawValue : ""}
              onChange={(e) => updateFilterState(field.key, e.target.value)}
              onPressEnter={handleFilter}
            />
          </Col>
        );
      case "number":
        return (
          <Col key={field.key} xs={span.xs} sm={span.sm} md={span.md}>
            <Input
              type="number"
              placeholder={field.placeholder || field.label}
              allowClear
              value={
                typeof rawValue === "number"
                  ? rawValue
                  : typeof rawValue === "string"
                    ? rawValue
                    : ""
              }
              onChange={(e) =>
                updateFilterState(
                  field.key,
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              onPressEnter={handleFilter}
              min={field.min}
              max={field.max}
            />
          </Col>
        );
      case "select":
        return (
          <Col key={field.key} xs={span.xs} sm={span.sm} md={span.md}>
            <Select
              placeholder={field.placeholder || field.label}
              allowClear
              style={{ width: "100%" }}
              value={
                rawValue !== null && rawValue !== undefined && rawValue !== ""
                  ? rawValue
                  : undefined
              }
              onChange={(val) => updateFilterState(field.key, val ?? "")}
              options={field.options}
            />
          </Col>
        );
      case "multiselect":
        return (
          <Col key={field.key} xs={span.xs} sm={span.sm} md={span.md}>
            <Select
              mode="multiple"
              placeholder={field.placeholder || field.label}
              allowClear
              style={{ width: "100%" }}
              value={isMultiSelectValue(rawValue) ? rawValue : []}
              onChange={(val: (string | number)[]) => updateFilterState(field.key, val ?? [])}
              options={field.options}
              maxTagCount="responsive"
            />
          </Col>
        );
      case "dateRange":
        return (
          <Col key={field.key} xs={span.xs} sm={span.sm} md={span.md}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder={
                field.placeholder
                  ? [field.placeholder, field.placeholder]
                  : ["Từ ngày", "Đến ngày"]
              }
              value={isDayjsRange(rawValue) ? rawValue : null}
              onChange={(dates) => updateFilterState(field.key, dates)}
            />
          </Col>
        );
      default:
        return null;
    }
  };

  // Nếu có filterFields config, chỉ render các field đó (không render soPhieu và dateRange mặc định)
  const useCustomFields = filterFields.length > 0;

  return (
    <Card style={{ marginBottom: 16 }} title={title}>
      <Row gutter={[16, 16]}>
        {useCustomFields ? (
          // Render các filter fields từ config
          <>{filterFields.map((field) => renderFilterField(field))}</>
        ) : (
          // Render mặc định (backward compatibility)
          <>
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder="Số phiếu..."
                allowClear
                value={soPhieu}
                onChange={(e) => setSoPhieu(e.target.value)}
                onPressEnter={handleFilter}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder={["Từ ngày", "Đến ngày"]}
                value={dateRange}
                onChange={(dates) =>
                  setDateRange(dates as [Dayjs | null, Dayjs | null] | null)
                }
              />
            </Col>
          </>
        )}
        {extraFilters && <>{extraFilters}</>}
        <Col>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleFilter}
          >
            Lọc
          </Button>
        </Col>
        <Col>
          <Button onClick={handleClearFilter}>Xóa bộ lọc</Button>
        </Col>
        {showCreateButton && onCreateClick && (
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateClick}
            >
              {createButtonText}
            </Button>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default PhieuFilterCard;
