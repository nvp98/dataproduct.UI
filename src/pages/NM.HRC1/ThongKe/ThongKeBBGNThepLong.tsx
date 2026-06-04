import { Button, Card, Checkbox, DatePicker, Form, Input, Select, Space, Table, Tag, message } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { TableColumnsType } from "antd";
import {
  HRC1Api,
  type HRC1_ThongKeQuery,
  type HRC1_ThongKeRow,
  type HRC1_TongHopItem,
  type HRC1_TongHopResult,
} from "../../../services/HRC1_BBGNApi";
import { MayDucServiceApi } from "../../../services/MayDucServiceApi";
import { MacThepServiceApi } from "../../../services/MacThepServiceApi";
import Tooltip from "antd/es/tooltip";

const { RangePicker } = DatePicker;

const fmt = (v: number | null | undefined) =>
  v == null ? "" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(v);

const ThongKeBBGNThepLongHRC1 = () => {
  const [form] = Form.useForm();
  const [loading, setLoading]       = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [data, setData]             = useState<HRC1_ThongKeRow[]>([]);
  const [totalRecords, setTotal]    = useState(0);
  const [totalKl, setTotalKl]           = useState<number | null>(null);
  const [totalKlPhanBo, setTotalKlPhanBo] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters]       = useState<HRC1_ThongKeQuery>({ page: 1, pageSize: 20 });
  const [mayDucOpts, setMayDucOpts] = useState<{ label: string; value: number }[]>([]);
  const [nhomMacOpts, setNhomMacOpts] = useState<{ label: string; value: number }[]>([]);
  const [tongHopData, setTongHopData] = useState<HRC1_TongHopResult | null>(null);

  useEffect(() => {
    MayDucServiceApi.search({ nhaMay: 1, isLock: false, page: 1, pageSize: 200 })
      .then((res) => setMayDucOpts((res.data || []).map((x: any) => ({ label: x.tenMayDuc, value: x.id }))))
      .catch(() => {});
    MacThepServiceApi.getPhanLoaiNhomOptions({ pageSize: 200 })
      .then((res) => setNhomMacOpts(res.data.map((x) => ({ label: x.tenNhom, value: x.id }))))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async (q: HRC1_ThongKeQuery) => {
    setLoading(true);
    try {
      const res = await HRC1Api.searchThongKe(q);
      setData(res.items);
      setTotal(res.totalRecords);
      setTotalKl(res.totalKlThepLong);
      setTotalKlPhanBo(res.totalKlThepLongPhanBo ?? null);
      setPagination({ current: res.page, pageSize: res.pageSize });
      setFilters(q);
      // Tổng hợp — fire and forget, không block main table
      void HRC1Api.tongHopThongKe(q).then(setTongHopData).catch(() => {});
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? "Lỗi tải dữ liệu.";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData({ page: 1, pageSize: 20 }); }, [fetchData]);

  const handleFilter = useCallback(() => {
    const v = form.getFieldsValue(true) as Record<string, unknown>;
    const dr = v.ngaySX as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    // Decode select "Trạng thái" → các filter riêng biệt
    const tt = v.trangThai as string | undefined;
    const trangThaiLo  = tt === "lo_0"  ? 0 : tt === "lo_1"  ? 1 : undefined;
    const trangThaiTL  = tt === "tl_0"  ? 0 : tt === "tl_1"  ? 1 : undefined;
    const trangThaiDuc = tt === "duc_0" ? 0 : tt === "duc_1" ? 1 : undefined;
    const isChot       = tt === "chot"  ? true : undefined;

    const q: HRC1_ThongKeQuery = {
      tuNgay:        dr?.[0]?.format("YYYY-MM-DD"),
      denNgay:       dr?.[1]?.format("YYYY-MM-DD"),
      ca:            v.ca != null ? Number(v.ca) : undefined,
      kip:           v.kip ? String(v.kip) : undefined,
      loSo:          v.loSo != null ? Number(v.loSo) : undefined,
      tlSo:          v.tlSo != null ? Number(v.tlSo) : undefined,
      idMayDuc:      v.idMayDuc != null ? Number(v.idMayDuc) : undefined,
      maMe:          v.maMe ? String(v.maMe).trim() : undefined,
      thungSo:       v.thungSo ? String(v.thungSo).trim() : undefined,
      phanLoai:      v.phanLoai ? String(v.phanLoai).trim() : undefined,
      isManualTL:           v.isManualTL === true ? true : undefined,
      isTrungMeThoi:        v.isTrungMeThoi === true ? true : undefined,
      chuaCoNhomPhanLoai:   v.chuaCoNhomPhanLoai === true ? true : undefined,
      idNhomPhanLoai:       v.idNhomPhanLoai != null ? Number(v.idNhomPhanLoai) : undefined,
      trangThaiLo,
      trangThaiTL,
      trangThaiDuc,
      isChot,
      page: 1,
      pageSize: pagination.pageSize,
    };
    void fetchData(q);
  }, [fetchData, form, pagination.pageSize]);

  const handleReset = useCallback(() => {
    form.resetFields();
    void fetchData({ page: 1, pageSize: pagination.pageSize });
  }, [fetchData, form, pagination.pageSize]);

  const handleSync = useCallback(async () => {
    const maMes = data
      .filter((r) => r.isChot !== true && r.maMe)
      .map((r) => r.maMe!);
    if (maMes.length === 0) {
      void message.info("Không có mẻ chưa chốt trong danh sách hiện tại.");
      return;
    }
    setSyncing(true);
    try {
      const res = await HRC1Api.syncPhanLoaiMeThep(maMes);
      void message.success(`Đồng bộ: ${res.totalUpdated}/${maMes.length} mẻ được cập nhật.`);
      void fetchData(filters);
    } catch {
      void message.error("Đồng bộ phân loại thất bại.");
    } finally {
      setSyncing(false);
    }
  }, [data, filters, fetchData]);

  const handleExport = useCallback(async () => {
    if (!filters.tuNgay || !filters.denNgay) {
      message.warning("Vui lòng chọn khoảng ngày (từ ngày – đến ngày) trước khi xuất Excel.");
      return;
    }
    setExporting(true);
    try {
      await HRC1Api.exportThongKe(filters);
    } catch (e: unknown) {
      const msg = typeof e === "string" ? e : (e as { message?: string })?.message ?? "Xuất Excel thất bại.";
      message.error(msg);
    } finally {
      setExporting(false);
    }
  }, [filters]);

  const columns = useMemo((): TableColumnsType<HRC1_ThongKeRow> => [
    {
      title: "Ngày tạo", dataIndex: "ngayTao", key: "ngayTao", width: 110, fixed: "left", align: "center",
      render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Ca", dataIndex: "ca", key: "ca", width: 70, fixed: "left", align: "center",
      render: (v: number) => v === 1 ? "Ngày" : v === 2 ? "Đêm" : "-",
    },
    { title: "Kíp", dataIndex: "kip", key: "kip", width: 60, align: "center" },
    {
      title: "Ngày TL", dataIndex: "ngayNhanTL", key: "ngayNhanTL", width: 110, fixed: "left", align: "center",
      render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY") : "-",
    },
    {
      title: "Ca TL", dataIndex: "caTinhLuyen", key: "caTinhLuyen", width: 70, fixed: "left", align: "center",
      render: (v: number) => v === 1 ? "Ngày" : v === 2 ? "Đêm" : "-",
    },
    { title: "Máy đúc", dataIndex: "tenMayDuc", key: "tenMayDuc", width: 110, fixed: "left" },
    {
      title: "Mẻ thổi", dataIndex: "maMe", key: "maMe", width: 110, fixed: "left", align: "center",
      render: (v: string, r: HRC1_ThongKeRow) =>
        r.isTrungMeThoi ? <span style={{ color: "red", fontWeight: 600 }}>{v}</span> : v,
    },
    // { title: "Mác thép", dataIndex: "macThep", key: "macThep", width: 110 },
    { title: "Thùng số", dataIndex: "thungSo", key: "thungSo", width: 60, align: "center" },
    { title: "Thời gian", dataIndex: "thoiGian", key: "thoiGian", width: 65 , align: "center"},
    {
      title: "KL LF sau thép", dataIndex: "kllfSauThep", key: "kllfSauThep", width: 80,
      align: "right", render: (v: number) => fmt(v),
    },
    {
      title: "KL lần 1", dataIndex: "klLan1", key: "klLan1", width: 80,
      align: "right", render: (v: number) => fmt(v),
    },
    {
      title: "KL lần 2", dataIndex: "klLan2", key: "klLan2", width: 80,
      align: "right", render: (v: number) => fmt(v),
    },
    {
      title: "KL lần 3", dataIndex: "klLan3", key: "klLan3", width: 80,
      align: "right", render: (v: number) => fmt(v),
    },
    {
      title: "KL thép lỏng", dataIndex: "klThepLong", key: "klThepLong", width: 80,
      align: "right",
      render: (v: number) => (
        <span style={{ fontWeight: 600, ...(v < 0 ? { color: "red" } : {}) }}>{fmt(v)}</span>
      ),
    },
    {
      title: "KL phân bổ", dataIndex: "klThepLongPhanBo", key: "klThepLongPhanBo", width: 80,
      align: "right",
      render: (v: number) => fmt(v),
    },
    { title: "TL / Lên thẳng", dataIndex: "tinhLuyenLenThang", key: "tinhLuyenLenThang", width: 90, align: "center" },
    { title: "Phân loại", dataIndex: "phanLoai", key: "phanLoai", width: 100, align: "center" },
    { title: "Mác BKMIS", dataIndex: "macThepBKMIS", key: "macThepBKMIS", width: 110 },
    { title: "Nhóm phân loại mác thép", dataIndex: "tenNhomPhanLoai", key: "tenNhomPhanLoai", width: 260 },
    {
      title: "TT Lò", key: "trangThaiLo", width: 90, align: "center",
      render: (_: unknown, r: HRC1_ThongKeRow) => {
        if (r.trangThaiLo === 1) return <Tag color="blue">Đã nhập</Tag>;
        if (r.trangThaiLo === 0) return <Tag>Chờ</Tag>;
        return <Tag color="default">-</Tag>;
      },
    },
    {
      title: "TT Nhận", key: "trangThaiTL", width: 95,align: "center",
      render: (_: unknown, r: HRC1_ThongKeRow) => {
        if (r.trangThaiTL === 1) return <Tag color="cyan">Đã nhận</Tag>;
        if (r.trangThaiTL === 0) return <Tag>Chưa nhận</Tag>;
        return <Tag color="default">-</Tag>;
      },
    },
    {
      title: "TT Đúc", key: "trangThaiDuc", width: 100,align: "center",
      render: (_: unknown, r: HRC1_ThongKeRow) => {
        if (r.trangThaiDuc === 1) return <Tag color="blue">Đã xác nhận</Tag>;
        if (r.trangThaiDuc === 0) return <Tag>Chờ</Tag>;
        return <Tag color="default">-</Tag>;
      },
    },
    {
      title: "Chốt", key: "isChot", width: 80, align: "center",
      render: (_: unknown, r: HRC1_ThongKeRow) =>
        r.isChot ? <Tag color="green">Đã chốt</Tag> : <Tag color="default">-</Tag>,
    },
    {
      title: "Trùng mẻ", dataIndex: "isTrungMeThoi", key: "isTrungMeThoi", width: 70, align: "center",
      render: (v: boolean) => v ? <Tag color="red">Trùng</Tag> : null,
    },
    {
      title: "Thử nghiệm", dataIndex: "isThuNghiem", key: "isThuNghiem", width: 70, align: "center",  
      render: (v: boolean) => v ? "✓" : "",
    },
    { title: "Ghi chú", dataIndex: "ghiChuLo", key: "ghiChuLo", width: 160 },
    { title: "Người sửa lò",  dataIndex: "tenCapNhatBoiLo",  key: "tenCapNhatBoiLo",  width: 160 },
    { title: "Người sửa TL", dataIndex: "tenCapNhatBoiTL",  key: "tenCapNhatBoiTL",  width: 160 },
    { title: "Người XN đúc", dataIndex: "tenCapNhatBoiDuc", key: "tenCapNhatBoiDuc", width: 160 },
  ], []);

  // ── Tổng hợp ─────────────────────────────────────────────────────────────
  type SummaryRow = {
    key: string;
    phanLoai: HRC1_TongHopItem | null;
    ca: HRC1_TongHopItem | null;
    kip: HRC1_TongHopItem | null;
    tinhLuyenLenThang: HRC1_TongHopItem | null;
    ducVuong: HRC1_TongHopItem | null;
    ducTam: HRC1_TongHopItem | null;
    nhomPhanLoaiMacThep: HRC1_TongHopItem | null;
    isTotal?: boolean;
  };

  const renderCell = (item: HRC1_TongHopItem | null, isTotal?: boolean) => {
    if (!item) return null;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: isTotal ? 600 : undefined }}>
        <span>{item.label}</span>
        <span>{item.soMe}</span>
      </div>
    );
  };

  const summaryRows = useMemo<SummaryRow[]>(() => {
    if (!tongHopData) return [];
    const { phanLoai, ca, kip, tinhLuyenLenThang, ducVuong, ducTam, nhomPhanLoaiMacThep } = tongHopData;
    const maxLen = Math.max(phanLoai.length, ca.length, kip.length, tinhLuyenLenThang.length, ducVuong.length, ducTam.length, nhomPhanLoaiMacThep.length, 0);
    const rows: SummaryRow[] = Array.from({ length: maxLen }, (_, i) => ({
      key: `s${i}`,
      phanLoai:            phanLoai[i]            ?? null,
      ca:                  ca[i]                  ?? null,
      kip:                 kip[i]                 ?? null,
      tinhLuyenLenThang:   tinhLuyenLenThang[i]   ?? null,
      ducVuong:            ducVuong[i]            ?? null,
      ducTam:              ducTam[i]              ?? null,
      nhomPhanLoaiMacThep: nhomPhanLoaiMacThep[i] ?? null,
    }));
    const sum = (arr: HRC1_TongHopItem[]) => arr.reduce((acc, x) => acc + x.soMe, 0);
    rows.push({
      key: "total", isTotal: true,
      phanLoai:            { label: "Tổng", soMe: sum(phanLoai) },
      ca:                  { label: "Tổng", soMe: sum(ca) },
      kip:                 { label: "Tổng", soMe: sum(kip) },
      tinhLuyenLenThang:   { label: "Tổng", soMe: sum(tinhLuyenLenThang) },
      ducVuong:            { label: "Tổng", soMe: sum(ducVuong) },
      ducTam:              { label: "Tổng", soMe: sum(ducTam) },
      nhomPhanLoaiMacThep: { label: "Tổng", soMe: sum(nhomPhanLoaiMacThep) },
    });
    return rows;
  }, [tongHopData]);

  const summaryColumns = useMemo(() => [
    { title: "Phân loại",           key: "phanLoai",            render: (_: unknown, r: SummaryRow) => renderCell(r.phanLoai, r.isTotal) },
    { title: "Ca",                  key: "ca",                  render: (_: unknown, r: SummaryRow) => renderCell(r.ca, r.isTotal) },
    { title: "Kíp",                 key: "kip",                 render: (_: unknown, r: SummaryRow) => renderCell(r.kip, r.isTotal) },
    { title: "TL / Lên thẳng",     key: "tinhLuyenLenThang",   render: (_: unknown, r: SummaryRow) => renderCell(r.tinhLuyenLenThang, r.isTotal) },
    { title: "Đúc vuông",           key: "ducVuong",            render: (_: unknown, r: SummaryRow) => renderCell(r.ducVuong, r.isTotal) },
    { title: "Đúc tấm",            key: "ducTam",              render: (_: unknown, r: SummaryRow) => renderCell(r.ducTam, r.isTotal) },
    { title: "Nhóm phân loại mác thép", key: "nhomPhanLoaiMacThep", render: (_: unknown, r: SummaryRow) => renderCell(r.nhomPhanLoaiMacThep, r.isTotal) },
  ], [tongHopData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card style={{ marginTop: 12 }}>
      <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
        <Space wrap align="center">
          <Form.Item name="ngaySX" label="Ngày">
            <RangePicker format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="ca" label="Ca">
            <Select allowClear style={{ minWidth: 70 }} placeholder="Ca"
              options={[{ label: "Ngày", value: 1 }, { label: "Đêm", value: 2 }]} />
          </Form.Item>
          <Form.Item name="kip" label="Kíp">
            <Select allowClear style={{ minWidth: 50 }} placeholder="Kíp"
              options={["A","B","C"].map(k => ({ label: `${k}`, value: k }))} />
          </Form.Item>
          <Form.Item name="loSo" label="Lò thổi">
            <Select allowClear style={{ minWidth: 90 }} placeholder="Lò số"
              options={[1,2,3,4,5].map(n => ({ label: `Lò thổi ${n}`, value: n }))} />
          </Form.Item>
          <Form.Item name="tlSo" label="Tinh luyện">
            <Select allowClear style={{ minWidth: 70 }} placeholder="TL số"
              options={[1,2,3,4,5].map(n => ({ label: `TL ${n}`, value: n }))} />
          </Form.Item>
          <Form.Item name="idMayDuc" label="Máy đúc">
            <Select allowClear style={{ minWidth: 120 }} placeholder="Máy đúc" options={mayDucOpts} />
          </Form.Item>
          <Form.Item name="maMe" label="Mẻ">
            <Input placeholder="Mã mẻ" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="thungSo" label="Thùng số">
            <Input placeholder="Thùng số" style={{ width: 80 }} />
          </Form.Item>
          <Form.Item name="phanLoai" label="Phân loại">
            <Select allowClear style={{ minWidth: 80 }} placeholder="Phân loại"
              options={["Loại 1","Loại 2","Loại 3","Phế phẩm"].map(n => ({ label: `${n}`, value: n }))} />
          </Form.Item>
          <Form.Item name="idNhomPhanLoai" label="Nhóm phân loại mác">
            <Select allowClear showSearch style={{ minWidth: 180 }} placeholder="Tất cả"
              optionFilterProp="label" options={nhomMacOpts} />
          </Form.Item>
          <Form.Item name="trangThai" label="Trạng thái">
            <Select allowClear style={{ minWidth: 160 }} placeholder="Tất cả"
              options={[
                { label: "TL: chưa nhận",         value: "tl_0" },
                { label: "TL: đã nhận",           value: "tl_1" },
                { label: "Đúc: chờ xác nhận",    value: "duc_0" },
                { label: "Đúc: đã xác nhận",     value: "duc_1" },
                { label: "Đã chốt",               value: "chot" },
              ]}
            />
          </Form.Item>
          <Form.Item name="isManualTL" valuePropName="checked">
            <Checkbox>Nhập tay</Checkbox>
          </Form.Item>
          <Form.Item name="isTrungMeThoi" valuePropName="checked">
            <Checkbox>Trùng mẻ</Checkbox>
          </Form.Item>
          <Form.Item name="chuaCoNhomPhanLoai" valuePropName="checked">
            <Checkbox>Chưa có nhóm phân loại</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" loading={loading} onClick={() => void handleFilter()}>Tìm</Button>
              <Button onClick={handleReset}>Reset</Button>
              <Button
                style={{ backgroundColor: "#217346", borderColor: "#217346", color: "#fff" }}
                loading={exporting}
                onClick={() => void handleExport()}
              >
                Xuất Excel
              </Button>
              <Tooltip title="Đồng bộ phân loại">
                <Button
                  icon={<SyncOutlined />}
                  loading={syncing}
                  onClick={() => void handleSync()}
                >
                </Button>
              </Tooltip>
            </Space>
          </Form.Item>
        </Space>
      </Form>

      <Table<HRC1_ThongKeRow>
        bordered
        size="small"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(r) => String(r.meId)}
        scroll={{ x: 1800, y: 520 }}
        onRow={(r) => (r.isManualTL ? { style: { backgroundColor: "#fdfce6" } } : {})}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: totalRecords,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ["10","20","50","100"],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} dòng`,
          onChange: (page, pageSize) => void fetchData({ ...filters, page, pageSize }),
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: "#fafafa", fontWeight: 600 }}>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                Tổng dòng: {totalRecords}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={5} colSpan={8} />
              <Table.Summary.Cell index={13} align="right">
                <span style={{ fontWeight: 600, ...(Number(totalKl) < 0 ? { color: "red" } : {}) }}>
                  {fmt(totalKl)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={14} align="right">
                {fmt(totalKlPhanBo)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={15} colSpan={8} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      {tongHopData && summaryRows.length > 0 && (
        <Table<SummaryRow>
          bordered
          size="small"
          columns={summaryColumns}
          dataSource={summaryRows}
          pagination={false}
          rowKey="key"
          style={{ marginTop: 16 }}
          rowClassName={(r) => r.isTotal ? "ant-table-row-selected" : ""}
        />
      )}
    </Card>
  );
};

export default ThongKeBBGNThepLongHRC1;
