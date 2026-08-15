/* eslint-disable @typescript-eslint/no-explicit-any */
import TKVV_BB_SanLuong from "../../../utils/BM_config/TKVV_BB_SanLuong.json";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable, { type FormColumnDef } from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import {
  tkvvNvlApi,
  tkvvDuLieuPivotApi,
  tkvvChiTietApi,
  type TKVVNguyenVatLieuDto,
  type TKVVChiTietDto,
} from "../../../services/TKVVApi";

interface TableRow {
  key: string | number;
  thuTuDong?: number;
  thoiGian?: string;
  tenSanPham?: number | null; // lưu NguyenVatLieuID, hiển thị qua options
  donViTinh?: string;
  ghiChu?: string;
  "1"?: number | string;
  "2"?: number | string;
  "3"?: number | string;
  "4"?: number | string;
  [key: string]: any;
}

const PHAN_LOAI_KEYS = ["1", "2", "3", "4"] as const;

// Số dòng mặc định khi tạo phiếu mới — khớp số mốc giờ điển hình trên biểu mẫu giấy (1 ca ~4 lần lấy mẫu).
// Người dùng vẫn thêm/xóa dòng tự do, đây chỉ là khung sẵn để đỡ phải bấm "+ Thêm dòng" nhiều lần.
const SO_DONG_MAC_DINH = 4;

const buildBlankRow = (
  idx: number,
  defaultNvlId: number | null = null,
  defaultDvt = "",
): TableRow => ({
  key: `blank-${idx}-${Date.now()}`,
  thuTuDong: idx,
  thoiGian: "",
  tenSanPham: defaultNvlId,
  donViTinh: defaultDvt,
  ghiChu: "",
  "1": "",
  "2": "",
  "3": "",
  "4": "",
});

const TaoPhieuBienBanSanLuong = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = TKVV_BB_SanLuong as any;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [nvlOptions, setNvlOptions] = useState<TKVVNguyenVatLieuDto[]>([]);
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: any[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  const phieuInfoRef = useRef(phieuInfo);
  useEffect(() => {
    phieuInfoRef.current = phieuInfo;
  }, [phieuInfo]);

  const currentUserInfo = useMemo(() => getThongTinUser(), []);

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isSignatureReadonly = [
    TrangThaiPhieuConst.HoanThanh,
    TrangThaiPhieuConst.DangPheDuyet,
    TrangThaiPhieuConst.DaChot,
  ].includes(currentTinhTrang);
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const getUserInfo = useCallback(() => getThongTinUser(), []);

  const nvlById = useMemo(() => {
    const map = new Map<number, TKVVNguyenVatLieuDto>();
    nvlOptions.forEach((n) => map.set(n.id, n));
    return map;
  }, [nvlOptions]);

  // nvlOptions đọc được trong initData mà không cần đưa vào deps (tránh initData
  // đổi identity mỗi lần danh mục tải xong, khiến toàn bộ phiếu bị load lại).
  const nvlOptionsRef = useRef<TKVVNguyenVatLieuDto[]>([]);
  useEffect(() => {
    nvlOptionsRef.current = nvlOptions;
  }, [nvlOptions]);

  // ─── Nạp danh mục sản phẩm (NVL) cho biểu mẫu này ─────────────────────────
  useEffect(() => {
    tkvvNvlApi
      .getList({ maBM: config.code })
      .then((list) => setNvlOptions((list || []).filter((n) => n.trangThai)))
      .catch(() => message.error("Không thể tải danh mục sản lượng!"));
  }, [config.code]);

  // Scope (số) trùng nhau giữa 2 nhóm ở tầng hiển thị (không trùng thật — xem ghi chú
  // ở BM_config) nên không cần tenScope để tránh trùng; tenScope chỉ dùng để hiển thị
  // tên xưởng dễ đọc (BmPhieu.TenScope) — tự động gán theo lựa chọn "Xưởng".
  const scopeValue = Form.useWatch("scope", form);
  useEffect(() => {
    const opt = config.headerFields
      .find((f: any) => f.key === "scope")
      ?.options?.find((o: any) => o.value === scopeValue);
    if (opt?.tenScope) form.setFieldsValue({ tenScope: opt.tenScope });
  }, [scopeValue, config, form]);

  // Danh mục NVL thường tải xong SAU khi 4 dòng mặc định đã được dựng (còn trống
  // sản phẩm) — khi đó điền lại sản phẩm mặc định vào các dòng còn trống, chỉ áp
  // dụng cho phiếu MỚI (chưa lưu) để không đụng vào dữ liệu đã tải từ DB.
  useEffect(() => {
    if (idphieu || nvlOptions.length === 0) return;
    setTableData((prev) => {
      if (prev.length === 0 || !prev.every((r) => !r.tenSanPham)) return prev;
      const defaultNvl = nvlOptions[0];
      return prev.map((r) => ({ ...r, tenSanPham: defaultNvl.id, donViTinh: defaultNvl.donViTinh ?? "" }));
    });
  }, [nvlOptions, idphieu]);

  // ─── Chuyển chi tiết đã lưu (DB) -> dòng bảng hiển thị ─────────────────────
  const chiTietToRows = useCallback((chiTiet: TKVVChiTietDto[]): TableRow[] => {
    const groups = new Map<number, TKVVChiTietDto[]>();
    chiTiet.forEach((c) => {
      const key = c.thuTuDong ?? 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    return Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([thuTu, items]) => {
        const first = items[0];
        const row: TableRow = {
          key: `row-${thuTu}`,
          thuTuDong: thuTu,
          thoiGian: first.thoiGian ?? "",
          tenSanPham: first.nguyenVatLieuID,
          donViTinh: nvlById.get(first.nguyenVatLieuID)?.donViTinh ?? "",
          ghiChu: first.ghiChu ?? "",
        };
        items.forEach((it) => {
          const k = String(it.phanLoai);
          row[k] = it.giaTriHienTai ?? "";
          if (it.isEdited) {
            row[`_manual_${k}`] = true;
            row[`_goc_${k}`] = it.giaTriTuDong ?? null;
          }
        });
        return row;
      });
  }, [nvlById]);

  // ─── Chuyển pivot PLC (chưa lưu) -> dòng bảng hiển thị ─────────────────────
  const pivotToRows = useCallback(
    (rows: Record<string, unknown>[]): TableRow[] =>
      rows.map((r, idx) => {
        const nguyenVatLieuID = Number(r["nguyenVatLieuID"] ?? 0) || null;
        const row: TableRow = {
          key: `row-${idx + 1}`,
          thuTuDong: idx + 1,
          thoiGian: String(r["thoiGian"] ?? ""),
          tenSanPham: nguyenVatLieuID,
          donViTinh: nguyenVatLieuID ? nvlById.get(nguyenVatLieuID)?.donViTinh ?? "" : "",
          ghiChu: "",
        };
        PHAN_LOAI_KEYS.forEach((k) => {
          if (r[k] !== undefined && r[k] !== null) row[k] = Number(r[k]);
        });
        return row;
      }),
    [nvlById]
  );

  // ─── initData: tải phiếu khi mở trang ──────────────────────────────────────
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      if (idphieu) {
        const res: any = await PhieuApi.getDetail(idphieu);
        if (res) {
          setSoPhieu(res.soPhieu || "");
          const data = res.jsonData || {};

          const signatureFields: Record<string, any> = {};
          (res.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy",
            );
            if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
          });

          const tinhTrang = res.tinhTrang ?? 0;
          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          form.setFieldsValue({ ...data, ...signatureFields, ...parsedDates });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => sig.capDuyet === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          const chiTiet = await tkvvChiTietApi.getByPhieu(idphieu);
          setTableData(chiTietToRows(chiTiet || []));

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: res.nguoiTaoId ?? null,
            idphongBan: res.idphongBan ?? null,
            pheDuyet: res.pheDuyet || data.pheDuyet || [],
            isClone: res.isClone ?? false,
            idPhieuGoc: res.idPhieuGoc ?? res.iD_PhieuGoc ?? res.ID_PhieuGoc ?? null,
          });
        }
      } else {
        setPhieuInfo({});
        const defaultNvl = nvlOptionsRef.current[0];
        setTableData(
          Array.from({ length: SO_DONG_MAC_DINH }, (_, i) =>
            buildBlankRow(i + 1, defaultNvl?.id ?? null, defaultNvl?.donViTinh ?? ""),
          ),
        );
        setTimeout(() => {
          const overrides: Record<string, any> = { ca: 1, NgaySX: dayjs() };
          config.signatures
            .filter((sig: any) => sig.capDuyet === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idphieu, config.signatures, config.headerFields, currentUserInfo, chiTietToRows]);

  useEffect(() => {
    initData();
  }, [initData]);

  // ─── Cập nhật dữ liệu từ PLC ────────────────────────────────────────────────
  const handleCapNhatDuLieu = useCallback(async () => {
    const formData = form.getFieldsValue();
    const ngay = formData.NgaySX ? dayjs(formData.NgaySX).format("YYYY-MM-DD") : null;
    const ca = formData.ca ?? null;
    const scope = formData.scope ?? null;

    if (!ngay || ca === null || scope === null) {
      message.warning("Vui lòng chọn Ngày sản xuất, Ca và Xưởng trước!");
      return;
    }

    try {
      setLoading(true);
      if (idphieu) {
        await tkvvDuLieuPivotApi.syncChiTiet(idphieu);
        const chiTiet = await tkvvChiTietApi.getByPhieu(idphieu);
        setTableData(chiTietToRows(chiTiet || []));
      } else {
        const pivot = await tkvvDuLieuPivotApi.getPivot({ ngay, ca, scope });
        setTableData(pivotToRows(pivot.rows || []));
      }
      message.success("Cập nhật dữ liệu thành công!");
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || "Không thể cập nhật dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, chiTietToRows, pivotToRows]);

  // ─── Thêm dòng thủ công (KTV/KCS lấy mẫu thêm) ──────────────────────────────
  // Thời gian để trống — người dùng tự ghi mốc giờ lấy mẫu thực tế, không suy ra
  // từ đồng hồ hệ thống lúc bấm nút.
  const handleAddRow = useCallback(() => {
    const defaultNvl = nvlOptions[0];
    setTableData((prev) => [
      ...prev,
      buildBlankRow(prev.length + 1, defaultNvl?.id ?? null, defaultNvl?.donViTinh ?? ""),
    ]);
  }, [nvlOptions]);

  const handleTableChange = useCallback(
    (rows: any[]) => {
      // Khi đổi "Sản lượng" (tenSanPham = NguyenVatLieuID) → đồng bộ lại ĐVT hiển thị
      const synced = rows.map((r) => {
        const nvlId = Number(r.tenSanPham) || null;
        const dvt = nvlId ? nvlById.get(nvlId)?.donViTinh ?? "" : "";
        return dvt !== r.donViTinh ? { ...r, donViTinh: dvt } : r;
      });
      setTableData(synced);
    },
    [nvlById]
  );

  const hasRowsToDelete = tableData.length > 0; // minRows=0 cho phép xóa hết

  // ─── getFormData ────────────────────────────────────────────────────────────
  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();
    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    // Dòng nào có nhập ít nhất 1 giá trị Loại 1-4 mà chưa chọn Sản lượng thì BE sẽ
    // ÂM THẦM bỏ qua cả dòng (nguyenVatLieuID null → không tạo bản ghi ChiTiet nào).
    // Chặn ngay ở đây thay vì để lưu "thành công" nhưng bảng chi tiết trống trơn.
    const rowsMissingSanPham = tableData
      .map((row, idx) => ({ idx, row }))
      .filter(
        ({ row }) =>
          !row.tenSanPham &&
          PHAN_LOAI_KEYS.some((k) => row[k] !== undefined && row[k] !== "" && row[k] !== null),
      );

    if (nvlOptions.length === 0) {
      message.error(
        'Xưởng này chưa có sản phẩm nào trong danh mục. Vào "Kho dữ liệu → NM.TKVV → Quản lý NVL & Mapping" để thêm trước khi lưu.',
      );
      throw new Error("Thiếu danh mục sản phẩm (NVL) cho xưởng này");
    }
    if (rowsMissingSanPham.length > 0) {
      const soDong = rowsMissingSanPham.map(({ idx }) => idx + 1).join(", ");
      message.error(`Dòng ${soDong} đã nhập số liệu nhưng chưa chọn "Sản lượng" — chọn sản phẩm trước khi lưu.`);
      throw new Error("Có dòng chưa chọn Sản lượng");
    }

    const processedTable1 = tableData.map((row, idx) => {
      const r: Record<string, any> = {
        thuTu: idx + 1,
        thoiGian: row.thoiGian ?? "",
        nguyenVatLieuID: Number(row.tenSanPham) || null,
        ghiChu: row.ghiChu ?? "",
      };
      PHAN_LOAI_KEYS.forEach((k) => {
        if (row[k] !== undefined && row[k] !== "") r[k] = row[k];
        if (row[`_manual_${k}`]) {
          r[`_manual_${k}`] = true;
          r[`_goc_${k}`] = row[`_goc_${k}`] ?? null;
        }
      });
      return r;
    });

    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });

    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [getUserInfo, form, config, tableData, nvlOptions]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieusanluongtkvv/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

  // Chỉ validate form trước khi đổi trạng thái — giống hệt TaoPhieuNapLieuLoCao.tsx (NM.LG),
  // TKVV không có bảng phụ trợ riêng cần đồng bộ thêm khi đổi trạng thái (khác CTD KCS).
  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error: any) {
      message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái");
    }
  }, [form]);

  const actionButtons = useMemo(() => {
    const userInfo = getUserInfo();
    const buttons = phieuActionService.getActionButtons({
      phieuId: idphieu || "",
      tinhTrang: phieuInfo.tinhTrang ?? 0,
      isClone: phieuInfo.isClone ?? false,
      currentUserId: userInfo.iD_TaiKhoan ?? null,
      currentUserPhongBanId: userInfo.iD_PhongBan ?? null,
      currentUserTenNgan: userInfo.tenNgan ?? null,
      nguoiTaoId: phieuInfo.nguoiTaoId ?? null,
      phieuPhongBanId: phieuInfo.idphongBan ?? null,
      phieuMaBm: config.code,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess, config.code]);

  // ─── Cột bảng (CustomFormTable) ─────────────────────────────────────────────
  const tableColumns: FormColumnDef[] = useMemo(
    () => [
      { title: "Thời gian", dataIndex: "thoiGian", width: 110, align: "center", type: "time" },
      {
        title: "Sản lượng",
        dataIndex: "tenSanPham",
        width: 200,
        options: nvlOptions.map((n) => ({ label: n.tenNVL, value: n.id })),
      },
      { title: "ĐVT", dataIndex: "donViTinh", width: 70, align: "center", readonly: true },
      { title: "Loại 1", dataIndex: "1", width: 100, type: "float", align: "right" },
      { title: "Loại 2", dataIndex: "2", width: 100, type: "float", align: "right" },
      { title: "Loại 3", dataIndex: "3", width: 100, type: "float", align: "right" },
      { title: "Phế phẩm", dataIndex: "4", width: 100, type: "float", align: "right" },
      { title: "Ghi chú", dataIndex: "ghiChu", width: 180 },
    ],
    [nvlOptions]
  );

  const tableSummary = useCallback((data: readonly any[]) => {
    const totals: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
    data.forEach((row) => {
      PHAN_LOAI_KEYS.forEach((k) => {
        const v = Number(row[k]);
        if (!Number.isNaN(v)) totals[k] += v;
      });
    });
    return (
      <tr>
        <td style={{ fontWeight: 600, textAlign: "center" }} colSpan={3}>
          TỔNG
        </td>
        {PHAN_LOAI_KEYS.map((k) => (
          <td key={k} style={{ fontWeight: 600, textAlign: "right" }}>
            {totals[k] ? totals[k].toLocaleString("en-US", { maximumFractionDigits: 3 }) : ""}
          </td>
        ))}
        <td />
      </tr>
    );
  }, []);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          {config.title}
        </Typography.Title>
        {idphieu && <b>Số phiếu: {soPhieu}</b>}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>
        <Form.Item name="tenScope" hidden>
          <Input type="hidden" />
        </Form.Item>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <Space style={{ justifyContent: "center", width: "100%" }}>
            {!isFormLocked && (
              <Button icon={<ReloadOutlined />} onClick={handleCapNhatDuLieu} loading={loading}>
                Cập nhật dữ liệu
              </Button>
            )}
            {actionButtons}
            <Button icon={<UndoOutlined />} onClick={() => navigate("/sanluongtkvv")}>
              Quay lại
            </Button>
          </Space>
        </div>

        <div style={{ width: "100%", overflowX: "auto", marginBottom: 8 }}>
          <CustomFormTable
            columns={tableColumns}
            initialData={tableData}
            onDataChange={handleTableChange}
            editable={!isFormLocked}
            loading={loading}
            minRows={0}
            showAddButton={false}
            showDeleteButton={!isFormLocked && hasRowsToDelete}
            manualTrackPattern={/^[1-4]$/}
            summary={tableSummary}
          />
        </div>
        {!isFormLocked && (
          <Button onClick={handleAddRow} type="dashed" style={{ marginBottom: 24 }}>
            + Thêm dòng
          </Button>
        )}

        {config.footerNotes?.length > 0 && (
          <div style={{ marginBottom: 16, fontSize: 13, color: "#666" }}>
            {config.footerNotes.map((note: string, i: number) => (
              <div key={i}>* {note}</div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig: any, i: number) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === sig.capDuyet);
            return (
              <div key={sig.key || i}>
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <div style={{ marginTop: 8 }}>
                    <Typography.Text type="secondary">
                      {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                    </Typography.Text>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuBienBanSanLuong;
