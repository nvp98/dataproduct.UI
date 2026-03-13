/* eslint-disable @typescript-eslint/no-explicit-any */
import HRC2_BB_NauLuyen_BOF from "../../../utils/BM_config/HRC2_BB_NauLuyen_BOF.json";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { FilterOutlined, EyeOutlined, EyeInvisibleOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation, useNavigate } from "react-router-dom";
import CustomTableHRC from "../../../components/CustomTableHRC";
import type { HRCChildColumn, HRCTableRow, HRCParentColumn } from "../../../components/CustomTableHRC";
import CustomFormTable from "../../../components/CustomFormTable";
import { hrc2PhuLieuService } from "../../../services/HRC2PhuLieuService";
import {
  hrc2TableService,
  type DynamicColumnMeta,
  type AdjustColumnMeta,
} from "../../../services/HRC2TableService";
import HeaderMappingModal from "../../../components/HeaderMapping";
import type { HeaderMappingRecord } from "../../../components/HeaderMapping";
import { phieuActionService, type PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

const TaoPhieuTieuHaoNauLuyen_BOF = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { idphieu } = location.state || {};
  const hasExistingPhieu = Boolean(idphieu);
  const config = HRC2_BB_NauLuyen_BOF;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<HRCTableRow[]>([]);
  const [table2Data, setTable2Data] = useState<HRCTableRow[]>([]);
  const [phuGiaColumns, setPhuGiaColumns] = useState<HRCChildColumn[]>([]); // Phụ liệu loại PG (Phụ gia và chất khử oxy)
  const [khacColumns, setKhacColumns] = useState<HRCChildColumn[]>([]); // Phụ liệu chưa mapped → render vào "Khác"
  const [adjustColumnMetas, setAdjustColumnMetas] = useState<AdjustColumnMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [mappingRecord, setMappingRecord] = useState<HeaderMappingRecord | null>(null);
  const [showAdjustColumns, setShowAdjustColumns] = useState(false);
  // State để lưu thông tin phiếu cho action buttons
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});
  // Theo dõi thay đổi trên các field chính
  const ngaySX = Form.useWatch("NgaySX", form);
  const ca = Form.useWatch("ca", form);
  const scope = Form.useWatch("scope", form);
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

  // Xóa logic thêm adjust column thủ công - giờ tự động từ dữ liệu phân bổ
  const addAdjustColumn = useCallback(() => {
    message.info("Các cột điều chỉnh được tự động tạo từ dữ liệu phân bổ. Vui lòng lọc dữ liệu để xem.");
  }, []);

  // Các function thêm adjust column thủ công đã được xóa - giờ tự động từ dữ liệu phân bổ

  const openMappingModalWithRecord = useCallback((record: HeaderMappingRecord) => {
    setMappingRecord({
      idPhuLieu: record.idPhuLieu ?? null,
      tenPhuLieu: record.tenPhuLieu ?? record.tenNguonDuLieu ?? "",
      tenNguonDuLieu: record.tenNguonDuLieu ?? record.tenPhuLieu ?? "",
      idHeaderKey: record.idHeaderKey ?? null,
      mappingId: record.mappingId ?? null,
      headerKeyName: record.headerKeyName ?? undefined,
    });
    setMappingModalVisible(true);
  }, []);

  // Render title cho các cột động (dùng khi restore từ jsonData.table1DynamicColumns)
  const renderDynamicColumnTitle = useCallback(
    (label: string, meta?: DynamicColumnMeta) => {
      const handleOpenMapping = () => {
        if (meta?.mappingPayload) {
          openMappingModalWithRecord(meta.mappingPayload);
        } else {
          const payload: HeaderMappingRecord = {
            idPhuLieu: null,
            tenPhuLieu: label,
            tenNguonDuLieu: label,
            idHeaderKey: null,
            mappingId: null,
          };
          openMappingModalWithRecord(payload);
        }
      };

      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>{label}</span>
          {meta?.allowMapping && (
            <Button
              size="small"
              type="link"
              onClick={handleOpenMapping}
            >
              Map
            </Button>
          )}
        </div>
      );
    },
    [openMappingModalWithRecord]
  );

  const adjustChildColumns = useMemo<HRCChildColumn[]>(() => {
    if (!adjustColumnMetas.length) {
      return [];
    }
    return adjustColumnMetas.map((meta) => ({
      title: meta.headerKeyLabel ?? "Điều chỉnh",
      dataIndex: meta.dataIndex,
      width: meta.width ?? 140,
      editable: false, // ⭐ KHÔNG cho phép chỉnh sửa thủ công
      variant: "adjust",
      metaLabel: meta.headerKeyLabel ?? "Điều chỉnh",
      headerKeyId: meta.headerKeyId ?? null,
    }));
  }, [adjustColumnMetas]);

  const fetchPhuLieus = useCallback(async (params: { NgaySX?: string | null; Ca?: number | null; Scope?: number | null }) => {
    try {
      setLoading(true);
      
      // Lấy base columns từ config
      const baseColumns = config.layout.find(
        (l) => l.sectionType === "table" && l.key === "table1"
      )?.columns || [];

      // Xác định các field editable (theo config JSON) để preserve giá trị từ getDetail
      const editableFieldSet = new Set<string>();
      baseColumns.forEach((col: any) => {
        // Cột cha không có children
        if (col.dataIndex && !col.children && col.isLabel !== true) {
          const editable = col.editable !== false;
          if (editable) editableFieldSet.add(col.dataIndex);
        }

        // Cột con
        if (Array.isArray(col.children)) {
          col.children.forEach((child: any) => {
            if (!child.dataIndex) return;
            const editableParent = col.editable !== false;
            const editableChild = child.editable !== false;
            if (editableParent && editableChild) {
              editableFieldSet.add(child.dataIndex);
            }
          });
        }
      });
      const editableFields = Array.from(editableFieldSet);

      // Gọi service để xử lý dữ liệu phụ liệu
      const result = await hrc2PhuLieuService.fetchAndProcessPhuLieus(
        {
          NgaySX: params.NgaySX,
          Ca: params.Ca,
          LoaiBM: "BOF",
          Scope: params.Scope,
        },
        {
          onOpenMappingModal: openMappingModalWithRecord,
          baseColumns,
          mergeMappedPhuLieus: true,
        }
      );
      // Kiểm tra nếu không có dữ liệu (bao gồm trường hợp chỉ có item "row-empty")
      const isEmpty = !result.tableData || 
        result.tableData.length === 0 || 
        (result.tableData.length === 1 && result.tableData[0]?.key === "row-empty");
      
      if (isEmpty) {
        message.info("Không có dữ liệu phù hợp với điều kiện lọc.");
        setPhuGiaColumns([]);
        setKhacColumns([]);
        setAdjustColumnMetas([]);
        setTableData([]);
        return;
      }

      // Set columns và table data
      const readonlyPhuGia = (result.phuGiaColumns ?? []).map((col) => ({
        ...col,
        editable: false,
      }));
      const readonlyKhac = (result.khacColumns ?? []).map((col) => ({
        ...col,
        editable: false,
      }));

      setPhuGiaColumns(readonlyPhuGia);
      setKhacColumns(readonlyKhac);

      // Tự động tạo adjust columns từ dữ liệu phân bổ
      if (result.adjustColumns && result.adjustColumns.length > 0) {
        const adjustMetas = result.adjustColumns.map((col) => ({
          key: col.dataIndex || `adjust_${col.headerKeyId}`,
          dataIndex: col.dataIndex || `adjust_${col.headerKeyId}_adjust`,
          headerKeyId: col.headerKeyId ?? null,
          headerKeyLabel: col.metaLabel || col.title?.toString() || undefined,
          width: col.width || 140,
        }));
        setAdjustColumnMetas(adjustMetas);
        setShowAdjustColumns(true);
      } else {
        setAdjustColumnMetas([]);
      }

      // Merge dữ liệu mới từ server với dữ liệu đang nhập theo meThoi
      // Các field editable (config trong JSON) sẽ được preserve từ dữ liệu getDetail
      setTableData((prev) =>
        hrc2TableService.mergeServerRows(
          result.tableData || [],
          prev,
          "meThoi",
          editableFields
        )
      );
    } catch (error) {
      console.error("Failed to fetch phu lieus:", error);
      message.error("Không thể tải danh sách dữ liệu nhà máy");
    } finally {
      setLoading(false);
    }
  }, [openMappingModalWithRecord, config.layout]);

  const handleMappingCancel = useCallback(() => {
    setMappingModalVisible(false);
    setMappingRecord(null);
  }, []);

  const table1Columns = useMemo(() => {
    const tableLayout = config.layout.find(
      (l) => l.sectionType === "table" && l.key === "table1"
    ) as { columns?: HRCParentColumn[] } | undefined;
    const baseColumns: HRCParentColumn[] = tableLayout?.columns
      ? (tableLayout.columns as HRCParentColumn[])
      : [];

    return hrc2TableService.buildColumnsWithAdjust({
      baseColumns,
      slotColumns: {
        BOF_PhuGia: phuGiaColumns,
        others: khacColumns,
      },
      showAdjustColumns,
      manualAdjustColumns: adjustChildColumns,
      generateAdjustColumnsFromBase: false,
    });
  }, [config.layout, phuGiaColumns, khacColumns, showAdjustColumns, adjustChildColumns]);

  // Hàm load dữ liệu NM theo các filter hiện tại (dùng chung cho init, mapping success, button)
  const loadFromNM = useCallback(async () => {
    if (!ngaySX || !ca || !scope) return;

    await fetchPhuLieus({
      NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
      Ca: ca,
      Scope: scope,
    });
  }, [ngaySX, ca, scope, fetchPhuLieus]);

  /** Hàm xử lý khi bấm nút Filter */
  const handleFilter = useCallback(() => {
    if (!ngaySX || !ca || !scope) {
      message.warning("Vui lòng điền đầy đủ các thông tin: Ngày SX, Ca, và Scope");
      return;
    }
    loadFromNM();
  }, [ngaySX, ca, scope, loadFromNM]);

  const handleMappingSuccess = useCallback(async () => {
    setMappingModalVisible(false);
    setMappingRecord(null);
    await loadFromNM();
  }, [loadFromNM]);

  // Hàm khởi tạo dữ liệu ban đầu
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      // Gọi API lấy phiếu theo số phiếu
      const idPhieu = idphieu || ""; // Lấy từ state nếu có
      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);

        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          // data.Data là phần JSON đã parse (form động)
          const data = (res as any)?.jsonData || {};
          
          // Map pheDuyet vào form fields (giống như TaoPhieuPhoiNong.tsx)
          // Ưu tiên map từ jsonData.pheDuyet (có maKyDuyet), nếu không có thì map từ res.pheDuyet (chỉ có capDuyet)
          const signatureFields: Record<string, any> = {};
          
          // Map từ jsonData.pheDuyet (có maKyDuyet) - đây là dữ liệu mới nhất đã được lưu
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) {
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
              }
            });
          } else {
            // Fallback: map từ res.pheDuyet theo capDuyet (nếu jsonData không có pheDuyet)
            const pheDuyetFromApi = (res as any)?.pheDuyet || [];
            pheDuyetFromApi.forEach((pd: any) => {
              const signature = config.signatures.find(
                (s) => s.capduyet === pd.capDuyet && s.isChon
              );
              if (signature && pd.nguoiDuyetId) {
                signatureFields[signature.key] = pd.nguoiDuyetId;
              }
            });
          }
          
          // Chuyển chuỗi -> dayjs
          const tinhTrang = (res as any)?.tinhTrang ?? 0;
          const formValues = {
            ...data,
            ...signatureFields, // Merge signature fields vào formValues (override nếu jsonData cũng có)
            idphieu: (res as any)?.idphieu || "",
            NgaySX: data.NgaySX ? dayjs(data.NgaySX, "YYYY-MM-DD") : null,
          };
          form.setFieldsValue(formValues);
          
          // Nếu trạng thái là DangLuu, override lại các field có capduyet === 0 bằng currentUser
          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrideFields: Record<string, any> = {};
            config.signatures
              .filter((sig) => sig.isChon && sig.capduyet === 0)
              .forEach((sig) => {
                overrideFields[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrideFields).length > 0) {
              form.setFieldsValue(overrideFields);
            }
          }

          if (formValues.table1) {
            // Đảm bảo các dòng có flag IsNM
            // Dòng từ server không có IsNM -> mặc định là true (từ NM)
            // Dòng có IsNM = false -> giữ nguyên (thêm tay)
            const processedTable1 = (formValues.table1 as HRCTableRow[]).map((row) => ({
              ...row,
              IsNM: row.IsNM !== undefined ? row.IsNM : true, // Mặc định là true nếu không có
            }));
            setTableData(processedTable1);
          } else {
            setTableData([]);
          }

          if (formValues.table2) {
            // Tương tự table1: chuẩn hóa flag IsNM cho bảng tồn (table2)
            const processedTable2 = (formValues.table2 as HRCTableRow[]).map((row) => ({
              ...row,
              IsNM: row.IsNM !== undefined ? row.IsNM : true,
            }));
            setTable2Data(processedTable2);
          } else {
            setTable2Data([]);
          }
          
          // Khôi phục cấu hình cột động (nếu có) để hiển thị đúng phụ liệu đã lưu
          if (formValues.table1DynamicColumns) {
            const dyn = formValues.table1DynamicColumns as Record<
              string,
              DynamicColumnMeta[]
            >;
            const restored = hrc2TableService.restoreDynamicGroups(
              dyn,
              renderDynamicColumnTitle
            );
            setPhuGiaColumns(restored.BOF_PhuGia ?? []);
            setKhacColumns(restored.others ?? []);
            if (dyn.adjust) {
              setAdjustColumnMetas(hrc2TableService.adjustMetaFromDynamic(dyn.adjust));
            } else {
              setAdjustColumnMetas([]);
            }
          }


          // Lưu thông tin phiếu cho action buttons
          setPhieuInfo({
            tinhTrang: (res as any)?.tinhTrang ?? 0,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });

          // message.success("Đã tải dữ liệu phiếu!");
        }
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
      // Khi vào component, luôn tự động load dữ liệu từ NM (nếu đủ filter)
      await loadFromNM();
    }
  }, [form, idphieu, loadFromNM, config.signatures, renderDynamicColumnTitle, currentUserInfo]);

  /** Gọi khi load lần đầu */
  useEffect(() => {
    initData();
  }, [initData]);

  // Helper để lấy userInfo
  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  // Function để lấy formData mới nhất (được gọi mỗi khi click button)
  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();
    
    const pheDuyetFlow = config.signatures
      .filter((s) => s.isChon)
      .map((s) => ({
        capDuyet: s.capduyet,
        maKyDuyet: s.key,
        nguoiDuyetId: form.getFieldValue(s.key),
        tinhTrang: 0,
        ghiChu: "",
      }));
    
    const hasCreator = config.signatures.find(
      (x) => x.isChon === false && x.capduyet === 1
    );
    if (hasCreator) {
      pheDuyetFlow.unshift({
        capDuyet: 1,
        maKyDuyet: hasCreator?.key || "",
        nguoiDuyetId: userInfo.iD_TaiKhoan ?? null,
        tinhTrang: 1,
        ghiChu: "Người tạo phiếu",
      });
    }

    const dynamicColumnMap = hrc2TableService.buildDynamicColumnMap({
      BOF_PhuGia: phuGiaColumns,
      others: khacColumns,
    });
    dynamicColumnMap.adjust = hrc2TableService.adjustMetaToDynamic(adjustColumnMetas);

    // Đảm bảo các dòng có flag IsNM được gửi lên
    // Dòng từ NM: IsNM = true (hoặc undefined, mặc định là true)
    // Dòng thêm tay: IsNM = false
    const processedTable1 = tableData.map((row) => {
      const processedRow = { ...row };
      // Nếu không có flag IsNM, mặc định là true (dòng từ NM)
      if (processedRow.IsNM === undefined) {
        processedRow.IsNM = true;
      }
      // Xóa flag _isNewRow trước khi gửi lên
      delete processedRow._isNewRow;
      return processedRow;
    });

    const processedTable2 = table2Data.map((row) => {
      const processedRow = { ...row };
      if (processedRow.IsNM === undefined) {
        processedRow.IsNM = true;
      }
      delete processedRow._isNewRow;
      return processedRow;
    });

    return {
      ...formData,
      NgaySX: formData.NgaySX ? formData.NgaySX.format("YYYY-MM-DD") : null,
      maBm: config.code,
      prefix: config.prefix,
      // nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: processedTable1,
      table2: processedTable2,
      table1DynamicColumns: dynamicColumnMap,
      pheDuyet: pheDuyetFlow,
    };
  }, [
    getUserInfo,
    form,
    config.signatures,
    config.code,
    phuGiaColumns,
    khacColumns,
    adjustColumnMetas,
    tableData,
    table2Data,
  ]);

  // Render action buttons từ PhieuActionService
  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate("/taophieutieuhaonauluyen_bof", {
          replace: true,
          state: { idphieu: context.newPhieuId },
        });
        return;
      }
      await initData();
    },
    [navigate, initData]
  );

  const actionButtons = useMemo(() => {
    const userInfo = getUserInfo();
    // const filteredPheDuyet = (phieuInfo.pheDuyet ?? []).filter(
    //   (item) => (item.capDuyet ?? 0) !== 0
    // );
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
      onSuccess: handleActionSuccess,
      onError: (error) => {
        console.error("Action error:", error);
      },
    });

    if (buttons.length === 0) return null;
    
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [getUserInfo, idphieu, phieuInfo, getFormData, handleActionSuccess]);

  return (
    <Card style={{ margin: 24, boxShadow: "0 2px 8px #f0f1f2" }}>
      {/* Tiêu đề biên bản */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >

        {/* Tiêu đề trung tâm */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {config.title}
          </Typography.Title>
          {idphieu && <b>Số phiếu: {soPhieu}</b>}
        </div>

        {/* ISO góc phải */}
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
        {/* HEADER - các trường nhập đầu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <CustomFormItem
              key={f.key || idx}
              field={f}
              idx={idx}
              disabled={hasExistingPhieu }
            />
          ))}
        </div>
        {/* Nút Filter */}
        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFilter}
            disabled={isFormLocked }
            loading={loading}
          >
            Làm mới dữ liệu
          </Button>
          <Button
            icon={showAdjustColumns ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setShowAdjustColumns(!showAdjustColumns)}
          >
            {showAdjustColumns ? "Ẩn" : "Hiện"} điều chỉnh số liệu
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={addAdjustColumn}
            disabled={isFormLocked}
          >
            Thêm cột điều chỉnh
          </Button>
        </div>
        {/* TABLE - danh sách phôi */}
        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && layout.key === "table1" ? (
              <>
              <CustomTableHRC
                maBm={config.code}
                ngaySX={ngaySX}
                ca={ca}
                scope={scope}
                bieuMau={"BOF"}
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
              />
              <div style={{ fontWeight: 600, marginTop: 12 }}>
                Phần điều chỉnh số liệu nằm ở cuối bảng (scroll ngang → cột "Điều chỉnh số liệu").
              </div>
              </>
            ) : (
              layout.sectionType === "table" && (
                <CustomFormTable
                  columns={layout.columns || []}
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
                columns={layout.columns || []}
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

        {/* FOOTER - ghi chú */}
        {/* <div style={{ marginTop: 24 }}>
          <Typography.Text strong>Ghi chú:</Typography.Text>
          <ul>
            {config.footerNotes?.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div> */}

        {/* SIGNATURES - ký tên */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures
            .filter((x) => x.isChon)
            ?.map((sig, i) => {
              const isLevelZero = sig.capduyet === 0;
              // Khi trạng thái là DangLuu và cấp duyệt = 0, luôn lấy currentUser, không quan tâm form có giá trị hay không
              const shouldUseCurrentUser = currentTinhTrang === TrangThaiPhieuConst.DangLuu && isLevelZero;
              
              return (
                <div key={sig.key || i}>
                  <CustomFormItem
                    field={sig}
                    idx={i}
                    disabled={isSignatureReadonly || isFormLocked}
                    initialValue={
                      shouldUseCurrentUser
                        ? currentUserInfo?.iD_TaiKhoan ?? null
                        : form.getFieldValue(sig.key)
                    }
                  />
                </div>
              );
            })}
          
        </div>

      </Form>
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
        {actionButtons}
      </div>
      <HeaderMappingModal
        open={mappingModalVisible}
        record={mappingRecord}
        onCancel={handleMappingCancel}
        onSuccess={handleMappingSuccess}
      />
    </Card>
  );
};

export default TaoPhieuTieuHaoNauLuyen_BOF;
