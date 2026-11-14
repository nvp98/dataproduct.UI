import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Tabs, message } from "antd";
import { SearchOutlined, ReloadOutlined, SyncOutlined, DownloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { KdlApi, KDL_KIEU_DL } from "../../services/KdlApi";
import type { KdlCauTruc, KdlDong, KdlLoc, KdlNhom, KdlSyncLog } from "../../services/KdlApi";
import { KdlBangChiTiet, KdlBangTongHop } from "../../components/KdlBangDong";
import { layCotLa } from "../../utils/kdlCot";

// Trang xem dữ liệu Kho dữ liệu động cho 1 form (KDL_Form). Cột, nhãn chiều, bộ lọc và tab tổng hợp
// đều lấy từ cấu hình CotJson — thêm form mới chỉ cần seed cấu hình + 1 route trỏ về trang này.

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { message?: string })?.message ?? fallback;

const CA_OPTIONS = [
  { value: 1, label: "Ca 1 (ngày)" },
  { value: 2, label: "Ca 2 (đêm)" },
];
const KIP_OPTIONS = ["A", "B", "C", "D"].map((k) => ({ value: k, label: `Kíp ${k}` }));

// Chiều lọc dạng ô nhập: field KDL_DoiTuong → tham số lọc
const CHIEU_LOC: { field: string; param: keyof KdlLoc }[] = [
  { field: "Mac", param: "mac" },
  { field: "MayDuc", param: "mayDuc" },
  { field: "KichThuoc", param: "kichThuoc" },
  { field: "LenhSanXuat", param: "lenhSanXuat" },
];

const defaultLoc = (): KdlLoc => ({
  tuNgay: dayjs().startOf("month").format("YYYY-MM-DD"),
  denNgay: dayjs().format("YYYY-MM-DD"),
});

interface KdlFormProps {
  maForm: string;
}

const KdlForm = ({ maForm }: KdlFormProps) => {
  const [searchForm] = Form.useForm();
  const [nhapTayForm] = Form.useForm();
  const [cauTruc, setCauTruc] = useState<KdlCauTruc | null>(null);
  const [loc, setLoc] = useState<KdlLoc>(defaultLoc);
  const [tab, setTab] = useState("chiTiet");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KdlDong[]>([]);
  const [tong, setTong] = useState<Record<string, number | null>>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const [tongHop, setTongHop] = useState<KdlNhom[]>([]);
  const [tongHopLoading, setTongHopLoading] = useState(false);

  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [lanGanNhat, setLanGanNhat] = useState<KdlSyncLog | null>(null);

  const [dongNhapTay, setDongNhapTay] = useState<KdlDong | null>(null);
  const [nhapTayLoading, setNhapTayLoading] = useState(false);

  // Nhãn chiều lấy theo cột field trong CotJson (vd Mac → "Mác thép")
  const nhanTruong = useMemo(() => {
    const m: Record<string, string> = {};
    if (cauTruc) layCotLa(cauTruc.cot).forEach((c) => c.field && c.label && (m[c.field] = c.label));
    return m;
  }, [cauTruc]);

  const cotNhapTay = useMemo(
    () => (cauTruc ? layCotLa(cauTruc.cot).filter((c) => c.key && c.editable) : []),
    [cauTruc]
  );

  const tabsTongHop = useMemo(() => {
    const ds: { key: string; label: string; nhom: { field: string; label: string }[] }[] = [];
    const co = (f: string) => !!nhanTruong[f];
    const nhan = (f: string, macDinh: string) => nhanTruong[f] ?? macDinh;
    if (co("Kip")) ds.push({ key: "kip", label: "Tổng hợp theo kíp", nhom: [{ field: "Kip", label: nhan("Kip", "Kíp") }] });
    if (co("CaSX"))
      ds.push({
        key: "ca",
        label: "Tổng hợp theo ca",
        nhom: [
          { field: "NgaySX", label: nhan("NgaySX", "Ngày") },
          { field: "CaSX", label: nhan("CaSX", "Ca") },
        ],
      });
    if (co("Mac")) ds.push({ key: "sp", label: `Theo ${nhan("Mac", "sản phẩm").toLowerCase()}`, nhom: [{ field: "Mac", label: nhan("Mac", "Sản phẩm") }] });
    if (co("LenhSanXuat")) ds.push({ key: "lenh", label: `Theo ${nhan("LenhSanXuat", "lệnh")}`, nhom: [{ field: "LenhSanXuat", label: nhan("LenhSanXuat", "Lệnh") }] });
    if (co("MayDuc")) ds.push({ key: "tb", label: `Theo ${nhan("MayDuc", "thiết bị").toLowerCase()}`, nhom: [{ field: "MayDuc", label: nhan("MayDuc", "Thiết bị") }] });
    return ds;
  }, [nhanTruong]);

  const fetchLanGanNhat = async (maModule: string) => {
    try {
      setLanGanNhat(await KdlApi.lanDongBoGanNhat(maModule));
    } catch {
      setLanGanNhat(null);
    }
  };

  const fetchData = async (page = pagination.current, pageSize = pagination.pageSize, applied: KdlLoc = loc) => {
    setLoading(true);
    try {
      const res = await KdlApi.getDuLieu(maForm, { ...applied, page, pageSize });
      setData(res.data);
      setTong(res.tong);
      setPagination({ current: res.page, pageSize: res.pageSize, total: res.totalRecords });
      setLoc(applied);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không thể tải dữ liệu"));
    } finally {
      setLoading(false);
    }
  };

  const fetchTongHop = async (tabKey: string, applied: KdlLoc = loc) => {
    const t = tabsTongHop.find((x) => x.key === tabKey);
    if (!t) return;
    setTongHopLoading(true);
    try {
      setTongHop(await KdlApi.getTongHop(maForm, applied, t.nhom.map((n) => n.field)));
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Không thể tải tổng hợp"));
    } finally {
      setTongHopLoading(false);
    }
  };

  useEffect(() => {
    const f = defaultLoc();
    searchForm.setFieldsValue({ khoangNgay: [dayjs(f.tuNgay), dayjs(f.denNgay)] });
    setTab("chiTiet");
    (async () => {
      try {
        const ct = await KdlApi.getCauTruc(maForm);
        setCauTruc(ct);
        fetchLanGanNhat(ct.maModule);
        fetchData(1, pagination.pageSize, f);
      } catch (error: unknown) {
        message.error(getErrorMessage(error, "Không tải được cấu hình form"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maForm]);

  const readLoc = (): KdlLoc => {
    const v = searchForm.getFieldsValue();
    const [tu, den]: [Dayjs, Dayjs] = v.khoangNgay ?? [dayjs().startOf("month"), dayjs()];
    const kq: KdlLoc = {
      tuNgay: tu.format("YYYY-MM-DD"),
      denNgay: den.format("YYYY-MM-DD"),
      caSX: v.caSX ?? undefined,
      kip: v.kip ?? undefined,
      searchKey: v.searchKey?.trim() || undefined,
    };
    CHIEU_LOC.forEach(({ param }) => {
      const x = (v[param] as string | undefined)?.trim();
      if (x) (kq[param] as string) = x;
    });
    return kq;
  };

  const apDung = (applied: KdlLoc) => {
    fetchData(1, pagination.pageSize, applied);
    if (tab !== "chiTiet") fetchTongHop(tab, applied);
  };

  const handleReset = () => {
    const f = defaultLoc();
    searchForm.resetFields();
    searchForm.setFieldsValue({ khoangNgay: [dayjs(f.tuNgay), dayjs(f.denNgay)] });
    apDung(f);
  };

  const handleDongBo = async () => {
    if (!cauTruc) return;
    const f = readLoc();
    setSyncLoading(true);
    try {
      const log = await KdlApi.dongBo(cauTruc.maModule, { tuNgay: f.tuNgay, denNgay: f.denNgay });
      message.success(`Đồng bộ xong: ${log.soDong} giá trị`);
      if (log.loiChiTiet) message.warning(log.loiChiTiet, 8);
      apDung(f);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Đồng bộ thất bại"));
    } finally {
      setSyncLoading(false);
      fetchLanGanNhat(cauTruc.maModule);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await KdlApi.exportExcel(maForm, readLoc());
    } catch {
      message.error("Không thể xuất Excel");
    } finally {
      setExportLoading(false);
    }
  };

  const moNhapTay = (row: KdlDong) => {
    setDongNhapTay(row);
    nhapTayForm.setFieldsValue(
      Object.fromEntries(cotNhapTay.map((c) => [c.key!, row.thuCong.includes(c.key!) ? row.giaTri[c.key!] : undefined]))
    );
  };

  const luuNhapTay = async () => {
    if (!dongNhapTay) return;
    const v = nhapTayForm.getFieldsValue();
    const payload = Object.fromEntries(cotNhapTay.map((c) => [c.key!, v[c.key!] ?? null]));
    setNhapTayLoading(true);
    try {
      const moi = await KdlApi.nhapTay(maForm, dongNhapTay.idDoiTuong, payload);
      setData((ds) => ds.map((d) => (d.idDoiTuong === moi.idDoiTuong ? moi : d)));
      message.success("Đã lưu");
      setDongNhapTay(null);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, "Lưu thất bại"));
    } finally {
      setNhapTayLoading(false);
    }
  };

  const tabTongHop = tabsTongHop.find((t) => t.key === tab);

  return (
    <div>
      <Card
        title={cauTruc?.tenForm ?? "Kho dữ liệu"}
        extra={
          <Space>
            <Popconfirm
              title="Đồng bộ dữ liệu"
              description="Kéo lại dữ liệu từ các nguồn cho khoảng ngày đang lọc (tối đa 31 ngày). Giá trị nhập tay được giữ nguyên."
              onConfirm={handleDongBo}
              okText="Đồng bộ"
              cancelText="Hủy"
            >
              <Button icon={<SyncOutlined />} loading={syncLoading} disabled={!cauTruc}>
                Đồng bộ
              </Button>
            </Popconfirm>
            <Button icon={<DownloadOutlined />} loading={exportLoading} onClick={handleExport} disabled={!cauTruc}>
              Xuất Excel
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {cauTruc?.canhBao.length ? (
          <Alert style={{ marginBottom: 12 }} type="warning" showIcon message="Cấu hình cột cần kiểm tra" description={cauTruc.canhBao.join(" · ")} />
        ) : null}
        {lanGanNhat && (
          <Alert
            style={{ marginBottom: 16 }}
            showIcon
            type={!lanGanNhat.thanhCong ? "error" : lanGanNhat.loiChiTiet ? "warning" : "success"}
            message={
              <span>
                Đồng bộ gần nhất: {dayjs(lanGanNhat.thoiGianBatDau).format("DD/MM/YYYY HH:mm")} (
                {lanGanNhat.nguonChay === "auto" ? "tự động" : lanGanNhat.nguonChay ?? "-"}) — kỳ{" "}
                {dayjs(lanGanNhat.tuNgay).format("DD/MM")}–{dayjs(lanGanNhat.denNgay).format("DD/MM/YYYY")} —{" "}
                {lanGanNhat.thanhCong ? `${lanGanNhat.soDong} giá trị` : "lỗi"}
                {lanGanNhat.loiChiTiet ? `: ${lanGanNhat.loiChiTiet}` : ""}
              </span>
            }
          />
        )}
        <Form form={searchForm} layout="vertical" onFinish={() => apDung(readLoc())}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item label={nhanTruong.NgaySX ?? "Khoảng ngày"} name="khoangNgay">
                <DatePicker.RangePicker format="DD/MM/YYYY" allowClear={false} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            {nhanTruong.CaSX && (
              <Col xs={12} md={3}>
                <Form.Item label={nhanTruong.CaSX} name="caSX">
                  <Select allowClear placeholder="Tất cả" options={CA_OPTIONS} />
                </Form.Item>
              </Col>
            )}
            {nhanTruong.Kip && (
              <Col xs={12} md={3}>
                <Form.Item label={nhanTruong.Kip} name="kip">
                  <Select allowClear placeholder="Tất cả" options={KIP_OPTIONS} />
                </Form.Item>
              </Col>
            )}
            {CHIEU_LOC.filter((c) => nhanTruong[c.field]).map((c) => (
              <Col xs={12} md={3} key={c.field}>
                <Form.Item label={nhanTruong[c.field]} name={c.param}>
                  <Input allowClear />
                </Form.Item>
              </Col>
            ))}
            <Col xs={12} md={3}>
              <Form.Item label={nhanTruong.Me ?? "Mã"} name="searchKey">
                <Input allowClear placeholder="Tìm…" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  Lọc
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Xóa lọc
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => {
            setTab(k);
            if (k !== "chiTiet") fetchTongHop(k);
          }}
          items={[{ key: "chiTiet", label: "Chi tiết" }, ...tabsTongHop.map((t) => ({ key: t.key, label: t.label }))]}
        />
        {cauTruc && tab === "chiTiet" && (
          <KdlBangChiTiet
            cot={cauTruc.cot}
            keys={cauTruc.keys}
            data={data}
            tong={tong}
            loading={loading}
            onNhapTay={moNhapTay}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100, 200, 500],
              showTotal: (total, range) => `${range[0]}-${range[1]} của ${total}`,
              onChange: (page, pageSize) => fetchData(page, pageSize),
            }}
          />
        )}
        {cauTruc && tabTongHop && (
          <KdlBangTongHop cot={cauTruc.cot} keys={cauTruc.keys} nhom={tabTongHop.nhom} data={tongHop} loading={tongHopLoading} />
        )}
      </Card>

      <Modal
        title={`Nhập tay — ${dongNhapTay?.me ?? ""}`}
        open={!!dongNhapTay}
        onOk={luuNhapTay}
        onCancel={() => setDongNhapTay(null)}
        confirmLoading={nhapTayLoading}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Alert style={{ marginBottom: 12 }} type="info" showIcon message="Để trống = xóa giá trị nhập tay, quay về số tự động." />
        <Form form={nhapTayForm} layout="vertical">
          {cotNhapTay.map((c) => {
            const k = cauTruc?.keys[c.key!];
            const nhan = c.label ?? k?.tenKey ?? c.key;
            return (
              <Form.Item key={c.key!} label={nhan} name={c.key!}>
                {k?.kieuDL === KDL_KIEU_DL.CHUOI ? <Input allowClear /> : <InputNumber style={{ width: "100%" }} />}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
};

export default KdlForm;
