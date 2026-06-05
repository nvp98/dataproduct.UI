/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AutoComplete, Button, Card, Checkbox, Col, Divider, InputNumber, Modal,
  Popconfirm, Row, Select, Space, Spin, Tag, Tooltip, Typography, Input, message, Empty,
} from "antd";
import { DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, FileExcelOutlined, FilePdfOutlined, SyncOutlined } from "@ant-design/icons";
import { PhieuApi } from "../../../services/PhieuApi";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import {
  HRC1Api,
  type HRC1_MeThepVm,
  type HRC1_PhieuDataVm,
  type HRC1_LoThoiUpdateRequest,
  type HRC1_TinhLuyenUpdateRequest,
  type HRC1_TrungMeInfo,
} from "../../../services/HRC1_BBGNApi";
import MeThepTable from "./components/MeThepTable";
import ChoNhanMePanel from "./components/ChoNhanMePanel";
import { bmQuyenConfig } from "../../../utils/configs/bmQuyenConfig";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { BmQuyenXlApi } from "../../../services/BmQuyenXlApi";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";

// ── Helper hiển thị ───────────────────────────────────────────────────────────

const _mayDucScopes = bmQuyenConfig.danhSachBieuMau
  .find((b) => b.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong)?.scope ?? [];

export const getScopeName = (maBm: string, scope: number | null | undefined, tenScope?: string | null): string => {
  if (tenScope) return tenScope;
  if (!scope) {
    if (maBm === BM_CONFIG.HRC1.HRC1_LoThoi)    return "Lò thổi";
    if (maBm === BM_CONFIG.HRC1.HRC1_TinhLuyen) return "Tinh luyện";
    return maBm;
  }
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

// Ghi chú dùng chung cả 3 công đoạn — auto-save khi blur
const GhiChuInput = ({ meId, value, locked }: { meId: number; value?: string | null; locked: boolean }) => {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  if (locked) return <>{value ?? ""}</>;
  return (
    <Input
      size="small"
      style={{ width: 85 }}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={async () => {
        const newVal = local.trim() || null;
        if (newVal === (value ?? null)) return;
        try { await HRC1Api.updateGhiChu(meId, newVal); }
        catch { message.error("Lỗi lưu ghi chú"); setLocal(value ?? ""); }
      }}
    />
  );
};

// AutoComplete chọn mẻ đích để chuyển (Tinh luyện panel)
const ChuyenMeCell = ({
  serverMaMe,
  ownMaMe,
  locked,
  onSet,
}: {
  serverMaMe: string | null;   // maMe của mẻ đích (null = chưa chuyển)
  ownMaMe: string | null;      // maMe của chính dòng này (hiển thị mặc định khi chưa chuyển)
  locked: boolean;
  onSet: (meId: number | null) => void;
}) => {
  const displayDefault = serverMaMe ?? ownMaMe ?? "";
  const [inputVal, setInputVal] = useState(displayDefault);
  const [opts, setOpts] = useState<{ value: string; label: string }[]>([]);
  const prevRef = useRef(displayDefault);

  useEffect(() => {
    const next = serverMaMe ?? ownMaMe ?? "";
    if (prevRef.current !== next) {
      prevRef.current = next;
      setInputVal(next);
      setOpts([]);
    }
  }, [serverMaMe, ownMaMe]);

  if (locked) return <>{displayDefault || "—"}</>;

  return (
    <AutoComplete
      size="small"
      style={{ width: 130 }}
      value={inputVal}
      options={opts}
      allowClear
      placeholder="Tìm mẻ..."
      onSearch={async (q) => {
        setInputVal(q);
        if (!q.trim()) { setOpts([]); return; }
        try {
          const res = await HRC1Api.searchMeThep(q.trim());
          setOpts(res.map((r) => ({ value: String(r.meId), label: r.maMe })));
        } catch { /* ignore */ }
      }}
      onSelect={(val, opt) => {
        onSet(Number(val));
        setInputVal(opt.label as string);
      }}
      onChange={(val) => {
        if (val === undefined || val === null || val === "") {
          setInputVal(ownMaMe ?? "");
          setOpts([]);
          onSet(null);
        }
      }}
    />
  );
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
  if (me.dichChuyen !== "len_thang" && me.klLan1 == null)  missing.push("KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)");
  if (me.klLan2 == null)                                   missing.push("KL bì - Lần 2 (tấn)");
  if (me.klThepLong == null)                               missing.push("KL thép lỏng");
  if (me.dichChuyen !== "len_thang" && !me.isManualTL && !me.tlDichSo) missing.push("Đích TL");
  if (!me.idMayDucDich)                                    missing.push("Máy đúc");
  return missing;
};

// ── Panel Lò thổi ─────────────────────────────────────────────────────────────

export const LoThoiPanel = ({
  phieuData,
  readOnly,
  loSo = null,
  onLoSoChange = () => {},
  allowedLoScopes = [],
  onReload,
  onDataUpdated,
  onExtraChange,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  loSo?: number | null;
  onLoSoChange?: (v: number | null) => void;
  allowedLoScopes?: number[];
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
      setEdits((p) => {
        // Khi chuyển sang tinh_luyen: xóa idMayDucDich, reset thoiGian và klLan2 (chỉ dùng cho len_thang)
        const { idMayDucDich: _removed, ...rest } = p[meId] ?? {};
        return { ...p, [meId]: { ...rest, dichChuyen: "tinh_luyen", tlDichSo: Number(val.slice(3)), thoiGian: null, klLan2: null } };
      });
    } else {
      setEdits((p) => ({ ...p, [meId]: { ...p[meId], dichChuyen: "len_thang", tlDichSo: null, idMayDucDich: Number(val.slice(3)) } }));
    }
  };

  const handleSaveAll = async () => {
    const dirty = Object.entries(edits);
    if (dirty.length === 0) return;

    // Validate: mẻ lên thẳng phải nhập đủ thungSo, thoiGian, kllfSauThep trước khi lưu
    const saveErrors: string[] = [];
    for (const [meIdStr, req] of dirty) {
      const me = phieuData.danhSachMe.find((m) => m.id === Number(meIdStr));
      const dich = ("dichChuyen" in req ? req.dichChuyen : me?.dichChuyen) ?? null;
      if (dich === "len_thang") {
        const thungSo     = ("thungSo"      in req ? req.thungSo      : me?.thungSo)      ?? null;
        const thoiGian    = ("thoiGian"     in req ? req.thoiGian     : me?.thoiGian)     ?? null;
        const kllfSauThep = ("kllfSauThep"  in req ? req.kllfSauThep  : me?.kllfSauThep)  ?? null;
        const missing: string[] = [];
        if (!thungSo)            missing.push("Thùng số");
        if (!thoiGian)           missing.push("Thời gian");
        if (kllfSauThep == null) missing.push("KL thùng LF sau khi ra thép");
        if (missing.length > 0)
          saveErrors.push(`Mẻ ${me?.maMe ?? meIdStr}: ${missing.join(", ")}`);
      }
    }
    if (saveErrors.length > 0) {
      message.error(`Mẻ lên thẳng cần nhập đủ:\n${saveErrors.join("\n")}`);
      return;
    }

    setSaving(true);
    try {
      await Promise.all(dirty.map(([meIdStr, req]) => {
        const meId = Number(meIdStr);
        const me = phieuData.danhSachMe.find((m) => m.id === meId);
        const dich = ("dichChuyen" in req ? req.dichChuyen : me?.dichChuyen) ?? null;
        let finalReq: Partial<HRC1_LoThoiUpdateRequest> = { ...req };
        if (dich === "len_thang") {
          const kllf = ("kllfSauThep" in req ? req.kllfSauThep : me?.kllfSauThep) ?? undefined;
          const l2   = ("klLan2"      in req ? req.klLan2      : me?.klLan2)      ?? undefined;
          const computed = calcKlThepLong(dich, kllf, me?.klLan1 ?? undefined, l2);
          if (computed != null) finalReq = { ...finalReq, klThepLong: computed };
        }
        return HRC1Api.updateLoThoi(meId, finalReq);
      }));
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

  const loScopeOpts = useMemo(() =>
    allowedLoScopes.map((n) => ({ label: `Lò thổi ${n}`, value: n })),
    [allowedLoScopes]
  );

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        <Select
          size="small"
          style={{ width: 120 }}
          placeholder="Chọn lò thổi..."
          value={loSo ?? undefined}
          options={loScopeOpts}
          onChange={(v) => onLoSoChange(v ?? null)}
          allowClear
        />
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
  }, [onExtraChange, readOnly, saving, dirtyCount, ghostCount, loSo, loScopeOpts, onLoSoChange]);

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
      render: (_, me) => {
        const locked = lk(me);
        return (
          <Input size="small" style={{ width: 40 }}
            value={locked ? (me.thungSo ?? "") : (get(me, "thungSo") ?? "")}
            disabled={locked}
            onChange={locked ? undefined : (e) => set(me.id, "thungSo", e.target.value || null)} />
        );
      },
    },
    {
      title: "Thời gian", key: "thoiGian", width: 75,
      render: (_, me) => {
        const effectiveDich = (edits[me.id] && "dichChuyen" in edits[me.id]) ? edits[me.id].dichChuyen : me.dichChuyen;
        const rowLocked = lk(me);
        const disabled = rowLocked || effectiveDich !== "len_thang";
        // Khi row bị lock thật sự → hiện giá trị DB; khi chỉ disabled do dichChuyen → hiện giá trị edit (có thể null sau reset)
        const raw = (rowLocked ? me.thoiGian : get(me, "thoiGian")) as string | null;
        return (
          <input
            type="time"
            style={{ width: 70, fontSize: 13, padding: "0 4px", borderRadius: 4, border: "1px solid #d9d9d9", height: 24, background: disabled ? "#f5f5f5" : undefined, color: disabled ? "rgba(0,0,0,0.25)" : undefined, cursor: disabled ? "not-allowed" : undefined }}
            value={raw ?? ""}
            disabled={disabled}
            onChange={disabled ? undefined : (e) => set(me.id, "thoiGian", e.target.value || null)}
          />
        );
      },
    },
    {
      title: "KL thùng LF sau khi ra thép", key: "kllfSauThep", width: 75,
      render: (_, me) => {
        const locked = lk(me);
        return (
          <InputNumber size="small" style={{ width: 65 }}
            value={locked ? me.kllfSauThep : get(me, "kllfSauThep")}
            disabled={locked}
            onChange={locked ? undefined : (v) => set(me.id, "kllfSauThep", v)} />
        );
      },
    },
    { title: "KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)", dataIndex: "klLan1", width: 75, render: (v) => <InputNumber size="small" style={{ width: 65 }} value={v ?? undefined} disabled /> },
    {
      title: "KL bì - Lần 2 (tấn)", key: "klLan2", width: 75,
      render: (_, me) => {
        const effectiveDich = (edits[me.id] && "dichChuyen" in edits[me.id]) ? edits[me.id].dichChuyen : me.dichChuyen;
        const rowLocked = lk(me);
        const disabled = rowLocked || effectiveDich !== "len_thang";
        return (
          <InputNumber size="small" style={{ width: 65 }}
            value={rowLocked ? me.klLan2 : (get(me, "klLan2") as number | null | undefined)}
            disabled={disabled}
            onChange={disabled ? undefined : (v) => set(me.id, "klLan2", v)} />
        );
      },
    },
    {
      title: "KL bì - Lần 3 (tấn)", key: "klLan3", width: 75,
      render: (_, me) => {
        const klLan3Locked = readOnly || !!me.isChot;
        return (
          <InputNumber size="small" style={{ width: 65 }}
            value={klLan3Locked ? me.klLan3 : get(me, "klLan3")}
            disabled={klLan3Locked}
            onChange={klLan3Locked ? undefined : (v) => set(me.id, "klLan3", v)} />
        );
      },
    },
    {
      title: "KL thép lỏng", key: "klThepLong", width: 80,
      render: (_, me) => {
        const computed = calcKlThepLong(me.dichChuyen, me.kllfSauThep, me.klLan1, me.klLan2);
        return <InputNumber size="small" style={{ width: 73, fontWeight: 600 }} value={computed ?? me.klThepLong ?? undefined} disabled />;
      },
    },
    {
      title: "KL phân bổ", key: "klThepLongPhanBo", width: 80,
      render: (_, me) => {
        const locked = lk(me);
        return (
          <InputNumber size="small" style={{ width: 73 }}
            value={locked ? (me.klThepLongPhanBo ?? undefined) : (get(me, "klThepLongPhanBo") as number ?? undefined)}
            disabled={locked}
            onChange={locked ? undefined : (v) => set(me.id, "klThepLongPhanBo", v)} />
        );
      },
    },
    {
      title: "Ghi chú", key: "ghiChuLo", width: 90,
      render: (_, me) => <GhiChuInput meId={me.id} value={me.ghiChuLo} locked={isLocked(me)} />,
    },
    {
      title: "Tinh luyện/Lên thẳng", key: "dichChuyen", width: 125,
      render: (_, me) => {
        if (lk(me)) {
          return (
            <Select size="small" style={{ width: 125 }}
              value={getDichEncoded(me) ?? undefined}
              options={dichChuyenOpts}
              disabled />
          );
        }
        const optsForMe = (me.trangThaiTL ?? 0) >= 1
          ? dichChuyenOpts.slice(0, 1)   // TL đã nhận → chỉ hiện nhóm Tinh luyện (tham khảo)
          : dichChuyenOpts;
        return (
          <Select size="small" style={{ width: 125 }} showSearch optionFilterProp="label"
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
    { title: "Máy đúc",   dataIndex: "tenMayDucDich", width: 90, render: (v) => <Input size="small" style={{ width: 84 }} value={v ?? ""} disabled /> },
    { title: "Phân loại", dataIndex: "phanLoai",      width: 80, render: (v) => <Input size="small" style={{ width: 74 }} value={v ?? ""} disabled /> },
    { title: "Mác BKMIS", dataIndex: "macThepBKMIS",  width: 110, render: (v) => <Input size="small" style={{ width: 110 }} value={v ?? ""} disabled /> },
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

  // Merge edits vào từng row để rc-table nhận biết thay đổi và re-render cell klThepLong
  const displayData = useMemo(
    () => phieuData.danhSachMe.map((me) =>
      edits[me.id] ? ({ ...me, ...edits[me.id] } as HRC1_MeThepVm) : me
    ),
    [phieuData.danhSachMe, edits]
  );

  if (!readOnly && !loSo) return (
    <Empty description="Chọn lò thổi để xem và nhập dữ liệu" style={{ padding: "40px 0" }} />
  );

  return (
    <MeThepTable
      columns={columns}
      dataSource={displayData}
      scrollX={1325}
      scrollY="calc(100vh - 190px)"
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
  tlSo = null,
  onTlSoChange = () => {},
  allowedTLScopes = [],
  onReload,
  onExtraChange,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  tlSo?: number | null;
  onTlSoChange?: (v: number | null) => void;
  allowedTLScopes?: number[];
  onReload: () => Promise<void>;
  onExtraChange?: (node: ReactNode) => void;
}) => {
  const [edits, setEdits] = useState<Record<number, Partial<HRC1_TinhLuyenUpdateRequest>>>({});
  const [saving, setSaving] = useState(false);
  const [selectedHuyNhan, setSelectedHuyNhan] = useState<number[]>([]);
  const [huyNhanBusy, setHuyNhanBusy] = useState(false);
  const [choNhanRefreshKey, setChoNhanRefreshKey] = useState(0);
  const [showChuyenMeCols, setShowChuyenMeCols] = useState(false);

  // Thêm mẻ tay
  const [showThemMeTay, setShowThemMeTay] = useState(false);
  const [themMeTaySearch, setThemMeTaySearch] = useState("");
  const [themMeTayMaMe, setThemMeTayMaMe] = useState<string | null>(null);
  const [themMeTayOptions, setThemMeTayOptions] = useState<{ value: string; label: string }[]>([]);
  const [themMeTayBusy, setThemMeTayBusy] = useState(false);
  const [xoaMeTayBusy, setXoaMeTayBusy] = useState<Set<number>>(new Set());

  const dirtyCount = Object.keys(edits).length;
  const mayDucOpts = phieuData.danhSachMayDuc.map((m) => ({ label: m.tenMayDuc, value: m.id }));

  const get = (me: HRC1_MeThepVm, f: keyof HRC1_TinhLuyenUpdateRequest) => {
    const e = edits[me.id];
    return e && f in e ? (e as any)[f] : (me as any)[f];
  };
  const set = (meId: number, f: keyof HRC1_TinhLuyenUpdateRequest, v: unknown) =>
    setEdits((p) => ({ ...p, [meId]: { ...p[meId], [f]: v } }));

  const handleSaveAll = async () => {
    const dirty = Object.entries(edits);
    if (dirty.length === 0) return;
    setSaving(true);
    try {
      type SaveItem = { pcId: number; maMe: string; req: HRC1_TinhLuyenUpdateRequest };

      const items: SaveItem[] = dirty.map(([meIdStr, patch]) => {
        const meId = Number(meIdStr);
        const me = phieuData.danhSachMe.find((m) => m.id === meId);
        const pcId = me?.mePhanCongId ?? -1;
        const l1 = ("klLan1" in patch ? patch.klLan1 : me?.klLan1) ?? null;
        const l2 = ("klLan2" in patch ? patch.klLan2 : me?.klLan2) ?? null;
        const computed = calcKlThepLong(me?.dichChuyen ?? "tinh_luyen", me?.kllfSauThep, l1, l2);
        return {
          pcId,
          maMe: me?.maMe ?? `#${meId}`,
          req: {
            thoiGian:     (("thoiGian"     in patch ? patch.thoiGian     : me?.thoiGian)     as string)  ?? null,
            klLan1:       l1,
            klLan2:       l2,
            klThepLong:   computed,
            idMayDucDich: (("idMayDucDich" in patch ? patch.idMayDucDich : me?.idMayDucDich) as number) ?? null,
            chuyenVeMeId: (("chuyenVeMeId" in patch ? patch.chuyenVeMeId : (me?.chuyenVeMeId ?? me?.id)) as number | null | undefined) ?? me?.id ?? null,
            // Chỉ gửi khi isManualTL — các field thường do LoThoi nhập
            ...(me?.isManualTL ? {
              thungSo:     (("thungSo"     in patch ? patch.thungSo     : me?.thungSo)     as string | null) ?? null,
              kllfSauThep: (("kllfSauThep" in patch ? patch.kllfSauThep : me?.kllfSauThep) as number | null) ?? null,
              klLan3:      (("klLan3"      in patch ? patch.klLan3      : me?.klLan3)      as number | null) ?? null,
            } : {}),
          },
        };
      });

      const results = await Promise.allSettled(
        items.map((item) => HRC1Api.updateTinhLuyen(item.pcId, item.req))
      );

      const succeededMeIds: number[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const me = phieuData.danhSachMe.find((m) => m.mePhanCongId === items[i].pcId);
          if (me) succeededMeIds.push(me.id);
        } else {
          const raw = r.reason;
          const errMsg = typeof raw === "string" ? raw : (raw?.message ?? "Lỗi lưu dữ liệu");
          message.error(`Mẻ ${items[i].maMe}: ${errMsg}`, 6);
        }
      });

      if (succeededMeIds.length > 0) {
        setEdits((prev) => {
          const next = { ...prev };
          succeededMeIds.forEach((id) => delete next[id]);
          return next;
        });
        message.success(`Đã lưu ${succeededMeIds.length}/${items.length} dòng`);
        await onReload();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleHuyNhanMe = async () => {
    if (selectedHuyNhan.length === 0) return;
    setHuyNhanBusy(true);
    try {
      await Promise.all(
        selectedHuyNhan.map((meId) => HRC1Api.huyNhanMe(meId, String(phieuData.idPhieu), tlSo))
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

  const resetThemMeTay = () => {
    setShowThemMeTay(false);
    setThemMeTaySearch("");
    setThemMeTayMaMe(null);
    setThemMeTayOptions([]);
  };

  const handleSearchMeTay = async (q: string) => {
    setThemMeTaySearch(q);
    setThemMeTayMaMe(null);
    if (q.trim().length < 1) { setThemMeTayOptions([]); return; }
    try {
      const results = await HRC1Api.searchMeThep(q.trim());
      setThemMeTayOptions(results.map((m) => ({
        value: m.maMe,
        label: m.thungSo ? `${m.maMe} — ${m.thungSo}` : m.maMe,
      })));
    } catch { /* ignore search errors */ }
  };

  const handleThemMeTay = async () => {
    if (!themMeTayMaMe) return;
    const maMe = themMeTayMaMe;
    setThemMeTayBusy(true);
    try {
      const result = await HRC1Api.themMeTay({ maMe, idPhieu: String(phieuData.idPhieu), xacNhanTrung: false, scopePhieu: tlSo });
      if (result.daThemVao) {
        message.success("Đã thêm dòng mẻ");
        resetThemMeTay();
        await onReload();
        return;
      }
      if (result.trungVoi.length > 0) {
        Modal.confirm({
          title: `Mẻ "${maMe}" đã được nhận`,
          content: (
            <div>
              <p>Mẻ này đã được nhận tại:</p>
              <ul style={{ paddingLeft: 20 }}>
                {result.trungVoi.map((t: HRC1_TrungMeInfo, i: number) => (
                  <li key={i}><b>{t.tenTinhLuyen}</b> — Phiếu {t.soPhieu}</li>
                ))}
              </ul>
              <p>Tiếp tục thêm và đánh dấu trùng?</p>
            </div>
          ),
          okText: "Xác nhận thêm",
          okButtonProps: { danger: true },
          cancelText: "Hủy",
          onOk: async () => {
            await HRC1Api.themMeTay({ maMe, idPhieu: String(phieuData.idPhieu), xacNhanTrung: true, scopePhieu: tlSo });
            message.success("Đã thêm mẻ (đã đánh dấu trùng)");
            resetThemMeTay();
            await onReload();
          },
        });
      }
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi thêm mẻ");
    } finally {
      setThemMeTayBusy(false);
    }
  };

  const handleXoaMeTay = async (mePhanCongId: number) => {
    setXoaMeTayBusy((prev) => new Set(prev).add(mePhanCongId));
    try {
      await HRC1Api.xoaMeTay(mePhanCongId);
      message.success("Đã xóa dòng mẻ");
      await onReload();
      setChoNhanRefreshKey((k) => k + 1);
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi xóa mẻ");
    } finally {
      setXoaMeTayBusy((prev) => { const s = new Set(prev); s.delete(mePhanCongId); return s; });
    }
  };

  const isLenThang = (me: HRC1_MeThepVm) => me.dichChuyen === "len_thang";
  const isLocked   = (me: HRC1_MeThepVm) => readOnly || !!me.isChot || (me.trangThaiDuc ?? 0) >= 1;

  // Mẻ đủ điều kiện hủy nhận: đã nhận tự động (không phải thêm tay), đúc chưa XN, dòng đầu
  const eligibleHuyNhan = useMemo(() => phieuData.danhSachMe.filter(
    (m) => m.thuTuTL == null && !m.isChot && !m.isManualTL && (m.trangThaiTL ?? 0) >= 1 && (m.trangThaiDuc ?? 0) < 1
  ), [phieuData.danhSachMe]);

  const saveRef2 = useRef(handleSaveAll);
  saveRef2.current = handleSaveAll;
  const huyNhanRef = useRef(handleHuyNhanMe);
  huyNhanRef.current = handleHuyNhanMe;

  const tlScopeOpts = useMemo(() =>
    allowedTLScopes.map((n) => ({ label: `Tinh luyện ${n}`, value: n })),
    [allowedTLScopes]
  );

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        <Select
          size="small"
          style={{ width: 130 }}
          placeholder="Chọn tinh luyện..."
          value={tlSo ?? undefined}
          options={tlScopeOpts}
          onChange={(v) => onTlSoChange(v ?? null)}
          allowClear
        />
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
  }, [onExtraChange, readOnly, saving, dirtyCount, huyNhanBusy, selectedHuyNhan.length, eligibleHuyNhan.length, tlSo, tlScopeOpts, onTlSoChange]);

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
        if (readOnly || me.isChot || me.thuTuTL != null || me.isManualTL) return null;
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
    {
      title: "Thùng số", key: "thungSo", width: 40,
      render: (_, me) => {
        const editable = !!me.isManualTL && !isLocked(me);
        return (
          <Input size="small" style={{ width: 34 }}
            value={editable ? ((get(me, "thungSo") as string) ?? "") : (me.thungSo ?? "")}
            disabled={!editable}
            onChange={editable ? (e) => set(me.id, "thungSo", e.target.value || null) : undefined} />
        );
      },
    },
    {
      title: "Thời gian", key: "thoiGian", width: 98,
      render: (_, me) => {
        const locked = isLocked(me);
        const raw = (locked ? me.thoiGian : get(me, "thoiGian")) as string | null;
        return (
          <input
            type="time"
            style={{ width: 95, fontSize: 13, padding: "0 4px", borderRadius: 4, border: "1px solid #d9d9d9", height: 24, background: locked ? "#f5f5f5" : undefined, color: locked ? "rgba(0,0,0,0.25)" : undefined, cursor: locked ? "not-allowed" : undefined }}
            value={raw ?? ""}
            disabled={locked}
            onChange={locked ? undefined : (e) => set(me.id, "thoiGian", e.target.value || null)}
          />
        );
      },
    },
    {
      title: "KL thùng LF sau khi ra thép", key: "kllfSauThep", width: 70,
      render: (_, me) => {
        const editable = !!me.isManualTL && !isLocked(me);
        return (
          <InputNumber size="small" style={{ width: 64 }}
            value={editable ? (get(me, "kllfSauThep") as number) : (me.kllfSauThep ?? undefined)}
            disabled={!editable}
            onChange={editable ? (v) => set(me.id, "kllfSauThep", v) : undefined} />
        );
      },
    },
    {
      title: "KL thùng&thép lỏng vào bệ xoay - Lần 1 (tấn)", key: "klLan1", width: 75,
      render: (_, me) => {
        const disabled = isLocked(me) || isLenThang(me);
        return (
          <InputNumber size="small" style={{ width: 68 }}
            value={disabled ? me.klLan1 : (get(me, "klLan1") as number)}
            disabled={disabled}
            onChange={disabled ? undefined : (v) => set(me.id, "klLan1", v)} />
        );
      },
    },
    {
      title: "KL bì - Lần 2 (tấn)", key: "klLan2", width: 75,
      render: (_, me) => {
        const locked = isLocked(me);
        return (
          <InputNumber size="small" style={{ width: 68 }}
            value={locked ? me.klLan2 : (get(me, "klLan2") as number)}
            disabled={locked}
            onChange={locked ? undefined : (v) => set(me.id, "klLan2", v)} />
        );
      },
    },
    {
      title: "KL bì - Lần 3 (tấn)", key: "klLan3", width: 70,
      render: (_, me) => {
        const editable = !!me.isManualTL && !isLocked(me);
        return (
          <InputNumber size="small" style={{ width: 64 }}
            value={editable ? (get(me, "klLan3") as number) : (me.klLan3 ?? undefined)}
            disabled={!editable}
            onChange={editable ? (v) => set(me.id, "klLan3", v) : undefined} />
        );
      },
    },
    {
      title: "KL thép lỏng", key: "klThepLong", width: 80,
      render: (_, me) => {
        // dichChuyen null ở TinhLuyen → mặc định dùng công thức tinh_luyen: klLan1 - klLan2
        const computed = calcKlThepLong(me.dichChuyen ?? "tinh_luyen", me.kllfSauThep, me.klLan1, me.klLan2);
        return <InputNumber size="small" style={{ width: 73, fontWeight: 600 }} value={computed ?? me.klThepLong ?? undefined} disabled />;
      },
    },
    {
      title: "Ghi chú", key: "ghiChuLo", width: 90,
      render: (_, me) => <GhiChuInput meId={me.id} value={me.ghiChuLo} locked={readOnly || !!me.isChot} />,
    },
    { title: "Thử nghiệm", dataIndex: "isThuNghiem", width: 44, render: (v) => <Checkbox checked={!!v} disabled /> },
    {
      title: "Máy đúc", key: "idMayDucDich", width: 125,
      render: (_, me) => {
        const disabled = isLocked(me) || isLenThang(me);
        return (
          <Select size="small" style={{ width: 120 }} showSearch optionFilterProp="label"
            value={disabled ? (me.idMayDucDich ?? undefined) : ((get(me, "idMayDucDich") as number) ?? undefined)}
            options={mayDucOpts}
            allowClear={!disabled}
            disabled={disabled}
            onChange={disabled ? undefined : (v) => set(me.id, "idMayDucDich", v ?? null)} />
        );
      },
    },
    ...(showChuyenMeCols ? [
      {
        title: "Chuyển mẻ", key: "chuyenVeMeId", width: 150,
        onCell: (me: HRC1_MeThepVm) => {
          const editedVal = edits[me.id]?.chuyenVeMeId;
          const effectiveId = editedVal !== undefined ? editedVal : me.chuyenVeMeId;
          return effectiveId != null && effectiveId !== me.id ? { style: { background: "#fffbe6" } } : {};
        },
        render: (_: unknown, me: HRC1_MeThepVm) => (
          <ChuyenMeCell
            serverMaMe={me.chuyenVeMaMe ?? null}
            ownMaMe={me.maMe ?? null}
            locked={isLocked(me)}
            onSet={(meId) => set(me.id, "chuyenVeMeId", meId)}
          />
        ),
      },
      {
        title: "Máy đúc chuyển", key: "tenMayDucChuyen", width: 110,
        onCell: (me: HRC1_MeThepVm) => {
          const editedVal = edits[me.id]?.chuyenVeMeId;
          const effectiveId = editedVal !== undefined ? editedVal : me.chuyenVeMeId;
          return effectiveId != null && effectiveId !== me.id ? { style: { background: "#fffbe6" } } : {};
        },
        render: (_: unknown, me: HRC1_MeThepVm) => {
          const editedChuyen = edits[me.id]?.chuyenVeMeId;
          const effectiveChuyenId = editedChuyen !== undefined ? editedChuyen : me.chuyenVeMeId;
          const isSelf = effectiveChuyenId == null || effectiveChuyenId === me.id;
          if (isSelf) {
            const mayId = get(me, "idMayDucDich") as number | null | undefined;
            return mayDucOpts.find((o) => o.value === mayId)?.label ?? "—";
          }
          return me.tenMayDucChuyen ?? "—";
        },
      },
    ] as TableColumnsType<HRC1_MeThepVm> : []),
    { title: "Phân loại", dataIndex: "phanLoai",     width: 70, render: (v) => <Input size="small" style={{ width: 64 }} value={v ?? ""} disabled /> },
    { title: "Mác BKMIS", dataIndex: "macThepBKMIS",  width: 115, render: (v) => <Input size="small" style={{ width: 110}} value={v ?? ""} disabled /> },
    { title: "Người sửa cuối", dataIndex: "tenCapNhatBoi", width: 150, render: (v) => v ?? "" },
    {
      title: "Tình trạng", key: "tinhTrang", width: 150, fixed: "right",
      render: (_, me) => (
        <Space size={4}>
          {tinhTrangTag(me.trangThaiDuc, me.isChot)}
          {me.isTrungMeThoi && <Tag color="orange" style={{ fontSize: 11 }}>Trùng</Tag>}
        </Space>
      ),
    },
    {
      title: "", key: "xoaTay", width: 36, fixed: "right",
      render: (_, me) => {
        if (readOnly || !me.isManualTL) return null;
        return (
          <Popconfirm
            title="Xóa dòng mẻ thêm tay này?"
            okText="Xóa" okButtonProps={{ danger: true }}
            cancelText="Không"
            onConfirm={() => handleXoaMeTay(me.mePhanCongId!)}>
            <Button
              size="small" type="text" danger icon={<DeleteOutlined />}
              loading={xoaMeTayBusy.has(me.mePhanCongId ?? -1)} />
          </Popconfirm>
        );
      },
    },
  ];

  // Merge edits vào từng row để rc-table nhận biết thay đổi và re-render cell klThepLong
  const tlDisplayData = useMemo(
    () => phieuData.danhSachMe.map((me) =>
      edits[me.id] ? ({ ...me, ...edits[me.id] } as HRC1_MeThepVm) : me
    ),
    [phieuData.danhSachMe, edits]
  );

  if (!readOnly && !tlSo) return (
    <Empty description="Chọn tinh luyện để xem và nhận mẻ" style={{ padding: "40px 0" }} />
  );

  return (
    <Row gutter={16} align="top" style={{ flexWrap: "nowrap" }}>
      {/* Trái: Mẻ chờ nhận */}
      <Col flex="500px" style={{ minWidth: 0 }}>
        <ChoNhanMePanel
          caPhieuId={phieuData.idPhieu}
          readOnly={readOnly}
          onNhanSuccess={onReload}
          refreshTrigger={choNhanRefreshKey}
          scopePhieu={tlSo}
          ngayPhieu={phieuData.ngaySX}
          caPhieu={phieuData.ca}
        />
      </Col>

      {/* Phải: Bảng TL chính + Thêm dòng */}
      <Col flex="auto" style={{ minWidth: 0, overflow: "hidden" }}>
        <div style={{ marginBottom: 6, textAlign: "right" }}>
          <Button
            size="small"
            icon={showChuyenMeCols ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowChuyenMeCols((v) => !v)}
          >
            {showChuyenMeCols ? "Ẩn cột chuyển mẻ" : "Hiện cột chuyển mẻ"}
          </Button>
        </div>
        <MeThepTable
          columns={mainCols}
          dataSource={tlDisplayData}
          rowKey={(r) => `${r.id}-${r.mePhanCongId}`}
          scrollX={showChuyenMeCols ? 1391 : 1131}
          scrollY="calc(100vh - 235px)"
          onRow={(me) => ({ style: me.isManualTL ? { background: "#fff1f0" } : undefined })}
        />

        {!readOnly && (
          <Space style={{ marginTop: 8 }}>
            {!showThemMeTay ? (
              <Button size="small" onClick={() => setShowThemMeTay(true)}>+ Thêm dòng mẻ</Button>
            ) : (
              <>
                <AutoComplete
                  size="small"
                  style={{ width: 200 }}
                  placeholder="Nhập mã mẻ để tìm..."
                  value={themMeTaySearch}
                  options={themMeTayOptions}
                  onSearch={handleSearchMeTay}
                  onSelect={(val) => { setThemMeTayMaMe(val); setThemMeTaySearch(val); }}
                />
                <Button
                  size="small" type="primary"
                  loading={themMeTayBusy}
                  disabled={!themMeTayMaMe}
                  onClick={handleThemMeTay}>
                  Thêm
                </Button>
                <Button size="small" onClick={resetThemMeTay}>Hủy</Button>
              </>
            )}
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
  canXacNhan = true,
  canChot = true,
}: {
  phieuData: HRC1_PhieuDataVm;
  readOnly?: boolean;
  onReload: () => Promise<void>;
  onExtraChange?: (node: ReactNode) => void;
  canXacNhan?: boolean;
  canChot?: boolean;
}) => {
  const [selected, setSelected] = useState<number[]>([]);

  const batchAction = useCallback(async (fn: () => Promise<unknown>) => {
    if (selected.length === 0) { message.warning("Chưa chọn mẻ nào"); return; }
    try { await fn(); setSelected([]); await onReload(); }
    catch (e: any) { message.error(e?.message ?? "Lỗi thao tác"); }
  }, [selected, onReload]);

  // vùng 4 (chốt only): chọn mẻ đã xác nhận (trangThaiDuc >= 1), kể cả đã chốt (cho hủy chốt)
  // vùng 3 (xác nhận only): chọn mẻ chưa chốt mà đủ điều kiện xác nhận hoặc đã xác nhận
  // cả hai: giữ logic cũ
  const eligibleMes = useMemo(() => {
    const mes = phieuData.danhSachMe;
    if (canChot && !canXacNhan)
      return mes.filter((m) => (m.trangThaiDuc ?? 0) >= 1);
    if (canXacNhan && !canChot)
      return mes.filter((m) => !m.isChot && (checkDucReady(m).length === 0 || (m.trangThaiDuc ?? 0) >= 1));
    return mes.filter((m) => !m.isChot && checkDucReady(m).length === 0);
  }, [phieuData.danhSachMe, canXacNhan, canChot]);

  const batchRef = useRef(batchAction);
  batchRef.current = batchAction;

  const idMayDuc = phieuData.scope ?? 0;

  useEffect(() => {
    if (!onExtraChange || readOnly) { onExtraChange?.(null); return; }
    onExtraChange(
      <Space>
        {canXacNhan && (
          <>
            {/* <Popconfirm title={`Xác nhận ${selected.length} mẻ?`}
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
            </Popconfirm>*/}
            <Popconfirm
              title={`Xác nhận ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={async () => {
              await batchRef.current?.(async () => {
                await HRC1Api.xacNhanDuc(selected);
              });

              message.success("Đã xác nhận");
            }}
            >
              <Button type="primary" disabled={selected.length === 0}>
                Xác nhận ({selected.length})
              </Button>
            </Popconfirm>
            <Popconfirm
              title={`Bỏ xác nhận ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={async () => {
              await batchRef.current?.(async () => {
                await HRC1Api.boXacNhanDuc(selected);
              });

              message.success("Đã bỏ xác nhận");
            }}
            >
              <Button danger type="primary" disabled={selected.length === 0}>
                Hủy xác nhận ({selected.length})
              </Button>
            </Popconfirm>
            
          </>
        )}
        {canChot && (
          <>
            {/* <Popconfirm title={`Chốt ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={() => batchRef.current(() =>
                HRC1Api.chotMe({ meIds: selected, idPhieu: String(phieuData.idPhieu), idMayDuc })
                  .then(() => message.success("Đã chốt")))}>
              <Button type="default" disabled={selected.length === 0}>
                Chốt ({selected.length})
              </Button>
            </Popconfirm>
            <Popconfirm title={`Bỏ chốt ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={() => batchRef.current(() =>
                HRC1Api.boChotMe({ meIds: selected, idPhieu: String(phieuData.idPhieu), idMayDuc })
                  .then(() => message.success("Đã bỏ chốt")))}>
              <Button disabled={selected.length === 0}>
                Bỏ chốt ({selected.length})
              </Button>
            </Popconfirm> */}
            <Popconfirm
              title={`Chốt ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={() => {
                return batchRef.current(() =>
                  HRC1Api.chotMe({
                    meIds: selected,
                    idPhieu: String(phieuData.idPhieu),
                    idMayDuc
                  }).then(() => {
                    message.success("Đã chốt");
                  })
                );
              }}
            >
              <Button type="primary" disabled={selected.length === 0}>
                Chốt ({selected.length})
              </Button>
            </Popconfirm>
            <Popconfirm
              title={`Bỏ chốt ${selected.length} mẻ?`}
              disabled={selected.length === 0}
              onConfirm={() => {
                return batchRef.current(() =>
                  HRC1Api.boChotMe({
                    meIds: selected,
                    idPhieu: String(phieuData.idPhieu),
                    idMayDuc
                  }).then(() => {
                    message.success("Đã bỏ chốt");
                  })
                );
              }}
            >
              <Button danger disabled={selected.length === 0}>
                Bỏ chốt ({selected.length})
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>
    );
  }, [onExtraChange, readOnly, canXacNhan, canChot, selected.length, idMayDuc, phieuData.idPhieu]);

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
        const toggle = (e: { target: { checked: boolean } }) =>
          setSelected((p) => e.target.checked ? [...p, me.id] : p.filter((id) => id !== me.id));

        // vùng 4: enable cho mẻ đã xác nhận (kể cả đã chốt → để hủy chốt); disabled nếu chưa xác nhận
        if (canChot && !canXacNhan) {
          if ((me.trangThaiDuc ?? 0) < 1)
            return <Tooltip title="Mẻ chưa được xác nhận" placement="right"><Checkbox disabled /></Tooltip>;
          return <Checkbox checked={selected.includes(me.id)} onChange={toggle} />;
        }

        // vùng 3 hoặc cả hai: không cho thao tác mẻ đã chốt
        if (me.isChot)
          return <Tooltip title="Mẻ đã chốt, không thể thao tác"><Checkbox disabled /></Tooltip>;
        const missing = checkDucReady(me);
        // chưa đủ thông tin VÀ chưa xác nhận → disabled
        if (missing.length > 0 && (me.trangThaiDuc ?? 0) < 1)
          return <Tooltip title={`Thiếu: ${missing.join(", ")}`} placement="right"><Checkbox disabled /></Tooltip>;
        return <Checkbox checked={selected.includes(me.id)} onChange={toggle} />;
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
    { title: "KL thép lỏng", dataIndex: "klThepLong", width: 80, render: (v) => <span style={{ fontWeight: 600 }}>{v ?? ""}</span> },
    {
      title: "Ghi chú", key: "ghiChuLo", width: 90,
      render: (_, me) => <GhiChuInput meId={me.id} value={me.ghiChuLo} locked={readOnly || !!me.isChot} />,
    },
    { title: "Tinh luyện/Lên thẳng", key: "dichDisp",         width: 90, render: (_, me) => getDichDisplay(me) },
    { title: "Thử nghiệm",  dataIndex: "isThuNghiem", width: 50, render: (v) => v ? "✓" : "" },
    { title: "Máy đúc",  dataIndex: "tenMayDucDich", width: 90, render: (v) => v ?? "" },
    { title: "Phân loại",dataIndex: "phanLoai",      width: 80,  render: (v) => v ?? "" },
    { title: "Mác BKMIS",dataIndex: "macThepBKMIS",  width: 110, render: (v) => v ?? "" },
    { title: "Người sửa cuối", dataIndex: "tenCapNhatBoi", width: 110, render: (v) => v ?? "-" },
    {
      title: "Tình trạng", key: "tinhTrang", width: 100, fixed: "right",
      render: (_, me) => tinhTrangTag(me.trangThaiDuc, me.isChot),
    },
  ];

  return (
    <MeThepTable
      columns={columns}
      dataSource={phieuData.danhSachMe}
      scrollX={1370}
      scrollY="calc(100vh - 190px)"
      onRow={(me) => ({ style: me.isManualTL ? { background: "#fff1f0" } : undefined })}
    />
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
  const [loading,         setLoading]         = useState(false);
  const [syncing,         setSyncing]         = useState(false);
  const [selectedId,      setSelectedId]      = useState<string | null>(null);
  const [cardExtra,       setCardExtra]       = useState<ReactNode>(null);
  const [exportingExcel,  setExportingExcel]  = useState(false);
  const [exportingPdf,    setExportingPdf]    = useState(false);

  // Scope state cho lò thổi và tinh luyện
  const [loSo,  setLoSo]  = useState<number | null>(null);
  const [tlSo,  setTlSo]  = useState<number | null>(null);
  const [allowedLoScopes,  setAllowedLoScopes]  = useState<number[]>([]);
  const [allowedTLScopes,  setAllowedTLScopes]  = useState<number[]>([]);
  const [hasQuyenXacNhanBBGN, setHasQuyenXacNhanBBGN] = useState(false);
  const [hasQuyenChotBBGN,    setHasQuyenChotBBGN]    = useState(false);

  const isPKHAdmin = useMemo(() => {
    const u = getThongTinUser();
    return u.tenNgan === "P.KH" || u.iD_PhongBan === 70 || isAdminUser(u);
  }, []);

  // Ref để loadPhieu luôn thấy loSo/tlSo mới nhất
  const loSoRef = useRef(loSo);
  loSoRef.current = loSo;
  const tlSoRef = useRef(tlSo);
  tlSoRef.current = tlSo;

  // ── Fetch quyền xử lý của user ──────────────────────────────────────────────
  useEffect(() => {
    const userId = getThongTinUser().iD_TaiKhoan;
    if (!userId) return;
    BmQuyenXlApi.getByTaiKhoan(userId).then((res: any) => {
      const list: Array<{ maBm: string; maKhuVuc: string; quyenChucNang: number }> = Array.isArray(res) ? res : res?.data ?? [];
      const loScopes = list
        .filter((r) => r.maBm === BM_CONFIG.HRC1.HRC1_LoThoi)
        .map((r) => Number(r.maKhuVuc))
        .filter((n) => n > 0 && n <= 5);
      const tlScopes = list
        .filter((r) => r.maBm === BM_CONFIG.HRC1.HRC1_TinhLuyen)
        .map((r) => Number(r.maKhuVuc))
        .filter((n) => n > 0 && n <= 5);
      setAllowedLoScopes([...new Set(loScopes)].sort());
      setAllowedTLScopes([...new Set(tlScopes)].sort());
      setHasQuyenXacNhanBBGN(
        list.some((r) => r.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong && Number(r.quyenChucNang) === 2)
      );
      setHasQuyenChotBBGN(
        list.some((r) => r.maBm === BM_CONFIG.HRC1.HRC1_BBGN_ThepLong && Number(r.quyenChucNang) === 3)
      );
    }).catch(() => {/* ignore permission load errors */});
  }, []);

  // ── Load nội dung 1 phiếu ────────────────────────────────────────────────────
  const loadPhieu = useCallback(async (
    idPhieu: string,
    opts?: { loSo?: number | null; tlSo?: number | null },
  ) => {
    setLoading(true);
    const effectiveLoSo = opts?.loSo !== undefined ? opts.loSo : loSoRef.current;
    const effectiveTlSo = opts?.tlSo !== undefined ? opts.tlSo : tlSoRef.current;
    try {
      const data = await HRC1Api.getPhieu(idPhieu, {
        loSo:       effectiveLoSo  ?? undefined,
        scopePhieu: effectiveTlSo  ?? undefined,
      });
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

  // Reload khi loSo hoặc tlSo thay đổi (sau khi đã có phiếu)
  const prevLoSo = useRef(loSo);
  const prevTlSo = useRef(tlSo);
  useEffect(() => {
    if (prevLoSo.current === loSo && prevTlSo.current === tlSo) return;
    prevLoSo.current = loSo;
    prevTlSo.current = tlSo;
    if (selectedId) loadPhieu(selectedId, { loSo, tlSo });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loSo, tlSo]);

  // Làm mới: lò thổi → sync gang lỏng rồi sync phân loại rồi reload; các công đoạn khác → sync phân loại rồi reload
  const handleRefresh = useCallback(async () => {
    if (!phieuData) return;
    setSyncing(true);
    try {
      let maMes = phieuData.danhSachMe
        .map((m) => m.maMe)
        .filter((m): m is string => !!m);

      if (phieuData.congDoan === "lo_thoi") {
        if (!loSoRef.current) { message.warning("Chọn lò thổi trước khi đồng bộ"); return; }
        const updated = await HRC1Api.syncLoThoi(phieuData.idPhieu, loSoRef.current);
        maMes = updated.danhSachMe.map((m) => m.maMe).filter((m): m is string => !!m);
        message.success(`Đồng bộ thành công — ${updated.danhSachMe.length} mẻ`);
      }

      if (maMes.length > 0) {
        await HRC1Api.syncPhanLoaiMeThep(maMes);
      }
      await handleReload();
    } catch (e: any) {
      message.error(e?.message ?? "Lỗi đồng bộ");
    } finally {
      setSyncing(false);
    }
  }, [phieuData, handleReload]);

  // ── Export helpers ───────────────────────────────────────────────────────────
  const downloadBlob = (raw: unknown, filename: string) => {
    const blob = raw instanceof Blob ? raw : new Blob([raw as BlobPart]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const buildExportFilename = (ext: "xlsx" | "pdf") => {
    if (!phieuData) return `HRC1_export.${ext}`;
    const label = getGroupLabel(phieuData.maBm ?? "").replace(/\s/g, "_");
    const ngay = phieuData.ngaySX ? phieuData.ngaySX.toString().replace(/-/g, "") : "";
    const ca = phieuData.ca === 1 ? "CaNgay" : phieuData.ca === 2 ? "CaDem" : "";
    return `HRC1_${label}_${ngay}_${ca}.${ext}`;
  };

  const handleExportExcel = async () => {
    if (!phieuData) return;
    setExportingExcel(true);
    try {
      const raw = await PhieuApi.exportDetailExcel(phieuData.idPhieu);
      downloadBlob(raw, buildExportFilename("xlsx"));
      message.success("Đã tải file Excel");
    } catch (e: unknown) {
      const err = e instanceof Blob
        ? await e.text()
        : typeof e === "string" ? e : (e as { message?: string })?.message ?? "Lỗi xuất Excel";
      message.error(err, 6);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    if (!phieuData) return;
    setExportingPdf(true);
    try {
      const raw = await PhieuApi.exportDynamicPDF(phieuData.idPhieu, {});
      downloadBlob(raw, buildExportFilename("pdf"));
      message.success("Đã tải file PDF");
    } catch (e: unknown) {
      const err = e instanceof Blob
        ? await e.text()
        : typeof e === "string" ? e : (e as { message?: string })?.message ?? "Lỗi xuất PDF";
      message.error(err, 6);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Mount: ưu tiên idphieu từ navigation state ────────────────────────────────
  useEffect(() => {
    const resolvedId = idphieuFromState ?? sessionStorage.getItem(SESSION_KEY) ?? null;
    if (resolvedId) loadPhieu(resolvedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idphieuFromState]);

  // ── Tiêu đề phiếu đang xem ──────────────────────────────────────────────────
  const phieuTitle = useMemo(() => {
    if (!phieuData) return null;
    const groupLabel = getGroupLabel(phieuData.maBm ?? "");
    const maBm = phieuData.maBm ?? "";
    // Lò thổi / Tinh luyện: scope lưu ở mẻ, không ở phiếu
    if (maBm === BM_CONFIG.HRC1.HRC1_LoThoi || maBm === BM_CONFIG.HRC1.HRC1_TinhLuyen) {
      return groupLabel;
    }
    const scopeName = getScopeName(maBm, phieuData.scope);
    return `${groupLabel} — ${scopeName}`;
  }, [phieuData]);

  return (
    <div style={{ padding: 0 }}>
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
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  loading={exportingExcel}
                  disabled={!phieuData}
                  onClick={handleExportExcel}
                  style={{ backgroundColor: "#217346", borderColor: "#217346", color: "#fff" }}
                >
                  Excel
                </Button>
                <Button
                  size="small"
                  icon={<FilePdfOutlined />}
                  loading={exportingPdf}
                  disabled={!phieuData}
                  onClick={handleExportPdf}
                  danger
                >
                  PDF
                </Button>
              </Space>
            }
            size="small"
            styles={{ body: { padding: "6px 8px" } }}
          >
            {phieuData.congDoan === "lo_thoi" && (
              <LoThoiPanel
                phieuData={phieuData}
                readOnly={readOnly}
                loSo={loSo}
                onLoSoChange={setLoSo}
                allowedLoScopes={allowedLoScopes}
                onReload={handleReload}
                onDataUpdated={(d) => setPhieuData(d)}
                onExtraChange={setCardExtra}
              />
            )}
            {phieuData.congDoan === "tinh_luyen" && (
              <TinhLuyenPanel
                phieuData={phieuData}
                readOnly={readOnly}
                tlSo={tlSo}
                onTlSoChange={setTlSo}
                allowedTLScopes={allowedTLScopes}
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
                canXacNhan={hasQuyenXacNhanBBGN}
                canChot={isPKHAdmin || hasQuyenChotBBGN}
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
