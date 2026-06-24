/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Checkbox, DatePicker, Input,
  Pagination, Select, Space, Table, Tag, Tooltip, Typography, message,
} from "antd";
import type { TableColumnsType } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { HRC1Api, type HRC1_ChoNhanMeVm } from "../../../../services/HRC1_BBGNApi";

const CA_OPTIONS = [
  { label: "Ca ngày (1)", value: 1 },
  { label: "Ca đêm (2)",  value: 2 },
];

const LO_OPTIONS = Array.from({ length: 5 }, (_, i) => ({ label: `Lò ${i + 1}`, value: i + 1 }));
const PAGE_SIZE = 30;

interface ChoNhanMePanelProps {
  caPhieuId: string;
  readOnly?: boolean;
  onNhanSuccess: () => Promise<void>;
  refreshTrigger?: number;
  scopePhieu?: number | null;  // TL số đang thao tác (dùng để ghi ScopePhieu vào MePhanCong)
  ngayPhieu?: string | null;   // Ngày của phiếu — dùng làm filter mặc định
  caPhieu?: number | null;     // Ca của phiếu — dùng làm filter mặc định
}

const ChoNhanMePanel = ({ caPhieuId, readOnly, onNhanSuccess, refreshTrigger, scopePhieu, ngayPhieu, caPhieu }: ChoNhanMePanelProps) => {
  const [selectedChoNhan, setSelectedChoNhan] = useState<number[]>([]);
  const [nhanBusy, setNhanBusy] = useState(false);

  const [filterTuNgay,  setFilterTuNgay]  = useState<Dayjs | null>(() => ngayPhieu ? dayjs(ngayPhieu) : null);
  const [filterDenNgay, setFilterDenNgay] = useState<Dayjs | null>(() => ngayPhieu ? dayjs(ngayPhieu) : null);
  const [filterCa,      setFilterCa]      = useState<number | null>(() => null);
  const [filterMaMe,    setFilterMaMe]    = useState("");
  const [filterThungSo, setFilterThungSo] = useState("");
  const [filterLoSo,    setFilterLoSo]    = useState<number | null>(null);
  const [showNgayCols, setShowNgayCols] = useState(false);
  const [choNhanItems, setChoNhanItems] = useState<HRC1_ChoNhanMeVm[]>([]);
  const [choNhanTotal, setChoNhanTotal] = useState(0);
  const [choNhanPage, setChoNhanPage] = useState(1);
  const [choNhanLoading, setChoNhanLoading] = useState(false);

  const fetchChoNhan = useCallback(async (
    page:     number,
    tuNgay:   Dayjs | null,
    denNgay:  Dayjs | null,
    ca:       number | null,
    maMe:     string,
    thungSo:  string,
    loSo:     number | null,
  ) => {
    setChoNhanLoading(true);
    try {
      const res = await HRC1Api.getMeChoNhan({
        tuNgay:  tuNgay  ? tuNgay.format("YYYY-MM-DD")  : null,
        denNgay: denNgay ? denNgay.format("YYYY-MM-DD") : null,
        ca:      ca ?? null,
        maMe:    maMe    || null,
        thungSo: thungSo || null,
        loSo:    loSo    ?? null,
        page,
        pageSize: PAGE_SIZE,
      });
      setChoNhanItems(res.items);
      setChoNhanTotal(res.total);
    } catch {
      setChoNhanItems([]);
      setChoNhanTotal(0);
    } finally {
      setChoNhanLoading(false);
    }
  }, []);

  // Tải lần đầu khi panel mount — áp dụng filter mặc định theo ngày/ca của phiếu nếu có
  useEffect(() => {
    const defaultNgay = ngayPhieu ? dayjs(ngayPhieu) : null;
    fetchChoNhan(1, defaultNgay, defaultNgay, caPhieu ?? null, "", "", null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload theo filter hiện tại khi có trigger từ bên ngoài (vd: sau hủy nhận)
  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return;
    fetchChoNhan(choNhanPage, filterTuNgay, filterDenNgay, filterCa, filterMaMe, filterThungSo, filterLoSo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const handleSearch = () => {
    setChoNhanPage(1);
    setSelectedChoNhan([]);
    fetchChoNhan(1, filterTuNgay, filterDenNgay, filterCa, filterMaMe, filterThungSo, filterLoSo);
  };

  const handleNhan = async () => {
    if (selectedChoNhan.length === 0) return;
    setNhanBusy(true);
    const errs: string[] = [];
    for (const meId of selectedChoNhan) {
      try { await HRC1Api.nhanMe(meId, caPhieuId, scopePhieu); }
      catch (e: any) { errs.push(e?.message ?? `Lỗi mẻ ${meId}`); }
    }
    if (errs.length) message.error(errs.join("; "));
    else message.success(`Đã nhận ${selectedChoNhan.length} mẻ`);
    setSelectedChoNhan([]);
    setNhanBusy(false);
    setChoNhanPage(1);
    await onNhanSuccess();
    await fetchChoNhan(1, filterTuNgay, filterDenNgay, filterCa, filterMaMe, filterThungSo, filterLoSo);
  };

  const selectableItems = choNhanItems.filter(
    (r) => !r.trangThaiTL && r.dichChuyen !== "len_thang"
  );

  const columns: TableColumnsType<HRC1_ChoNhanMeVm> = [
    {
      title: readOnly ? "" : (
        <Checkbox
          checked={selectableItems.length > 0 && selectableItems.every((r) => selectedChoNhan.includes(r.meId))}
          indeterminate={selectedChoNhan.length > 0 && !selectableItems.every((r) => selectedChoNhan.includes(r.meId))}
          onChange={(e) => setSelectedChoNhan(e.target.checked ? selectableItems.map((r) => r.meId) : [])}
        />
      ),
      key: "chk", width: 30,
      render: (_, row) => {
        if (readOnly) return null;
        if (row.dichChuyen === "len_thang")
          return (
            <Tooltip title="Mẻ lên thẳng máy đúc, không thể nhận vào tinh luyện">
              <Checkbox disabled />
            </Tooltip>
          );
        if (row.trangThaiTL)
          return <Checkbox disabled />;
        return (
          <Checkbox
            checked={selectedChoNhan.includes(row.meId)}
            onChange={(e) =>
              setSelectedChoNhan((p) =>
                e.target.checked ? [...p, row.meId] : p.filter((id) => id !== row.meId)
              )
            }
          />
        );
      },
    },
    ...(showNgayCols ? [
      {
        title: "Ngày thổi", dataIndex: "ngayTao", width: 85,
        render: (v: string | null | undefined) => v ? dayjs(v).format("DD/MM/YYYY") : "",
      } as const,
      {
        title: "Ngày TL", dataIndex: "ngayNhanTL", width: 85,
        render: (v: string | null | undefined) => v ? dayjs(v).format("DD/MM/YYYY") : "",
      } as const,
    ] : []),
    { title: "Mã mẻ",    dataIndex: "maMe",    width: 85 },
    { title: "Thùng",    dataIndex: "thungSo", width: 38 },
    {
      title: "Đích", key: "dich", width: 70,
      render: (_, row) => {
        if (row.dichChuyen === "len_thang")
          return <Tag color="default">{row.tenMayDuc}</Tag>;
        if (row.tlDichSo)
          return <Tag color="default">TL {row.tlDichSo}</Tag>;
        return "-";
      },
    },
    // { title: "Lò", dataIndex: "loSo", width: 32 },
    {
      title: "TT",
      key: "tt",
      width: 60,
      render: (_, row) =>
        row.dichChuyen === "len_thang" ? (
          <Tag color="orange">Lên thẳng</Tag>
        ) : row.trangThaiTL ? (
          <Tag color="green">Đã nhận</Tag>
        ) : (
          <Tag color="default">Chờ nhận</Tag>
        ),
    },
    { title: "Người nhận", dataIndex: "tenNguoiNhan", width: 90, render: (v) => v ?? "-" },
  ];

  return (
    <Card
      size="small"
      title={
        <Typography.Text type={choNhanTotal > 0 ? "warning" : "secondary"}>
          Mẻ chờ nhận{choNhanTotal > 0 ? ` (${choNhanTotal})` : ""}
        </Typography.Text>
      }
      style={{ borderColor: choNhanTotal > 0 ? "#faad14" : undefined }}
      styles={{ body: { padding: "4px 6px" } }}
      extra={
        !readOnly && (
          <Button
            size="small" type="primary"
            disabled={selectedChoNhan.length === 0} loading={nhanBusy}
            onClick={handleNhan}>
            Nhận{selectedChoNhan.length > 0 ? ` (${selectedChoNhan.length})` : ""}
          </Button>
        )
      }
    >
      <Space size={4} wrap style={{ marginBottom: 8 }}>
        <DatePicker.RangePicker
          size="small" style={{ width: 210 }}
          placeholder={["Từ ngày", "Đến ngày"]}
          format="DD/MM/YYYY"
          value={filterTuNgay && filterDenNgay ? [filterTuNgay, filterDenNgay] : null}
          onChange={(range) => {
            setFilterTuNgay(range?.[0] ?? null);
            setFilterDenNgay(range?.[1] ?? null);
          }}
          allowClear
        />
        <Select
          size="small" style={{ width: 100 }}
          placeholder="Ca" allowClear
          value={filterCa ?? undefined}
          options={CA_OPTIONS}
          onChange={(v) => setFilterCa(v ?? null)}
        />
        <Input
          size="small" style={{ width: 110 }}
          placeholder="Mẻ thổi..."
          allowClear
          value={filterMaMe}
          onChange={(e) => setFilterMaMe(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Input
          size="small" style={{ width: 100 }}
          placeholder="Thùng số..."
          allowClear
          value={filterThungSo}
          onChange={(e) => setFilterThungSo(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Select
          size="small" style={{ width: 70 }}
          placeholder="Lò" allowClear
          value={filterLoSo ?? undefined}
          options={LO_OPTIONS}
          onChange={(v) => setFilterLoSo(v ?? null)}
        />
        <Button size="small" type="primary" loading={choNhanLoading} onClick={handleSearch}>
          Tìm
        </Button>
        <Button size="small" onClick={() => setShowNgayCols((v) => !v)}>
          {showNgayCols ? "Ẩn ngày" : "Hiện ngày"}
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={choNhanItems}
        rowKey="meId"
        size="small"
        pagination={false}
        scroll={{ x: showNgayCols ? 700 : 400, y: "calc(100vh - 310px)" }}
        loading={choNhanLoading}
        locale={{ emptyText: "Chưa có mẻ chờ nhận" }}
      />

      {choNhanTotal > PAGE_SIZE && (
        <Pagination
          size="small"
          style={{ marginTop: 8, textAlign: "right" }}
          current={choNhanPage}
          total={choNhanTotal}
          pageSize={PAGE_SIZE}
          showSizeChanger={false}
          onChange={(p) => {
            setChoNhanPage(p);
            fetchChoNhan(p, filterTuNgay, filterDenNgay, filterCa, filterMaMe, filterThungSo, filterLoSo);
          }}
        />
      )}
    </Card>
  );
};

export default ChoNhanMePanel;
