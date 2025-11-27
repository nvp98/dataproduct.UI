import CTD_BB_Phoinong from "../../../utils/BM_config/CTD_BB_Phoinong.json";
import {
  Button,
  Card,
  Form,
  Input,
  Typography,
  message,
  Modal,
  InputNumber,
  Table,
} from "antd";
import CustomFormTable from "../../../components/CustomFormTable";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import { phoiGiaoNhanApi } from "../../../services/BKPhoiThepApi";
import CustomFormItem from "../../../components/CustomFormItem";
import { v4 as uuidv4 } from "uuid";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation } from "react-router-dom";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";

const TaoPhieuPhoiNong = () => {
  const location = useLocation();
  const { idphieu } = location.state || {};

  const config = CTD_BB_Phoinong;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [thungData, setThungData] = useState<any[]>([]);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialValues, setPartialValues] = useState<
    Record<
      string,
      {
        loaiI?: number;
        loaiIIBm?: number;
        loaiIITp?: number;
        loaiIII?: number;
        chuyenST?: number;
      }
    >
  >({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<
    Array<string | number>
  >([]);
  // Theo dõi thay đổi trên các field chính
  const ngaySX = Form.useWatch("NgaySX", form);
  const ca = Form.useWatch("ca", form);
  const mayduc = Form.useWatch("mayduc", form);

  // Lấy tất cả field keys từ columns
  // const getAllFieldKeys = (columns: any[]): string[] => {
  //   const keys: string[] = [];
  //   columns.forEach((col) => {
  //     if (col.dataIndex) {
  //       keys.push(col.dataIndex);
  //     }
  //     if (col.children) {
  //       col.children.forEach((child: any) => {
  //         if (child.dataIndex) {
  //           keys.push(child.dataIndex);
  //         }
  //       });
  //     }
  //   });
  //   return keys;
  // };

  // Khởi tạo dữ liệu bảng với cấu trúc đúng
  // const getInitialTableData = () => {
  //   const tableLayout = config.layout.find((l) => l.sectionType === "table");
  //   if (!tableLayout) return [{ key: uuidv4() }];

  //   const fieldKeys = getAllFieldKeys(tableLayout.columns);

  //   return [
  //     {
  //       key: 1,
  //       ...fieldKeys.reduce((acc, key) => {
  //         acc[key] = "";
  //         return acc;
  //       }, {} as any),
  //     },
  //   ];
  // };

  /* Map dữ liệu API thành table */
  const mapApiToTable = (res: any[]) => {
    if (!res || res.length === 0) {
      return [
        {
          key: uuidv4(),
          me: "",
          mac: "",
          kichThuoc: "",
          loaiI_TP: 0,
          loaiI_BM: 0,
          loaiII_TP: 0,
          loaiII_BM: 0,
          loaiIII_TP: 0,
          loaiIII_BM: 0,
          tongKhoi: 0,
          tinhTrang: 0,
          ghiChu: "",
          stChuaChuyen: 0,
        },
      ];
    }
    return (res || []).map((item: any) => ({
      key: item.id || uuidv4(),
      me: item.me ?? "",
      mac: item.mac ?? "",
      duc: item.mayDuc ?? "",
      nmc: item.nmc ?? "",
      kichThuoc: item.kichThuoc ?? "",
      loaiI_TP: item.soThanh ?? 0,
      loaiI_BM: item.tongKhoiLuong ?? item.tongKhoiLuog ?? 0,
      loaiII_TP: item.LoaiII_TP ?? 0,
      loaiII_BM: item.LoaiII_BM ?? 0,
      loaiIII_TP: item.LoaiIII_TP ?? 0,
      loaiIII_BM: item.LoaiIII_BM ?? 0,
      tongKhoi: item.tongKhoiLuong ?? item.tongKhoiLuog ?? 0,
      tongSoThanh: 0,
      stChuaChuyen: item.stChuaChuyen ?? item.LoaiI_TP ?? 0,
      stBKM: Number(item.stChuaChuyen ?? item.LoaiI_TP ?? 0),
      tinhTrang: 0,
      ghiChu: item.GhiChu ?? "",
    }));
  };

  // Hàm tải dữ liệu bảng (dùng chung cho init + watcher)
  const fetchTableData = async (params: any) => {
    try {
      setLoading(true);
      const tablePhoiNong = config.layout.find(
        (l) =>
          l.sectionType === "table" &&
          l.key === "table1" &&
          config.code === "CTD_BB_Phoinong"
      );
      if (!tablePhoiNong) return; // check đúng bảng phôi nóng

      if (tablePhoiNong && tablePhoiNong.dataSource.url !== "") {
        const res = await phoiGiaoNhanApi.getData(params);
        const apiRows = mapApiToTable(res as any) ?? [];
        const readonlyKeys = getReadonlyFields(tablePhoiNong.columns || []);
        setTableData((prev) => {
          const prevKeys = new Set(
            (prev || []).map(
              (r: any) => `${String(r.me || "")}|${String(r.mac || "")}`
            )
          );
          const result: any[] = [];
          for (const prevRow of prev || []) {
            const k = `${String(prevRow.me || "")}|${String(
              prevRow.mac || ""
            )}`;
            const match = apiRows.find(
              (r: any) =>
                String(r.me || "") === String(prevRow.me || "") &&
                String(r.mac || "") === String(prevRow.mac || "")
            );
            if (match) {
              const merged: any = { ...prevRow };
              readonlyKeys.forEach((key) => {
                (merged as any)[key] = (match as any)[key];
              });
              result.push(merged);
            } else {
              result.push(prevRow);
            }
          }
          for (const apiRow of apiRows) {
            const k = `${String(apiRow.me || "")}|${String(apiRow.mac || "")}`;
            if (!prevKeys.has(k)) {
              result.push(apiRow);
            }
          }
          return result;
        });
      }
    } catch (err: any) {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  };

  /** Theo dõi form → load lại bảng */
  useEffect(() => {
    if (idphieu) return; // Đang mở phiếu đã có dữ liệu → không override dữ liệu ban đầu
    if (ngaySX && ca && mayduc) {
      fetchTableData({
        NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
        Ca: ca,
        MayDuc: mayduc,
      });
    }
  }, [ngaySX, ca, mayduc, idphieu]);

  // Hàm khởi tạo dữ liệu ban đầu
  const initData = async () => {
    try {
      setLoading(true);
      // Gọi API lấy phiếu theo số phiếu
      const idPhieu = idphieu || ""; // Lấy từ state nếu có
      if (idPhieu) {
        const res = await PhieuApi.getDetail(idPhieu);

        if (res) {
          setSoPhieu((res as any)?.soPhieu);
          console.log("✅ Dữ liệu phiếu:", res);
          // data.Data là phần JSON đã parse (form động)
          const data = (res as any)?.jsonData || {};
          // Chuyển chuỗi -> dayjs
          const formValues = {
            ...data,
            idphieu: (res as any)?.idphieu || "",
            NgaySX: data.NgaySX ? dayjs(data.NgaySX, "YYYY-MM-DD") : null,
          };
          console.log("➡️ Form values:", formValues);
          form.setFieldsValue(formValues);

          if (formValues.table1) {
            setTableData(formValues.table1);
          }
          if ((formValues as any).thungData) {
            setThungData((formValues as any).thungData);
          }

          message.success("Đã tải dữ liệu phiếu!");
        }
      }
    } catch (err: any) {
      console.error("Lỗi khởi tạo dữ liệu:", err);
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  };

  const enhanceColumns = (cols: any[]) => {
    return (cols || []).map((c: any) => {
      if (c.title === "Mẻ") return { ...c, width: 120, fixed: "left" };
      if (c.title === "Mác") return { ...c, width: 140, fixed: "left" };
      if (c.title === "Kích thước") return { ...c, width: 160 };
      if (c.title === "Đúc") return { ...c, width: 90 };
      if (c.title === "NMC") return { ...c, width: 90 };
      if (c.children && Array.isArray(c.children)) {
        return {
          ...c,
          children: c.children.map((child: any) => ({
            ...child,
            width: child.title?.toString().toLowerCase().includes("khối lượng")
              ? 130
              : 110,
          })),
        };
      }
      if (c.title === "Trạng thái" || c.title === "Tình trạng")
        return { ...c, width: 160 };
      if (c.title === "Tổng số thanh") return { ...c, width: 120 };
      if (c.title === "Tổng khối lượng") return { ...c, width: 140 };
      if (c.title === "Ghi chú") return { ...c, width: 180 };
      if (c.title?.toString().includes("ST Chưa chuyển"))
        return { ...c, width: 130 };
      if (c.title?.toString().includes("ST BKM")) return { ...c, width: 120 };
      return c;
    });
  };

  const saveAfterTransfer = async (nextTable: any[], nextThung: any[]) => {
    try {
      const stored = localStorage.getItem("userinfo");
      const values = form.getFieldsValue();
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
          nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
          tinhTrang: 1,
          ghiChu: "Người tạo phiếu",
        });
      }
      const normalizedTable = (nextTable || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stChuaChuyen || 0),
      }));
      const normalizedThung = (nextThung || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stChuaChuyen || 0),
      }));
      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
        idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
        table1: normalizedTable,
        thungData: normalizedThung,
        pheDuyet: pheDuyetFlow,
      };
      if (values.idphieu) {
        await PhieuApi.putData(values.idphieu, payload);
        message.success("Đã lưu cập nhật sau khi chuyển hết");
      } else {
        const res = await PhieuApi.postData(payload);
        form.setFieldsValue({ idphieu: (res as any)?.idphieu });
        setSoPhieu((res as any)?.soPhieu || "");
        message.success(
          `Đã tạo phiếu và lưu chuyển hết: ${(res as any)?.soPhieu || ""}`
        );
      }
    } catch (e) {
      console.error(e);
      message.error("Không thể lưu dữ liệu sau khi chuyển hết");
    }
  };

  const getReadonlyFields = (cols: any[]): string[] => {
    const MIS_READONLY = [
      "me",
      "mac",
      "kichThuoc",
      "duc",
      "nmc",
      "loaiI_TP",
      "loaiI_BM",
      "loaiII_TP",
      "loaiII_BM",
      "loaiIII_TP",
      "loaiIII_BM",
      "tongKhoi",
    ];
    const keys: string[] = [];
    (cols || []).forEach((c: any) => {
      if (c.dataIndex) keys.push(c.dataIndex);
      if (Array.isArray(c.children)) {
        c.children.forEach((child: any) => {
          if (child.dataIndex) keys.push(child.dataIndex);
        });
      }
    });
    return keys.filter((k) => MIS_READONLY.includes(k));
  };

  /** Gọi khi load lần đầu */
  useEffect(() => {
    initData();
  }, [idphieu]);

  // Gửi dữ liệu form
  const handleSubmit = async (values: any) => {
    try {
      const stored = localStorage.getItem("userinfo");

      // Thông tin phê duyệt
      const pheDuyetFlow = config.signatures
        .filter((s) => s.isChon)
        .map((s) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      // Thêm dòng mặc định cho người tạo phiếu = cấp 1
      const hasCreator = config.signatures.find(
        (x) => x.isChon === false && x.capduyet === 1
      );
      if (hasCreator) {
        pheDuyetFlow.unshift({
          capDuyet: 1,
          maKyDuyet: hasCreator?.key || "", //
          nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
          tinhTrang: 1, // 1 = đã duyệt (vì chính người tạo)
          ghiChu: "Người tạo phiếu",
        });
      }

      const normalizedTable = (tableData || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stChuaChuyen || 0),
      }));
      const normalizedThung = (thungData || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stChuaChuyen || 0),
      }));
      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
        idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
        table1: normalizedTable,
        thungData: normalizedThung,
        pheDuyet: pheDuyetFlow,
      };
      // Kiểm tra có IDPhiếu hay không
      console.log("➡️ Payload gửi API:", payload);
      if (values.idphieu) {
        // Cập nhật
        await PhieuApi.putData(values.idphieu, payload);
        message.success("Cập nhật phiếu thành công!");
      } else {
        // Gửi POST API
        const res = await PhieuApi.postData(payload);

        // Nếu thành công
        message.success(`Tạo phiếu thành công: ${(res as any)?.soPhieu || ""}`);
      }
    } catch (error) {
      console.error("Lỗi tạo phiếu:", error);
      message.error("Không thể tạo phiếu! Vui lòng thử lại.");
    }
  };

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

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="idphieu" hidden>
          <Input type="hidden" />
        </Form.Item>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Button
            onClick={() => {
              fetchTableData({
                NgaySX: ngaySX ? dayjs(ngaySX).format("YYYY-MM-DD") : null,
                Ca: ca,
                MayDuc: mayduc,
              });
            }}
            style={{
              backgroundColor: "#13c2c2",
              borderColor: "#13c2c2",
              color: "#fff",
            }}
            icon={<ReloadOutlined />}
          >
            Làm mới
          </Button>
          <Button
            onClick={() => {
              if (!selectedRowKeys || selectedRowKeys.length === 0) {
                message.warning("Vui lòng chọn ít nhất một dòng");
                return;
              }
              const selectedRows = tableData.filter((r) =>
                selectedRowKeys.includes(r.key)
              );
              const invalid = selectedRows.find((row) => {
                const hasMe = !!row.me;
                const hasMac = !!row.mac;
                const hasQtyWeightRow =
                  Number(row.soLuong || 0) > 0 &&
                  Number(row.khoiLuong || row.tongKhoi || 0) > 0;
                const hasAnyTypePair =
                  (Number(row.loaiI_TP || 0) > 0 &&
                    Number(row.loaiI_BM || 0) > 0) ||
                  (Number(row.loaiII_TP || 0) > 0 &&
                    Number(row.loaiII_BM || 0) > 0) ||
                  (Number(row.loaiIII_TP || 0) > 0 &&
                    Number(row.loaiIII_BM || 0) > 0);
                return !(
                  hasMe &&
                  hasMac &&
                  (hasQtyWeightRow || hasAnyTypePair)
                );
              });
              if (invalid) {
                message.warning(
                  "Vui lòng nhập Mẻ, Mác và ít nhất 1 loại có Số thanh & Khối lượng"
                );
                return;
              }
              const nextThung = [
                ...thungData,
                ...selectedRows.map((r) => ({
                  ...r,
                  isThung: true,
                  chuyenHet: true,
                  tongSoThanh: Number(r.loaiI_TP || 0),
                  stChuaChuyen: 0,
                  stBKM: 0,
                })),
              ];
              const nextTable = tableData.map((row) => {
                if (!selectedRowKeys.includes(row.key)) return row;
                const tong = Number(row.loaiI_TP || 0);
                return {
                  ...row,
                  tongSoThanh: tong,
                  stChuaChuyen: 0,
                  stBKM: 0,
                  tinhTrang: 1,
                };
              });
              setThungData(nextThung);
              setTableData(nextTable);
              setSelectedRowKeys([]);
              message.success("Đã chuyển hết các dòng đã chọn");
              saveAfterTransfer(nextTable, nextThung);
            }}
            type="primary"
            style={{
              backgroundColor: "#52c41a",
              borderColor: "#52c41a",
              color: "#fff",
            }}
            icon={<CheckCircleOutlined />}
          >
            Chuyển hết
          </Button>
          <Button
            onClick={() => {
              if (!selectedRowKeys || selectedRowKeys.length === 0) {
                message.warning("Vui lòng chọn ít nhất một dòng");
                return;
              }
              const selectedRows = tableData.filter((r) =>
                selectedRowKeys.includes(r.key)
              );
              const invalid = selectedRows.find((row) => {
                const hasMe = !!row.me;
                const hasMac = !!row.mac;
                const hasQtyWeightRow =
                  Number(row.soLuong || 0) > 0 &&
                  Number(row.khoiLuong || row.tongKhoi || 0) > 0;
                const hasAnyTypePair =
                  (Number(row.loaiI_TP || 0) > 0 &&
                    Number(row.loaiI_BM || 0) > 0) ||
                  (Number(row.loaiII_TP || 0) > 0 &&
                    Number(row.loaiII_BM || 0) > 0) ||
                  (Number(row.loaiIII_TP || 0) > 0 &&
                    Number(row.loaiIII_BM || 0) > 0);
                return !(
                  hasMe &&
                  hasMac &&
                  (hasQtyWeightRow || hasAnyTypePair)
                );
              });
              if (invalid) {
                message.warning(
                  "Vui lòng nhập Mẻ, Mác và ít nhất 1 loại có Số thanh & Khối lượng"
                );
                return;
              }
              const initVals: Record<
                string,
                {
                  loaiI?: number;
                  loaiIIBm?: number;
                  loaiIITp?: number;
                  loaiIII?: number;
                  chuyenST?: number;
                }
              > = {};
              selectedRowKeys.forEach((k) => (initVals[String(k)] = {}));
              setPartialValues(initVals);
              setPartialOpen(true);
            }}
            style={{
              backgroundColor: "#fa8c16",
              borderColor: "#fa8c16",
              color: "#fff",
            }}
            icon={<ArrowRightOutlined />}
          >
            Chuyển một phần
          </Button>
        </div>
        {/* HEADER - các trường nhập đầu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {config.headerFields.map((f, idx) => (
            <CustomFormItem key={f.key || idx} field={f} idx={idx} />
          ))}
        </div>
        {/* TABLE - danh sách phôi */}
        {config.layout.map((layout, idx) => (
          <div key={idx}>
            {layout.sectionType === "table" && (
              <CustomFormTable
                columns={enhanceColumns(layout.columns || [])}
                initialData={tableData}
                onDataChange={setTableData}
                addRowButtonText="+ Thêm dòng"
                showAddButton={true}
                showDeleteButton={true}
                minRows={1}
                editable={(layout as any).editable !== false} // Default true nếu không có config
                loading={loading}
                selectionEnabled={true}
                selectedRowKeys={selectedRowKeys}
                onSelectionChange={(keys) => setSelectedRowKeys(keys)}
                isRowSelectable={(row) => {
                  const hasMe = !!row.me;
                  const hasMac = !!row.mac;
                  const hasQtyWeightRow =
                    Number(row.soLuong || 0) > 0 &&
                    Number(row.khoiLuong || row.tongKhoi || 0) > 0;
                  const hasAnyTypePair =
                    (Number(row.loaiI_TP || 0) > 0 &&
                      Number(row.loaiI_BM || 0) > 0) ||
                    (Number(row.loaiII_TP || 0) > 0 &&
                      Number(row.loaiII_BM || 0) > 0) ||
                    (Number(row.loaiIII_TP || 0) > 0 &&
                      Number(row.loaiIII_BM || 0) > 0);
                  return hasMe && hasMac && (hasQtyWeightRow || hasAnyTypePair);
                }}
                showStatus={true}
                stickyHeader={true}
                scrollY={460}
                readonlyFields={getReadonlyFields(layout.columns || [])}
                onCellChange={async (rowIndex, dataIndex, value, row) => {
                  if (dataIndex !== "me") return;
                  const mayDucVal = form.getFieldValue("mayduc");
                  if (!mayDucVal || !value) {
                    message.warning(
                      "Vui lòng chọn Máy Đúc và nhập Mẻ để tra cứu"
                    );
                    return;
                  }
                  try {
                    setLoading(true);
                    const res = await phoiGiaoNhanApi.getData({
                      MayDuc: mayDucVal,
                      Me: value,
                    });
                    const mapped = mapApiToTable(res as any);
                    const newRow =
                      mapped && mapped.length > 0 ? mapped[0] : undefined;
                    if (!newRow) {
                      message.info("Không tìm thấy dữ liệu MIS cho mẻ này");
                    }
                    setTableData((prev) => {
                      const next = [...prev];
                      const current = next[rowIndex] || {};
                      next[rowIndex] = {
                        ...current,
                        me: value,
                        mac: newRow?.mac ?? current.mac ?? "",
                        kichThuoc: newRow?.kichThuoc ?? current.kichThuoc ?? "",
                        loaiI_TP: newRow?.loaiI_TP ?? current.loaiI_TP ?? 0,
                        loaiI_BM: newRow?.loaiI_BM ?? current.loaiI_BM ?? 0,
                        loaiII_TP: newRow?.loaiII_TP ?? current.loaiII_TP ?? 0,
                        loaiII_BM: newRow?.loaiII_BM ?? current.loaiII_BM ?? 0,
                        loaiIII_TP:
                          newRow?.loaiIII_TP ?? current.loaiIII_TP ?? 0,
                        loaiIII_BM:
                          newRow?.loaiIII_BM ?? current.loaiIII_BM ?? 0,
                        tongKhoi: newRow?.tongKhoi ?? current.tongKhoi ?? 0,
                        tongSoThanh: 0,
                        stChuaChuyen: Number(newRow?.loaiI_TP ?? 0),
                        stBKM: Number(newRow?.loaiI_TP ?? 0),
                      };
                      return next;
                    });
                  } catch (e) {
                    message.error("Không thể tra cứu mẻ từ MIS");
                  } finally {
                    setLoading(false);
                  }
                }}
                // onRefresh={() => {
                //   const tableLayout = config.layout.find(
                //     (l) => l.sectionType === "table"
                //   );
                //   if (tableLayout) {
                //     fetchTableData(tableLayout);
                //   }
                // }}
              />
            )}
          </div>
        ))}

        <Modal
          open={partialOpen}
          title="Chuyển một phần"
          width={1150}
          destroyOnClose
          onCancel={() => setPartialOpen(false)}
          onOk={async () => {
            const selectedRows = tableData.filter((r) =>
              selectedRowKeys.includes(r.key)
            );
            for (const row of selectedRows) {
              const v = partialValues[String(row.key)] || {};
              const sum = Number(v.chuyenST || 0);
              const total = Number(row.soLuong || 0);
              if (sum <= 0) {
                message.error("Số thanh chuyển phải lớn hơn 0");
                return;
              }
              const stLoai1 = Number(row.loaiI_TP || 0);
              if (sum > stLoai1) {
                message.error("Số thanh chuyển vượt quá số thanh hiện có");
                return;
              }
              if (total && sum > total) {
                message.error("Tổng số thanh chuyển vượt quá số lượng hiện có");
                return;
              }
            }
            const nextThung = [
              ...thungData,
              ...selectedRows.map((row) => {
                const v = partialValues[String(row.key)] || {};
                const sum = Number(v.chuyenST || 0);
                const totalRowST =
                  Number(row.loaiI_TP || 0) +
                  Number(row.loaiII_TP || 0) +
                  Number(row.loaiIII_TP || 0) +
                  Number(row.loaiII_BM || 0);
                const stChuaChuyen = Math.max(totalRowST - sum, 0);
                return {
                  ...row,
                  isThung: true,
                  chuyenHet: false,
                  tinhTrang: 2,
                  tongSoThanh: sum,
                  stChuaChuyen,
                  stBKM: stChuaChuyen,
                  chuyenMotPhan: {
                    tongChuyen: sum,
                  },
                };
              }),
            ];
            const nextTable = tableData.map((row) => {
              if (!selectedRowKeys.includes(row.key)) return row;
              const v = partialValues[String(row.key)] || {};
              const sum = Number(v.chuyenST || 0);
              const total = Number(row.soLuong || 0);
              const remaining = total ? Math.max(total - sum, 0) : total;
              const totalRowST =
                Number(row.loaiI_TP || 0) +
                Number(row.loaiII_TP || 0) +
                Number(row.loaiIII_TP || 0) +
                Number(row.loaiII_BM || 0);
              const stChuaChuyen = Math.max(totalRowST - sum, 0);
              return {
                ...row,
                soLuong: remaining,
                tinhTrang: 2,
                stChuaChuyen,
                tongSoThanh: sum,
                stBKM: stChuaChuyen,
              };
            });
            setThungData(nextThung);
            setTableData(nextTable);
            setPartialOpen(false);
            setSelectedRowKeys([]);
            message.success("Đã chuyển một phần các dòng đã chọn");
            await saveAfterTransfer(nextTable, nextThung);
          }}
        >
          <div>
            <Table
              size="small"
              pagination={false}
              bordered
              style={{ width: "100%", marginTop: 8 }}
              rowKey="key"
              dataSource={tableData
                .filter((r) => selectedRowKeys.includes(r.key))
                .map((r) => ({ ...r, key: r.key }))}
              columns={[
                { title: "Mẻ", dataIndex: "me", width: 120 },
                { title: "Mác", dataIndex: "mac", width: 120 },
                { title: "Kích thước", dataIndex: "kichThuoc", width: 160 },
                {
                  title: "Loại 1 ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={Number(record.loaiI_TP || 0)}
                      readOnly
                    />
                  ),
                },
                {
                  title: "Loại 2 BM ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={Number(record.loaiII_BM || 0)}
                      readOnly
                    />
                  ),
                },
                {
                  title: "Loại 2 TP ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={Number(record.loaiII_TP || 0)}
                      readOnly
                    />
                  ),
                },
                {
                  title: "Loại 3 ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={Number(record.loaiIII_TP || 0)}
                      readOnly
                    />
                  ),
                },
                {
                  title: "Số thanh chuyển",
                  width: 160,
                  render: (_: any, record: any) => (
                    <InputNumber
                      min={0}
                      max={Number(record.loaiI_TP || 0)}
                      style={{ width: "100%" }}
                      value={partialValues[String(record.key)]?.chuyenST || 0}
                      onChange={(val) =>
                        setPartialValues((p) => ({
                          ...p,
                          [String(record.key)]: {
                            ...p[String(record.key)],
                            chuyenST: Number(val) || 0,
                          },
                        }))
                      }
                    />
                  ),
                },
                {
                  title: "Tổng số thanh",
                  width: 140,
                  align: "center",
                  render: (_: any, record: any) => (
                    <Typography.Text type="danger">
                      {Number(record.loaiI_TP || 0) +
                        Number(record.loaiII_TP || 0) +
                        Number(record.loaiIII_TP || 0) +
                        Number(record.loaiII_BM || 0)}
                    </Typography.Text>
                  ),
                },
              ]}
            />
          </div>
        </Modal>

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
            ?.map((sig, i) => (
              <div key={i}>
                <CustomFormItem key={sig.key || i} field={sig} idx={i} />
              </div>
            ))}
          {config.signatures
            .filter((x) => x.capduyet == 1)
            .map((sig, i) => (
              <Form.Item name={sig.key || i} hidden>
                <Input type="hidden" />
              </Form.Item>
            ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Button type="primary" htmlType="submit">
            Lưu & Gửi phê duyệt
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuPhoiNong;
