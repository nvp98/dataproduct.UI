/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from "react";
import {
  Card,
  Table,
  Tooltip,
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
import { dlnmHRC1Api } from "../../../services/DLNMHRC1Api";
import { formatNumberVN } from "../../../utils/formatters/numberFormat";
import {
  Header_TieuHaoLoThoi_HRC1,
  type ThongKeHeaderColumn,
} from "../../../utils/configs/thongKeHRC1HeaderConfig";
import ThongKeBBGNThepLong from "./ThongKeBBGNThepLong";

const { Title } = Typography;
const { RangePicker } = DatePicker;

type HkCellData = {
  value: number | null;
  manualValue?: number | null;
  klPhanBo?: number | null;
  totalKLPhuGia?: number | null;
  isManual?: boolean;
};

const renderHkCell = (cellData: HkCellData | null | unknown) => {
  if (cellData === null || cellData === undefined) return "";
  const { value, manualValue, klPhanBo, totalKLPhuGia } = cellData as HkCellData;

  const displayValue = totalKLPhuGia ?? (manualValue != null ? manualValue : value);
  const formatted = formatNumberVN(displayValue);

  const hasPhanBo = klPhanBo != null;
  const hasManual = manualValue != null;

  if (hasPhanBo || hasManual) {
    const tooltipParts: string[] = [];
    tooltipParts.push(`Tự động: ${formatNumberVN(value)}`);
    if (hasManual) tooltipParts.push(`Chỉnh tay: ${formatNumberVN(manualValue)}`);
    if (hasPhanBo) tooltipParts.push(`Phân bổ: ${formatNumberVN(klPhanBo)}`);

    const bg = hasPhanBo && hasManual ? "#d4edda" : hasPhanBo ? "#d6f0ff" : "#fff7b3";
    return (
      <Tooltip title={tooltipParts.join(" | ")}>
        <span style={{ backgroundColor: bg, display: "block", padding: "0 4px" }}>
          {formatted}
        </span>
      </Tooltip>
    );
  }
  return formatted;
};

const toAntdColumns = (cols: ThongKeHeaderColumn[]): any[] => {
  return cols.map((c) => {
    const mapped: any = {
      key: c.dataIndex,
      dataIndex: c.dataIndex,
      title: c.title,
      width: c.width,
      align: "right" as const,
    };

    if (c.dataIndex === "ngaySx") {
      mapped.render = (value: unknown) =>
        value ? dayjs(String(value)).format("DD/MM/YYYY") : "";
    }

    if (c.dataIndex === "klGangLong" || c.dataIndex === "klThepPhe") {
      mapped.render = (value: unknown) => formatNumberVN(value);
    }

    if (Array.isArray(c.children) && c.children.length > 0) {
      mapped.children = toAntdColumns(c.children);
    }
    return mapped;
  });
};

const CA_OPTIONS = [
  { value: 1, label: "Ca Ngày" },
  { value: 2, label: "Ca Đêm" },
];

type SumRowMap = Record<string, number | null>;

const flattenLeafColumns = (cols: any[]): any[] =>
  cols.flatMap((c) => (Array.isArray(c.children) ? flattenLeafColumns(c.children) : [c]));

const ThongKeHRC1 = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumRow, setSumRow] = useState<SumRowMap>({});
  const [columns, setColumns] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [mainTabKey, setMainTabKey] = useState<"tieuhao" | "bbgn">("bbgn");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const handleSearch = useCallback(
    async (page?: number, pageSize?: number) => {
      try {
        const values = form.getFieldsValue(true) as Record<string, unknown>;

        const dateRange = values.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
        const fromDate = dateRange?.[0] ?? null;
        const toDate = dateRange?.[1] ?? null;
        const ca = values.ca as number | undefined;
        const meThoiFilter = (values.meThoi as string | undefined)?.trim();

        const fixedCols = Header_TieuHaoLoThoi_HRC1;
        const fixedColumns = toAntdColumns(fixedCols);

        setLoading(true);

        const currentPage = page ?? 1;
        const currentPageSize = pageSize ?? pagination.pageSize;

        const basePayload = {
          TuNgay: fromDate ? fromDate.format("YYYY-MM-DD") : null,
          DenNgay: toDate ? toDate.format("YYYY-MM-DD") : null,
          Ca: ca ?? undefined,
          SearchText: meThoiFilter ?? undefined,
        };

        const hasDateRange = !!(fromDate && toDate);
        setSumLoading(true);
        setSumRow({});
        if (hasDateRange) {
          dlnmHRC1Api.sumThongKe(basePayload).then((sumRes) => {
            const sp = sumRes as any;
            const sumList: any[] = Array.isArray(sp)
              ? sp
              : (sp?.SumValues ?? sp?.sumValues ?? sp?.data ?? sp?.Data ?? []);
            const map: SumRowMap = {};
            sumList.forEach((sv: any) => {
              const hkId = sv?.idHeaderKey ?? sv?.IDHeaderKey ?? sv?.iDHeaderKey;
              const total = sv?.totalKLPhuGia ?? sv?.TotalKLPhuGia ?? sv?.KLPhuGia ?? sv?.kLPhuGia ?? sv?.klPhuGia;
              if (hkId != null) {
                map[`hk_${hkId}`] = total != null ? Number(total) : null;
              }
            });
            setSumRow(map);
          }).catch((err) => console.error("Lỗi sum thống kê HRC1:", err)).finally(() => setSumLoading(false));
        }

        const res = await dlnmHRC1Api.searchThongKe({
          ...basePayload,
          Page: currentPage,
          PageSize: currentPageSize,
        });

        const payload = res as any;

        const headerListRaw: any[] =
          (payload?.phuLieuHeaderTables as any[]) ||
          (payload?.PhuLieuHeaderTables as any[]) ||
          [];
        const headerList = headerListRaw
          .map((h: any) => ({
            idHeaderKey: Number(h?.iDHeaderKey ?? h?.IDHeaderKey ?? h?.idHeaderKey ?? 0),
            tenPhuLieu: String(h?.tenPhuLieu ?? h?.TenPhuLieu ?? "").trim(),
          }))
          .filter((h: any) => h.idHeaderKey > 0 && !!h.tenPhuLieu);

        const totalRecords: number =
          payload?.totalRecords ?? payload?.TotalRecords ?? payload?.totalCount ?? payload?.TotalCount ?? 0;

        const rawList: any[] =
          (Array.isArray(payload?.data) && payload.data) ||
          (Array.isArray(payload?.Data) && payload.Data) ||
          [];

        const headerColumns: any[] = [
          ...fixedColumns,
          ...headerList.map((h: any) => ({
            key: `hk_${h.idHeaderKey}`,
            dataIndex: `hk_${h.idHeaderKey}`,
            title: h.tenPhuLieu,
            width: 90,
            align: "right" as const,
            render: (value: unknown) => renderHkCell(value),
          })),
        ];

        if (!rawList.length) {
          message.info("Không có dữ liệu phù hợp với điều kiện lọc.");
          setColumns(headerColumns);
          setTableData([]);
          setPagination({ current: currentPage, pageSize: currentPageSize, total: 0 });
          return;
        }

        const rows = rawList.map((item: any, idx: number) => {
          const dataObj = (item?.data ?? item?.Data ?? {}) as any;
          const valuesArr = (item?.values ?? item?.Values ?? []) as any[];

          const row: any = {
            key: dataObj?.id ?? dataObj?.ID ?? dataObj?.report_NO ?? idx,
          };

          const getFieldValue = (dataIndex: string): unknown => {
            const direct = dataObj?.[dataIndex];
            if (direct !== undefined && direct !== null) return direct;
            const pascal = dataIndex.charAt(0).toUpperCase() + dataIndex.slice(1);
            if (dataObj?.[pascal] !== undefined && dataObj?.[pascal] !== null) return dataObj?.[pascal];
            return null;
          };

          const valueByHeaderKeyId = new Map<number, HkCellData>();
          valuesArr.forEach((v: any) => {
            const hkId: number | null | undefined =
              v?.iDHeaderKey ?? v?.IDHeaderKey ?? v?.idHeaderKey ?? v?.IdHeaderKey;
            if (!hkId) return;
            const toNum = (raw: unknown): number | null => {
              if (raw === null || raw === undefined) return null;
              const n = Number(raw);
              return Number.isFinite(n) ? n : null;
            };
            const value = toNum(v?.kLPhuGia ?? v?.KLPhuGia ?? v?.klPhuGia);
            const manualValue = toNum(v?.klPhuGia_Manual ?? v?.KLPhuGia_Manual);
            const klPhanBo = toNum(v?.kLPhanBo ?? v?.KLPhanBo ?? v?.klPhanBo);
            const totalKLPhuGia = toNum(v?.totalKLPhuGia ?? v?.TotalKLPhuGia);
            const isManual = v?.isManual === true || v?.IsManual === true;
            valueByHeaderKeyId.set(Number(hkId), { value, manualValue, klPhanBo, totalKLPhuGia, isManual });
          });

          fixedCols.forEach((c) => {
            row[c.dataIndex] = getFieldValue(c.dataIndex);
          });

          headerList.forEach((h: any) => {
            row[`hk_${h.idHeaderKey}`] = valueByHeaderKeyId.get(h.idHeaderKey) ?? null;
          });

          return row;
        });

        if (!hasDateRange) {
          const localSum: SumRowMap = {};
          rows.forEach((row) => {
            Object.keys(row).forEach((key) => {
              if (!key.startsWith("hk_")) return;
              const cell = row[key] as HkCellData | null;
              if (!cell) return;
              const val = cell.totalKLPhuGia ?? (cell.manualValue != null ? cell.manualValue : cell.value);
              if (val != null) localSum[key] = (localSum[key] ?? 0) + val;
            });
          });
          setSumRow(localSum);
          setSumLoading(false);
        }

        setColumns(headerColumns);
        setTableData(rows);
        setPagination({
          current: payload?.page ?? payload?.Page ?? currentPage,
          pageSize: payload?.pageSize ?? payload?.PageSize ?? currentPageSize,
          total: totalRecords || rows.length,
        });
      } catch (error) {
        console.error("Lỗi thống kê HRC1:", error);
        message.error("Không thể tải dữ liệu thống kê.");
      } finally {
        setLoading(false);
      }
    },
    [form, pagination.pageSize]
  );

  // Chưa auto-load khi mount vì backend chưa triển khai API tiêu hao HRC1

  const handleReset = useCallback(() => {
    form.resetFields();
    setColumns([]);
    setTableData([]);
    setSumRow({});
    setPagination({ current: 1, pageSize: pagination.pageSize, total: 0 });
  }, [form, pagination.pageSize]);

  const handleExcel = useCallback(async () => {
    const values = form.getFieldsValue(true) as Record<string, unknown>;
    const dateRange = values.dateRange as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    const fromDate = dateRange?.[0];
    const toDate = dateRange?.[1];
    if (!fromDate || !toDate) {
      message.warning("Xuất Excel cần chọn Từ ngày và Đến ngày.");
      return;
    }
    const ca = values.ca as number | undefined;
    const meThoiFilter = (values.meThoi as string | undefined)?.trim();

    const payload: Record<string, unknown> = {
      TuNgay: fromDate.format("YYYY-MM-DD"),
      DenNgay: toDate.format("YYYY-MM-DD"),
      Ca: ca ?? undefined,
      SearchText: meThoiFilter ?? undefined,
    };

    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_URL as string;
      const token = localStorage.getItem("token");

      const res = await fetch(`${baseUrl}api/DLNMHRC1/export-thongke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Xuất Excel thất bại.");
      }

      const blob = await res.blob();
      let fileName = `ThongKe_HRC1_LoThoi_${fromDate.format("YYYYMMDD")}_${toDate.format("YYYYMMDD")}.xlsx`;
      const contentDisposition = res.headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (match && match[1]) {
          fileName = decodeURIComponent(match[1].replace(/['"]/g, ""));
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? "Xuất Excel thất bại. Vui lòng thử lại.";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [form]);

  return (
    <div style={{ margin: 2 }}>
      <Tabs
        activeKey={mainTabKey}
        onChange={(k) => setMainTabKey(k as "tieuhao" | "bbgn")}
        items={[
          { key: "tieuhao", label: "Thống kê tiêu hao HRC1" },
          { key: "bbgn", label: "Thống kê BBGN thép lỏng" },
        ]}
      />

      {mainTabKey === "bbgn" ? (
        <ThongKeBBGNThepLong />
      ) : (
        <Card style={{ boxShadow: "0 2px 8px #f0f1f2" }}>
          <Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>
            BẢNG TỔNG HỢP DỮ LIỆU TIÊU HAO HRC1
          </Title>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 4, flexShrink: 0 }}>
              {[
                { bg: "#fff7b3", label: "Chỉnh tay" },
                { bg: "#d6f0ff", label: "Phân bổ" },
                { bg: "#d4edda", label: "Phân bổ + Chỉnh tay" },
              ].map(({ bg, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555" }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, backgroundColor: bg, border: "1px solid #ccc", borderRadius: 2, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <Form form={form} layout="inline" style={{ marginTop: 12 }}>
            <Space wrap align="center">
              <Form.Item name="dateRange" label="Từ ngày / Đến ngày">
                <RangePicker format="DD/MM/YYYY" />
              </Form.Item>

              <Form.Item name="ca" label="Ca">
                <Select
                  allowClear
                  options={CA_OPTIONS}
                  placeholder="-- Ca --"
                  style={{ minWidth: 120 }}
                />
              </Form.Item>

              <Form.Item name="kip" label="Kíp">
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
                  <Button type="primary" onClick={() => void handleSearch()} loading={loading}>
                    Tìm
                  </Button>
                  <Button onClick={handleReset}>Reset</Button>
                  <Button onClick={() => void handleExcel()}>Excel</Button>
                </Space>
              </Form.Item>
            </Space>
          </Form>

          <div style={{ marginTop: 24 }}>
            <Table
              bordered
              size="small"
              loading={loading}
              columns={columns}
              dataSource={tableData}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} bản ghi`,
                onChange: (page, pageSize) => {
                  void handleSearch(page, pageSize);
                },
              }}
              scroll={{ x: "max-content", y: 500 }}
              summary={() => {
                const leafCols = flattenLeafColumns(columns);
                if (!leafCols.length) return null;
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: "#e6f4ff", fontWeight: 600 }}>
                      {leafCols.map((col, idx) => {
                        if (idx === 0) {
                          return (
                            <Table.Summary.Cell key={idx} index={idx} align="right">
                              Tổng
                            </Table.Summary.Cell>
                          );
                        }
                        const di: string = col.dataIndex ?? "";
                        if (!di.startsWith("hk_")) {
                          return <Table.Summary.Cell key={idx} index={idx} />;
                        }
                        if (sumLoading) {
                          return (
                            <Table.Summary.Cell key={idx} index={idx} align="right">
                              <span style={{ color: "#aaa" }}>...</span>
                            </Table.Summary.Cell>
                          );
                        }
                        const val = sumRow[di];
                        return (
                          <Table.Summary.Cell key={idx} index={idx} align="right">
                            {val != null ? formatNumberVN(val) : ""}
                          </Table.Summary.Cell>
                        );
                      })}
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default ThongKeHRC1;
