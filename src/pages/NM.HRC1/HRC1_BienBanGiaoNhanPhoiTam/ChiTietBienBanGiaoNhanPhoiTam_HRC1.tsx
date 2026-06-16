/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Card,
  Descriptions,
  Input,
  Popconfirm,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableRowSelection } from "antd/es/table/interface";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
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
import { Hrc1MaVatTuApi } from "../../../services/Hrc1MaVatTuApi";
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

const buildMacPhoi = (r: { chieuDay?: number | null; chieuRong?: number | null; chieuDai?: number | null; macThep?: string | null }) => {
  const kt = [r.chieuDay, r.chieuRong, r.chieuDai].every((v) => v != null)
    ? `${r.chieuDay}x${r.chieuRong}x${r.chieuDai}`
    : null;
  if (!kt && !r.macThep) return "-";
  return ["Phôi tấm", kt ? `${kt}mm` : null, r.macThep].filter(Boolean).join(" ");
};

// ── Row edit state ──────────────────────────────────────────────────────────
type RowEdit = { ghiChu: string; maVatTu: string };

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
  const isKho = hasKhuVucPhu(userInfo, MA_BM, "Kho");
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

  // inline edits per slab id
  const [rowEdits, setRowEdits] = useState<Record<number, RowEdit>>({});
  // tonghop ghi chu local edits: key = "macThep|kichThuoc"
  const [thGhiChuEdits, setThGhiChuEdits] = useState<Record<string, string>>({});

  // MaVatTu autocomplete options
  const [mvtOptions, setMvtOptions] = useState<{ value: string; label: string }[]>([]);
  const mvtSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setSlabDetails([]);
      setTongHopGhiChu([]);
      setSelectedRowKeys([]);
      setRowEdits({});
      setThGhiChuEdits({});
      if (!idphieu) return;
      const [res, details, ghiChuList] = await Promise.all([
        safeGetDetail(() => PhieuApi.getDetail(idphieu)),
        Hrc1SlabApi.getSlabsByPhieu(idphieu),
        Hrc1SlabApi.getTongHopGhiChu(idphieu),
      ]);
      if (!res) return;
      setData((res as any)?.data ?? res);
      setSlabDetails(details);
      setTongHopGhiChu(ghiChuList);

      // Khởi tạo rowEdits từ data hiện có
      const edits: Record<number, RowEdit> = {};
      details.forEach((s) => { edits[s.id] = { ghiChu: s.ghiChu ?? "", maVatTu: s.maVatTu ?? "" }; });
      setRowEdits(edits);

      // Khởi tạo thGhiChuEdits
      const thEdits: Record<string, string> = {};
      ghiChuList.forEach((g) => {
        const key = `${g.macThep ?? ""}|${g.kichThuoc ?? ""}`;
        thEdits[key] = g.ghiChu ?? "";
      });
      setThGhiChuEdits(thEdits);
    } catch (error) {
      console.error("Lỗi tải dữ liệu phiếu:", error);
      message.error("Không thể tải dữ liệu phiếu");
    } finally {
      setLoading(false);
    }
  }, [idphieu, safeGetDetail]);

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

  const canXacNhanDuc = selectedCount > 0 && selectedRows.every((r) => r.trangThaiDuc === 0 && r.trangThaiPKH === 0);
  const canHuyDuc     = selectedCount > 0 && selectedRows.every((r) => r.trangThaiDuc === 1 && r.trangThaiPKH === 0);
  const canXacNhanKho = selectedCount > 0 && selectedRows.every((r) => r.trangThaiKho === 0 && r.trangThaiPKH === 0);
  const canHuyKho     = selectedCount > 0 && selectedRows.every((r) => r.trangThaiKho === 1 && r.trangThaiPKH === 0);

  const handleXacNhan = async (loai: "Duc" | "Kho") => {
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

  const handleHuyXacNhan = async (loai: "Duc" | "Kho") => {
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

  // ── Inline save GhiChu / MaVatTu ─────────────────────────────────────────
  const saveRowEdit = useCallback(async (id: number) => {
    const edit = rowEdits[id];
    if (!edit) return;
    const original = slabDetails.find((s) => s.id === id);
    if (!original) return;
    const ghiChu = edit.ghiChu || null;
    const maVatTu = edit.maVatTu || null;
    if (ghiChu === (original.ghiChu ?? null) && maVatTu === (original.maVatTu ?? null)) return;
    try {
      await Hrc1SlabApi.updateSlab(id, { ghiChu, maVatTu });
      setSlabDetails((prev) => prev.map((s) => s.id === id ? { ...s, ghiChu, maVatTu } : s));
    } catch {
      message.error("Lỗi lưu ghi chú / mã vật tư");
    }
  }, [rowEdits, slabDetails]);

  // MaVatTu autocomplete — load 20 items khi focus, debounce khi gõ
  const fetchMvtOptions = useCallback(async (searchText: string) => {
    try {
      const res = await Hrc1MaVatTuApi.search({ searchKey: searchText || undefined, pageSize: 20 });
      setMvtOptions(res.data.map((x) => ({ value: x.maVatTu, label: x.maVatTu })));
    } catch { /* ignore */ }
  }, []);

  const handleMvtSearch = (searchText: string) => {
    if (mvtSearchTimer.current) clearTimeout(mvtSearchTimer.current);
    mvtSearchTimer.current = setTimeout(() => void fetchMvtOptions(searchText), 250);
  };

  const handleMvtFocus = () => {
    if (mvtOptions.length === 0) void fetchMvtOptions("");
  };

  // ── Inline save TongHop GhiChu ────────────────────────────────────────────
  const saveTongHopGhiChu = useCallback(async (macThep: string | null, kichThuoc: string | null) => {
    if (!idphieu) return;
    const key = `${macThep ?? ""}|${kichThuoc ?? ""}`;
    const ghiChu = thGhiChuEdits[key] ?? null;
    const original = tongHopGhiChu.find((g) => g.macThep === macThep && g.kichThuoc === kichThuoc);
    if ((ghiChu || null) === (original?.ghiChu ?? null)) return;
    try {
      await Hrc1SlabApi.saveTongHopGhiChu({ idPhieuBBSL: idphieu, macThep, kichThuoc, ghiChu: ghiChu || null });
      setTongHopGhiChu((prev) => {
        const idx = prev.findIndex((g) => g.macThep === macThep && g.kichThuoc === kichThuoc);
        const updated = { macThep, kichThuoc, ghiChu: ghiChu || null };
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
      render: (_: unknown, r: Hrc1SlabItem) => (
        <AutoComplete
          value={rowEdits[r.id]?.maVatTu ?? ""}
          options={mvtOptions}
          onFocus={handleMvtFocus}
          onSearch={handleMvtSearch}
          onChange={(val) => setRowEdits((prev) => ({ ...prev, [r.id]: { ...prev[r.id], maVatTu: val } }))}
          onSelect={(val) => {
            setRowEdits((prev) => ({ ...prev, [r.id]: { ...prev[r.id], maVatTu: val } }));
            void saveRowEdit(r.id);
          }}
          onBlur={() => void saveRowEdit(r.id)}
          size="small"
          style={{ width: "100%" }}
          placeholder="Tìm mã vật tư..."
        />
      ),
    },
    {
      title: "Mác phôi",
      key: "macPhoi",
      width: 260,
      render: (_: unknown, r: Hrc1SlabItem) => buildMacPhoi(r),
    },
    {
      title: "Số Mẻ",
      dataIndex: "maMe",
      width: 110,
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
        />
      ),
    },
    ...(isDuc ? [{
      title: "TT Đúc",
      dataIndex: "trangThaiDuc",
      width: 85,
      align: "center" as const,
      render: (v: number) => <Tag color={TT_COLOR[v]}>{v === 1 ? "Đã XN" : "Chưa"}</Tag>,
    }] : []),
    ...(isKho ? [{
      title: "TT Kho",
      dataIndex: "trangThaiKho",
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
  ], [isDuc, isKho, isPKH, rowEdits, mvtOptions, saveRowEdit]);

  // ── Tab tổng hợp rows ─────────────────────────────────────────────────────
  // Group theo (MacThep, KichThuoc) — bỏ MaMe
  const tongHopRows = useMemo(() => {
    const map = new Map<string, { macThep: string | null; kichThuoc: string; soPhoi: number; tongKL: number }>();
    slabDetails.forEach((r) => {
      const kt = [r.chieuDay, r.chieuRong, r.chieuDai].every((v) => v != null)
        ? `${r.chieuDay}x${r.chieuRong}x${r.chieuDai}`
        : "";
      const key = `${r.macThep ?? ""}|${kt}`;
      if (!map.has(key)) {
        map.set(key, { macThep: r.macThep ?? null, kichThuoc: kt, soPhoi: 0, tongKL: 0 });
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
      render: (_: unknown, r: { macThep: string | null; kichThuoc: string }) =>
        ["Phôi tấm", r.kichThuoc ? `${r.kichThuoc}mm` : null, r.macThep].filter(Boolean).join(" ") || "-",
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
      render: (_: unknown, r: { macThep: string | null; kichThuoc: string }) => {
        const key = `${r.macThep ?? ""}|${r.kichThuoc ?? ""}`;
        return (
          <Input
            value={thGhiChuEdits[key] ?? ""}
            onChange={(e) => setThGhiChuEdits((prev) => ({ ...prev, [key]: e.target.value }))}
            onBlur={() => void saveTongHopGhiChu(r.macThep, r.kichThuoc || null)}
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
                        icon={<FileExcelOutlined />}
                        loading={exportLoading === "chitiet-excel"}
                        onClick={() => void handleExportChiTietExcel()}
                        style={{ color: "#217346" }}
                      >
                        Excel
                      </Button>
                      {isDuc && (
                        <>
                          <Popconfirm
                            title={`Xác nhận Đúc ${selectedCount} slab?`}
                            onConfirm={() => void handleXacNhan("Duc")}
                            disabled={!canXacNhanDuc}
                          >
                            <Button
                              size="small"
                              icon={<CheckCircleOutlined />}
                              disabled={!canXacNhanDuc}
                              loading={actionLoading}
                              style={{ color: canXacNhanDuc ? "#1890ff" : undefined }}
                            >
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
                      {isKho && (
                        <>
                          <Popconfirm
                            title={`Xác nhận Kho ${selectedCount} slab?`}
                            onConfirm={() => void handleXacNhan("Kho")}
                            disabled={!canXacNhanKho}
                          >
                            <Button
                              size="small"
                              icon={<CheckCircleOutlined />}
                              disabled={!canXacNhanKho}
                              loading={actionLoading}
                              style={{ color: canXacNhanKho ? "#52c41a" : undefined }}
                            >
                              XN Kho
                            </Button>
                          </Popconfirm>
                          <Popconfirm
                            title={`Hủy XN Kho ${selectedCount} slab?`}
                            onConfirm={() => void handleHuyXacNhan("Kho")}
                            disabled={!canHuyKho}
                          >
                            <Button size="small" icon={<CloseCircleOutlined />} disabled={!canHuyKho} loading={actionLoading} danger>
                              Hủy XN Kho
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  }
                >
                  <Table<Hrc1SlabItem>
                    rowKey="id"
                    rowSelection={rowSelection}
                    size="small"
                    bordered
                    columns={detailColumns}
                    dataSource={slabDetails}
                    pagination={false}
                    scroll={{ x: "max-content", y: 520 }}
                    sticky={{ offsetHeader: 0 }}
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
                  rowKey={(r) => `${r.macThep ?? ""}|${r.kichThuoc ?? ""}`}
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
          <Popconfirm
            title="Chốt phiếu này? Sau khi chốt sẽ không thể chuyển thêm slab vào."
            onConfirm={handleChotPhieu}
          >
            <Button type="primary" icon={<LockOutlined />} loading={chotLoading}>
              Chốt phiếu
            </Button>
          </Popconfirm>
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
    </Card>
  );
};

export default ChiTietBienBanGiaoNhanPhoiTam_HRC1;
