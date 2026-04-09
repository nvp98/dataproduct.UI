/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable from "../../../components/CustomFormTable";
import type { HRCTableRow } from "../../../components/CustomTableHRC";
import BBGN_ThepLong from "../../../utils/BM_config/BBGN_ThepLong.json";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import { PhieuApi } from "../../../services/PhieuApi";
import { phieuActionService, type PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { FilterOutlined } from "@ant-design/icons";
import { bbgbThepLongApi } from "../../../services/BBGNThepLongApi";

const TaoPhieuGN = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    "phieu_gn_theplong_id",
    "/giaonhantheplong"
  );
  const config = BBGN_ThepLong;
  const [form] = Form.useForm();

  const hasExistingPhieu = Boolean(idphieu);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [tableData, setTableData] = useState<HRCTableRow[]>([]);
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const currentTinhTrang = phieuInfo.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
    currentTinhTrang === TrangThaiPhieuConst.HieuChinh
  );

  const loadDetail = useCallback(async () => {
    if (!idphieu) return;
    const res = await safeGetDetail(() => PhieuApi.getDetail(idphieu));
    if (!res) return;
    const detail: any = (res as any)?.data ?? res;

    setSoPhieu(detail?.soPhieu ?? "");
    setPhieuInfo({
      tinhTrang: detail?.tinhTrang ?? 0,
      nguoiTaoId: detail?.nguoiTaoId ?? null,
      idphongBan: detail?.idphongBan ?? null,
      pheDuyet: detail?.pheDuyet ?? [],
      isClone: detail?.isClone ?? false,
    });

    const json = detail?.jsonData ?? {};
    form.setFieldsValue({
      ...json,
      NgaySX: json?.NgaySX ? dayjs(json.NgaySX) : undefined,
    });
    setTableData(Array.isArray(json?.table1) ? json.table1 : []);
  }, [form, idphieu, safeGetDetail]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        if (idphieu) await loadDetail();
      } catch (e) {
        console.error(e);
        message.error("Không thể tải dữ liệu phiếu");
      } finally {
        setLoading(false);
      }
    })();
  }, [idphieu, loadDetail]);

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const getFormData = useCallback(
    async (actionKey?: string) => {
      const userInfo = getUserInfo();
      const isSend = actionKey === "saveAndSend" || actionKey === "gui";

      const headerFieldKeys = (config.headerFields || []).map((f: any) => f.key);
      const signatureKeys = (config.signatures || [])
        .filter((s: any) => s.isChon)
        .map((s: any) => s.key);
      const fieldsToValidate = isSend ? [...headerFieldKeys, ...signatureKeys] : headerFieldKeys;
      await form.validateFields(fieldsToValidate);

      const values = form.getFieldsValue(true);
      const pheDuyetFlow = (config.signatures || [])
        .filter((s: any) => s.isChon)
        .map((s: any) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      return {
        ...values,
        NgaySX: values?.NgaySX ? dayjs(values.NgaySX).format("YYYY-MM-DD") : null,
        maBm: config.code,
        prefix: config.prefix,
        scope: 2,
        xuongId: userInfo.iD_PhanXuong ?? null,
        idphongBan: userInfo.iD_PhongBan ?? null,
        table1: tableData,
        pheDuyet: pheDuyetFlow,
      };
    },
    [config.code, config.headerFields, config.prefix, config.signatures, form, getUserInfo, tableData]
  );

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/taophieugiaonhantheplong");
        return;
      }
      if (idphieu) await loadDetail();
    },
    [idphieu, loadDetail, navigateToDetail]
  );

  const handleFetch = useCallback(async () => {
    const ngaySX = form.getFieldValue("NgaySX")?.format("YYYY-MM-DD");
    const ca = form.getFieldValue("ca");
    if (!ngaySX || !ca) {
      message.warning("Vui lòng chọn Ngày và Ca trước khi làm mới dữ liệu");
      return;
    }
    try {
      setLoading(true);
      const res = await bbgbThepLongApi.load({
        IdPhieu: idphieu || null,
        NgaySX: ngaySX,
        Ca: ca,
        NhaMay: 2,
      });
      const data = (res as any)?.data ?? res;
      if (Array.isArray(data)) {
        setTableData(data);
        message.success("Lấy dữ liệu thành công");
      } else {
        message.error("Lấy dữ liệu thất bại");
      }
    } catch {
      message.error("Lấy dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu]);

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
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => console.error("Action error:", error),
    });
    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getFormData, getUserInfo, handleActionSuccess, idphieu, phieuInfo, redirectToList]);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }} loading={loading}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>
        {config.isoInfo && (
          <div style={{ fontSize: 13, textAlign: "right", lineHeight: "20px" }}>
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
            <div>Ngày hiệu lực: {config.isoInfo.effectiveDate}</div>
            <div>Lần sửa đổi: {config.isoInfo.revision}</div>
          </div>
        )}
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {(config.headerFields || []).map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={hasExistingPhieu || isFormLocked} />
          ))}
        </div>
        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFetch}
            disabled={isFormLocked }
            loading={loading}
          >
            Làm mới dữ liệu
          </Button>
        </div>
        <div style={{ marginTop: 16 }}>
          <CustomFormTable
            columns={(config.layout?.[0]?.columns || []) as any}
            initialData={tableData}
            onDataChange={(rows) => setTableData(rows as HRCTableRow[])}
            addRowButtonText="+ Thêm dòng"
            showAddButton={!isFormLocked}
            showDeleteButton={!isFormLocked}
            minRows={0}
            editable={!isFormLocked}
            loading={loading}
          />
        </div>

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {(config.signatures || [])
            .filter((x: any) => x.isChon)
            .map((sig: any, i: number) => (
              <div key={sig.key || i}>
                <CustomFormItem field={sig} idx={i} disabled={isFormLocked} />
              </div>
            ))}
        </div>
      </Form>

      <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {actionButtons}
      </div>
    </Card>
  );
};

export default TaoPhieuGN;

