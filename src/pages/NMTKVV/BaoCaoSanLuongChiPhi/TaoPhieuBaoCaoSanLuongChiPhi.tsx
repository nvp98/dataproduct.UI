/* eslint-disable @typescript-eslint/no-explicit-any */
import TKVV_BC_SanLuongChiPhi from "../../../utils/BM_config/TKVV_BC_SanLuongChiPhi.json";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { UndoOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable, { type FormColumnDef } from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";

interface TableRow {
  key: string | number;
  kip?: string;
  nguyenLieu?: string;
  klAm?: number | string;
  doAm?: number | string;
  quyKho?: number | string;
  thanhPhamL1?: number | string;
  thanhPhamL2?: number | string;
  ghiChu?: string;
  [key: string]: any;
}

const SUM_KEYS = ["klAm", "quyKho", "thanhPhamL1", "thanhPhamL2"] as const;

// Số dòng mặc định khi tạo phiếu mới — 1 kíp trên giấy thường có ~9 dòng nguyên liệu.
const SO_DONG_MAC_DINH = 9;

const buildBlankRow = (idx: number): TableRow => ({
  key: `blank-${idx}-${Date.now()}`,
  kip: "",
  nguyenLieu: "",
  klAm: "",
  doAm: "",
  quyKho: "",
  thanhPhamL1: "",
  thanhPhamL2: "",
  ghiChu: "",
});

const TaoPhieuBaoCaoSanLuongChiPhi = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = TKVV_BC_SanLuongChiPhi as any;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
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

          setTableData(
            Array.isArray(data.table1) && data.table1.length > 0
              ? data.table1.map((row: any, idx: number) => ({ ...row, key: row.key ?? `row-${idx}` }))
              : [],
          );

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
        setTableData(Array.from({ length: SO_DONG_MAC_DINH }, (_, i) => buildBlankRow(i + 1)));
        setTimeout(() => {
          const overrides: Record<string, any> = {
            tuNgay: dayjs(),
            denNgay: dayjs().add(1, "day"),
          };
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
  }, [idphieu, config.signatures, config.headerFields, currentUserInfo]);

  useEffect(() => {
    initData();
  }, [initData]);

  // ─── Thêm dòng thủ công ──────────────────────────────────────────────────
  const handleAddRow = useCallback(() => {
    setTableData((prev) => [...prev, buildBlankRow(prev.length + 1)]);
  }, []);

  const handleTableChange = useCallback((rows: any[]) => {
    setTableData(rows);
  }, []);

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

    const processedTable1 = tableData.map((row, idx) => {
      const r: Record<string, any> = { thuTu: idx + 1 };
      Object.keys(row).forEach((k) => {
        if (k !== "key") r[k] = row[k];
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
  }, [getUserInfo, form, config, tableData]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieubaocaoslcptkvv/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

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

  // ─── Cột bảng (CustomFormTable) — lấy từ JSON config ────────────────────────
  const tableColumns: FormColumnDef[] = useMemo(() => {
    const tableSection = config.layout.find(
      (section: any) => section.sectionType === "table" && section.key === "table1",
    );
    return (tableSection?.columns || []) as FormColumnDef[];
  }, [config]);

  const tableSummary = useCallback((data: readonly any[]) => {
    const totals: Record<string, number> = { klAm: 0, quyKho: 0, thanhPhamL1: 0, thanhPhamL2: 0 };
    data.forEach((row) => {
      SUM_KEYS.forEach((k) => {
        const v = Number(row[k]);
        if (!Number.isNaN(v)) totals[k] += v;
      });
    });
    return (
      <tr>
        <td style={{ fontWeight: 600, textAlign: "center" }} colSpan={2}>
          TỔNG
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {totals.klAm ? totals.klAm.toLocaleString("en-US", { maximumFractionDigits: 3 }) : ""}
        </td>
        <td />
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {totals.quyKho ? totals.quyKho.toLocaleString("en-US", { maximumFractionDigits: 3 }) : ""}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {totals.thanhPhamL1 ? totals.thanhPhamL1.toLocaleString("en-US", { maximumFractionDigits: 3 }) : ""}
        </td>
        <td style={{ fontWeight: 600, textAlign: "right" }}>
          {totals.thanhPhamL2 ? totals.thanhPhamL2.toLocaleString("en-US", { maximumFractionDigits: 3 }) : ""}
        </td>
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
            {actionButtons}
            <Button icon={<UndoOutlined />} onClick={() => navigate("/baocaoslcptkvv")}>
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

export default TaoPhieuBaoCaoSanLuongChiPhi;
