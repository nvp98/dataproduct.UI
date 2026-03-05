/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useState } from "react";
import {
  Card,
  Table,
  Typography,
  message,
  Form,
  DatePicker,
  Select,
  Input,
  Button,
  Tabs,
  Space,
} from "antd";
import dayjs from "dayjs";
import { dlnmHRC2Api } from "../../../services/DLNMHRC2Api";
import {
  THONGKE_HRC2_HEADERS,
  type ThongKeHeaderColumn,
  type ThongKeLoaiBMKey,
} from "../../../utils/configs/thongKeHRC2HeaderConfig";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type LoaiBMKey = ThongKeLoaiBMKey;

const toAntdColumns = (cols: ThongKeHeaderColumn[]): any[] => {
  return cols.map((c) => {
    const mapped: any = {
      key: c.dataIndex,
      dataIndex: c.dataIndex,
      title: c.title,
      width: c.width,
    };

    if (c.dataIndex === "ngaySx") {
      mapped.render = (value: unknown) =>
        value ? dayjs(String(value)).format("DD/MM/YYYY") : "";
    }

    if (Array.isArray(c.children) && c.children.length > 0) {
      mapped.children = toAntdColumns(c.children);
    }
    return mapped;
  });
};

const deriveScopeLabel = (loai: LoaiBMKey, scopeRaw: unknown): string => {
  const scopeNum = Number(scopeRaw);
  if (!Number.isFinite(scopeNum)) return "";
  if (loai === "BOF") return `Lò thổi ${scopeNum}`;
  if (loai === "RH") return `RH${scopeNum}`;
  if (loai === "LF") return "LF";
  return String(scopeNum);
};

const flattenLeafDataIndexes = (cols: ThongKeHeaderColumn[]): string[] => {
  const out: string[] = [];
  const walk = (items: ThongKeHeaderColumn[]) => {
    items.forEach((c) => {
      if (Array.isArray(c.children) && c.children.length > 0) {
        walk(c.children);
      } else if (c.dataIndex) {
        out.push(c.dataIndex);
      }
    });
  };
  walk(cols);
  return out;
};

const buildSampleRows = (loai: LoaiBMKey, headers: ThongKeHeaderColumn[]) => {
  const leafs = flattenLeafDataIndexes(headers);
  const base: Record<string, unknown> = { key: "sample-1" };
  leafs.forEach((di) => {
    if (di === "ngaySx") base[di] = "2025-12-21";
    else if (di === "ca") base[di] = 1;
    else if (di === "kip") base[di] = "A";
    else if (di === "loThoi") base[di] = "Lò thổi 6";
    else if (di === "tinhLuyen") base[di] = loai === "RH" ? "RH1" : "LF";
    else if (di === "meThoi") base[di] = "25F006389";
    else if (di === "macThep") base[di] = "M01";
    else base[di] = 0;
  });

  const row2: Record<string, unknown> = { ...base, key: "sample-2" };
  row2.ngaySx = "2025-12-22";
  row2.ca = 2;
  row2.meThoi = "25F006390";
  return [base, row2];
};

const CA_OPTIONS = [
  { value: 1, label: "Ca Ngày" },
  { value: 2, label: "Ca Đêm" },
];

const SCOPE_OPTIONS_BY_BM: Record<LoaiBMKey, { value: number; label: string }[]> =
  {
    BOF: [
      { value: 6, label: "Lò 6" },
      { value: 7, label: "Lò 7" },
    ],
    // RH: scope 1,2
    RH: [
      { value: 1, label: "Lò RH1" },
      { value: 2, label: "Lò RH2" },
    ],
    // LF: mặc định là 6
    LF: [{ value: 6, label: "Lò 6" }],
  };

const ThongKeHRC2 = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loaiBmKey, setLoaiBmKey] = useState<LoaiBMKey>("BOF");
  const [hasSearched, setHasSearched] = useState(false);

  const headerConfig = useMemo(
    () => THONGKE_HRC2_HEADERS[loaiBmKey] as ThongKeHeaderColumn[],
    [loaiBmKey]
  );

  const headerColumns = useMemo(() => toAntdColumns(headerConfig), [headerConfig]);

  const sampleRows = useMemo(() => buildSampleRows(loaiBmKey, headerConfig), [loaiBmKey, headerConfig]);

  const handleSearch = useCallback(
    async (overrideLoaiBm?: LoaiBMKey) => {
      try {
        // Multi search: không bắt validate field nào
        const values = form.getFieldsValue(true) as Record<string, unknown>;
        const currentLoaiBm: LoaiBMKey = overrideLoaiBm ?? loaiBmKey ?? "BOF";
        setHasSearched(true);

        const dateRange = values.dateRange as
          | [dayjs.Dayjs, dayjs.Dayjs]
          | undefined;
        // Không chọn ngày thì mặc định lấy ngày hiện tại để gọi API (không chặn search)
        const fromDate = dateRange?.[0] ?? dayjs();

        const ca = values.ca as number | undefined;
        let scope = values.scope as number | undefined;

        // Quy ước Lò / Khu vực theo từng loại BM
        if (currentLoaiBm === "LF") {
          // LF mặc định là 6
          scope = 6;
        }
        const meThoiFilter = (values.meThoi as string | undefined)?.trim();

        // Lấy base columns từ config header thống kê (2 form chính)
        const baseColumns =
          THONGKE_HRC2_HEADERS[currentLoaiBm] as ThongKeHeaderColumn[];
        const headerColumns = toAntdColumns(baseColumns);

        setLoading(true);

        const res = await dlnmHRC2Api.searchGrouped({
          NgaySX: fromDate.format("YYYY-MM-DD"),
          Ca: ca ?? undefined,
          LoaiBM: currentLoaiBm,
          Scope: scope ?? undefined,
          searchText: meThoiFilter ?? undefined,
          page: 1,
          pageSize: 100,
        });

        const rawList: any[] =
          (Array.isArray((res as any)?.data) && (res as any).data) ||
          (Array.isArray((res as any)?.Data) && (res as any).Data) ||
          [];

        if (!rawList.length) {
          message.info("Không có dữ liệu phù hợp với điều kiện lọc.");
          setColumns(headerColumns);
          setTableData([]);
          return;
        }

        const leafs = flattenLeafDataIndexes(baseColumns);

        const rows = rawList.map((item: any, idx: number) => {
          const dataObj = item?.data ?? item?.Data ?? {};
          const mapped = (item?.mappedPhulieus ??
            item?.mappedPhuLieus ??
            item?.MappedPhulieus ??
            item?.MappedPhuLieus ??
            []) as any[];

          const row: any = {
            key:
              dataObj?.report_NO ??
              dataObj?.REPORT_NO ??
              dataObj?.id ??
              dataObj?.ID ??
              idx,
          };

          const getFieldValue = (dataIndex: string): unknown => {
            const direct = (dataObj as any)?.[dataIndex];
            if (direct !== undefined && direct !== null) return direct;

            const pascal =
              dataIndex.charAt(0).toUpperCase() + dataIndex.slice(1);
            if (
              (dataObj as any)?.[pascal] !== undefined &&
              (dataObj as any)?.[pascal] !== null
            ) {
              return (dataObj as any)?.[pascal];
            }

            const upper = dataIndex.toUpperCase();
            if (
              (dataObj as any)?.[upper] !== undefined &&
              (dataObj as any)?.[upper] !== null
            ) {
              return (dataObj as any)?.[upper];
            }

            const lower = dataIndex.toLowerCase();
            if (
              (dataObj as any)?.[lower] !== undefined &&
              (dataObj as any)?.[lower] !== null
            ) {
              return (dataObj as any)?.[lower];
            }

            return null;
          };

          // Lookup từ mappedPhulieus (chỉ những phụ liệu có trong Header_Mapping)
          const valueByHeaderKeyId = new Map<number, number | null>();
          const idByName = new Map<string, number>();
          mapped.forEach((pl: any) => {
            const hkId: number | null | undefined =
              pl?.iD_HeaderKey ??
              pl?.ID_HeaderKey ??
              pl?.id_HeaderKey ??
              pl?.Id_HeaderKey ??
              pl?.idHeaderKey ??
              pl?.IDHeaderKey;
            if (!hkId) return;

            const rawVal =
              pl?.kLPhuGiaTotal ??
              pl?.KLPhuGiaTotal ??
              pl?.klPhuGiaTotal ??
              pl?.kLPhuGia ??
              pl?.KLPhuGia ??
              pl?.klPhuGia ??
              null;
            const val =
              rawVal === null || rawVal === undefined ? null : Number(rawVal);
            valueByHeaderKeyId.set(Number(hkId), Number.isFinite(val ?? NaN) ? (val as number) : null);

            const tenHienThi = pl?.tenHienThi ?? pl?.TenHienThi;
            const tenNguonDuLieu =
              pl?.tenNguonDuLieu ?? pl?.TenNguonDuLieu ?? null;

            const pushName = (name: unknown) => {
              if (name === null || name === undefined) return;
              const key = String(name).trim().toLowerCase();
              if (!key) return;
              if (!idByName.has(key)) {
                idByName.set(key, Number(hkId));
              }
            };

            pushName(tenHienThi);
            pushName(tenNguonDuLieu);
          });

          leafs.forEach((di) => {
            if (di === "loThoi" || di === "tinhLuyen") return;

            // 1) Field cơ bản từ data (nếu có)
            const baseVal = getFieldValue(di);
            if (baseVal !== null && baseVal !== undefined) {
              row[di] = baseVal;
              return;
            }

            // 2) Phụ liệu: không match Header_Mapping => null
            let headerKeyId: number | null = null;
            const m = /^phuLieu_(\d+)$/.exec(di);
            if (m) headerKeyId = Number(m[1]);
            else if (/^\d+$/.test(di)) headerKeyId = Number(di);
            else {
              const key = di.trim().toLowerCase();
              headerKeyId = idByName.get(key) ?? null;
            }

            if (headerKeyId && valueByHeaderKeyId.has(headerKeyId)) {
              row[di] = valueByHeaderKeyId.get(headerKeyId) ?? null;
            } else {
              row[di] = null;
            }
          });

          const scopeValue = (dataObj as any)?.scope ?? (dataObj as any)?.Scope;
          row.loThoi = row.loThoi ?? deriveScopeLabel(currentLoaiBm, scopeValue);
          row.tinhLuyen =
            row.tinhLuyen ?? deriveScopeLabel(currentLoaiBm, scopeValue);

          return row;
        });

        setColumns(headerColumns);
        setTableData(rows);
      } catch (error) {
        console.error("Lỗi thống kê HRC2:", error);
        message.error("Không thể tải dữ liệu thống kê.");
      } finally {
        setLoading(false);
      }
    },
    [form, loaiBmKey]
  );

  const handleReset = useCallback(() => {
    form.resetFields();
    setHasSearched(false);
    setColumns([]);
    setTableData([]);
  }, [form]);

  const handleExcel = useCallback(async () => {
    const values = form.getFieldsValue(true) as Record<string, unknown>;
    const dateRange = values.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    const fromDate = dateRange?.[0];
    const toDate = dateRange?.[1];
    if (!fromDate || !toDate) {
      message.warning("Xuất Excel cần chọn Từ ngày và Đến ngày.");
      return;
    }
    // TODO: nối API xuất excel. Hiện tại chỉ kiểm tra điều kiện ngày.
    message.info("Chức năng xuất Excel sẽ được triển khai sau.");
  }, [form]);

  const handleTabChange = useCallback(
    (key: string) => {
      const bmKey = key as LoaiBMKey;
      setLoaiBmKey(bmKey);
      // Cập nhật lại scope theo loại BM (LF mặc định 6, BOF/RH để trống cho người dùng chọn)
      if (bmKey === "LF") {
        form.setFieldsValue({ scope: 6 });
      } else {
        form.setFieldsValue({ scope: undefined });
      }
      // Nếu đã từng search thì tự reload theo tab mới
      if (hasSearched) {
        void handleSearch(bmKey);
      } else {
        // Chưa search: giữ sample rows + header theo tab
        setColumns([]);
        setTableData([]);
      }
    },
    [form, handleSearch, hasSearched]
  );

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
        BẢNG TỔNG HỢP DỮ LIỆU TIÊU HAO HRC2
      </Title>

      {/* Tabs chọn loại BM */}
      <Tabs
        activeKey={loaiBmKey}
        onChange={handleTabChange}
        items={[
          { key: "BOF", label: "BOF" },
          { key: "LF", label: "LF" },
          { key: "RH", label: "RH" },
        ]}
      />

      {/* Khu vực search (các ô tô đỏ trong Excel) */}
      <Form form={form} layout="inline" style={{ marginTop: 8 }}>
        <Space wrap align="center">
          <Form.Item
            name="dateRange"
            label="Từ ngày LT / Đến ngày LT"
          >
            <RangePicker format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="ca" label="Ca LT">
            <Select
              allowClear
              options={CA_OPTIONS}
              placeholder="-- Ca --"
              style={{ minWidth: 120 }}
            />
          </Form.Item>

          <Form.Item name="scope" label="Lò / Khu vực">
            <Select
              allowClear
              options={SCOPE_OPTIONS_BY_BM[loaiBmKey]}
              placeholder={loaiBmKey === "LF" ? "Lò 6 (mặc định)" : "-- Lò --"}
              style={{ minWidth: 150 }}
            />
          </Form.Item>

          <Form.Item name="kip" label="Kíp LT">
            <Select
              allowClear
              placeholder="-- Kíp --"
              options={[
                { value: "A", label: "Kíp A" },
                { value: "B", label: "Kíp B" },
                { value: "C", label: "Kíp C" },
              ]}
              style={{ minWidth: 140 }}
            />
          </Form.Item>

          <Form.Item name="meThoi" label="Mã mẻ thép">
            <Input placeholder="Nhập mã mẻ thép" style={{ minWidth: 160 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                onClick={() => void handleSearch()}
                loading={loading}
              >
                Tìm
              </Button>
              <Button onClick={handleReset}>Reset</Button>
              <Button onClick={() => void handleExcel()}>
                Excel
              </Button>
            </Space>
          </Form.Item>
        </Space>
      </Form>

      {/* Bảng thống kê */}
      <div style={{ marginTop: 24 }}>
        <Table
          bordered
          size="small"
          loading={loading}
          columns={columns.length > 0 ? columns : headerColumns}
          dataSource={hasSearched ? tableData : sampleRows}
          pagination={false}
          scroll={{ x: "max-content", y: 500 }}
        />
      </div>
    </Card>
  );
};

export default ThongKeHRC2;
