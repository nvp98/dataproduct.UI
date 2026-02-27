/* eslint-disable @typescript-eslint/no-explicit-any */
import CTD_BB_GiaoNhanPhoiNhapKho from "../../../utils/BM_config/CTD_BB_GiaoNhanPhoiNhapKho.json";
import { Button, Card, Form, Input, Typography, message, Table } from "antd";
import { FilePdfOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormTable from "../../../components/CustomFormTable";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import { phoiNhapKhoApi, sanLuongPhoiApi } from "../../../services/BMDucCTDApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

const TaoPhieuPhoiNhapKho = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = CTD_BB_GiaoNhanPhoiNhapKho;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  // Theo dõi thay đổi trên các field chính
  const kip = Form.useWatch("kip", form);
  const ca = Form.useWatch("ca", form);
  const mayduc = Form.useWatch("mayduc", form);
  const ngaySX = Form.useWatch("NgaySX", form);

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

  // Khóa form: chỉ mở khi Đang lưu hoặc Đã thu hồi
  const isFormLocked = !(
    currentTinhTrang === TrangThaiPhieuConst.DangLuu ||
    currentTinhTrang === TrangThaiPhieuConst.DaThuHoi
  );

  const getUserInfo = useCallback(() => {
    const stored = localStorage.getItem("userinfo");
    return stored ? JSON.parse(stored) : {};
  }, []);

  /** Hàm load dữ liệu từ API theo filter */
  const loadDataFromAPI = useCallback(async () => {
    
    if (!kip) {
      message.warning("Vui lòng chọn Kíp");
      return;
    }

    if (!ca) {
      message.warning("Vui lòng chọn Ca");
      return;
    }

    if (!mayduc) {
      message.warning("Vui lòng chọn Máy đúc");
      return;
    }

    // Kiểm tra ngày từ form thay vì từ watch
    const ngaySXValue = form.getFieldValue("NgaySX");

    if (!ngaySXValue) {
      message.warning("Vui lòng chọn Ngày sản xuất");
      return;
    }

    try {
      setLoading(true);
      // Format ngày nếu là dayjs object, nếu không thì dùng trực tiếp
      const ngaySXFormatted = ngaySXValue?.format ? ngaySXValue.format("YYYY-MM-DD") : ngaySXValue;
      
      const params = { 
        kip, 
        ca: Number(ca),
        mayduc: Number(mayduc),
        ngaySX: ngaySXFormatted 
      };
      
      const response = await phoiNhapKhoApi.getByKipNgay(params);
      
      if (response && Array.isArray(response)) {
        const updatedData = response.map((newRow: any, index: number) => {
          // Tìm record hiện tại có cùng điều kiện nếu cần
          const existingRow = tableData.find((row: any) => 
            row.id === newRow.id
          );
          
          // Nếu tìm thấy record cũ có ID, giữ nguyên ID
          if (existingRow && existingRow.id) {
            return {
              key: existingRow.key || `row-${index}`,
              ...newRow,
              id: existingRow.id, // Giữ nguyên ID cũ
            };
          }
          
          // Nếu không tìm thấy, trả về record mới
          return {
            key: `row-${index}`,
            ...newRow,
          };
        });
        
        setTableData(updatedData);
        message.success(`Cập nhật dữ liệu thành công! Có ${updatedData.length} bản ghi`);
      } else {
        setTableData([]);
        message.info("Không có dữ liệu");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      message.error("Không thể tải dữ liệu");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [kip, ca, mayduc , form, tableData]);

  /** Hàm xử lý khi bấm nút Filter */
  const handleFilter = useCallback(() => {
    const ngaySXValue = form.getFieldValue("NgaySX");

    if (!kip) {
      message.warning("Vui lòng chọn Kíp");
      return;
    }
    if (!ca) {
      message.warning("Vui lòng chọn Ca");
      return;
    }
    if (!mayduc) {
      message.warning("Vui lòng chọn Máy đúc");
      return;
    }
    if (!ngaySXValue) {
      message.warning("Vui lòng chọn Ngày sản xuất");
      return;
    }
    loadDataFromAPI();
  }, [kip, ca, mayduc, form, loadDataFromAPI]);

  // Hàm khởi tạo dữ liệu ban đầu
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
                 (s) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy"
               );
               if (signature && pd.nguoiDuyetId) {
                 signatureFields[signature.key] = pd.nguoiDuyetId;
               }
             });
           }
 
           const tinhTrang = (res as any)?.tinhTrang ?? 0;
           
           // Lấy tất cả date fields từ config
           const dateFields = config.headerFields
             .filter((f: any) => f.type === "date")
             .map((f: any) => f.key);
           
           // Parse tất cả date fields an toàn
           const parsedDates: Record<string, any> = {};
           dateFields.forEach((fieldKey: string) => {
             if (data[fieldKey]) {
               const parsed = dayjs(data[fieldKey]);
               parsedDates[fieldKey] = parsed.isValid() ? parsed : null;
             }
           });       
           const formValues = {
             ...data,
             ...signatureFields,
             ...parsedDates,
             idphieu: (res as any)?.idphieu || "",
           };  
           form.setFieldsValue(formValues);
 
           // Nếu trạng thái là DangLuu, override lại các field có capDuyet === 0 bằng currentUser
           if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
             const overrideFields: Record<string, any> = {};
             config.signatures
               .filter((sig) => sig.capDuyet === 0)
               .forEach((sig) => {
                 overrideFields[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
               });
             if (Object.keys(overrideFields).length > 0) {
               form.setFieldsValue(overrideFields);
             }
           }
 
           if (formValues.table1) {
             setTableData(formValues.table1);
           } else {
             setTableData([]);
           }
 
           setPhieuInfo({
             tinhTrang: (res as any)?.tinhTrang ?? 0,
             nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
             idphongBan: (res as any)?.idphongBan ?? null,
             pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
             isClone: (res as any)?.isClone ?? false,
           });
         }
       } else {
         // Tạo phiếu mới - set giá trị mặc định cho cấp duyệt 0
         setPhieuInfo({});
         
         // Set người ký cấp 0 = user hiện tại
         setTimeout(() => {
           const overrideFields: Record<string, any> = {};
           config.signatures
             .filter((sig) => sig.capDuyet === 0)
             .forEach((sig) => {
               overrideFields[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
             });
           if (Object.keys(overrideFields).length > 0) {
            // console.log("🆕 Set default signature for new form:", overrideFields);
             form.setFieldsValue(overrideFields);
           }
         }, 300);
       }
     } catch (err: any) {
      // console.error("Lỗi khởi tạo dữ liệu:", err);
       message.error("Không thể tải dữ liệu ban đầu!");
     } finally {
       setLoading(false);
     }
   }, [form, idphieu, config.signatures, currentUserInfo]);
  /** Gọi khi load lần đầu */
  useEffect(() => {
    initData();
  }, [initData]);
  
  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();

    const pheDuyetFlow = config.signatures.map((s) => ({
      capDuyet: s.capDuyet,
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const dataToProcess = tableData;

    const processedTable1 = dataToProcess.map((row) => {
      const processedRow = { ...row };
      delete processedRow.key;
      delete processedRow._isNewRow;
      return processedRow;
    });

    // Format tất cả date fields
    const dateFields = config.headerFields
      .filter((f: any) => f.type === "date")
      .map((f: any) => f.key);
    
    const formattedDates: Record<string, any> = {};

    dateFields.forEach((fieldKey: string) => {
      if (formData[fieldKey]) {
        formattedDates[fieldKey] = formData[fieldKey].format("YYYY-MM-DD");
      }
    });

    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix
    };
  }, [getUserInfo, form, config.signatures, config.code, config.headerFields, config.prefix, tableData]);

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      if (context?.newPhieuId) {
        navigate(`/taophieubienbanphoinapkho/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }
      
      // Reload lại dữ liệu phiếu sau khi action thành công
      await initData();
    },
    [navigate, initData]
  );
  
  const handleStatusChange = useCallback(
    async (idPhieu: string, newStatus: number) => {
      console.log("🔔 handleStatusChange called:", { idPhieu, newStatus });
      
      // Xử lý insert/delete dựa trên trạng thái mới
      try {
        const formValues = await form.validateFields();
        console.log("✅ Form validated:", formValues);

        // Nếu đơn đã phê duyệt hoàn tất => Insert
        if (newStatus === TrangThaiPhieuConst.HoanThanh) {
          console.log("📥 Preparing to INSERT phoi nhap kho...");
          
          const dataToProcess = tableData;
          
          const payload = {
            idPhieu: idPhieu,
            soPhieu: soPhieu || "",
            ngaySX: formValues.NgaySX ? formValues.NgaySX.format("YYYY-MM-DD") : "",
            kip: formValues.kip || "",
            ca: formValues.ca || 0,
            mayDuc: formValues.mayDuc || 0,
            table1: dataToProcess.map((row) => ({
              me: row.me || "",
              mac: row.mac || "",
              kichThuoc: row.kichThuoc || "",
              stLoai1: Number(row.stLoai1) || 0,
              klLoai1: Number(row.klLoai1) || 0,
              stPhoiNgan: Number(row.stPhoiNgan) || 0,
              cdPhoiNgan: Number(row.cdPhoiNgan) || 0,
              klPhoiNgan: Number(row.klPhoiNgan) || 0,
              stLoai2: Number(row.stLoai2) || 0,
              klLoai2: Number(row.klLoai2) || 0,
              stLoai2tp: Number(row.stLoai2tp) || 0,
              klLoai2tp: Number(row.klLoai2tp) || 0,
              stLoai3: Number(row.stLoai3) || 0,
              klLoai3: Number(row.klLoai3) || 0,
              tongSoThanh: Number(row.tongSoThanh) || 0,
              tongKhoiLuong: Number(row.tongKhoiLuong) || 0,
            })),
          };
          
         // console.log("📦 Insert phoi nhap kho payload:", payload);
          await phoiNhapKhoApi.insertPhoiNhapKho(payload);
          // console.log("✅ INSERT phoi nhap kho successful!");
          // message.success("Đã insert dữ liệu phôi nhập kho thành công!");
        }
        
        // Nếu đơn đã thu hồi => Delete
        if (newStatus === TrangThaiPhieuConst.DaThuHoi) {
        //  console.log("🗑️ Preparing to DELETE phoi nhap kho...");
          await phoiNhapKhoApi.deletePhoiNhapKhoByIdPhieu(idPhieu);
          // console.log("✅ DELETE phoi nhap kho successful!");
          // message.success("Đã xóa dữ liệu phôi nhập kho!");
        }
      } catch (error: any) {
        console.error("❌ Error in handleStatusChange:", error);
        console.error("Error details:", error?.response?.data || error?.message);
        // Hiện error để user biết
        message.error(`Lỗi: ${error?.response?.data?.message || error?.message || "Không xác định"}`);
      }
    },
    [form, soPhieu, tableData]
  );

  const handleExportPdf = async () => {
    if (!idphieu) {
      message.warning("Vui lòng lưu phiếu trước khi xuất PDF!");
      return;
    }

    try {
      setLoading(true);
      const response = await phoiNhapKhoApi.exportPhoiNhapKhoPdf({
        NgaySX: form.getFieldValue("NgaySX") ? form.getFieldValue("NgaySX").format("YYYY-MM-DD") : undefined,
        Ca: form.getFieldValue("ca"),
        Kip: form.getFieldValue("kip"),
        idPhieu: idphieu,
      });

      const blob = new Blob([response as any], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Bien_ban_san_luong_phoi_${soPhieu || idphieu}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Xuất PDF thành công!");
    } catch (error: any) {
      console.error("Export PDF failed:", error);
      message.error(error?.message || "Xuất file PDF thất bại!");
    } finally {
      setLoading(false);
    }
  };
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
              disabled={isFormLocked}
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
            Tải dữ liệu
          </Button>
           {idphieu && (currentTinhTrang === TrangThaiPhieuConst.HoanThanh || currentTinhTrang === TrangThaiPhieuConst.DaChot) && (
          <Button
            type="default"
            icon={<FilePdfOutlined />}
            onClick={handleExportPdf}
            loading={loading}
          >
            Xuất PDF
          </Button>
        )}
        {actionButtons}
        </div>

        {/* TABLE - danh sách phôi */}
        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={tableSection?.columns || []}
                initialData={tableData}
                onDataChange={(rows) => setTableData(rows as TableRow[])}
                addRowButtonText="+ Thêm dòng"
                showAddButton={!isFormLocked}
                showDeleteButton={!isFormLocked}
                minRows={0}
                editable={!isFormLocked && (layout as any).editable !== false}
                loading={loading}
              //  selectionEnabled={false}
                summary={(pageData) => {
                  // Tính tổng cho từng cột số
                  const totals = {
                    stLoai1: 0,
                    klLoai1: 0,
                    stPhoiNgan: 0,
                    klPhoiNgan: 0,
                    cdPhoiNgan:0,
                    stLoai2: 0,
                    klLoai2: 0,
                    stLoai2tp: 0,
                    klLoai2tp: 0,
                    stLoai3: 0,
                    klLoai3: 0,
                    tongSoThanh: 0,
                    tongKhoiLuong: 0,
                  };

                  pageData.forEach((row: any) => {
                    totals.stLoai1 += Number(row.stLoai1) || 0;
                    totals.klLoai1 += Number(row.klLoai1) || 0;
                    totals.stPhoiNgan += Number(row.stPhoiNgan) || 0;
                    totals.klPhoiNgan += Number(row.klPhoiNgan) || 0;
                    totals.cdPhoiNgan += Number(row.cdPhoiNgan) || 0;
                    totals.stLoai2 += Number(row.stLoai2) || 0;
                    totals.klLoai2 += Number(row.klLoai2) || 0;
                    totals.stLoai2tp += Number(row.stLoai2tp) || 0;
                    totals.klLoai2tp += Number(row.klLoai2tp) || 0;
                    totals.stLoai3 += Number(row.stLoai3) || 0;
                    totals.klLoai3 += Number(row.klLoai3) || 0;
                    totals.tongSoThanh += Number(row.tongSoThanh) || 0;
                    totals.tongKhoiLuong += Number(row.tongKhoiLuong) || 0;
                  });

                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ backgroundColor: "#fafafa", fontWeight: "bold" }}>
                        <Table.Summary.Cell index={0} colSpan={3} align="center">
                          TỔNG CỘNG
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {totals.stLoai1.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          {totals.klLoai1.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                       <Table.Summary.Cell index={3} align="right">
                          {totals.stLoai2.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} align="right">
                          {totals.klLoai2.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                        <Table.Summary.Cell index={5} align="right">
                          {totals.stLoai2tp.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          {totals.klLoai2tp.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                        <Table.Summary.Cell index={7} align="right">
                          {totals.stPhoiNgan.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={8} align="right">
                          {totals.cdPhoiNgan.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={9} align="right">
                          {totals.klPhoiNgan.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                  

                        <Table.Summary.Cell index={10} align="right">
                          {totals.stLoai3.toLocaleString("en-US")}
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={11} align="right">
                          {totals.klLoai3.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                        <Table.Summary.Cell index={12} align="right">
                          {totals.tongKhoiLuong.toLocaleString("en-US")}
                        </Table.Summary.Cell>

                        
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </div>
        ))}

        {/* SIGNATURES - ký tên */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          {config.signatures?.map((sig, i) => {
            const isLevelZero = sig.capDuyet === 0;
            const autoValue = isLevelZero
              ? currentUserInfo?.iD_TaiKhoan ?? null
              : undefined;
            
            // Lấy thông tin phê duyệt
            const duyet = phieuInfo.pheDuyet?.find(
              (p: any) => p.capDuyet === sig.capDuyet
            );
            
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
                      {duyet?.tinhTrang === 1 ? "Đã ký" 
                      :duyet?.tinhTrang === 2 ? "Đã từ chối" 
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

export default TaoPhieuPhoiNhapKho;
