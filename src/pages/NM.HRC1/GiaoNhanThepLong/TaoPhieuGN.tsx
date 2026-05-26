/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Button, Card, Checkbox, Col, Divider, InputNumber,
  Popconfirm, Row, Select, Space, Spin, Tag, TimePicker, Tooltip, Typography, Input, message, Empty,
} from "antd";
import { DeleteOutlined, SyncOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useLocation } from "react-router-dom";
import {
  HRC1Api,
  type HRC1_MeThepVm,
  type HRC1_PhieuDataVm,
  type HRC1_LoThoiUpdateRequest,
  type HRC1_TinhLuyenUpdateRequest,
} from "../../../services/HRC1_BBGNApi";
import MeThepTable from "./components/MeThepTable";
import ChoNhanMePanel from "./components/ChoNhanMePanel";
import { bmQuyenConfig } from "../../../utils/configs/bmQuyenConfig";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";

// ── Helper hiển thị ───────────────────────────────────────────────────────────

const _mayDucScopes = bmQuyenConfig.danhSachBieuMau
  .find((b) => b.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong)?.scope ?? [];

export const getScopeName = (maBm: string, scope: number, tenScope?: string | null): string => {
  if (tenScope) return tenScope;
  if (maBm === BM_CONFIG.HRC1.HRC1_LoThoi)    return `Lò thổi ${scope}`;
  if (maBm === BM_CONFIG.HRC1.HRC1_TinhLuyen) return `Tinh luyện ${scope}`;
  if (maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong)
    return _mayDucScopes.find((s) => s.maKhuVuc === String(scope))?.tenKhuVuc ?? `TSC/Đúc ${scope}`;
  const bmDef = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
  return bmDef?.scope?.find((s) => s.maKhuVuc === String(scope))?.tenKhuVuc ?? `${maBm}-${scope}`;
};

export const getGroupLabel = (maBm: string) =>
  maBm === BM_CONFIG.HRC1.HRC1_LoThoi    ? "Lò thổi"
  : maBm === BM_CONFIG.HRC1.HRC1_TinhLuyen ? "Tinh luyện"
  : "Máy đúc";

const fmtTime = (v: string | null | undefined) => v ?? "";

const tinhTrangTag = (trangThaiDuc: number | null | undefined, isChot: boolean | null | undefined) => {
  if (isChot)            return <Tag color="green">Đã chốt</Tag>;
  if (trangThaiDuc === 1) return <Tag color="blue">Đã xác nhận</Tag>;
  return <Tag color="default">Chờ xử lý</Tag>;
};

// Tính klThepLong tự động
const calcKlThepLong = (dichChuyen: string | null | undefined, kllf: number | null | undefined, klLan1: number | null | undefined, klLan2: number | null | undefined): number | null => {
  if (!klLan2) return null;
  if (dichChuyen === "len_thang" && kllf)  return Math.round((kllf - klLan2) * 100) / 100;
  if (dichChuyen === "tinh_luyen" && klLan1) return Math.round((klLan1 - klLan2) * 100) / 100;
  return null;
};

const getDichDisplay = (me: HRC1_MeThepVm): string => {
  if (me.dichChuyen === "tinh_luyen") return me.tlDichSo ? `TL ${me.tlDichSo}` : "Tinh luyện";
  if (me.dichChuyen === "len_thang")  return me.tenMayDucDich ?? (me.idMayDucDich ? `Máy ${me.idMayDucDich}` : "Lên thẳng");
  return "";
};

const checkDucReady = (me: HRC1_MeThepVm): string[] => {
  const missing: string[] = [];
  if (!me.maMe)                                            missing.push("Mã mẻ");
  if (!me.thungSo)                                         missing.push("Thùng số");
  if (!me.thoiGian)                                        missing.push("Thời gian");
  if (me.kllfSauThep == null)                              missing.push("KL thùng LF sau khi ra thép");
  if (me.dichChuyen === "tinh_luyen" && me.klLan1 == null) missing.push("KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)");
  if (me.klLan2 == null)                                   missing.push("KL bì - Lần 2 (tấn)");
  if (me.klLan3 == null)                                   missing.push("KL bì - Lần 3 (tấn)");
  if (me.klThepLong == null)                               missing.push("KL thép lỏng");
  if (me.dichChuyen === "tinh_luyen" && !me.tlDichSo)      missing.push("Đích TL");
  if (!me.idMayDucDich)                                    missing.push("Máy đúc");
  return missing;
};

// ── Panel Lò thổi ─────────────────────────────────────────────────────────────

export const LoThoiPanel = ({
  phieuData,
  readOnly,
  onReload,
  onDataUpdated,
  onExtraChange,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  onReload: () => Promise<void>;
  onDataUpdated?: (data: HRC1_PhieuDataVm) => void;
  onExtraChange?: (node: ReactNode) => void;
}) => {
  const [edits, setEdits] = useState<Record<number, Partial<HRC1_LoThoiUpdateRequest>>>({});
  const [saving, setSaving] = useState(false);
  const [xoaBusy, setXoaBusy] = useState<Set<number>>(new Set());

  const ghostCount = phieuData.danhSachMe.filter((m) => m.isGhost).length;
  const dirtyCount = Object.keys(edits).length;

  // "Tinh luyện/Lên thẳng" combined Select options
  const dichChuyenOpts = useMemo(() => [
    {
      label: "Tinh luyện",
      options: [1, 2, 3, 4, 5].map((n) => ({ label: `TL ${n}`, value: `TL:${n}` })),
    },
    {
      label: "Lên thẳng",
      options: phieuData.danhSachMayDuc.map((m) => ({ label: m.tenMayDuc, value: `LS:${m.id}` })),
    },
  ], [phieuData.danhSachMayDuc]);

  const getDichEncoded = (me: HRC1_MeThepVm): string | undefined => {
    const e = edits[me.id];
    const dich = (e && "dichChuyen" in e) ? e.dichChuyen : me.dichChuyen;
    const tlSo = (e && "tlDichSo"   in e) ? e.tlDichSo   : me.tlDichSo;
    const mayId = (e && "idMayDucDich" in e) ? e.idMayDucDich : me.idMayDucDich;
    if (dich === "tinh_luyen" && tlSo)  return `TL:${tlSo}`;
    if (dich === "len_thang"  && mayId) return `LS:${mayId}`;
    return undefined;
  };

  const setDich = (meId: number, val: string | undefined) => {
    if (!val) return;
    if (val.startsWith("TL:")) {
      setEdits((p) => ({ ...p, [meId]: { ...p[meId], dichChuyen: "tinh_luyen", tlDichSo: Number(val.slice(3)), idMayDucDich: null } }));
    } else {
      setEdits((p) => ({ ...p, [meId]: { ...p[meId], dichChuyen: "len_thang", tlDichSo: null, idMayDucDich: Number(val.slice(3)) } }));
    }
  };

  const handleSaveAll = async () => {
    const dirty = Object.entries(edits);
    if (dirty.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(dirty.map(([meIdStr, req]) => HRC1Api.updateLoThoi(Number(meIdStr), req)));
      message.success(`Đã lưu ${dirty.length} mẻ`);
      setEdits({});
      await onReload();
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleXoaGhost = async (meId: number) => {
    setXoaBusy((prev) => new Set(prev).add(meId));
    try {
      await HRC1Api.xoaMeGhost(meId);
      message.success("Đã xóa mẻ ghost");
      await onReload();
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xóa mẻ ghost");
    } finally {
      setXoaBusy((prev) => { const s = new Set(prev); s.delete(meId); return s; });
    }
  };

  const saveRef = useRef(handleSaveAll);
  saveRef.current = handleSaveAll;

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        {ghostCount > 0 && (
          <Typography.Text type="warning" style={{ fontSize: 13 }}>
            {ghostCount} mẻ ghost
          </Typography.Text>
        )}
        <Button type="primary" loading={saving} disabled={dirtyCount === 0}
          onClick={() => saveRef.current()}>
          Lưu{dirtyCount > 0 ? ` (${dirtyCount} mẻ)` : ""}
        </Button>
      </Space>
    );
  }, [onExtraChange, readOnly, saving, dirtyCount, ghostCount]);

  const get = (me: HRC1_MeThepVm, f: keyof HRC1_MeThepVm) => {
    const e = edits[me.id];
    return e && f in e ? (e as any)[f] : (me as any)[f];
  };
  const set = (meId: number, f: keyof HRC1_LoThoiUpdateRequest, v: unknown) =>
    setEdits((p) => ({ ...p, [meId]: { ...p[meId], [f]: v } }));

  const buildColumns = (lk: (me: HRC1_MeThepVm) => boolean): TableColumnsType<HRC1_MeThepVm> => [
    { title: "STT",      key: "stt",    width: 40,  fixed: "left", render: (_, __, i) => i + 1 },
    {
      title: "Mẻ thổi", key: "maMe",   width: 85, fixed: "left",
      render: (_, me) => (
        <>
          {me.maMe ?? ""}
          {me.isGhost && <Tag color="warning" style={{ marginLeft: 4 }}>Ghost</Tag>}
        </>
      ),
    },
    {
      title: "Thùng số", key: "thungSo", width: 45,
      render: (_, me) =>
        lk(me) ? (me.thungSo ?? "") : (
          <Input size="small" style={{ width: 40 }}
            value={get(me, "thungSo") ?? ""}
            onChange={(e) => set(me.id, "thungSo", e.target.value || null)} />
        ),
    },
    { title: "Thời gian", dataIndex: "thoiGian", width: 65, render: fmtTime },
    {
      title: "KL thùng LF sau khi ra thép", key: "kllfSauThep", width: 75,
      render: (_, me) =>
        lk(me) ? (me.kllfSauThep ?? "") : (
          <InputNumber size="small" style={{ width: 65 }}
            value={get(me, "kllfSauThep")} onChange={(v) => set(me.id, "kllfSauThep", v)} />
        ),
    },
    { title: "KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)", dataIndex: "klLan1",  width: 75, render: (v) => v ?? "" },
    { title: "KL bì - Lần 2 (tấn)", dataIndex: "klLan2",  width: 75, render: (v) => v ?? "" },
    {
      title: "KL bì - Lần 3 (tấn)", key: "klLan3", width: 75,
      render: (_, me) =>
        lk(me) ? (me.klLan3 ?? "") : (
          <InputNumber size="small" style={{ width: 65 }}
            value={get(me, "klLan3")} onChange={(v) => set(me.id, "klLan3", v)} />
        ),
    },
    {
      title: "KL thép lỏng", key: "klThepLong", width: 80,
      render: (_, me) => {
        const dich = (edits[me.id] && "dichChuyen" in edits[me.id]) ? edits[me.id].dichChuyen : me.dichChuyen;
        const kllf = (edits[me.id] && "kllfSauThep" in edits[me.id]) ? edits[me.id].kllfSauThep as number : me.kllfSauThep;
        const l1 = me.klLan1;
        const l2 = me.klLan2;
        const computed = calcKlThepLong(dich, kllf, l1, l2);
        return computed ?? me.klThepLong ?? "";
      },
    },
    { title: "Ghi chú", dataIndex: "ghiChuLo", width: 90, render: (v) => v ?? "" },
    {
      title: "Tinh luyện/Lên thẳng", key: "dichChuyen", width: 125,
      render: (_, me) => {
        if (lk(me)) return getDichDisplay(me);
        const optsForMe = (me.trangThaiTL ?? 0) >= 1
          ? dichChuyenOpts.slice(0, 1)   // TL đã nhận → chỉ hiện nhóm Tinh luyện (tham khảo)
          : dichChuyenOpts;
        return (
          <Select size="small" style={{ width: 120 }} showSearch optionFilterProp="label"
            value={getDichEncoded(me) ?? undefined}
            options={optsForMe}
            placeholder="Chọn đích..."
            onChange={(v) => setDich(me.id, v)} />
        );
      },
    },
    {
      title: "Thử nghiệm", key: "isThuNghiem", width: 44,
      render: (_, me) => (
        <Checkbox checked={!!get(me, "isThuNghiem")}
          disabled={lk(me)}
          onChange={(e) => set(me.id, "isThuNghiem", e.target.checked)} />
      ),
    },
    { title: "Máy đúc",   dataIndex: "tenMayDucDich", width: 90, render: (v) => v ?? "" },
    { title: "Phân loại", dataIndex: "phanLoai",      width: 80,  render: (v) => v ?? "" },
    { title: "Mác BKMIS", dataIndex: "macThepBKMIS",  width: 90, render: (v) => v ?? "" },
    {
      title: "TL nhận", key: "soTinhLuyenNhan", width: 70,
      render: (_, me) => me.soTinhLuyenNhan ? (
        <Tag color="purple">TL {me.soTinhLuyenNhan}</Tag>
      ) : "-",
    },
    { title: "Người sửa cuối", dataIndex: "tenCapNhatBoi", width: 110, render: (v) => v ?? "-" },
    {
      title: "Tình trạng", key: "tinhTrang", width: 130, fixed: "right",
      render: (_, me) => (
        <Space size={4}>
          {tinhTrangTag(me.trangThaiDuc, me.isChot)}
          {me.isGhost && !readOnly && !me.isChot && (
            <Popconfirm
              title="Xóa mẻ ghost này khỏi phiếu?"
              okText="Xóa" okButtonProps={{ danger: true }} cancelText="Không"
              onConfirm={() => handleXoaGhost(me.id)}>
              <Button
                size="small" type="link" danger
                icon={<DeleteOutlined />}
                loading={xoaBusy.has(me.id)}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const isLocked = (me: HRC1_MeThepVm) => readOnly || !!me.isChot || (me.trangThaiLo ?? 0) >= 1 || !!me.isGhost;
  const columns = buildColumns(isLocked);

  return (
    <MeThepTable
      columns={columns}
      dataSource={phieuData.danhSachMe}
      scrollX={1325}
      onRow={(me) => ({
        style: me.isGhost ? { background: "#fff7e6", opacity: 0.85 } : undefined,
      })}
    />
  );
};

// ── Panel Tinh luyện ──────────────────────────────────────────────────────────

export const TinhLuyenPanel = ({
  phieuData,
  readOnly,
  onReload,
  onExtraChange,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  onReload: () => Promise<void>;
  onExtraChange?: (node: ReactNode) => void;
}) => {
  const [edits, setEdits] = useState<Record<number, Partial<HRC1_TinhLuyenUpdateRequest>>>({});
  const [saving, setSaving] = useState(false);
  const [themDongMeId, setThemDongMeId] = useState<number | null>(null);
  const [addingDong, setAddingDong] = useState(false);
  const [selectedHuyNhan, setSelectedHuyNhan] = useState<number[]>([]);
  const [huyNhanBusy, setHuyNhanBusy] = useState(false);
  const [choNhanRefreshKey, setChoNhanRefreshKey] = useState(0);

  const dirtyCount = Object.keys(edits).length;
  const mayDucOpts = phieuData.danhSachMayDuc.map((m) => ({ label: m.tenMayDuc, value: m.id }));

  // Mẻ đủ điều kiện thêm dòng lần 2+ (đã được nhận, unique)
  const eligibleThemDong = useMemo(() => {
    const seen = new Set<number>();
    return phieuData.danhSachMe
      .filter((m) => (m.trangThaiTL ?? 0) >= 1 && !seen.has(m.id) && !!seen.add(m.id))
      .map((m) => ({ label: m.maMe ?? String(m.id), value: m.id }));
  }, [phieuData.danhSachMe]);

  const get = (me: HRC1_MeThepVm, f: keyof HRC1_TinhLuyenUpdateRequest) => {
    const e = edits[me.mePhanCongId!];
    return e && f in e ? (e as any)[f] : (me as any)[f];
  };
  const set = (pcId: number, f: keyof HRC1_TinhLuyenUpdateRequest, v: unknown) =>
    setEdits((p) => ({ ...p, [pcId]: { ...p[pcId], [f]: v } }));

  const handleSaveAll = async () => {
    const dirty = Object.entries(edits);
    if (dirty.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(dirty.map(([pcIdStr, patch]) => {
        const pcId = Number(pcIdStr);
        const me = phieuData.danhSachMe.find((m) => m.mePhanCongId === pcId);
        const l1 = ("klLan1" in patch ? patch.klLan1 : me?.klLan1) ?? null;
        const l2 = ("klLan2" in patch ? patch.klLan2 : me?.klLan2) ?? null;
        const computed = calcKlThepLong(me?.dichChuyen, me?.kllfSauThep, l1, l2);
        const req: HRC1_TinhLuyenUpdateRequest = {
          thoiGian:     (("thoiGian"     in patch ? patch.thoiGian     : me?.thoiGian)     as string)  ?? null,
          klLan1:       l1,
          klLan2:       l2,
          klThepLong:   computed,
          idMayDucDich: (("idMayDucDich" in patch ? patch.idMayDucDich : me?.idMayDucDich) as number) ?? null,
        };
        return HRC1Api.updateTinhLuyen(pcId, req);
      }));
      message.success(`Đã lưu ${dirty.length} dòng`);
      setEdits({});
      await onReload();
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleThemDong = async () => {
    if (!themDongMeId) return;
    setAddingDong(true);
    try {
      await HRC1Api.themDong(themDongMeId, phieuData.idPhieu);
      message.success("Đã thêm dòng TL");
      setThemDongMeId(null);
      await onReload();
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi thêm dòng");
    } finally {
      setAddingDong(false);
    }
  };

  const handleHuyNhanMe = async () => {
    if (selectedHuyNhan.length === 0) return;
    setHuyNhanBusy(true);
    try {
      await Promise.all(
        selectedHuyNhan.map((meId) => HRC1Api.huyNhanMe(meId, String(phieuData.idPhieu)))
      );
      message.success(`Đã hủy nhận ${selectedHuyNhan.length} mẻ`);
      setSelectedHuyNhan([]);
      await onReload();
      setChoNhanRefreshKey((k) => k + 1);
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi hủy nhận mẻ");
    } finally {
      setHuyNhanBusy(false);
    }
  };

  const isLenThang = (me: HRC1_MeThepVm) => me.dichChuyen === "len_thang";
  const isLocked   = (me: HRC1_MeThepVm) => readOnly || !!me.isChot || (me.trangThaiDuc ?? 0) >= 1;

  // Mẻ đủ điều kiện hủy nhận: đã nhận, đúc chưa XN, chỉ lấy dòng đầu (thuTuTL==null)
  const eligibleHuyNhan = useMemo(() => phieuData.danhSachMe.filter(
    (m) => m.thuTuTL == null && !m.isChot && (m.trangThaiTL ?? 0) >= 1 && (m.trangThaiDuc ?? 0) < 1
  ), [phieuData.danhSachMe]);

  const saveRef2 = useRef(handleSaveAll);
  saveRef2.current = handleSaveAll;
  const huyNhanRef = useRef(handleHuyNhanMe);
  huyNhanRef.current = handleHuyNhanMe;

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        <Button type="primary" loading={saving} disabled={dirtyCount === 0}
          onClick={() => saveRef2.current()}>
          Lưu{dirtyCount > 0 ? ` (${dirtyCount} dòng)` : ""}
        </Button>
        {eligibleHuyNhan.length > 0 && (
          <Popconfirm
            title={`Hủy nhận ${selectedHuyNhan.length} mẻ? Toàn bộ dữ liệu TL đã nhập sẽ bị xóa.`}
            disabled={selectedHuyNhan.length === 0}
            okText="Hủy nhận" okButtonProps={{ danger: true }} cancelText="Không"
            onConfirm={() => huyNhanRef.current()}>
            <Button danger loading={huyNhanBusy} disabled={selectedHuyNhan.length === 0}>
              Hủy nhận ({selectedHuyNhan.length})
            </Button>
          </Popconfirm>
        )}
      </Space>
    );
  }, [onExtraChange, readOnly, saving, dirtyCount, huyNhanBusy, selectedHuyNhan.length, eligibleHuyNhan.length]);

  // Cột bảng TL chính — toàn bộ cột, TL nhập thoiGian/klLan1/klLan2/idMayDucDich
  const mainCols: TableColumnsType<HRC1_MeThepVm> = [
    {
      title: readOnly ? "" : (
        <Checkbox
          checked={eligibleHuyNhan.length > 0 && selectedHuyNhan.length === eligibleHuyNhan.length}
          indeterminate={selectedHuyNhan.length > 0 && selectedHuyNhan.length < eligibleHuyNhan.length}
          onChange={(e) => setSelectedHuyNhan(e.target.checked ? eligibleHuyNhan.map((m) => m.id) : [])}
        />
      ),
      key: "chkHuyNhan", width: 40, fixed: "left",
      render: (_, me) => {
        if (readOnly || me.isChot || me.thuTuTL != null) return null;
        const eligible = (me.trangThaiTL ?? 0) >= 1 && (me.trangThaiDuc ?? 0) < 1;
        if (!eligible) return null;
        return (
          <Checkbox
            checked={selectedHuyNhan.includes(me.id)}
            onChange={(e) => setSelectedHuyNhan((p) => e.target.checked ? [...p, me.id] : p.filter((id) => id !== me.id))}
          />
        );
      },
    },
    { title: "STT",        key: "stt",     width: 40,  fixed: "left", render: (_, __, i) => i + 1 },
    { title: "Mẻ thổi",   dataIndex: "maMe",    width: 90, fixed: "left", render: (v) => v ?? "" },
    { title: "Thùng số",  dataIndex: "thungSo", width: 40, render: (v) => v ?? "" },
    {
      title: "Thời gian", key: "thoiGian", width: 75,
      render: (_, me) => {
        if (isLocked(me)) return fmtTime(me.thoiGian);
        const raw = get(me, "thoiGian") as string | null;
        const timeVal = raw ? dayjs(raw, "HH:mm") : null;
        return (
          <TimePicker
            size="small" format="HH:mm" style={{ width: 70 }}
            value={timeVal?.isValid() ? timeVal : null}
            onChange={(t) => set(me.mePhanCongId!, "thoiGian", t ? t.format("HH:mm") : null)}
          />
        );
      },
    },
    { title: "KL thùng LF sau khi ra thép",   dataIndex: "kllfSauThep", width: 70, render: (v) => v ?? "" },
    {
      title: "KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)", key: "klLan1", width: 75,
      render: (_, me) => {
        if (isLocked(me) || isLenThang(me)) return me.klLan1 ?? "";
        return (
          <InputNumber size="small" style={{ width: 68 }} 
            value={get(me, "klLan1") as number}
            onChange={(v) => set(me.mePhanCongId!, "klLan1", v)} />
        );
      },
    },
    {
      title: "KL bì - Lần 2 (tấn)", key: "klLan2", width: 75,
      render: (_, me) =>
        isLocked(me) ? (me.klLan2 ?? "") : (
          <InputNumber size="small" style={{ width: 68 }}
            value={get(me, "klLan2") as number}
            onChange={(v) => set(me.mePhanCongId!, "klLan2", v)} />
        ),
    },
    { title: "KL bì - Lần 3 (tấn)",  dataIndex: "klLan3", width: 70, render: (v) => v ?? "" },
    {
      title: "KL thép lỏng", key: "klThepLong", width: 80,
      render: (_, me) => {
        const l1 = (edits[me.mePhanCongId!] && "klLan1" in edits[me.mePhanCongId!]) ? edits[me.mePhanCongId!].klLan1 as number : me.klLan1;
        const l2 = (edits[me.mePhanCongId!] && "klLan2" in edits[me.mePhanCongId!]) ? edits[me.mePhanCongId!].klLan2 as number : me.klLan2;
        const computed = calcKlThepLong(me.dichChuyen, me.kllfSauThep, l1, l2);
        return computed ?? me.klThepLong ?? "";
      },
    },
    { title: "Ghi chú",   dataIndex: "ghiChuLo",   width: 80, render: (v) => v ?? "" },
    { title: "Tinh luyện/Lên thẳng", key: "dichDisp",         width: 75, render: (_, me) => getDichDisplay(me) },
    { title: "Thử nghiệm", dataIndex: "isThuNghiem", width: 44,  render: (v) => v ? "✓" : "" },
    {
      title: "Máy đúc", key: "idMayDucDich", width: 110,
      render: (_, me) => {
        if (isLocked(me) || isLenThang(me)) return me.tenMayDucDich ?? "";
        return (
          <Select size="small" style={{ width: 106 }} showSearch optionFilterProp="label"
            value={(get(me, "idMayDucDich") as number) ?? undefined}
            options={mayDucOpts} allowClear
            onChange={(v) => set(me.mePhanCongId!, "idMayDucDich", v ?? null)} />
        );
      },
    },
    { title: "Phân loại", dataIndex: "phanLoai",     width: 70,  render: (v) => v ?? "" },
    { title: "Mác BKMIS", dataIndex: "macThepBKMIS",  width: 80, render: (v) => v ?? "" },
    { title: "Người sửa cuối", dataIndex: "tenCapNhatBoi", width: 150, render: (v) => v ?? "" },
    {
      title: "Tình trạng", key: "tinhTrang", width: 100, fixed: "right",
      render: (_, me) => tinhTrangTag(me.trangThaiDuc, me.isChot),
    },
  ];

  return (
    <Row gutter={16} align="top" style={{ flexWrap: "nowrap" }}>
      {/* Trái: Mẻ chờ nhận */}
      <Col flex="400px" style={{ minWidth: 0 }}>
        <ChoNhanMePanel
          caPhieuId={phieuData.idPhieu}
          readOnly={readOnly}
          onNhanSuccess={onReload}
          refreshTrigger={choNhanRefreshKey}
        />
      </Col>

      {/* Phải: Bảng TL chính + Thêm dòng */}
      <Col flex="auto" style={{ minWidth: 0, overflow: "hidden" }}>
        <MeThepTable
          columns={mainCols}
          dataSource={phieuData.danhSachMe}
          rowKey={(r) => `${r.id}-${r.mePhanCongId}`}
          scrollX={1430}
        />

        {!readOnly && eligibleThemDong.length > 0 && (
          <Space style={{ marginTop: 12 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>Thêm dòng TL lần 2+:</Typography.Text>
            <Select
              size="small" style={{ width: 140 }} showSearch optionFilterProp="label"
              placeholder="Chọn mẻ..." value={themDongMeId ?? undefined}
              options={eligibleThemDong}
              onChange={(v) => setThemDongMeId(v)} />
            <Popconfirm
              title="Thêm dòng TL lần 2+ cho mẻ đã chọn?"
              disabled={!themDongMeId}
              onConfirm={handleThemDong}>
              <Button size="small" loading={addingDong} disabled={!themDongMeId}>+ Thêm dòng</Button>
            </Popconfirm>
          </Space>
        )}
      </Col>
    </Row>
  );
};

// ── Panel Máy đúc ─────────────────────────────────────────────────────────────

export const DucPanel = ({
  phieuData,
  readOnly,
  onReload,
  onExtraChange,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  onReload: () => Promise<void>;
  onExtraChange?: (node: ReactNode) => void;
}) => {
  const [selected, setSelected] = useState<number[]>([]);

  const batchAction = useCallback(async (fn: () => Promise<void>) => {
    if (selected.length === 0) { message.warning("Chưa chọn mẻ nào"); return; }
    try { await fn(); setSelected([]); await onReload(); }
    catch (e: any) { message.error(e?.message ?? "Lỗi thao tác"); }
  }, [selected, onReload]);

  const eligibleMes = useMemo(
    () => phieuData.danhSachMe.filter((m) => !m.isChot && checkDucReady(m).length === 0),
    [phieuData.danhSachMe]
  );

  const batchRef = useRef(batchAction);
  batchRef.current = batchAction;

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        <Popconfirm title={`Xác nhận ${selected.length} mẻ?`}
          disabled={selected.length === 0}
          onConfirm={() => batchRef.current(() => HRC1Api.xacNhanDuc(selected).then(() => message.success("Đã xác nhận")))}>
          <Button type="primary" disabled={selected.length === 0}>
            Xác nhận ({selected.length})
          </Button>
        </Popconfirm>
        <Popconfirm title={`Bỏ xác nhận ${selected.length} mẻ?`}
          disabled={selected.length === 0}
          onConfirm={() => batchRef.current(() => HRC1Api.boXacNhanDuc(selected).then(() => message.success("Đã bỏ XN")))}>
          <Button danger disabled={selected.length === 0}>
            Bỏ xác nhận ({selected.length})
          </Button>
        </Popconfirm>
      </Space>
    );
  }, [onExtraChange, readOnly, selected.length]);

  const columns: TableColumnsType<HRC1_MeThepVm> = [
    {
      title: readOnly ? "" : (
        <Checkbox
          checked={eligibleMes.length > 0 && selected.length === eligibleMes.length}
          indeterminate={selected.length > 0 && selected.length < eligibleMes.length}
          onChange={(e) => setSelected(e.target.checked ? eligibleMes.map((m) => m.id) : [])}
        />
      ),
      key: "chk", width: 40, fixed: "left",
      render: (_, me) => {
        if (readOnly) return null;
        if (me.isChot)
          return (
            <Tooltip title="Mẻ đã chốt, không thể thao tác">
              <Checkbox disabled />
            </Tooltip>
          );
        const missing = checkDucReady(me);
        if (missing.length > 0) {
          return (
            <Tooltip title={`Thiếu: ${missing.join(", ")}`} placement="right">
              <Checkbox disabled />
            </Tooltip>
          );
        }
        return (
          <Checkbox checked={selected.includes(me.id)}
            onChange={(e) => setSelected((p) => e.target.checked ? [...p, me.id] : p.filter((id) => id !== me.id))} />
        );
      },
    },
    { title: "STT",       key: "stt",    width: 40,  fixed: "left", render: (_, __, i) => i + 1 },
    { title: "Mẻ thổi",  dataIndex: "maMe",         width: 80, fixed: "left", render: (v) => v ?? "" },
    { title: "Thùng số", dataIndex: "thungSo",      width: 50, render: (v) => v ?? "" },
    { title: "Thời gian",dataIndex: "thoiGian",     width: 65, render: fmtTime },
    { title: "KL thùng LF sau khi ra thép",    dataIndex: "kllfSauThep",  width: 75,  render: (v) => v ?? "" },
    { title: "KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)", dataIndex: "klLan1",       width: 75,  render: (v) => v ?? "" },
    { title: "KL bì - Lần 2 (tấn)", dataIndex: "klLan2",       width: 75,  render: (v) => v ?? "" },
    { title: "KL bì - Lần 3 (tấn)", dataIndex: "klLan3",       width: 75,  render: (v) => v ?? "" },
    { title: "KL thép lỏng", dataIndex: "klThepLong", width: 80, render: (v) => v ?? "" },
    { title: "Ghi chú",  dataIndex: "ghiChuLo",     width: 90, render: (v) => v ?? "" },
    { title: "Tinh luyện/Lên thẳng", key: "dichDisp",         width: 90, render: (_, me) => getDichDisplay(me) },
    { title: "Thử nghiệm",  dataIndex: "isThuNghiem", width: 50, render: (v) => v ? "✓" : "" },
    { title: "Máy đúc",  dataIndex: "tenMayDucDich", width: 90, render: (v) => v ?? "" },
    { title: "Phân loại",dataIndex: "phanLoai",      width: 80,  render: (v) => v ?? "" },
    { title: "Mác BKMIS",dataIndex: "macThepBKMIS",  width: 90, render: (v) => v ?? "" },
    { title: "Người sửa cuối", dataIndex: "tenCapNhatBoi", width: 110, render: (v) => v ?? "-" },
    {
      title: "Tình trạng", key: "tinhTrang", width: 100, fixed: "right",
      render: (_, me) => tinhTrangTag(me.trangThaiDuc, me.isChot),
    },
  ];

  return (
    <MeThepTable columns={columns} dataSource={phieuData.danhSachMe} scrollX={1370} />
  );
};

// ── Trang chính ───────────────────────────────────────────────────────────────

const SESSION_KEY = "hrc1_bbgn_selected_phieu";

interface TaoPhieuGNProps {
  readOnly?: boolean;
}

const TaoPhieuGN = ({ readOnly = false }: TaoPhieuGNProps) => {
  const location = useLocation();
  const idphieuFromState = (location.state as { idphieu?: string } | null)?.idphieu;

  const [phieuData,  setPhieuData]  = useState<HRC1_PhieuDataVm | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardExtra,  setCardExtra]  = useState<ReactNode>(null);

  // ── Load nội dung 1 phiếu ────────────────────────────────────────────────────
  const loadPhieu = useCallback(async (idPhieu: string) => {
    setLoading(true);
    setCardExtra(null);
    try {
      const data = await HRC1Api.getPhieu(idPhieu);
      setPhieuData(data);
      setSelectedId(idPhieu);
      sessionStorage.setItem(SESSION_KEY, idPhieu);
      return data;
    } catch {
      message.error("Không tải được dữ liệu phiếu");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReload = useCallback(async () => {
    if (selectedId) await loadPhieu(selectedId);
  }, [selectedId, loadPhieu]);

  // Làm mới: lò thổi → sync gang lỏng rồi reload; các công đoạn khác → reload
  const handleRefresh = useCallback(async () => {
    if (phieuData?.congDoan === "lo_thoi") {
      setSyncing(true);
      try {
        const updated = await HRC1Api.syncLoThoi(phieuData.idPhieu);
        setPhieuData(updated);
        message.success(`Đồng bộ thành công — ${updated.danhSachMe.length} mẻ`);
      } catch (e: any) {
        message.error(e?.message ?? "Lỗi đồng bộ mẻ từ gang lỏng");
      } finally {
        setSyncing(false);
      }
    } else {
      await handleReload();
    }
  }, [phieuData?.congDoan, phieuData?.idPhieu, handleReload]);

  // ── Mount: ưu tiên idphieu từ navigation state ────────────────────────────────
  useEffect(() => {
    const resolvedId = idphieuFromState ?? sessionStorage.getItem(SESSION_KEY) ?? null;
    if (resolvedId) loadPhieu(resolvedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idphieuFromState]);

  // ── Tiêu đề phiếu đang xem ──────────────────────────────────────────────────
  const phieuTitle = useMemo(() => {
    if (!phieuData) return null;
    const scopeName = getScopeName(phieuData.maBm ?? "", phieuData.scope ?? 0);
    return `${getGroupLabel(phieuData.maBm ?? "")} — ${scopeName}`;
  }, [phieuData]);

  return (
    <div style={{ padding: "16px 24px" }}>
      <Spin spinning={loading}>
        {phieuData ? (
          <Card
            title={
              <Space split={<Divider type="vertical" />}>
                <Typography.Text strong>{phieuTitle}</Typography.Text>
                <Typography.Text type="secondary">
                  {phieuData.ngaySX ? dayjs(phieuData.ngaySX).format("DD/MM/YYYY") : ""}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {phieuData.ca === 1 ? "Ca ngày" : "Ca đêm"}
                  {phieuData.kip ? ` — Kíp ${phieuData.kip}` : ""}
                </Typography.Text>
                {readOnly && <Tag color="default">Chỉ xem</Tag>}
              </Space>
            }
            extra={
              <Space>
                {cardExtra}
                <Button
                  size="small" icon={<SyncOutlined />}
                  loading={syncing || loading}
                  onClick={handleRefresh}
                >
                  Làm mới
                </Button>
              </Space>
            }
          >
            {phieuData.congDoan === "lo_thoi" && (
              <LoThoiPanel
                phieuData={phieuData}
                readOnly={readOnly}
                onReload={handleReload}
                onDataUpdated={(d) => setPhieuData(d)}
                onExtraChange={setCardExtra}
              />
            )}
            {phieuData.congDoan === "tinh_luyen" && (
              <TinhLuyenPanel
                phieuData={phieuData}
                readOnly={readOnly}
                onReload={handleReload}
                onExtraChange={setCardExtra}
              />
            )}
            {phieuData.congDoan === "duc" && (
              <DucPanel
                phieuData={phieuData}
                readOnly={readOnly}
                onReload={handleReload}
                onExtraChange={setCardExtra}
              />
            )}
          </Card>
        ) : (
          !loading && (
            <Card>
              <Empty description="Không tìm thấy phiếu" />
            </Card>
          )
        )}
      </Spin>
    </div>
  );
};

export default TaoPhieuGN;
