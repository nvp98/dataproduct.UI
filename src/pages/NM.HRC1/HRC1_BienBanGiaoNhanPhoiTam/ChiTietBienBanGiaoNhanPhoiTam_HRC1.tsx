/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Input,
  Popconfirm,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  LockOutlined,
  UnlockOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import {
  Hrc1SlabApi,
  type Hrc1SlabItem,
  type Hrc1TongHopGhiChuItem,
} from "../../../services/Hrc1SlabApi";
import {
  getBmQuyenUiFlags,
  hasKhuVucPhu,
  canChotBm,
} from "../../../utils/helpers/checkAdminRole";
import { phieuActionService } from "../../../services/PhieuActionService";
import { DETAIL_HIDDEN_BUTTON_KEYS } from "../../../utils/constants/PhieuActionButtonKeys";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";

const { Title } = Typography;

const MA_BM = BM_CONFIG.HRC1.HRC1_BBGN_PhoiTam as string;
const TT_COLOR: Record<number, string> = { 0: "default", 1: "green" };

const getUserId = (): number => {
  try {
    const info = localStorage.getItem("userinfo");
    if (info) {
      const obj = JSON.parse(info);
      return obj.iD_TaiKhoan ?? obj.ID_TaiKhoan ?? obj.idTaiKhoan ?? 0;
    }
  } catch { /* empty */ }
  return 0;
};



// Tính ca đích khi chuyển phôi
const tinhCaDich = (phieuNgaySX: string, phieuCa: number, huong: "truoc" | "sau") => {
  const ngay = dayjs(phieuNgaySX);
  if (phieuCa === 1) {
    return huong === "truoc"
      ? { ca: 2, ngay: ngay.subtract(1, "day") }
      : { ca: 2, ngay };
  }
  return huong === "truoc"
    ? { ca: 1, ngay }
    : { ca: 1, ngay: ngay.add(1, "day") };
};

// ── Row edit state ──────────────────────────────────────────────────────────
type RowEdit = { ghiChu: string };

const ChiTietBienBanGiaoNhanPhoiTam_HRC1 = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } =
    usePhieuNavigation("phieu_bbgnphoitam_hrc1_id", "/viecdentoi/bbgnphoitam_hrc1");

  // ── Phân quyền ────────────────────────────────────────────────────────────
  const userInfo = useMemo(() => {
    try {
      const s = localStorage.getItem("userinfo");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, []);
  const isDuc = hasKhuVucPhu(userInfo, MA_BM, "Duc");
  const isCan = hasKhuVucPhu(userInfo, MA_BM, "Can");
  const isPKH = canChotBm(userInfo, MA_BM);

  // ── State ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [slabDetails, setSlabDetails] = useState<Hrc1SlabItem[]>([]);
  const [tongHopGhiChu, setTongHopGhiChu] = useState<Hrc1TongHopGhiChuItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [chotLoading, setChotLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  const [chuyenLoading, setChuyenLoading] = useState<"truoc" | "sau" | null>(null);

  // inline edits per slab id
  const [rowEdits, setRowEdits] = useState<Record<number, RowEdit>>({});
  // tonghop ghi chu local edits: key = "macThep|maVatTu"
  const [thGhiChuEdits, setThGhiChuEdits] = useState<Record<string, string>>({});

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadSlabs = useCallback(async () => {
    if (!idphieu) return;
    const [details, ghiChuList] = await Promise.all([
      Hrc1SlabApi.getSlabsByPhieu(idphieu),
      Hrc1SlabApi.getTongHopGhiChu(idphieu),
    ]);
    setSlabDetails(details);
    setTongHopGhiChu(ghiChuList);
    setSelectedRowKeys([]);
    const edits: Record<number, RowEdit> = {};
    details.forEach((s) => { edits[s.id] = { ghiChu: s.ghiChu ?? "" }; });
    setRowEdits(edits);
    const thEdits: Record<string, string> = {};
    ghiChuList.forEach((g) => {
      const key = `${g.macThep ?? ""}|${g.maVatTu ?? ""}`;
      thEdits[key] = g.ghiChu ?? "";
    });
    setThGhiChuEdits(thEdits);
  }, [idphieu]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setSlabDetails([]);
      setTongHopGhiChu([]);
      setSelectedRowKeys([]);
      setRowEdits({});
      setThGhiChuEdits({});
      if (!idphieu) return;

      // Get phiếu detail trước để lấy ngaySX + ca cho sync
      const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
      if (!res) return;
      const phieuData = (res as any)?.data ?? res;
      setData(phieuData);

      // Auto-sync từ TSC khi vào trang
      if (phieuData?.ngaySX && phieuData?.ca) {
        try {
          await Hrc1SlabApi.sync(dayjs(phieuData.ngaySX).format("YYYY-MM-DD"), phieuData.ca);
        } catch { /* bỏ qua lỗi sync tự động */ }
      }

      await loadSlabs();
    } catch (error) {
      console.error("Lỗi tải dữ liệu phiếu:", error);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, safeGetDetail, loadSlabs]);

  const handleSyncData = useCallback(async () => {
    if (!idphieu || !data?.ngaySX || !data?.ca) return;
    try {
      setSyncLoading(true);
      const result = await Hrc1SlabApi.sync(dayjs(data.ngaySX).format("YYYY-MM-DD"), data.ca);
      message.success(`Sync thành công: ${result.rowsUpserted} slab từ TSC`);
      await loadSlabs();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi sync dữ liệu từ TSC");
    } finally {
      setSyncLoading(false);
    }
  }, [idphieu, data, loadSlabs]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Chốt / Hủy chốt ──────────────────────────────────────────────────────
  const handleChotPhieu = async () => {
    if (!idphieu) return;
    try {
      setChotLoading(true);
      await Hrc1SlabApi.chotPhieu(idphieu, getUserId());
      message.success("Đã chốt phiếu thành công");
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi chốt phiếu");
    } finally { setChotLoading(false); }
  };

  const handleHuyChotPhieu = async () => {
    if (!idphieu) return;
    try {
      setChotLoading(true);
      await Hrc1SlabApi.huyChotPhieu(idphieu, getUserId());
      message.success("Đã hủy chốt phiếu");
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi khi hủy chốt phiếu");
    } finally { setChotLoading(false); }
  };

  // ── XN / Hủy XN theo selection ────────────────────────────────────────────
  const selectedRows = useMemo(
    () => slabDetails.filter((r) => selectedRowKeys.includes(r.id)),
    [slabDetails, selectedRowKeys],
  );
  const selectedCount = selectedRowKeys.length;

  // Đúc và Cán đồng cấp (song song, không phụ thuộc lẫn nhau)
  const canXacNhanDuc = selectedCount > 0 && selectedRows.every((r) => r.trangThaiDuc === 0 && r.trangThaiPKH === 0);
  const canHuyDuc     = selectedCount > 0 && selectedRows.every((r) => r.trangThaiDuc === 1 && r.trangThaiPKH === 0);
  const canXacNhanCan = selectedCount > 0 && selectedRows.every((r) => r.trangThaiCan === 0 && r.trangThaiPKH === 0);
  const canHuyCan     = selectedCount > 0 && selectedRows.every((r) => r.trangThaiCan === 1 && r.trangThaiPKH === 0);
  // PKH chỉ chốt được khi cả Đúc và Cán đã xác nhận
  const canChotPKH    = selectedCount > 0 && selectedRows.every((r) => r.trangThaiDuc === 1 && r.trangThaiCan === 1 && r.trangThaiPKH === 0);
  const canHuyChotPKH = selectedCount > 0 && selectedRows.every((r) => r.trangThaiPKH === 1);

  const handleXacNhan = async (loai: "Duc" | "Can" | "PKH") => {
    try {
      setActionLoading(true);
      const ids = selectedRows.map((r) => r.id);
      await Hrc1SlabApi.xacNhan(ids, loai, getUserId());
      message.success(`Xác nhận ${loai} thành công cho ${ids.length} slab`);
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? `Lỗi xác nhận ${loai}`);
    } finally { setActionLoading(false); }
  };

  const handleHuyXacNhan = async (loai: "Duc" | "Can" | "PKH") => {
    try {
      setActionLoading(true);
      const ids = selectedRows.map((r) => r.id);
      await Hrc1SlabApi.huyXacNhan(ids, loai, getUserId());
      message.success(`Hủy xác nhận ${loai} thành công cho ${ids.length} slab`);
      await loadData();
    } catch (err: any) {
      message.error(err?.message ?? `Lỗi hủy xác nhận ${loai}`);
    } finally { setActionLoading(false); }
  };

  const canChuyen = selectedCount > 0 && selectedRows.every((r) => r.trangThaiCan === 0 && r.trangThaiPKH === 0);

  // ── Chuyển phôi bulk (áp dụng cho tất cả slab đã chọn) ───────────────────
  const handleChuyenBulk = useCallback(async (huong: "truoc" | "sau") => {
    if (!idphieu || selectedRows.length === 0) return;
    try {
      setChuyenLoading(huong);
      const ids = selectedRows.map((r) => r.id);
      const result = await Hrc1SlabApi.chuyenPhoi(ids, idphieu, huong, getUserId());
      message.success(`Đã chuyển ${result.affectedRows} slab về ca ${huong === "truoc" ? "trước" : "sau"}`);
      await loadSlabs();
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi chuyển phôi");
    } finally { setChuyenLoading(null); }
  }, [idphieu, selectedRows, loadSlabs]);

  // ── Inline save GhiChu ───────────────────────────────────────────────────
  const saveRowEdit = useCallback(async (id: number) => {
    const edit = rowEdits[id];
    if (!edit) return;
    const original = slabDetails.find((s) => s.id === id);
    if (!original) return;
    const ghiChu = edit.ghiChu || null;
    if (ghiChu === (original.ghiChu ?? null)) return;
    try {
      await Hrc1SlabApi.updateSlab(id, { ghiChu });
      setSlabDetails((prev) => prev.map((s) => s.id === id ? { ...s, ghiChu } : s));
    } catch {
      message.error("Lỗi lưu ghi chú");
    }
  }, [rowEdits, slabDetails]);

  // ── Inline save TongHop GhiChu ────────────────────────────────────────────
  const saveTongHopGhiChu = useCallback(async (macThep: string | null, maVatTu: string | null) => {
    if (!idphieu) return;
    const key = `${macThep ?? ""}|${maVatTu ?? ""}`;
    const ghiChu = thGhiChuEdits[key] ?? null;
    const original = tongHopGhiChu.find((g) => g.macThep === macThep && g.maVatTu === maVatTu);
    if ((ghiChu || null) === (original?.ghiChu ?? null)) return;
    try {
      await Hrc1SlabApi.saveTongHopGhiChu({ idPhieuBBSL: idphieu, macThep, maVatTu, ghiChu: ghiChu || null });
      setTongHopGhiChu((prev) => {
        const idx = prev.findIndex((g) => g.macThep === macThep && g.maVatTu === maVatTu);
        const updated = { macThep, maVatTu, ghiChu: ghiChu || null };
        return idx >= 0 ? prev.map((g, i) => (i === idx ? updated : g)) : [...prev, updated];
      });
    } catch {
      message.error("Lỗi lưu ghi chú tổng hợp");
    }
  }, [idphieu, thGhiChuEdits, tongHopGhiChu]);

  // ── rowSelection ──────────────────────────────────────────────────────────
  const rowSelection: TableRowSelection<Hrc1SlabItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    columnWidth: 32,
  };

  // ── Tab chi tiết columns ──────────────────────────────────────────────────
  const detailColumns = useMemo(() => [
    {
      title: "STT",
      key: "stt",
      width: 40,
      align: "center" as const,
      render: (_: unknown, __: unknown, idx: number) => idx + 1,
    },
    {
      title: "Mã vật tư",
      key: "maVatTu",
      width: 140,
      render: (_: unknown, r: Hrc1SlabItem) => r.maVatTu ?? "-",
    },
    {
      title: "Mác phôi",
      key: "macPhoi",
      width: 300,
      render: (_: unknown, r: Hrc1SlabItem) => r.tenVatTu || r.macThep || "-",
    },
    {
      title: "Số Mẻ",
      dataIndex: "maMe",
      width: 100,
      align: "center" as const,
      render: (v: string) => v ?? "-",
    },
    {
      title: "ID Slab",
      dataIndex: "idSlab",
      width: 130,
      align: "center" as const,
    },
    {
      title: "KL (kg)",
      dataIndex: "khoiLuong",
      width: 100,
      align: "right" as const,
      render: (v: number) =>
        v != null ? Number(v).toLocaleString("vi-VN", { minimumFractionDigits: 2 }) : "-",
    },
    {
      title: "Ghi chú",
      key: "ghiChu",
      width: 200,
      render: (_: unknown, r: Hrc1SlabItem) => (
        <Input
          value={rowEdits[r.id]?.ghiChu ?? ""}
          onChange={(e) => setRowEdits((prev) => ({ ...prev, [r.id]: { ...prev[r.id], ghiChu: e.target.value } }))}
          onBlur={() => void saveRowEdit(r.id)}
          size="small"
          placeholder="Nhập ghi chú..."
          disabled={data?.tinhTrang === 5}
        />
      ),
    },
    ...((isDuc || isCan || isPKH) ? [{
      title: "TT Đúc",
      dataIndex: "trangThaiDuc",
      width: 85,
      align: "center" as const,
      render: (v: number) => <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã XN" : "Chưa"}</Tag>,
    }] : []),
    ...((isCan || isPKH) ? [{
      title: "TT Cán",
      dataIndex: "trangThaiCan",
      width: 85,
      align: "center" as const,
      render: (v: number) => <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã XN" : "Chưa"}</Tag>,
    }] : []),
    ...(isPKH ? [{
      title: "TT PKH",
      dataIndex: "trangThaiPKH",
      width: 85,
      align: "center" as const,
      render: (v: number) => <Tag color={v === 1 ? "blue" : "default"}>{v === 1 ? "Đã chốt" : "Chưa"}</Tag>,
    }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isDuc, isCan, isPKH, rowEdits, saveRowEdit, data?.tinhTrang]);

  // ── Tab tổng hợp rows ─────────────────────────────────────────────────────
  const tongHopRows = useMemo(() => {
    const map = new Map<string, { macThep: string | null; maVatTu: string | null; tenVatTu: string | null; soPhoi: number; tongKL: number }>();
    slabDetails.forEach((r) => {
      const key = `${r.macThep ?? ""}|${r.maVatTu ?? ""}`;
      if (!map.has(key)) {
        map.set(key, { macThep: r.macThep ?? null, maVatTu: r.maVatTu ?? null, tenVatTu: r.tenVatTu ?? null, soPhoi: 0, tongKL: 0 });
      }
      const row = map.get(key)!;
      row.soPhoi += 1;
      row.tongKL += r.khoiLuong ?? 0;
    });
    return Array.from(map.values()).map((r, i) => ({ ...r, stt: i + 1 }));
  }, [slabDetails]);

  const tongHopTotals = useMemo(() => ({
    soPhoi: tongHopRows.reduce((s, r) => s + r.soPhoi, 0),
    tongKL: tongHopRows.reduce((s, r) => s + r.tongKL, 0),
  }), [tongHopRows]);

  // ── Export handlers ───────────────────────────────────────────────────────

  const handleExportChiTietExcel = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("chitiet-excel");
    try {
      await Hrc1SlabApi.exportExcel(idphieu, "chitiet");
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất Excel");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  const handleExportTongHopExcel = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("tonghop-excel");
    try {
      await Hrc1SlabApi.exportExcel(idphieu, "tonghop");
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất Excel");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  const handleExportTongHopPdf = useCallback(async () => {
    if (!idphieu) return;
    setExportLoading("tonghop-pdf");
    try {
      await Hrc1SlabApi.exportPdf(idphieu);
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xuất PDF");
    } finally { setExportLoading(null); }
  }, [idphieu]);

  const tongHopColumns = useMemo(() => [
    { title: "STT", dataIndex: "stt", width: 60, align: "center" as const },
    {
      title: "Sản phẩm x Mác thép",
      key: "sanPham",
      render: (_: unknown, r: { macThep: string | null; maVatTu: string | null; tenVatTu: string | null }) =>
        r.tenVatTu || r.macThep || "-",
    },
    {
      title: "Số phôi",
      dataIndex: "soPhoi",
      width: 100,
      align: "right" as const,
      render: (v: number) => v.toLocaleString("vi-VN"),
    },
    {
      title: "KL Cân (kg)",
      dataIndex: "tongKL",
      width: 200,
      align: "right" as const,
      render: (v: number) => Number(v).toLocaleString("vi-VN", { minimumFractionDigits: 2 }),
    },
    {
      title: "Ghi chú",
      key: "ghiChu",
      width: 260,
      render: (_: unknown, r: { macThep: string | null; maVatTu: string | null }) => {
        const key = `${r.macThep ?? ""}|${r.maVatTu ?? ""}`;
        return (
          <Input
            value={thGhiChuEdits[key] ?? ""}
            onChange={(e) => setThGhiChuEdits((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => void saveTongHopGhiChu(r.macThep, r.maVatTu || null)}
            size="small"
            placeholder="Nhập ghi chú..."
          />
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [thGhiChuEdits, saveTongHopGhiChu]);

  // ── Action buttons phiếu ──────────────────────────────────────────────────
  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const handleActionSuccess = useCallback(async (context?: { newPhieuId?: string }) => {
    if (context?.newPhieuId) {
      navigateToDetail(context.newPhieuId, "/form-bbgnphoitam_hrc1");
      return;
    }
    await loadData();
  }, [loadData, navigateToDetail]);

  const actionButtons = useMemo(() => {
    if (!data || !idphieu) return null;
    const ui = getUserInfo();
    if (getBmQuyenUiFlags(MA_BM, ui).isView) return null;
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu,
      tinhTrang: data.tinhTrang ?? 0,
      isClone: data.isClone ?? false,
      currentUserId: ui.iD_TaiKhoan ?? null,
      currentUserPhongBanId: ui.iD_PhongBan ?? null,
      currentUserTenNgan: ui.tenNgan ?? null,
      nguoiTaoId: data.nguoiTaoId ?? null,
      phieuPhongBanId: data.idphongBan ?? null,
      pheDuyet: data.pheDuyet ?? [],
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
        message.error((error as any)?.message ?? "Không thể thực hiện thao tác");
      },
    });
    const filtered = buttons.filter((btn) => !DETAIL_HIDDEN_BUTTON_KEYS.has(btn.key));
    if (filtered.length === 0) return null;
    return phieuActionService.renderActionButtons(filtered, idphieu);
  }, [data, idphieu, getUserInfo, handleActionSuccess, redirectToList]);

  const chuyenTargets = useMemo(() => {
    if (!data?.ngaySX || !data?.ca) return null;
    const truoc = tinhCaDich(data.ngaySX, data.ca, "truoc");
    const sau   = tinhCaDich(data.ngaySX, data.ca, "sau");
    return {
      truoc: `Ca ${truoc.ca} - ${truoc.ngay.format("DD/MM/YYYY")}`,
      sau:   `Ca ${sau.ca} - ${sau.ngay.format("DD/MM/YYYY")}`,
    };
  }, [data]);

  // ── Info header dùng chung ────────────────────────────────────────────────
  const phieuInfo = (
    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
      <Descriptions.Item label="Số phiếu">{data?.soPhieu || ""}</Descriptions.Item>
      <Descriptions.Item label="Ngày SX">
        {data?.ngaySX ? dayjs(data.ngaySX).format("DD/MM/YYYY") : ""}
      </Descriptions.Item>
      <Descriptions.Item label="Ca sản xuất">
        {data?.ca == 1 ? "Ca ngày" : data?.ca == 2 ? "Ca đêm" : ""}
      </Descriptions.Item>
      <Descriptions.Item label="Kíp">{data?.kip || ""}</Descriptions.Item>
    </Descriptions>
  );

  return (
    <Card bordered style={{ padding: 24, background: "#fff" }} loading={loading}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          Biên Bản Giao Nhận Phôi Tấm HRC1
        </Title>
        {idphieu && <b>Số phiếu: {data?.soPhieu}</b>}
      </div>

      <Tabs
        defaultActiveKey="chitiet"
        type="card"
        style={{ padding: "0 8px" }}
        items={[
          {
            key: "chitiet",
            label: "Biên bản giao nhận phôi tấm",
            children: (
              <>
                {phieuInfo}
                <Card
                  size="small"
                  title={`Danh sách slab (${slabDetails.length})${selectedCount > 0 ? ` — Đã chọn ${selectedCount}` : ""}`}
                  styles={{ body: { padding: "8px 12px" } }}
                  extra={
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        icon={<SyncOutlined />}
                        loading={syncLoading}
                        onClick={() => void handleSyncData()}
                        type="primary"
                        ghost
                        disabled={data?.tinhTrang === 5}
                      >
                        Làm mới dữ liệu
                      </Button>

                      {/* Đúc: chuyển ca + xác nhận Đúc */}
                      {isDuc && (
                        <>
                          <Tooltip title={canChuyen ? `Chuyển ${selectedCount} slab → ${chuyenTargets?.truoc ?? "ca trước"}` : "Chọn slab chưa Cán xác nhận để chuyển"}>
                            <Popconfirm
                              title={`Chuyển ${selectedCount} slab về ${chuyenTargets?.truoc ?? "ca trước"}?`}
                              onConfirm={() => void handleChuyenBulk("truoc")}
                              disabled={!canChuyen}
                            >
                              <Button size="small" icon={<ArrowLeftOutlined />} disabled={!canChuyen} loading={chuyenLoading === "truoc"} />
                            </Popconfirm>
                          </Tooltip>
                          <Tooltip title={canChuyen ? `Chuyển ${selectedCount} slab → ${chuyenTargets?.sau ?? "ca sau"}` : "Chọn slab chưa Cán xác nhận để chuyển"}>
                            <Popconfirm
                              title={`Chuyển ${selectedCount} slab về ${chuyenTargets?.sau ?? "ca sau"}?`}
                              onConfirm={() => void handleChuyenBulk("sau")}
                              disabled={!canChuyen}
                            >
                              <Button size="small" icon={<ArrowRightOutlined />} disabled={!canChuyen} loading={chuyenLoading === "sau"} />
                            </Popconfirm>
                          </Tooltip>
                          <Popconfirm
                            title={`Xác nhận Đúc ${selectedCount} slab?`}
                            onConfirm={() => void handleXacNhan("Duc")}
                            disabled={!canXacNhanDuc}
                          >
                            <Button size="small" icon={<CheckCircleOutlined />} disabled={!canXacNhanDuc} loading={actionLoading} style={{ color: canXacNhanDuc ? "#1890ff" : undefined }}>
                              XN Đúc
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy XN Đúc ${selectedCount} slab?`}
                            onConfirm={() => void handleHuyXacNhan("Duc")}
                            disabled={!canHuyDuc}
                          >
                            <Button size="small" icon={<CloseCircleOutlined />} disabled={!canHuyDuc} loading={actionLoading} danger>
                              Hủy XN Đúc
                            </Button>
                          </Popconfirm>
                        </>
                      )}

                      {/* Cán: xác nhận Cán */}
                      {isCan && (
                        <>
                          <Popconfirm
                            title={`Xác nhận Cán ${selectedCount} slab?`}
                            onConfirm={() => void handleXacNhan("Can")}
                            disabled={!canXacNhanCan}
                          >
                            <Button size="small" icon={<CheckCircleOutlined />} disabled={!canXacNhanCan} loading={actionLoading} style={{ color: canXacNhanCan ? "#52c41a" : undefined }}>
                              XN Cán
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy XN Cán ${selectedCount} slab?`}
                            onConfirm={() => void handleHuyXacNhan("Can")}
                            disabled={!canHuyCan}
                          >
                            <Button size="small" icon={<CloseCircleOutlined />} disabled={!canHuyCan} loading={actionLoading} danger>
                              Hủy XN Cán
                            </Button>
                          </Popconfirm>
                        </>
                      )}

                      {/* PKH: chốt từng dòng (chỉ khi phiếu chưa chốt) */}
                      {isPKH && data?.tinhTrang !== 5 && (
                        <>
                          <Popconfirm
                            title={`Chốt PKH ${selectedCount} slab?`}
                            onConfirm={() => void handleXacNhan("PKH")}
                            disabled={!canChotPKH}
                          >
                            <Button size="small" icon={<LockOutlined />} disabled={!canChotPKH} loading={actionLoading} style={{ color: canChotPKH ? "#722ed1" : undefined }}>
                              Chốt PKH
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy chốt PKH ${selectedCount} slab?`}
                            onConfirm={() => void handleHuyXacNhan("PKH")}
                            disabled={!canHuyChotPKH}
                          >
                            <Button size="small" icon={<UnlockOutlined />} disabled={!canHuyChotPKH} loading={actionLoading} danger>
                              Hủy chốt PKH
                            </Button>
                          </Popconfirm>
                        </>
                      )}

                      <Button
                        size="small"
                        icon={<FileExcelOutlined />}
                        loading={exportLoading === "chitiet-excel"}
                        onClick={() => void handleExportChiTietExcel()}
                        style={{ color: "#217346" }}
                      >
                        Excel
                      </Button>
                    </div>
                  }
                >
                  <Table<Hrc1SlabItem>
                    rowKey="id"
                    rowSelection={rowSelection}
                    size="small"
                    bordered
                    virtual
                    columns={detailColumns}
                    dataSource={slabDetails}
                    pagination={false}
                    scroll={{ x: "max-content", y: 520 }}
                    sticky={{ offsetHeader: 0 }}
                    rowClassName={(r) => r.isChuyenCa ? "row-chuyen-ca" : ""}
                    summary={() => {
                      const totalKL = slabDetails.reduce((s, r) => s + (r.khoiLuong ?? 0), 0);
                      const optColCount = ((isDuc || isCan || isPKH) ? 1 : 0) + ((isCan || isPKH) ? 1 : 0) + (isPKH ? 1 : 0);
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={6} align="center">
                              <strong>Tổng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="right">
                              <strong>{Number(totalKL).toLocaleString("vi-VN", { minimumFractionDigits: 2 })}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={7} colSpan={1 + optColCount} />
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: "tonghop",
            label: "Biên bản xác nhận sản lượng phôi tấm",
            children: (
              <>
                {phieuInfo}
                <div style={{ display: "flex", gap: 8, marginBottom: 8, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    icon={<FileExcelOutlined />}
                    loading={exportLoading === "tonghop-excel"}
                    onClick={() => void handleExportTongHopExcel()}
                    style={{ color: "#217346" }}
                  >
                    Excel
                  </Button>
                  <Button
                    size="small"
                    icon={<FilePdfOutlined />}
                    loading={exportLoading === "tonghop-pdf"}
                    onClick={() => void handleExportTongHopPdf()}
                    danger
                  >
                    PDF
                  </Button>
                </div>
                <Table
                  rowKey={(r) => `${r.macThep ?? ""}|${r.maVatTu ?? ""}`}
                  bordered
                  columns={tongHopColumns}
                  dataSource={tongHopRows}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                  sticky={{ offsetHeader: 0 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={2} align="center">
                          <strong>Tổng</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <strong>{tongHopTotals.soPhoi.toLocaleString("vi-VN")}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <strong>
                            {Number(tongHopTotals.tongKL).toLocaleString("vi-VN", { minimumFractionDigits: 2 })}
                          </strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </>
            ),
          },
        ]}
      />

      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          display: "flex",
          gap: 8,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
          Làm mới
        </Button>
        {isPKH && data?.tinhTrang !== 5 && (
          <Tooltip title="Tự động chốt tất cả dòng chưa chốt và đóng phiếu">
            <Popconfirm
              title="Chốt phiếu? Tất cả slab chưa chốt sẽ được chốt tự động và phiếu sẽ bị khóa."
              onConfirm={handleChotPhieu}
            >
              <Button type="primary" icon={<LockOutlined />} loading={chotLoading}>
                Chốt phiếu
              </Button>
            </Popconfirm>
          </Tooltip>
        )}
        {isPKH && data?.tinhTrang === 5 && (
          <Popconfirm title="Hủy chốt phiếu này?" onConfirm={handleHuyChotPhieu}>
            <Button danger icon={<UnlockOutlined />} loading={chotLoading}>
              Hủy chốt
            </Button>
          </Popconfirm>
        )}
        {actionButtons}
      </div>

      {/* CSS cho row được chuyển ca */}
      <style>{`
        .row-chuyen-ca td {
          background-color: #fff7e6 !important;
        }
        .row-chuyen-ca:hover td {
          background-color: #ffe7ba !important;
        }
      `}</style>
    </Card>
  );
};

export default ChiTietBienBanGiaoNhanPhoiTam_HRC1;
