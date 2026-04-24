/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_NapLieuLoCao from "../../../utils/BM_config/LG_BB_NapLieuLoCao.json";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomTableLG, {
  type TableColumnDef,
  type TableSectionConfig,
} from "../../../components/CustomTableLG";
import { napLieuLoCaoApi } from "../../../services/NapLieuLoCaoApi";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const TaoPhieuNapLieuLoCao = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_BB_NapLieuLoCao;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [materialColumnsOverride, setMaterialColumnsOverride] = useState<TableColumnDef[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Config hiệu lực: khác null khi đang dùng cấu hình từ ngày/ca khác (fallback)
  const [configHieuLuc, setConfigHieuLuc] = useState<{
    ngayHieuLuc: string;
    idCaHieuLuc: number;
  } | null>(null);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  const ca = Form.useWatch("ca", form);
  const scope = Form.useWatch("scope", form);
  Form.useWatch("NgaySX", form);

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const getCapDuyet = useCallback((sig: any) => sig?.capDuyet ?? sig?.capduyet ?? 0, []);

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

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  // Lấy table section config từ JSON — đây là nguồn sự thật cho cấu trúc bảng
  const tableConfig = useMemo(
    () =>
      config.layout.find(
        (s: any) => s.sectionType === "table" && s.key === "table1"
      ) as unknown as TableSectionConfig,
    [config.layout]
  );

  const loadDataFromAPI = useCallback(async () => {
    if (!ca) { message.warning("Vui lòng chọn Kíp"); return; }
    if (!scope) { message.warning("Vui lòng chọn Lò cao"); return; }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!ngaySXValue) { message.warning("Vui lòng chọn Ngày sản xuất"); return; }

    try {
      setLoading(true);
      const ngaySXFormatted = ngaySXValue?.format
        ? ngaySXValue.format("YYYY-MM-DD")
        : ngaySXValue;

      const response = await napLieuLoCaoApi.getSiloMapped({
        idLoCao: Number(scope),
        ngay: ngaySXFormatted,
        idCa: Number(ca),
      });

      setMaterialColumnsOverride((response.columns as TableColumnDef[]) ?? null);

      const ngayHL = response.ngayHieuLuc ?? null;
      const idCaHL = response.idCaHieuLuc ?? null;
      if (ngayHL && idCaHL && (ngayHL !== ngaySXFormatted || idCaHL !== Number(ca))) {
        setConfigHieuLuc({ ngayHieuLuc: ngayHL, idCaHieuLuc: idCaHL });
      } else {
        setConfigHieuLuc(null);
      }

      const rows = (response.rows ?? []).map((row: any, index: number) => {
        const { time, ...rest } = row;
        const thoiGianNapLieu = time
          ? new Date(time).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "";
        return {
          key: row?.id ?? `row-${index}`,
          thoiGianNapLieu,
          ...rest,
        };
      });
      setTableData(rows);

      if (rows.length > 0) {
        message.success(`Cập nhật dữ liệu thành công! Có ${rows.length} bản ghi`);
      } else {
        message.info("Không có dữ liệu");
      }
    } catch {
      message.error("Không thể tải dữ liệu");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [ca, scope, form]);

  const handleFilter = useCallback(() => {
    loadDataFromAPI();
  }, [loadDataFromAPI]);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";

      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);

        if (res) {
          setSoPhieu((res as any)?.soPhieu || "");
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];

          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) {
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
              }
            });
          } else {
            ((res as any)?.pheDuyet || []).forEach((pd: any) => {
              const sig = config.signatures.find(
                (s) => getCapDuyet(s) === pd.capDuyet && s.type === "selectNguoiKy"
              );
              if (sig && pd.nguoiDuyetId) {
                signatureFields[sig.key] = pd.nguoiDuyetId;
              }
            });
          }

          const dateFields = config.headerFields
            .filter((f: any) => f.type === "date")
            .map((f: any) => f.key);

          const parsedDates: Record<string, any> = {};
          dateFields.forEach((fieldKey: string) => {
            if (data[fieldKey]) {
              const parsed = dayjs(data[fieldKey]);
              parsedDates[fieldKey] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          const normalizedData = {
            ...data,
            scope: data.scope ?? data.Scope ?? data.loCao ?? null,
          };

          const formValues = {
            ...normalizedData,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };

          form.setFieldsValue(formValues);

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => getCapDuyet(sig) === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) {
              form.setFieldsValue(overrides);
            }
          }

          setTableData(formValues.table1 || []);
          // Khôi phục cột động đã lưu để render đúng dataIndex khi xem chi tiết
          if (Array.isArray(data.materialColumns) && data.materialColumns.length > 0) {
            setMaterialColumnsOverride(data.materialColumns);
          }
          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
            idPhieuGoc:
              (res as any)?.idPhieuGoc ??
              (res as any)?.iD_PhieuGoc ??
              (res as any)?.ID_PhieuGoc ??
              null,
          });
        }
      } else {
        setPhieuInfo({});
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig: any) => getCapDuyet(sig) === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) {
            form.setFieldsValue(overrides);
          }
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo, getCapDuyet]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();

    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: getCapDuyet(s),
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const processedTable1 = tableData.map((row) => {
      const r = { ...row };
      delete r._isNewRow;
      delete r.key;
      return r;
    });

    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);

    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) {
        formattedDates[k] = formData[k].format("YYYY-MM-DD");
      }
    });

    return {
      ...formData,
      ...formattedDates,
      ca: formData.ca != null ? Number(formData.ca) : null,
      scope: formData.scope != null ? Number(formData.scope) : null,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      // Lưu cột động để khôi phục khi mở lại phiếu (xem chi tiết)
      materialColumns: materialColumnsOverride ?? [],
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [getUserInfo, form, config, tableData, getCapDuyet]);

  const handleStatusChange = useCallback(async () => {
    try {
      await form.validateFields();
    } catch (error: any) {
      message.error(error?.message || "Vui lòng kiểm tra dữ liệu trước khi đổi trạng thái");
    }
  }, [form]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieubienbannaplieulocao/${context.newPhieuId}`, { replace: true });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

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
      pheDuyet: phieuInfo.pheDuyet ?? [],
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>

        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div><b>{config.isoInfo.code}</b></div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {(config.isoInfo as any).revision || "-"}</div>
          </div>
        )}
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

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFilter}
            disabled={isFormLocked}
            loading={loading}
          >
            Tải dữ liệu
          </Button>
          {actionButtons}
        </div>

        {configHieuLuc && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Đang áp dụng cấu hình từ Ca ${configHieuLuc.idCaHieuLuc} ngày ${dayjs(configHieuLuc.ngayHieuLuc).format("DD/MM/YYYY")} (chưa có cấu hình riêng cho ngày/ca đang xem)`}
          />
        )}

        {tableConfig && (
          <CustomTableLG
            tableConfig={tableConfig}
            materialColumnsOverride={materialColumnsOverride}
            initialData={tableData}
            onDataChange={(rows) => setTableData(rows as TableRow[])}
            loading={loading}
            editable={!isFormLocked}
            showAddButton={!isFormLocked}
            showDeleteButton={!isFormLocked}
            minRows={0}
          />
        )}

        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig: any, i: number) => {
            const capDuyet = getCapDuyet(sig);
            const isLevelZero = capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === capDuyet);

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
                      {duyet?.tinhTrang === 1
                        ? "Đã ký"
                        : duyet?.tinhTrang === 2
                        ? "Đã từ chối"
                        : "Chưa xử lý"}
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

export default TaoPhieuNapLieuLoCao;
