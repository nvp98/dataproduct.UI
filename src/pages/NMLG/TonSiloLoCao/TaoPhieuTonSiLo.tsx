/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_TonSiLo from "../../../utils/BM_config/LG_BB_TonSiLo.json";
import { Button, Card, Form, Input, Table, Typography, message } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import CustomFormTable from "../../../components/CustomFormTable";
import { PhieuApi } from "../../../services/PhieuApi";

import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { tonSiLoLoCaoApi } from "../../../services/NMLGService";

interface TableRow {
  key?: string;
  [key: string]: any;
}

interface LoCaoItem {
  id: number;
  tenLoCao: string;
}

const TaoPhieuTonSiLo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = LG_BB_TonSiLo;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loCaoOptions, setLoCaoOptions] = useState<Array<{ label: string; value: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  const scope = Form.useWatch("scope", form);
  const ca = Form.useWatch("ca", form);
  Form.useWatch("NgaySX", form);

  const currentUserInfo = useMemo(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

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

  const loadDsLoCao = useCallback(async () => {
    try {
      const res = await PhieuApi.getDsLoCao();
      const options = (Array.isArray(res) ? res : [])
        .map((item: LoCaoItem) => ({
          label: item.tenLoCao,
          value: item.id,
        }))
        .filter((item) => Number.isFinite(item.value));
      setLoCaoOptions(options);
    } catch {
      setLoCaoOptions([]);
    }
  }, []);

  const loadDataFromAPI = useCallback(async () => {
    if (!scope) {
      message.warning("Vui lòng chọn Lò cao");
      return;
    }
    if (!ca) {
      message.warning("Vui lòng chọn Ca");
      return;
    }
    const ngaySXValue = form.getFieldValue("NgaySX");
    if (!ngaySXValue) {
      message.warning("Vui lòng chọn Ngày sản xuất");
      return;
    }
    try {
      setLoading(true);
      const ngayFormatted = ngaySXValue?.format
        ? ngaySXValue.format("YYYY-MM-DD")
        : ngaySXValue;
      const response = await tonSiLoLoCaoApi.getByFilter({
        idLoCao: Number(scope),
        idCa: Number(ca),
        ngay: ngayFormatted,
      });
      const list = Array.isArray(response) ? response : (response as any)?.data ?? [];
      if (list.length > 0) {
        const sorted = [...list].sort((a: any, b: any) => (a.thuTu ?? 0) - (b.thuTu ?? 0));
        const rows = sorted.map((item: any, index: number) => ({
          key: item.id ?? `row-${index}`,
          stt: index + 1,
          silo: item.tenSiLo ?? "",
          loaiNguyenNhienLieu: item.tenNL_DieuChinh ?? item.tenNL ?? "",
          klTonCuoiKip: item.ton ?? null,
          ghiChu: "",
        }));
        setTableData(rows);
        message.success(`Tải dữ liệu thành công! Có ${rows.length} bản ghi`);
      } else {
        setTableData([]);
        message.info("Không có dữ liệu");
      }
    } catch {
      message.error("Không thể tải dữ liệu");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [scope, ca, form]);

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
                (s: any) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
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
          const formValues = {
            ...data,
            locao: data.locao ?? data.loCao ?? data.scope ?? null,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          };

          form.setFieldsValue(formValues);

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => sig.capDuyet === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });

            if (Object.keys(overrides).length > 0) {
              form.setFieldsValue(overrides);
            }
          }

          setTableData(
            (formValues.table1 || []).map((row: any, index: number) => ({
              ...row,
              stt: row.stt || index + 1,
            }))
          );

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
            .filter((sig: any) => sig.capDuyet === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });

          if (Object.keys(overrides).length > 0) {
            form.setFieldsValue(overrides);
          }

          if (tableData.length === 0) {
            setTableData([{ key: "row-0", stt: 1 }]);
          }
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo, tableData.length]);

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    loadDsLoCao();
  }, [loadDsLoCao]);

  const headerFields = useMemo(() => {
    return config.headerFields.map((field: any) => {
      if (field.key !== "scope") return field;

      return {
        ...field,
        options: loCaoOptions.length > 0 ? loCaoOptions : field.options || [],
        placeholder: "Chọn lò cao",
      };
    });
  }, [config.headerFields, loCaoOptions]);

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

    const processedTable1 = tableData.map((row, index) => {
      const r = { ...row };
      delete r._isNewRow;
      delete r.key;
      r.stt = index + 1;
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
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [getUserInfo, form, config, tableData]);

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
        navigate(`/taophieubienbantonsilolocao/${context.newPhieuId}`, {
          replace: true,
        });
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
      onError: (error) => {
        console.error("Action error:", error);
      },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleStatusChange, handleActionSuccess]);

  const tableSection = config.layout.find(
    (section: any) => section.sectionType === "table" && section.key === "table1"
  );

  const summaryColumns = useMemo(
    () => (tableSection?.summary?.columns as string[] | undefined) || [],
    [tableSection]
  );

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
            <div>
              <b>{config.isoInfo.code}</b>
            </div>
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
          {headerFields.map((f: any, idx: number) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={isFormLocked} />
          ))}
        </div>

        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={loadDataFromAPI}
            disabled={isFormLocked}
            loading={loading}
          >
            Tải dữ liệu
          </Button>
          {actionButtons}
        </div>

        {config.layout.map((layout: any, idx: number) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={tableSection?.columns || []}
                initialData={tableData}
                onDataChange={(rows) =>
                  setTableData(
                    (rows as TableRow[]).map((row, index) => ({
                      ...row,
                      stt: index + 1,
                    }))
                  )
                }
                addRowButtonText="+ Thêm dòng"
                minRows={1}
                loading={loading}
                editable={!isFormLocked}
                showAddButton={!isFormLocked}
                showDeleteButton={!isFormLocked}
                stickyHeader={true}
                scrollY={800}
                summary={(pageData) => {
                  const totals: Record<string, number> = {};
                  summaryColumns.forEach((field) => {
                    totals[field] = 0;
                  });

                  pageData.forEach((row: any) => {
                    summaryColumns.forEach((field) => {
                      totals[field] += Number(row[field]) || 0;
                    });
                  });

                  const totalValue = totals.klTonCuoiKip || 0;

                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} colSpan={3} align="center">
                          TỔNG CỘNG
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {totalValue.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        ))}

        {config.footerNotes?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Typography.Text strong style={{ fontStyle: "italic" }}>
              Ghi chú:
            </Typography.Text>
            {config.footerNotes.map((note: string, idx: number) => (
              <div key={`note-${idx}`} style={{ fontStyle: "italic" }}>
                - {note}
              </div>
            ))}
          </div>
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

export default TaoPhieuTonSiLo;
