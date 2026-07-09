/* eslint-disable @typescript-eslint/no-explicit-any */
import HRC1_BB_TieuHao_LF from "../../../utils/BM_config/HRC1_BB_TieuHao_LF.json";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { usePhieuNavigation } from "../../../hooks/usePhieuNavigation";
import CustomTableHRC from "../../../components/CustomTableHRC";
import type { HRCChildColumn, HRCTableRow, HRCParentColumn, CustomTableHRCHandle } from "../../../components/CustomTableHRC";
import CustomFormTable from "../../../components/CustomFormTable";
import { hrc1LFPhuLieuService } from "../../../services/HRC1LFPhuLieuService";
import { dlnmHRC1Api } from "../../../services/DLNMHRC1Api";
import { hrc2TableService, type DynamicColumnMeta } from "../../../services/HRC2TableService";
import { phieuActionService, type PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

const TaoTieuHaoTinhLuyenLF = () => {
  const { idphieu, navigateToDetail, safeGetDetail, redirectToList } = usePhieuNavigation(
    "phieu_hrc1_lf_id",
    "/hrc1_tieuhaotinhluyenlf"
  );
  const hasExistingPhieu = Boolean(idphieu);
  const config = HRC1_BB_TieuHao_LF;
  const [form] = Form.useForm();

  const table1Ref = useRef<CustomTableHRCHandle>(null);
  const [tableData, setTableData] = useState<HRCTableRow[]>([]);
  const [table2Data, setTable2Data] = useState<HRCTableRow[]>([]);
  const [table1LyDo, setTable1LyDo] = useState("");
  const [phuGiaColumns, setPhuGiaColumns] = useState<HRCChildColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const ngaySX = Form.useWatch("NgaySX", form);
  const ca = Form.useWatch("ca", form);
  const scope = Form.useWatch("scope", form);
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

  // Render title cho cột phụ liệu khi restore từ jsonData.table1DynamicColumns — LF không có nút Map
  // (danh mục HRC1_PhuLieuNM cố định theo BieuMau, không cần Header Mapping như HRC2).
  const renderDynamicColumnTitle = useCallback((label: string) => <span>{label}</span>, []);

  const fetchPhuLieus = useCallback(async (paramsIn: { NgaySX?: string | null; Ca?: number | null; Scope?: number | null }) => {
    try {
      setLoading(true);

      const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
        a === "left" || a === "center" || a === "right" ? a : undefined;
      const rawBase = config.layout.find(
        (l) => l.sectionType === "table" && l.key === "table1"
      )?.columns || [];
      const baseColumns: HRCParentColumn[] = rawBase.map((col: any) => {
        if (Array.isArray(col.children)) {
          return {
            ...col,
            align: alignType(col.align),
            children: col.children.map((c: any) => ({ ...c, align: alignType(c.align) })),
          };
        }
        return { ...col, align: alignType(col.align) };
      });

      const editableFieldSet = new Set<string>();
      baseColumns.forEach((col: any) => {
        if (col.dataIndex && !col.children && col.isLabel !== true) {
          const editable = col.editable !== false;
          if (editable) editableFieldSet.add(col.dataIndex);
        }
        if (Array.isArray(col.children)) {
          col.children.forEach((child: any) => {
            if (!child.dataIndex) return;
            const editableParent = col.editable !== false;
            const editableChild = child.editable !== false;
            if (editableParent && editableChild) editableFieldSet.add(child.dataIndex);
          });
        }
      });

      const result = await hrc1LFPhuLieuService.fetchAndProcessPhuLieus(
        { NgaySX: paramsIn.NgaySX, Ca: paramsIn.Ca, Scope: paramsIn.Scope },
        { baseColumns }
      );

      // Cột phụ liệu LF luôn hiển thị đủ (lấy từ danh mục), kể cả khi chưa có mẻ nào — khác BOF
      // (không early-return xóa cột khi trống, vì người dùng cần cột trống để bắt đầu nhập).
      setPhuGiaColumns(result.phuGiaColumns);

      const isEmpty = !result.tableData ||
        result.tableData.length === 0 ||
        (result.tableData.length === 1 && result.tableData[0]?.key === "row-empty");

      if (isEmpty) {
        message.info("Chưa có dữ liệu đã lưu cho Ngày/Ca/Tinh luyện này — có thể bắt đầu thêm dòng mới.");
        setTableData([]);
        return;
      }

      const editableFields = [
        ...Array.from(editableFieldSet),
        ...result.phuGiaColumns.map((c) => c.dataIndex),
      ];

      setTableData((prev) =>
        hrc2TableService.mergeServerRows(result.tableData || [], prev, "meThoi", editableFields)
      );
    } catch (error) {
      console.error("Failed to fetch phu lieus:", error);
      message.error("Không thể tải danh sách dữ liệu đã lưu");
    } finally {
      setLoading(false);
    }
  }, [config.layout]);

  const table1Columns = useMemo(() => {
    const tableLayout = config.layout.find(
      (l) => l.sectionType === "table" && l.key === "table1"
    ) as { columns?: HRCParentColumn[] } | undefined;
    const alignType = (a: unknown): "left" | "center" | "right" | undefined =>
      a === "left" || a === "center" || a === "right" ? a : undefined;
    const normalizeAlign = (cols: any[]): HRCParentColumn[] =>
      cols.map((col) => {
        if (Array.isArray(col.children)) {
          return { ...col, align: alignType(col.align), children: col.children.map((c: any) => ({ ...c, align: alignType(c.align) })) };
        }
        return { ...col, align: alignType(col.align) };
      });
    const baseColumns: HRCParentColumn[] = tableLayout?.columns ? normalizeAlign(tableLayout.columns as any[]) : [];

    return hrc2TableService.buildColumnsWithAdjust({
      baseColumns,
      slotColumns: { LF_PhuGia: phuGiaColumns },
      showAdjustColumns: false,
      generateAdjustColumnsFromBase: false,
    });
  }, [config.layout, phuGiaColumns]);

  const loadFromNM = useCallback(async () => {
    if (!ngaySX || !ca || !scope) return;
    await fetchPhuLieus({ NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"), Ca: ca, Scope: scope });
  }, [ngaySX, ca, scope, fetchPhuLieus]);

  const handleFilter = useCallback(() => {
    if (!ngaySX || !ca || !scope) {
      message.warning("Vui lòng điền đầy đủ các thông tin: Ngày SX, Ca, và Tinh luyện");
      return;
    }
    loadFromNM();
  }, [ngaySX, ca, scope, loadFromNM]);

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";
      if (idPhieu) {
        const res = await safeGetDetail(() => PhieuApi.getDetail(idPhieu));

        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          const data = (res as any)?.jsonData || {};

          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
            });
          } else {
            const pheDuyetFromApi = (res as any)?.pheDuyet || [];
            pheDuyetFromApi.forEach((pd: any) => {
              const signature = config.signatures.find((s) => s.capduyet === pd.capDuyet && s.isChon);
              if (signature && pd.nguoiDuyetId) signatureFields[signature.key] = pd.nguoiDuyetId;
            });
          }

          const tinhTrang = (res as any)?.tinhTrang ?? 0;
          const formValues = {
            ...data,
            ...signatureFields,
            idphieu: (res as any)?.idphieu || "",
            NgaySX: data.NgaySX ? dayjs(data.NgaySX, "YYYY-MM-DD") : null,
          };
          form.setFieldsValue(formValues);

          const nguoiTaoIdFromRes = (res as any)?.nguoiTaoId ?? null;
          const hasNguoiTaoIdFromRes = nguoiTaoIdFromRes != null && Number(nguoiTaoIdFromRes) > 0;
          const cap0Signatures = config.signatures.filter((s: any) => s.isChon && s.capduyet === 0);

          if (cap0Signatures.length > 0) {
            const overrideFields: Record<string, any> = {};
            if (
              tinhTrang === TrangThaiPhieuConst.DangLuu ||
              tinhTrang === TrangThaiPhieuConst.DaThuHoi ||
              tinhTrang === TrangThaiPhieuConst.HieuChinh
            ) {
              const currentUserInfo = getUserInfo();
              cap0Signatures.forEach((sig: any) => {
                overrideFields[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            } else if (hasNguoiTaoIdFromRes) {
              cap0Signatures.forEach((sig: any) => {
                overrideFields[sig.key] = nguoiTaoIdFromRes;
              });
            }
            if (Object.keys(overrideFields).length > 0) form.setFieldsValue(overrideFields);
          }

          if (formValues.table1) {
            const processedTable1 = (formValues.table1 as HRCTableRow[]).map((row) => ({
              ...row,
              IsNM: false,
            }));
            setTableData(processedTable1);
          } else {
            setTableData([]);
          }

          if (formValues.table2) {
            const processedTable2 = (formValues.table2 as HRCTableRow[]).map((row) => ({
              ...row,
              IsNM: row.IsNM !== undefined ? row.IsNM : true,
            }));
            setTable2Data(processedTable2);
          } else {
            setTable2Data([]);
          }

          setTable1LyDo(formValues.table1_lyDo || "");

          if (formValues.table1DynamicColumns) {
            const dyn = formValues.table1DynamicColumns as Record<string, DynamicColumnMeta[]>;
            const restored = hrc2TableService.restoreDynamicGroups(dyn, renderDynamicColumnTitle);
            setPhuGiaColumns(restored.LF_PhuGia ?? []);
          }

          setPhieuInfo({
            tinhTrang: (res as any)?.tinhTrang ?? 0,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });
        }
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
      await loadFromNM();
    }
  }, [form, idphieu, loadFromNM, config.signatures, renderDynamicColumnTitle, getUserInfo, safeGetDetail]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async (actionKey?: string) => {
    const userInfo = getUserInfo();
    const isSend = actionKey === "saveAndSend" || actionKey === "gui";
    const isCreateNew = !idphieu;
    const headerFieldKeys = config.headerFields.map((f: any) => f.key);
    const signatureKeys = config.signatures.filter((s) => s.isChon).map((s) => s.key);
    const fieldsToValidate = isSend ? [...headerFieldKeys, ...signatureKeys] : headerFieldKeys;
    await form.validateFields(fieldsToValidate);
    if (!(table1Ref.current?.validate() ?? true)) throw new Error("validation");
    const formData = form.getFieldsValue(true);

    const pheDuyetFlow = config.signatures
      .filter((s) => s.isChon)
      .map((s) => ({
        capDuyet: s.capduyet,
        maKyDuyet: s.key,
        nguoiDuyetId: form.getFieldValue(s.key),
        tinhTrang: 0,
        ghiChu: "",
      }));

    const hasCreator = config.signatures.find((x) => x.isChon === false && x.capduyet === 1);
    if (hasCreator) {
      pheDuyetFlow.unshift({
        capDuyet: 1,
        maKyDuyet: hasCreator?.key || "",
        nguoiDuyetId: userInfo.iD_TaiKhoan ?? null,
        tinhTrang: 1,
        ghiChu: "Người tạo phiếu",
      });
    }

    const processedTable1 = hrc1LFPhuLieuService.sanitizeRowsBeforeSubmit(tableData);

    const dynamicColumnMap = hrc2TableService.buildDynamicColumnMap({ LF_PhuGia: phuGiaColumns });

    const processedTable2 = table2Data.map((row) => {
      const processedRow = { ...row };
      if (processedRow.IsNM === undefined) processedRow.IsNM = true;
      delete processedRow._isNewRow;
      return processedRow;
    });

    return {
      ...formData,
      NgaySX: formData.NgaySX ? formData.NgaySX.format("YYYY-MM-DD") : null,
      maBm: config.code,
      prefix: config.prefix,
      nguoiTaoId: isCreateNew ||
        phieuInfo.tinhTrang === TrangThaiPhieuConst.DaThuHoi ||
        phieuInfo.tinhTrang === TrangThaiPhieuConst.HieuChinh
          ? userInfo.iD_TaiKhoan ?? null
          : phieuInfo.nguoiTaoId ?? null,
      tenScope: scope ? "Tinh luyện " + scope : null,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: processedTable1,
      table1_lyDo: table1LyDo,
      table2: processedTable2,
      table1DynamicColumns: dynamicColumnMap,
      pheDuyet: pheDuyetFlow,
    };
  }, [
    getUserInfo, form, config.headerFields, config.signatures, config.code, config.prefix,
    idphieu, phieuInfo.nguoiTaoId, phieuInfo.tinhTrang, scope, phuGiaColumns, tableData, table1LyDo, table2Data,
  ]);

  const handleAutoSave = useCallback(async () => {
    if (!idphieu) return;
    try {
      const formData = await getFormData("save");
      await PhieuApi.putData(idphieu, formData);
      message.success("Lưu phiếu thành công!");
      await initData();
    } catch (err) {
      console.error("Auto save error:", err);
      message.error("Không thể tự động lưu phiếu");
    }
  }, [idphieu, getFormData, initData]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigateToDetail(context.newPhieuId, "/hrc1_taotieuhaotinhluyenlf");
        return;
      }
      await initData();
    },
    [navigateToDetail, initData]
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
      redirectToList,
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
      },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleActionSuccess, redirectToList]);

  return (
    <>
      <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
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
              <div>Lần sửa đổi: {config.isoInfo.revision}</div>
            </div>
          )}
        </div>

        <Form form={form} layout="vertical">
          <Form.Item name="idphieu" hidden>
            <Input type="hidden" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {config.headerFields.map((f, idx) => (
              <CustomFormItem key={f.key || idx} field={f} idx={idx} disabled={hasExistingPhieu} />
            ))}
          </div>

          <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
            <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} disabled={isFormLocked} loading={loading}>
              Làm mới dữ liệu
            </Button>
          </div>

          {config.layout.map((layout, idx) => (
            <div key={idx}>
              {layout.sectionType === "table" && layout.key === "table1" ? (
                <CustomTableHRC
                  maBm={config.code}
                  ngaySX={ngaySX}
                  ca={ca}
                  scope={scope}
                  bieuMau={"LF"}
                  isHasExistingPhieu={hasExistingPhieu}
                  columns={table1Columns}
                  initialData={tableData}
                  onDataChange={setTableData}
                  addRowButtonText="+ Thêm dòng"
                  showAddButton={!isFormLocked}
                  showDeleteButton={!isFormLocked}
                  minRows={1}
                  editable={!isFormLocked && (layout as any).editable !== false}
                  loading={loading}
                  stickyHeaders
                  stickyFirstColumn
                  stickyColumnKeys={["meThoi", "macThep"]}
                  scrollX="1500px"
                  lyDoLabel={(layout as any).lyDo?.label}
                  lyDoValue={table1LyDo}
                  onLyDoChange={setTable1LyDo}
                  onSave={handleAutoSave}
                  deleteApi={dlnmHRC1Api}
                  chuyenMeThoiApi={dlnmHRC1Api}
                  ref={table1Ref}
                />
              ) : (
                layout.sectionType === "table" && (
                  <CustomFormTable
                    columns={(layout.columns || []) as any}
                    initialData={tableData}
                    onDataChange={(rows) => setTableData(rows as HRCTableRow[])}
                    addRowButtonText="+ Thêm dòng"
                    showAddButton={!isFormLocked}
                    showDeleteButton={!isFormLocked}
                    minRows={1}
                    editable={!isFormLocked && (layout as any).editable !== false}
                    loading={loading}
                  />
                )
              )}
            </div>
          ))}
          {config.layout2.map((layout, idx) => (
            <div key={idx}>
              {layout.sectionType === "table" && (
                <CustomFormTable
                  columns={(layout.columns || []) as any}
                  initialData={table2Data}
                  onDataChange={(rows) => setTable2Data(rows as HRCTableRow[])}
                  className="w-full overflow-x-auto"
                  addRowButtonText="+ Thêm dòng tồn"
                  showAddButton={!isFormLocked}
                  showDeleteButton={!isFormLocked}
                  minRows={0}
                  editable={!isFormLocked && (layout as any).editable !== false}
                  loading={loading}
                  compactWhenEmpty
                />
              )}
            </div>
          ))}

          <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
            {config.signatures
              .filter((x) => x.isChon)
              ?.map((sig, i) => {
                const isLevelZero = sig.capduyet === 0;
                const nguoiTaoIdFromPhieu = phieuInfo.nguoiTaoId ?? null;
                const hasNguoiTaoIdFromPhieu = nguoiTaoIdFromPhieu != null && Number(nguoiTaoIdFromPhieu) > 0;

                const shouldUseCurrentUser =
                  isLevelZero &&
                  (!idphieu ||
                    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
                    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi ||
                    currentTinhTrang === TrangThaiPhieuConst.HieuChinh);

                const cap0InitialValue = isLevelZero
                  ? shouldUseCurrentUser
                    ? getUserInfo()?.iD_TaiKhoan ?? null
                    : hasNguoiTaoIdFromPhieu
                      ? nguoiTaoIdFromPhieu
                      : undefined
                  : undefined;

                return (
                  <div key={sig.key || i}>
                    <CustomFormItem
                      maBm={config.code}
                      field={sig}
                      idx={i}
                      disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                      initialValue={cap0InitialValue}
                    />
                  </div>
                );
              })}
          </div>
        </Form>
        <div style={{ textAlign: "center", marginTop: 32, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {actionButtons}
        </div>
      </Card>
    </>
  );
};

export default TaoTieuHaoTinhLuyenLF;
