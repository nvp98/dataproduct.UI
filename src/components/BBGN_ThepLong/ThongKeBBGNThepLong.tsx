import { Button, Card, Checkbox, DatePicker, Form, Input, Select, Space, Table, Tag, message } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  bbgbThepLongApi,
  type SearchThongKeBBGNThepLongRequest,
  type SumThongKeBBGNThepLongResponse,
} from "../../services/BBGNThepLongApi";
import { MayDucServiceApi } from "../../services/MayDucServiceApi";

const { RangePicker } = DatePicker;

type ThongKeRow = {
  id: number;
  mayDuc?: string | null;
  me?: string | null;
  macThep?: string | null;
  thungSo?: string | null;
  thoiGian?: string | null;
  klLan1?: number | null;
  klLan2?: number | null;
  klLan3?: number | null;
  klThepLong?: number | null;
  ghiChu?: string | null;
  tinhLuyenLenThang?: string | null;
  phanLoai?: string | null;
  ngaySX?: string | null;
  ca?: number | null;
  scope?: number | null;
  isTrungMeThoi?: boolean | null;
  IsTrungMeThoi?: boolean | null;
};

const formatNumber = (value: number | null | undefined) =>
  value == null ? "" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

const isDuplicateMe = (record: ThongKeRow) =>
  record.isTrungMeThoi === true || record.IsTrungMeThoi === true;

type Props = {
  bieuMau: string;
  nhaMay: number;
};

const ThongKeBBGNThepLong = ({ bieuMau, nhaMay }: Props) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<ThongKeRow[]>([]);
  const [sumData, setSumData] = useState<SumThongKeBBGNThepLongResponse>({
    totalRows: 0,
    totalKlThepLong: null,
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState<SearchThongKeBBGNThepLongRequest>({
    bieuMau,
    page: 1,
    pageSize: 20,
  });
  const [mayDucOptions, setMayDucOptions] = useState<Array<{ label: string; value: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await MayDucServiceApi.search({ nhaMay, isLock: false, page: 1, pageSize: 200 });
        if (cancelled) return;
        setMayDucOptions((res.data || []).map((x) => ({ label: x.tenMayDuc, value: x.id })));
      } catch (error) {
        console.error(error);
      }
    })();
    return () => { cancelled = true; };
  }, [nhaMay]);

  const fetchData = useCallback(async (nextFilters: SearchThongKeBBGNThepLongRequest) => {
    try {
      setLoading(true);
      const [searchRes, sumRes] = await Promise.all([
        bbgbThepLongApi.searchThongKe<ThongKeRow>(nextFilters),
        bbgbThepLongApi.sumThongKe(nextFilters),
      ]);
      setTableData(searchRes.data ?? []);
      setSumData(sumRes);
      setPagination({
        current: searchRes.page ?? nextFilters.page ?? 1,
        pageSize: searchRes.pageSize ?? nextFilters.pageSize ?? 20,
        total: searchRes.totalRecords ?? 0,
      });
      setFilters(nextFilters);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải thống kê BBGN thép lỏng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData({ bieuMau, page: 1, pageSize: 20 });
  }, [fetchData, bieuMau]);

  const handleFilter = useCallback(() => {
    const values = form.getFieldsValue(true) as Record<string, unknown>;
    const dateRange = values.ngaySX as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    const nextFilters: SearchThongKeBBGNThepLongRequest = {
      tuNgay: dateRange?.[0]?.format("YYYY-MM-DD"),
      denNgay: dateRange?.[1]?.format("YYYY-MM-DD"),
      ca: values.ca ? Number(values.ca) : undefined,
      kip: values.kip ? String(values.kip) : undefined,
      scope: values.scope ? Number(values.scope) : undefined,
      mayDuc: values.scope ? Number(values.scope) : undefined,
      searchString: values.searchString ? String(values.searchString).trim() : undefined,
      thungSo: values.thungSo ? String(values.thungSo).trim() : undefined,
      tinhLuyenLenThang: values.tinhLuyenLenThang ? String(values.tinhLuyenLenThang) : undefined,
      phanLoai: values.phanLoai ? String(values.phanLoai).trim() : undefined,
      isTrungMeThoi: values.isTrungMeThoi === true ? true : undefined,
      bieuMau,
      page: 1,
      pageSize: pagination.pageSize,
    };
    void fetchData(nextFilters);
  }, [fetchData, form, pagination.pageSize, bieuMau]);

  const handleClearFilter = useCallback(() => {
    form.resetFields();
    void fetchData({ bieuMau, page: 1, pageSize: pagination.pageSize });
  }, [fetchData, form, pagination.pageSize, bieuMau]);

  const columns = useMemo(
    () => [
      {
        title: "Ngày SX",
        dataIndex: "ngaySX",
        key: "ngaySX",
        width: 120,
        render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
      },
      {
        title: "Ca",
        dataIndex: "ca",
        key: "ca",
        width: 80,
        render: (value: number) => (value === 1 ? "Ngày" : value === 2 ? "Đêm" : "-"),
      },
      {
        title: "Máy đúc",
        dataIndex: "mayDuc",
        key: "mayDuc",
        width: 130,
        render: (value: string) => {
          return value;
        },
      },
      {
        title: "Mẻ",
        dataIndex: "me",
        key: "me",
        width: 120,
        render: (value: string, record: ThongKeRow) =>
          isDuplicateMe(record) ? <span style={{ color: "red", fontWeight: 600 }}>{value}</span> : value,
      },
      { title: "Mác thép", dataIndex: "macThep", key: "macThep", width: 120 },
      { title: "Thùng số", dataIndex: "thungSo", key: "thungSo", width: 110 },
      { title: "Thời gian", dataIndex: "thoiGian", key: "thoiGian", width: 100 },
      {
        title: "KL lần 1",
        dataIndex: "klLan1",
        key: "klLan1",
        width: 100,
        align: "right" as const,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "KL lần 2",
        dataIndex: "klLan2",
        key: "klLan2",
        width: 100,
        align: "right" as const,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "KL lần 3",
        dataIndex: "klLan3",
        key: "klLan3",
        width: 100,
        align: "right" as const,
        render: (value: number) => formatNumber(value),
      },
      {
        title: "KL thép lỏng",
        dataIndex: "klThepLong",
        key: "klThepLong",
        width: 120,
        align: "right" as const,
        render: (value: number) => {
          const isNegative = Number(value) < 0;
          return (
            <span style={isNegative ? { color: "red", fontWeight: 600 } : undefined}>
              {formatNumber(value)}
            </span>
          );
        },
      },
      { title: "Tinh luyện lên thang", dataIndex: "tinhLuyenLenThang", key: "tinhLuyenLenThang", width: 160 },
      { title: "Phân loại", dataIndex: "phanLoai", key: "phanLoai", width: 120 },
      {
        title: "Trùng mẻ",
        dataIndex: "isTrungMeThoi",
        key: "isTrungMeThoi",
        width: 100,
        render: (value: boolean | null) =>
          value === true ? <Tag color="red">Trùng</Tag> : <Tag>Không</Tag>,
      },
      { title: "Ghi chú", dataIndex: "ghiChu", key: "ghiChu", width: 180 },
    ],
    [mayDucOptions]
  );

  return (
    <Card style={{ marginTop: 12 }}>
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <Form.Item name="ngaySX" label="Ngày sản xuất">
            <RangePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="ca" label="Ca"> 
            <Select allowClear options={[
              { label: "Ca ngày (1)", value: 1 },
              { label: "Ca đêm (2)", value: 2 },
            ]} placeholder="Ca" style={{ minWidth: 140 }} />
          </Form.Item>
          <Form.Item name="kip" label="Kíp">
            <Select allowClear options={[
              { label: "Kíp A", value: "A" },
              { label: "Kíp B", value: "B" },
              { label: "Kíp C", value: "C" },
            ]} placeholder="Kíp" style={{ minWidth: 140 }} />
          </Form.Item>
          <Form.Item name="scope" label="Máy đúc">
            <Select allowClear options={mayDucOptions} placeholder="Máy đúc" style={{ minWidth: 140 }} />
          </Form.Item>

          <Form.Item name="searchString" label="Mẻ / Mác thép">
            <Input placeholder="Mẻ hoặc mác thép" style={{ minWidth: 160 }} />
          </Form.Item>

          <Form.Item name="thungSo" label="Thùng số">
            <Input placeholder="Thùng số" style={{ minWidth: 120 }} />
          </Form.Item>

          <Form.Item name="tinhLuyenLenThang" label="Tinh luyện / Lên thẳng">
            <Select
              allowClear
              placeholder="Tất cả"
              style={{ minWidth: 140 }}
              options={[
                { label: "Tinh luyện", value: "Tinh luyện" },
                { label: "Lên thẳng", value: "Lên thẳng" },
              ]}
            />
          </Form.Item>

          <Form.Item name="phanLoai" label="Phân loại">
            <Input placeholder="Phân loại" style={{ minWidth: 100 }} />
          </Form.Item>

          <Form.Item name="isTrungMeThoi" valuePropName="checked">
            <Checkbox>Trùng mẻ</Checkbox>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => void handleFilter()} loading={loading}>
                Tìm
              </Button>
              <Button onClick={handleClearFilter}>Reset</Button>
            </Space>
          </Form.Item>
        </Space>
      </Form>

      <Table<ThongKeRow>
        bordered
        size="small"
        columns={columns}
        dataSource={tableData}
        loading={loading}
        rowKey={(row) => String(row.id)}
        scroll={{ x: 1800, y: 520 }}
        onRow={(record) => (isDuplicateMe(record) ? { style: { backgroundColor: "#fff1f0" } } : {})}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} dòng`,
          onChange: (page, pageSize) => {
            void fetchData({ ...filters, page, pageSize });
          },
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: "#fafafa", fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={10} align="right">
                Tổng
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right">
                <span
                  style={
                    Number(sumData.totalKlThepLong) < 0 ? { color: "red", fontWeight: 600 } : undefined
                  }
                >
                  {formatNumber(sumData.totalKlThepLong)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={11} colSpan={4} align="right">
                Tổng dòng: {sumData.totalRows}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
};

export default ThongKeBBGNThepLong;
