/* eslint-disable @typescript-eslint/no-explicit-any */
import HRC2_BB_NauLuyen_LF from "../../../utils/BM_config/HRC2_BB_NauLuyen_LF.json";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { FilterOutlined, LinkOutlined, EyeOutlined, EyeInvisibleOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation, useNavigate } from "react-router-dom";
import CustomTableHRC from "../../../components/CustomTableHRC";
import type { HRCChildColumn, HRCTableRow, HRCParentColumn } from "../../../components/CustomTableHRC";
import CustomFormTable from "../../../components/CustomFormTable";
import { hrc2PhuLieuService } from "../../../services/HRC2PhuLieuService";
import { hrc2TableService, type DynamicColumnMeta, type AdjustColumnMeta } from "../../../services/HRC2TableService";
import HeaderMappingModal from "../../../components/HeaderMapping";
import type { HeaderMappingRecord } from "../../../components/HeaderMapping";
import HeaderKeyAutocomplete from "../../../components/HeaderKeyAutocomplete";
import type { HeaderKey } from "../../../models/HeaderKeyModel";
import { phieuActionService, type PheDuyetItem } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";

const DEFAULT_EXCLUDED_KEYS = ["meThoi", "macThep","queLayMau","queDoNhiet", "ghiChu", "stt", "STT"];

const TaoPhieuTieuHaoNauLuyen_LF = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { idphieu } = location.state || {};
  const hasExistingPhieu = Boolean(idphieu);

  const config = HRC2_BB_NauLuyen_LF;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<HRCTableRow[]>([]);
  const [table2Data, setTable2Data] = useState<HRCTableRow[]>([]);
  const [phuGiaColumns, setPhuGiaColumns] = useState<HRCChildColumn[]>([]); // Phụ liệu loại PG (Phụ gia và chất khử oxy)
  const [chatHopKimColumns, setChatHopKimColumns] = useState<HRCChildColumn[]>([]); // Phụ liệu loại KL (Chất hợp kim hóa)
  const [khacColumns, setKhacColumns] = useState<HRCChildColumn[]>([]); // Phụ liệu chưa mapped → render vào "Khác"
  const [adjustColumnMetas, setAdjustColumnMetas] = useState<AdjustColumnMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [mappingModalVisible, setMappingModalVisible] = useState(false);
  const [mappingRecord, setMappingRecord] = useState<HeaderMappingRecord | null>(null);
  const [showAdjustColumns, setShowAdjustColumns] = useState(false);
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
  // Khóa form giống BOF: chỉ mở khi Đang lưu hoặc Đã thu hồi
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi
  );

  const addAdjustColumn = useCallback(() => {
    setShowAdjustColumns(true);
    setAdjustColumnMetas((prev) => {
      const key = `adjust_${Date.now()}`;
      return [
        ...prev,
        {
          key,
          dataIndex: `${key}_adjust`,
          headerKeyId: null,
          headerKeyLabel: undefined,
          width: 140,
        },
      ];
    });
  }, []);

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  const updateAdjustColumnMeta = useCallback(
    (columnKey: string, patch: Partial<AdjustColumnMeta>) => {
      setAdjustColumnMetas((prev) =>
        prev.map((meta) => (meta.key === columnKey ? { ...meta, ...patch } : meta))
      );
    },
    []
  );

  const handleAdjustOptionSelect = useCallback(
    (columnKey: string, option: HeaderKey | null) => {
      updateAdjustColumnMeta(columnKey, {
        headerKeyId: option?.id ?? null,
        headerKeyLabel: option
          ? option.tenHienThi || option.mota || `Header Key #${option.id}`
          : undefined,
      });
    },
    [updateAdjustColumnMeta]
  );

  const handleAdjustValueChange = useCallback(
    (columnKey: string, value: number | null) => {
      if (value === null) {
        updateAdjustColumnMeta(columnKey, {
          headerKeyId: null,
          headerKeyLabel: undefined,
        });
        return;
      }
      updateAdjustColumnMeta(columnKey, { headerKeyId: value });
    },
    [updateAdjustColumnMeta]
  );

  const removeAdjustColumn = useCallback(
    (columnKey: string) => {
      setAdjustColumnMetas((prev) => {
        const target = prev.find((meta) => meta.key === columnKey);
        if (target) {
          setTableData((rows) =>
            rows.map((row) => {
              if (!(target.dataIndex in row)) {
                return row;
              }
              const next = { ...row };
              delete next[target.dataIndex];
              return next;
            })
          );
        }
        return prev.filter((meta) => meta.key !== columnKey);
      });
    },
    [setTableData]
  );

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

  const renderDynamicColumnTitle = useCallback(
    (label: string, meta?: DynamicColumnMeta) => {
      const handleOpenMapping = () => {
        if (meta?.mappingPayload) {
          openMappingModalWithRecord(meta.mappingPayload);
        } else {
          // Tạo payload mới từ meta nếu chưa có
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
              icon={<LinkOutlined />}
              onClick={handleOpenMapping}
            />
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
      title: (
        <div style={{ width: "100%" }}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeAdjustColumn(meta.key)}
              style={{
                padding: "4px",
                minWidth: "auto",
                height: "auto",
              }}
            />
            <HeaderKeyAutocomplete
              value={meta.headerKeyId ?? null}
              defaultLabel={meta.headerKeyLabel ?? undefined}
              allowClear
              size="small"
              placeholder="Chọn phụ liệu"
              onChange={(val) => handleAdjustValueChange(meta.key, val)}
              onSelectOption={(option) => handleAdjustOptionSelect(meta.key, option)}
              style={{ width: "100%" }}
            />
            
          </div>
      ),
      dataIndex: meta.dataIndex,
      width: meta.width ?? 140,
      editable: true,
      variant: "adjust",
      metaLabel: meta.headerKeyLabel ?? "Chưa chọn phụ liệu",
    }));
  }, [adjustColumnMetas, handleAdjustValueChange, handleAdjustOptionSelect, removeAdjustColumn]);

  const restoreDynamicColumns = useCallback(
    (map?: Record<string, DynamicColumnMeta[]>) => {
      if (!map) return;
      const restored = hrc2TableService.restoreDynamicGroups(
        map,
        renderDynamicColumnTitle
      );
      setPhuGiaColumns(restored.PG ?? []);
      setChatHopKimColumns(restored.KL ?? []);
      setKhacColumns(restored.others ?? []);
      if (map.adjust) {
        setAdjustColumnMetas(hrc2TableService.adjustMetaFromDynamic(map.adjust));
      } else {
        setAdjustColumnMetas([]);
      }
    },
    [renderDynamicColumnTitle]
  );

  const fetchPhuLieus = useCallback(async (params: { NgaySX?: string | null; Ca?: number | null; Scope?: number | null }) => {
    try {
      setLoading(true);
      
      // Lấy base columns từ config
      const baseColumns = config.layout.find(
        (l) => l.sectionType === "table" && l.key === "table1"
      )?.columns || [];

      // Xác định các field editable dựa trên config JSON
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
          LoaiBM: "LF",
          Scope: params.Scope,
        },
        {
          onOpenMappingModal: openMappingModalWithRecord,
          baseColumns,
        }
      );

      // Kiểm tra nếu không có dữ liệu (bao gồm trường hợp chỉ có item "row-empty")
      const isEmpty = !result.tableData || 
        result.tableData.length === 0 || 
        (result.tableData.length === 1 && result.tableData[0]?.key === "row-empty");
      
      if (isEmpty) {
        message.info("Không có dữ liệu phù hợp với điều kiện lọc.");
        setPhuGiaColumns([]);
        setChatHopKimColumns([]);
        setKhacColumns([]);
        setTableData([]);
        return;
      }

      // Set columns và table data
      setPhuGiaColumns(result.phuGiaColumns);
      setChatHopKimColumns(result.chatHopKimColumns);
      setKhacColumns(result.khacColumns);
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
      message.error("Không thể tải danh sách phụ liệu");
    } finally {
      setLoading(false);
    }
  }, [openMappingModalWithRecord, config.layout]);

  // Hàm load dữ liệu NM theo filter hiện tại (dùng chung init/filter/mapping)
  const loadFromNM = useCallback(async () => {
    if (!ngaySX || !ca || !scope) return;
    await fetchPhuLieus({
      NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
      Ca: ca,
      Scope: scope,
    });
  }, [ngaySX, ca, scope, fetchPhuLieus]);

  const handleMappingSuccess = useCallback(async () => {
    setMappingModalVisible(false);
    setMappingRecord(null);
    await loadFromNM();
  }, [loadFromNM]);

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
        PG: phuGiaColumns,
        KL: chatHopKimColumns,
        others: khacColumns,
      },
      excludedAdjustKeys: DEFAULT_EXCLUDED_KEYS,
      showAdjustColumns,
      manualAdjustColumns: adjustChildColumns,
      generateAdjustColumnsFromBase: false,
    });
  }, [
    config.layout,
    phuGiaColumns,
    chatHopKimColumns,
    khacColumns,
    showAdjustColumns,
    adjustChildColumns,
  ]);

  /** Hàm xử lý khi bấm nút Filter */
  const handleFilter = useCallback(() => {
    if (!ngaySX || !ca || !scope) {
      message.warning("Vui lòng điền đầy đủ các thông tin: Ngày SX, Ca, và Scope");
      return;
    }
    loadFromNM();
  }, [ngaySX, ca, scope, loadFromNM]);

  // Hàm khởi tạo dữ liệu ban đầu
  const initData = useCallback(async () => {
    try {
      setLoading(true);
      const idPhieu = idphieu || "";
      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);

        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          const data = (res as any)?.jsonData || {};

          // Map chữ ký
          const signatureFields: Record<string, any> = {};
          const pheDuyetFromJson = data.pheDuyet || [];
          if (pheDuyetFromJson.length > 0) {
            pheDuyetFromJson.forEach((pd: any) => {
              if (pd.maKyDuyet && pd.nguoiDuyetId) {
                signatureFields[pd.maKyDuyet] = pd.nguoiDuyetId;
              }
            });
          } else {
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
            ...signatureFields,
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
            const processedTable1 = (formValues.table1 as HRCTableRow[]).map((row) => ({
              ...row,
              IsNM: row.IsNM !== undefined ? row.IsNM : true,
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
          }

          if (formValues.table1DynamicColumns) {
            restoreDynamicColumns(
              formValues.table1DynamicColumns as Record<string, DynamicColumnMeta[]>
            );
          }

          setPhieuInfo({
            tinhTrang: (res as any)?.tinhTrang ?? 0,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });

          // message.success("Đã tải dữ liệu phiếu!");
        }
      } else {
        setPhieuInfo({});
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
      // Sau khi khôi phục phiếu, tự động load dữ liệu NM (nếu đủ filter)
      await loadFromNM();
    }
  }, [form, idphieu, restoreDynamicColumns, config.signatures, loadFromNM, currentUserInfo]);

  /** Gọi khi load lần đầu */
  useEffect(() => {
    initData();
  }, [initData]);

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
      PG: phuGiaColumns,
      KL: chatHopKimColumns,
      others: khacColumns,
    });
    dynamicColumnMap.adjust = hrc2TableService.adjustMetaToDynamic(adjustColumnMetas);

    const processedTable1 = tableData.map((row) => {
      const processedRow = { ...row };
      if (processedRow.IsNM === undefined) {
        processedRow.IsNM = true;
      }
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
    chatHopKimColumns,
    khacColumns,
    adjustColumnMetas,
    tableData,
    table2Data,
  ]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate("/taophieutieuhaonauluyen_lf", {
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
        {/* Logo + tên công ty */}
        {/* <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <img
            src="https://report.hoaphatdungquat.vn/img/logoHP.png"
            alt="logo"
            style={{ height: "auto", width: 150 }}
          />
          {config.headerInfo && (
            <>
              <Typography.Text strong>
                {config.headerInfo.subCompany}
              </Typography.Text>
              <Typography.Text>{config.headerInfo.company}</Typography.Text>
            </>
          )}
        </div> */}

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
              disabled={hasExistingPhieu}
            />
          ))}
        </div>
        {/* Nút Filter */}
        <div style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={handleFilter}
            disabled={isFormLocked}
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
              <CustomTableHRC
                maBm={config.code}
                ngaySX={ngaySX}
                ca={ca}
                scope={scope}
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
              const autoValue = isLevelZero
                ? currentUserInfo?.iD_TaiKhoan ?? null
                : undefined;
              return (
                <div key={sig.key || i}>
                  <CustomFormItem
                    field={sig}
                    idx={i}
                    disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                    initialValue={autoValue ?? form.getFieldValue(sig.key)}
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

export default TaoPhieuTieuHaoNauLuyen_LF;
