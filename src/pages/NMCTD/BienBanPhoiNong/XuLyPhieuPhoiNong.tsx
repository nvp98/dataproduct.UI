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
  DatePicker,
  Select,
} from "antd";
import CustomFormTable from "../../../components/CustomFormTable";
import dayjs from "dayjs";
import { useState, useEffect } from "react";
import type { Key } from "react";
import { phoiGiaoNhanApi } from "../../../services/BKPhoiThepApi";
import CustomFormItem from "../../../components/CustomFormItem";
import { v4 as uuidv4 } from "uuid";
import { PhieuApi } from "../../../services/PhieuApi";
import { useLocation } from "react-router-dom";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { CtdPhoiNongApi } from "../../../services/CtdPhoiNongApi";

const XuLyPhieuPhoiNong = () => {
  const location = useLocation();
  const { idphieu, thongtinphieu } = location.state || {};
  // console.log(thongtinphieu);
  const config = CTD_BB_Phoinong;
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [chuyenData, setChuyenData] = useState<any[]>([]);
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
  const [loadingChuyen, setLoadingChuyen] = useState(false);
  const [filterXuong, setFilterXuong] = useState("");
  const [filterNgay, setFilterNgay] = useState(dayjs());
  const [filterCa, setFilterCa] = useState("");
  const [filterMe, setFilterMe] = useState("");
  const [filteredChuyenData, setFilteredChuyenData] = useState<any[]>([]);
  const [selectedProcessedKeys, setSelectedProcessedKeys] = useState<Key[]>([]);

  // Theo dõi thay đổi trên các field chính
  const ngaySX = Form.useWatch("NgaySX", form);
  const ca = Form.useWatch("ca", form);
  // Máy đúc gán cố định theo phiếu, không theo dõi chọn UI

  useEffect(() => {
    const ng = thongtinphieu?.ngaySX
      ? dayjs(thongtinphieu.ngaySX, "YYYY-MM-DD")
      : ngaySX || null;
    setFilterNgay(ng);
    const caVal = thongtinphieu?.ca ?? ca;
    setFilterCa(caVal ? String(caVal) : "");
  }, [ngaySX, ca, thongtinphieu]);

  // useEffect(() => {
  //   if (filterNgay && filterCa) {
  //     handleFilterChuyenData();
  //   }
  // }, [filterNgay, filterCa]);

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

  /**
   * Map dữ liệu API BKMIS sang hàng bảng phôi nóng
   * - Khi không có dữ liệu: tạo một dòng trống với cấu trúc chuẩn
   * - Tính `tongSoThanh` và `stChuaChuyen` dựa trên số lượng đã chuyển
   * - Chuẩn hóa các trường: `me`, `mac`, `kichThuoc`, loại ST/KL, tổng khối
   */
  const mapApiToTable = (res: any[]) => {
    if (!res || res.length === 0) {
      return [
        {
          key: uuidv4(),
          me: "",
          mac: "",
          kichThuoc: "",
          idBkPhoiThep: 0,
          ST_LoaiI: 0,
          KL_LoaiI: 0,
          ST_LoaiII: 0,
          KL_LoaiII: 0,
          ST_LoaiIII: 0,
          KL_LoaiIII: 0,
          tongKhoi: 0,
          tinhTrang: 0,
          ghiChu: "",
          stChuaChuyen: 0,
          stDaChuyen: 0,
        },
      ];
    }
    return (res || []).map((item: any) => {
      console.log("item", item);
      const ST_LoaiI = Number(item.loaiChatLuong == 1 ? item.soThanh : 0);
      const ST_LoaiII = Number(item.loaiChatLuong == 2 ? item.soThanh : 0);
      const ST_LoaiIII = Number(item.loaiChatLuong == 3 ? item.soThanh : 0);
      const totalRowST = ST_LoaiI + ST_LoaiII + ST_LoaiIII; // dữ liệu BK mis
      const sT_DaChuyenSrc = Number(item.stDaChuyen ?? 0); // dữ liệu DB
      const tongSoThanh = Math.max(sT_DaChuyenSrc, 0);
      const tongSoThanhBKM = Math.max(totalRowST, 0);
      const stChuaChuyen = Math.max(tongSoThanhBKM - sT_DaChuyenSrc, 0);
      const tinhtrang =
        stChuaChuyen == 0
          ? 1
          : stChuaChuyen > 0 && stChuaChuyen < tongSoThanhBKM
          ? 2
          : 0;
      return {
        key: item.id || uuidv4(),
        me: item.me ?? "",
        mac: item.mac ?? "",
        duc: item.mayDuc ?? "",
        nmc: "NMC" + (item.mayDuc ?? ""),
        kichThuoc: item.kichThuoc ?? "",
        idBkPhoiThep: item.idBkPhoiThep ?? item.IdBkPhoiThep ?? item.id ?? 0,
        ST_LoaiI,
        KL_LoaiI: Number(item.tongKhoiLuong ?? item.tongKhoiLuog ?? 0),
        ST_LoaiII,
        KL_LoaiII: Number(item.LoaiII_BM ?? 0),
        ST_LoaiIII,
        KL_LoaiIII: Number(item.LoaiIII_BM ?? 0),
        tongKhoi: Number(item.tongKhoiLuong ?? item.tongKhoiLuog ?? 0),
        tongSoThanh,
        stChuaChuyen,
        stDaChuyen: item.stDaChuyen ?? 0,
        stBKM: tongSoThanhBKM,
        tinhTrang: tinhtrang,
        ghiChu: item.GhiChu ?? "",
      };
    });
  };

  /**
   * Map một dòng bảng → payload API `CtdPhoiNong/bulk`
   * - Lấy `idphieu`, `NgaySX`, `ca` từ form hoặc tham số truyền vào
   * - Tính khối lượng chuyển Loại 1 dựa trên kg/1 thanh hiện có
   * - Trả về object chuẩn theo yêu cầu API CTD
   */
  const mapRowToCtdPhoiNong = (
    row: any,
    opts?: { sum?: number; ngaySx?: string; ca?: string | number }
  ) => {
    const idphieuVal = form.getFieldValue("idphieu") || idphieu || null;
    const caVal =
      opts?.ca != null
        ? Number(opts.ca)
        : Number(form.getFieldValue("ca") || 0);
    const ngaySxVal =
      opts?.ngaySx ||
      (form.getFieldValue("NgaySX")
        ? form.getFieldValue("NgaySX").format("YYYY-MM-DD")
        : null);
    const sum =
      opts?.sum != null
        ? Number(opts.sum)
        : row.tongSoThanh
        ? Number(row.tongSoThanh)
        : Number(row.ST_LoaiI || row.loaiI_TP || 0);
    const loai1St = Number(row.ST_LoaiI || row.loaiI_TP || 0);
    const loai1Kl = Number(row.KL_LoaiI || row.loaiI_BM || 0);
    const kgPer1 = loai1St > 0 ? loai1Kl / loai1St : 0;
    const khoiLuongChuyenLoai1 =
      sum > 0 ? Number((kgPer1 * sum).toFixed(3)) : 0;
    const caKipText = caVal === 1 ? "Ngày" : caVal === 2 ? "Đêm" : "";
    return {
      id: 0,
      idphieu: idphieuVal,
      ngaySx: ngaySxVal,
      ca: caVal,
      kip: caKipText,
      me: String(row.me || ""),
      mac: String(row.mac || ""),
      kichThuoc: String(row.kichThuoc || ""),
      nmCan: Number(row.duc || 0),
      soThanhLoai1: sum, // chuyển theo Loại 1
      khoiLuongLoai1: khoiLuongChuyenLoai1,
      soThanhLoai2: Number(row.ST_LoaiII || row.loaiII_TP || 0),
      khoiLuongLoai2: Number(row.KL_LoaiII || row.loaiII_BM || 0),
      soThanhLoai3: Number(row.ST_LoaiIII || row.loaiIII_TP || 0),
      khoiLuongLoai3: Number(row.KL_LoaiIII || row.loaiIII_BM || 0),
      tongSt: sum,
      tongKl: sum > 0 ? khoiLuongChuyenLoai1 : Number(row.tongKhoi || 0),
      caKip: caKipText,
      idBkPhoiThep: row.idBkPhoiThep || 0,
      tinhTrang: 0,
      ghiChu: String(row.ghiChu || ""),
      ngayTao: new Date().toISOString(),
    };
  };

  /**
   * Gửi danh sách dòng đã chọn sang API `CtdPhoiNong/bulk`
   * - `rows`: các dòng cần chuyển
   * - `opts.sums`: số thanh chuyển theo từng `row.key`
   * - Build payload bằng `mapRowToCtdPhoiNong` rồi gọi API
   */
  const postBulkTransfers = async (
    rows: any[],
    opts?: {
      sums?: Record<string, number>;
      ngaySx?: string;
      ca?: string | number;
    }
  ) => {
    try {
      console.log("rows", rows);
      const payload = rows.map((r) =>
        mapRowToCtdPhoiNong(r, {
          sum: opts?.sums ? Number(opts.sums[String(r.key)] || 0) : undefined,
          ngaySx: thongtinphieu?.ngaySX || null,
          ca: thongtinphieu?.ca || null,
        })
      );
      await CtdPhoiNongApi.bulk(payload); // đẩy dữ liệu vào API CtdPhoiNong/bulk
    } catch (e) {
      message.error("Không thể gửi dữ liệu chuyển sang API CtdPhoiNong");
    }
  };

  /**
   * Map dữ liệu từ API CtdPhoiNong → danh sách đã chuyển (bảng dưới)
   * - Chuẩn hóa key, thông tin Mẻ/Mác/Kích thước, loại ST/KL, tổng ST/KL
   * - Bao gồm trạng thái CTD/QLCL để phục vụ xác nhận
   */
  const mapCtdPhoiNongToRows = (list: any[]) => {
    return (list || []).map((item: any) => ({
      id: item.id,
      key: item.id || uuidv4(),
      me: item.me ?? "",
      mac: item.mac ?? "",
      kichThuoc: item.kichThuoc ?? "",
      duc: item.nmCan ?? 0,
      nmc: "NMC" + (item.nmCan ?? ""),
      idBkPhoiThep: item.idBkPhoiThep ?? 0,
      ST_LoaiI: item.soThanhLoai1 ?? 0,
      KL_LoaiI: item.khoiLuongLoai1 ?? 0,
      ST_LoaiII: item.soThanhLoai2 ?? 0,
      KL_LoaiII: item.khoiLuongLoai2 ?? 0,
      ST_LoaiIII: item.soThanhLoai3 ?? 0,
      KL_LoaiIII: item.khoiLuongLoai3 ?? 0,
      tongSoThanh: item.tongSt ?? 0,
      tongKhoi: item.tongKl ?? 0,
      tinhTrang: item.tinhTrang ?? 0,
      tinhTrangCTD: item.tinhTrangCTD ?? 0,
      tinhTrangQLCL: item.tinhTrangQLCL ?? 0,
      ghiChu: item.ghiChu ?? "",
      ngaySX: item.ngaySx ?? null,
      ca: item.ca ?? null,
    }));
  };

  /**
   * Tải và hợp nhất dữ liệu bảng phôi nóng (init + theo dõi form)
   * - Lấy cấu hình bảng từ `config.layout` (đúng mã biểu mẫu)
   * - Gọi API BKMIS, map sang hàng bảng
   * - Hợp nhất với dữ liệu hiện có: chỉ cập nhật các trường readonly
   * - Dùng cặp khóa `me|mac` để nhận diện dòng
   */
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
        // const readonlyKeys = getReadonlyFields(tablePhoiNong.columns || []);
        setTableData(() => {
          // const prevKeys = new Set(
          //   (prev || []).map(
          //     (r: any) => `${String(r.me || "")}|${String(r.mac || "")}`
          //   )
          // );
          // const result: any[] = [];
          // for (const prevRow of prev || []) {
          //   const match = apiRows.find(
          //     (r: any) =>
          //       String(r.me || "") === String(prevRow.me || "") &&
          //       String(r.mac || "") === String(prevRow.mac || "")
          //   );
          //   if (match) {
          //     const merged: any = { ...prevRow };
          //     readonlyKeys.forEach((key) => {
          //       (merged as any)[key] = (match as any)[key];
          //     });
          //     result.push(merged);
          //   } else {
          //     result.push(prevRow);
          //   }
          // }
          // for (const apiRow of apiRows) {
          //   const k = `${String(apiRow.me || "")}|${String(apiRow.mac || "")}`;
          //   if (!prevKeys.has(k)) {
          //     result.push(apiRow);
          //   }
          // }
          // console.log("➡️ Dữ liệu API:", apiRows);
          return apiRows;
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
    if (ngaySX && ca) {
      fetchTableData({
        NgaySX: dayjs(ngaySX).format("YYYY-MM-DD"),
        Ca: ca,
        LoaiPhoi: 1, // Phoi nong
        MayDuc: thongtinphieu?.mayDuc,
      });
    }
  }, [ngaySX, ca, idphieu]);

  /**
   * Khởi tạo dữ liệu khi mở phiếu đã tạo
   * - Tải chi tiết phiếu theo `idphieu`
   * - Set form values, filter Ngày/Ca
   * - Nạp `tableData` và `chuyenData` từ `jsonData`
   */
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
          // console.log("➡️ Form values:", formValues);
          form.setFieldsValue(formValues);
          setFilterNgay(formValues.NgaySX || null);
          setFilterCa(formValues.ca ? String(formValues.ca) : "");

          if (formValues.table1) {
            // dữ liệu này chỉ để tham khảo
            // setTableData(formValues.table1);
          }
          if ((formValues as any).chuyenData) {
            setChuyenData((formValues as any).chuyenData);
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

  /**
   * Tinh chỉnh cấu hình cột của bảng
   * - Nhận mảng columns (cấu hình động) và trả về mảng mới
   * - Gán width/fixed cho các cột quan trọng: "Mẻ", "Mác", "Kích thước",
   *   "Đúc", "NMC", "Trạng thái/Tình trạng", "Tổng số thanh",
   *   "Tổng khối lượng", "Ghi chú", "ST Chưa chuyển", "ST BKM"
   * - Với nhóm cột con (children): đặt width 130 nếu tiêu đề chứa "khối lượng",
   *   ngược lại width 110
   * - Giữ nguyên cấu hình các cột khác
   */
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

  /**
   * Lưu phiếu sau thao tác chuyển (hết/một phần)
   * - Chuẩn hóa dữ liệu bảng: cập nhật `stBKM` theo `stChuaChuyen`
   * - Build luồng phê duyệt: thêm người tạo (cấp 1) nếu có cấu hình
   * - POST/PUT dữ liệu phiếu tùy theo có `idphieu`
   */
  // const saveAfterTransfer = async (nextTable: any[], nextThung: any[]) => {
  //   try {
  //     const stored = localStorage.getItem("userinfo");
  //     const values = form.getFieldsValue();
  //     const pheDuyetFlow = config.signatures
  //       .filter((s) => s.isChon)
  //       .map((s) => ({
  //         capDuyet: s.capduyet,
  //         maKyDuyet: s.key,
  //         nguoiDuyetId: form.getFieldValue(s.key),
  //         tinhTrang: 0,
  //         ghiChu: "",
  //       }));
  //     const hasCreator = config.signatures.find(
  //       (x) => x.isChon === false && x.capduyet === 1
  //     );
  //     if (hasCreator) {
  //       pheDuyetFlow.unshift({
  //         capDuyet: 1,
  //         maKyDuyet: hasCreator?.key || "",
  //         nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
  //         tinhTrang: 1,
  //         ghiChu: "Người tạo phiếu",
  //       });
  //     }
  //     const normalizedTable = (nextTable || []).map((r: any) => ({
  //       ...r,
  //       stBKM: Number(r.stBKM || 0),
  //     }));
  //     const normalizedThung = (nextThung || []).map((r: any) => ({
  //       ...r,
  //       stBKM: Number(r.stBKM || 0),
  //     }));
  //     const payload = {
  //       ...values,
  //       NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
  //       maBm: config.code,
  //       nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
  //       xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
  //       idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
  //       table1: normalizedTable,
  //       chuyenData: normalizedThung,
  //       pheDuyet: pheDuyetFlow,
  //     };
  //     if (values.idphieu) {
  //       await PhieuApi.putData(values.idphieu, payload);
  //       message.success("Đã lưu cập nhật sau khi chuyển");
  //     }
  //     // else {
  //     //   const res = await PhieuApi.postData(payload);
  //     //   form.setFieldsValue({ idphieu: (res as any)?.idphieu });
  //     //   setSoPhieu((res as any)?.soPhieu || "");
  //     //   message.success(
  //     //     `Đã tạo phiếu và lưu dữ liệu chuyển: ${(res as any)?.soPhieu || ""}`
  //     //   );
  //     // }
  //     // if (values.idphieu) {
  //     //   await PhieuApi.putData(values.idphieu, payload);
  //     //   message.success("Đã lưu cập nhật sau khi chuyển hết");
  //     // } else {
  //     //   const res = await PhieuApi.postData(payload);
  //     //   form.setFieldsValue({ idphieu: (res as any)?.idphieu });
  //     //   setSoPhieu((res as any)?.soPhieu || "");
  //     //   message.success(
  //     //     `Đã tạo phiếu và lưu chuyển hết: ${(res as any)?.soPhieu || ""}`
  //     //   );
  //     // }
  //   } catch (e) {
  //     console.error(e);
  //     message.error("Không thể lưu dữ liệu sau khi chuyển hết");
  //   }
  // };

  /**
   * Lấy danh sách field readonly từ cấu hình cột
   * - Duyệt `columns` và `children` để gom `dataIndex`
   * - Lọc theo danh sách MIS_READONLY
   */
  const getReadonlyFields = (cols: any[]): string[] => {
    const MIS_READONLY = [
      "me",
      "mac",
      "kichThuoc",
      "duc",
      "nmc",
      "ST_LoaiI",
      "KL_LoaiI",
      "ST_LoaiII",
      "KL_LoaiII",
      "ST_LoaiIII",
      "KL_LoaiIII",
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

  /**
   * Lọc tải danh sách phôi đã chuyển theo Ngày/Ca
   * - Kiểm tra filter bắt buộc
   * - Gọi API CtdPhoiNong, map về dạng bảng
   * - Reset danh sách đã lọc
   */
  const handleFilterChuyenData = async () => {
    try {
      // setLoadingChuyen(true);
      setChuyenData([]);
      const idVal =
        form.getFieldValue("idphieu") || idphieu || thongtinphieu?.idphieu;
      if (!idVal) {
        message.warning("Chưa có ID phiếu để tải danh sách phôi đã chuyển");
        return;
      }
      const res = await CtdPhoiNongApi.getByPhieu(idVal);
      const rows = mapCtdPhoiNongToRows(res as any);
      setChuyenData(rows);
      setFilteredChuyenData([]);
      setSelectedProcessedKeys([]);
    } catch (e) {
      message.error(
        "Không thể tải danh sách phôi đã chuyển từ API CtdPhoiNong"
      );
    } finally {
      setLoadingChuyen(false);
    }
  };

  const reloadChuyenData = async () => {
    try {
      setLoadingChuyen(true);
      const idVal = thongtinphieu?.idphieu;
      let res: any;
      if (idVal) {
        res = await CtdPhoiNongApi.getByPhieu(idVal);
      }
      const rows = mapCtdPhoiNongToRows(res as any);
      setChuyenData(rows);
      setFilteredChuyenData([]);
      setSelectedProcessedKeys([]);
    } catch (e) {
    } finally {
      setLoadingChuyen(false);
    }
  };

  /**
   * Thu hồi các dòng đã chuyển → trả về bảng trên
   * - Đưa các dòng chọn về `tableData`, đặt `tinhTrang` = 0
   * - Loại khỏi `chuyenData`, reset filter
   */
  const handleRecall = async () => {
    try {
      const source =
        filteredChuyenData.length > 0 ? filteredChuyenData : chuyenData;
      const selected = source.filter((r: any) =>
        selectedProcessedKeys.includes(r.key)
      );
      if (!selected || selected.length === 0) {
        message.warning("Chọn dòng để thu hồi");
        return;
      }
      const stUpdatePayload = selected
        .filter((r: any) => Number(r.idBkPhoiThep || 0) > 0)
        .map((r: any) => ({
          id: Number(r.idBkPhoiThep || 0),
          soThuHoi: Number(
            r.soThanhLoai1 != null
              ? r.soThanhLoai1
              : r.tongSoThanh != null
              ? r.tongSoThanh
              : r.tongSt != null
              ? r.tongSt
              : 0
          ),
        }));
      console.log("stUpdatePayload", stUpdatePayload);
      if (stUpdatePayload.length > 0) {
        await phoiGiaoNhanApi.stThuHoiBulk(stUpdatePayload);
      }
      await Promise.all(
        selected
          .filter((r: any) => Number(r.id || 0) > 0)
          .map((r: any) => CtdPhoiNongApi.delete(Number(r.id)))
      );
      const updatedChuyenData = chuyenData.filter(
        (r: any) => !selected.find((f: any) => f.key === r.key)
      );
      setChuyenData(updatedChuyenData);
      setFilteredChuyenData([]);
      setSelectedProcessedKeys([]);
      await reloadChuyenData();
      const formNgay = form.getFieldValue("NgaySX");
      await fetchTableData({
        NgaySX: formNgay
          ? formNgay.format("YYYY-MM-DD")
          : ngaySX
          ? dayjs(ngaySX).format("YYYY-MM-DD")
          : null,
        Ca: form.getFieldValue("ca") || ca,
        LoaiPhoi: 1,
        MayDuc: thongtinphieu?.mayDuc,
      });
      message.success("Đã thu hồi và cập nhật dữ liệu");
    } catch (e) {
      message.error("Không thể thu hồi và cập nhật dữ liệu");
    }
  };

  /**
   * Xóa bộ lọc danh sách đã chuyển
   */
  // const handleResetFilter = () => {
  //   setFilterMe("");
  //   setFilterCa("");
  //   setFilterNgay(dayjs());
  //   setFilterXuong("");
  //   setFilteredChuyenData([]);
  // };

  /**
   * Gửi dữ liệu form để tạo/cập nhật phiếu
   * - Build luồng phê duyệt, thêm người tạo (cấp 1)
   * - Chuẩn hóa `table1` và `chuyenData`
   * - PUT nếu có `idphieu`, ngược lại POST
   */
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
      const normalizedThung = (chuyenData || []).map((r: any) => ({
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
        chuyenData: normalizedThung,
        pheDuyet: pheDuyetFlow,
      };
      // Kiểm tra có IDPhiếu hay không
      console.log("➡️ Payload gửi API:", payload);
      if (values.idphieu) {
        await PhieuApi.putData(values.idphieu, payload);
        await PhieuApi.changeStatus_extended(values.idphieu, {
          status: 1,
          isLock: 0,
          isDelete: 0,
        });
        message.success("Gửi trình ký thành công!");
      } else {
        const res = await PhieuApi.postData(payload);
        const newId = (res as any)?.idphieu;
        if (newId) form.setFieldsValue({ idphieu: newId });
        setSoPhieu((res as any)?.soPhieu || "");
        await PhieuApi.changeStatus_extended(newId, {
          status: 1,
          isLock: 0,
          isDelete: 0,
        });
        message.success(
          `Gửi trình ký thành công: ${(res as any)?.soPhieu || ""}`
        );
      }
    } catch (error) {
      message.error("Không thể tạo phiếu! Vui lòng thử lại.");
    }
  };

  const handleSaveOnly = async () => {
    try {
      const stored = localStorage.getItem("userinfo");
      const values = form.getFieldsValue();
      const normalizedTable = (tableData || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stBKM || 0),
      }));
      const normalizedThung = (chuyenData || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stBKM || 0),
      }));
      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: stored ? JSON.parse(stored).iD_PhanXuong : null,
        idphongBan: stored ? JSON.parse(stored).iD_PhongBan : null,
        table1: normalizedTable,
        chuyenData: normalizedThung,
      };
      if (values.idphieu) {
        await PhieuApi.putData(values.idphieu, payload);
        await PhieuApi.changeStatus_extended(values.idphieu, {
          status: 0,
          isLock: 0,
          isDelete: 0,
        });
        message.success("Đã lưu phiếu (chưa gửi trình ký)");
      } else {
        const res = await PhieuApi.postData(payload);
        const newId = (res as any)?.idphieu;
        if (newId) form.setFieldsValue({ idphieu: newId });
        setSoPhieu((res as any)?.soPhieu || "");
        await PhieuApi.changeStatus_extended(newId, {
          status: 0,
          isLock: 0,
          isDelete: 0,
        });
        message.success(`Đã lưu phiếu: ${(res as any)?.soPhieu || ""}`);
      }
    } catch (e) {
      message.error("Không thể lưu phiếu");
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
            onClick={async () => {
              fetchTableData({
                NgaySX: ngaySX ? dayjs(ngaySX).format("YYYY-MM-DD") : null,
                Ca: ca,
                LoaiPhoi: 1, // Phoi nong
                MayDuc: thongtinphieu?.mayDuc,
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
            onClick={async () => {
              // Kiểm tra đã chọn Ngày và Ca trong vùng filter chưa
              if (!filterNgay || !filterCa) {
                message.warning(
                  "Vui lòng chọn Ngày và Ca trong vùng 'Danh sách phôi đã chuyển' trước khi chuyển!"
                );
                return;
              }

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
                  (Number(row.ST_LoaiI || 0) > 0 &&
                    Number(row.KL_LoaiI || 0) > 0) ||
                  (Number(row.ST_LoaiII || 0) > 0 &&
                    Number(row.KL_LoaiII || 0) > 0) ||
                  (Number(row.ST_LoaiIII || 0) > 0 &&
                    Number(row.KL_LoaiIII || 0) > 0);
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
              // const nextThung = [
              //   ...chuyenData,
              //   ...selectedRows.map((r) => ({
              //     ...r,
              //     isThung: true,
              //     chuyenHet: true,
              //     tongSoThanh: Number(r.ST_LoaiI || 0),
              //     stChuaChuyen: 0,
              //     stBKM: r.stBKM,
              //     ngaySX: form.getFieldValue("NgaySX")
              //       ? form.getFieldValue("NgaySX").format("YYYY-MM-DD")
              //       : null,
              //     ca: form.getFieldValue("ca") || null,
              //   })),
              // ];
              const nextTable = tableData.map((row) => {
                if (!selectedRowKeys.includes(row.key)) return row;
                // const tong = Number(row.stDaChuyen || 0);
                return {
                  ...row,
                  tongSoThanh: row.stBKM,
                  stChuaChuyen: 0,
                  stBKM: row.stBKM,
                  // tinhTrang: 1,
                };
              });
              // setChuyenData(nextThung);
              setTableData(nextTable);
              setSelectedRowKeys([]);
              message.success("Đã chuyển hết các dòng đã chọn");
              // await saveAfterTransfer(nextTable, nextThung);
              const fullSums: Record<string, number> = {};
              selectedRows.forEach((r) => {
                fullSums[String(r.key)] = Number(r.ST_LoaiI || 0);
              });
              await postBulkTransfers(selectedRows, { sums: fullSums });
              const stUpdatePayload = selectedRows.map((r) => ({
                id: Number(r.idBkPhoiThep || 0),
                sT_DaChuyen: Number(fullSums[String(r.key)] || 0),
              }));
              if (stUpdatePayload.length > 0)
                await phoiGiaoNhanApi.stDaChuyenBulk(stUpdatePayload);
              await reloadChuyenData();
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
              // Kiểm tra đã chọn Ngày và Ca trong vùng filter chưa
              if (!filterNgay || !filterCa) {
                message.warning(
                  "Vui lòng chọn Ngày và Ca trong vùng 'Danh sách phôi đã chuyển' trước khi chuyển!"
                );
                return;
              }

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
                  (Number(row.ST_LoaiI || 0) > 0 &&
                    Number(row.KL_LoaiI || 0) > 0) ||
                  (Number(row.ST_LoaiII || 0) > 0 &&
                    Number(row.KL_LoaiII || 0) > 0) ||
                  (Number(row.ST_LoaiIII || 0) > 0 &&
                    Number(row.KL_LoaiIII || 0) > 0);
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
          {config.headerFields.map((f, idx) => {
            if (f.key === "mayduc") return null; // bỏ UI máy đúc
            return <CustomFormItem key={f.key || idx} field={f} idx={idx} />;
          })}
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
                showAddButton={false}
                showDeleteButton={false}
                minRows={1}
                editable={false}
                loading={loading}
                selectionEnabled={true}
                selectedRowKeys={selectedRowKeys}
                onSelectionChange={(keys) => setSelectedRowKeys(keys)}
                // isRowSelectable={(row) => {
                //   const hasMe = !!row.me;
                //   const hasMac = !!row.mac;
                //   const hasQtyWeightRow =
                //     Number(row.soLuong || 0) > 0 &&
                //     Number(row.khoiLuong || row.tongKhoi || 0) > 0;
                //   const hasAnyTypePair =
                //     (Number(row.ST_LoaiI || 0) > 0 &&
                //       Number(row.KL_LoaiI || 0) > 0) ||
                //     (Number(row.ST_LoaiII || 0) > 0 &&
                //       Number(row.KL_LoaiII || 0) > 0) ||
                //     (Number(row.ST_LoaiIII || 0) > 0 &&
                //       Number(row.KL_LoaiIII || 0) > 0);
                //   return hasMe && hasMac && (hasQtyWeightRow || hasAnyTypePair);
                // }}
                showStatus={true}
                stickyHeader={true}
                scrollY={460}
                readonlyFields={getReadonlyFields(layout.columns || [])}
                onCellChange={async (rowIndex, dataIndex, value) => {
                  if (dataIndex !== "me") return;
                  const mayDucVal = form.getFieldValue("mayduc");
                  if (!value) return;
                  try {
                    setLoading(true);
                    const params: any = { Me: value };
                    if (mayDucVal) params.MayDuc = mayDucVal;
                    const res = await phoiGiaoNhanApi.getData(params);
                    const mapped = mapApiToTable(res as any);
                    const newRow =
                      mapped && mapped.length > 0 ? mapped[0] : undefined;
                    if (!newRow) {
                      message.info("Không tìm thấy dữ liệu BKMIS cho mẻ này");
                    }
                    setTableData((prev) => {
                      const next = [...prev];
                      const current = next[rowIndex] || {};
                      next[rowIndex] = {
                        ...current,
                        me: value,
                        mac: newRow?.mac ?? current.mac ?? "",
                        kichThuoc: newRow?.kichThuoc ?? current.kichThuoc ?? "",
                        idBkPhoiThep:
                          newRow?.idBkPhoiThep ?? current.idBkPhoiThep ?? 0,
                        ST_LoaiI: newRow?.ST_LoaiI ?? current.ST_LoaiI ?? 0,
                        KL_LoaiI: newRow?.KL_LoaiI ?? current.KL_LoaiI ?? 0,
                        ST_LoaiII: newRow?.ST_LoaiII ?? current.ST_LoaiII ?? 0,
                        KL_LoaiII: newRow?.KL_LoaiII ?? current.KL_LoaiII ?? 0,
                        ST_LoaiIII:
                          newRow?.ST_LoaiIII ?? current.ST_LoaiIII ?? 0,
                        KL_LoaiIII:
                          newRow?.KL_LoaiIII ?? current.KL_LoaiIII ?? 0,
                        tongKhoi: newRow?.tongKhoi ?? current.tongKhoi ?? 0,
                        stBKM: Number(
                          (newRow?.ST_LoaiI ?? 0) +
                            (newRow?.ST_LoaiII ?? 0) +
                            (newRow?.ST_LoaiIII ?? 0)
                        ),
                      };
                      return next;
                    });
                  } catch (e) {
                    message.error("Không thể tra cứu mẻ từ BKMIS");
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

        {/* TABLE - danh sách đã chuyển */}
        <div style={{ marginTop: 32 }}>
          <Typography.Title level={4} style={{ marginBottom: 16 }}>
            Danh sách phôi đã chuyển
          </Typography.Title>
          {/* Filter section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 16,
              padding: "12px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>Xưởng</label>
              <Input
                placeholder="Xưởng"
                value={filterXuong}
                onChange={(e) => setFilterXuong(e.target.value)}
                size="small"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>Ngày</label>
              <DatePicker
                style={{ width: "100%" }}
                value={filterNgay}
                onChange={(date) => setFilterNgay(date)}
                format="YYYY-MM-DD"
                size="small"
                disabled
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: "bold" }}>Ca</div>
              <Select
                style={{ width: "100%" }}
                placeholder="Chọn Ca"
                value={filterCa}
                onChange={(value) => setFilterCa(value)}
                size="small"
                allowClear={false}
                disabled
                options={[
                  { label: "Ngày", value: "1" },
                  { label: "Đêm", value: "2" },
                ]}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>Mẻ</label>
              <Input
                placeholder="Mẻ"
                value={filterMe}
                onChange={(e) => setFilterMe(e.target.value)}
                size="small"
              />
            </div>
          </div>
          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              justifyContent: "flex-end",
            }}
          >
            <Button
              onClick={handleFilterChuyenData}
              type="primary"
              style={{
                backgroundColor: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              Tìm kiếm
            </Button>
            {/* <Button
              onClick={handleResetFilter}
              style={{
                backgroundColor: "#f0f0f0",
                borderColor: "#d9d9d9",
              }}
            >
              Xóa filter
            </Button> */}
            <Button
              onClick={async () => {
                if (
                  !selectedProcessedKeys ||
                  selectedProcessedKeys.length === 0
                ) {
                  message.warning(
                    "Vui lòng chọn ít nhất một dòng để QLCL xác nhận"
                  );
                  return;
                }
                try {
                  setLoadingChuyen(true);
                  const source =
                    filteredChuyenData.length > 0
                      ? filteredChuyenData
                      : chuyenData;
                  const idsPayload = source
                    .filter((r: any) => selectedProcessedKeys.includes(r.key))
                    .map((r: any) => ({
                      id: Number(r.id || 0),
                      tinhTrangQLCL: 1,
                    }));
                  if (idsPayload.length === 0) {
                    message.warning("Không có dòng hợp lệ để QLCL xác nhận");
                    setLoadingChuyen(false);
                    return;
                  }
                  await CtdPhoiNongApi.updateStatus(idsPayload);
                  const next = source.map((r: any) =>
                    selectedProcessedKeys.includes(r.key)
                      ? { ...r, tinhTrangQLCL: 1 }
                      : r
                  );
                  if (filteredChuyenData.length > 0) {
                    setFilteredChuyenData(next);
                  } else {
                    setChuyenData(next);
                  }
                  setSelectedProcessedKeys([]);
                  message.success("QLCL đã xác nhận các dòng đã chọn");
                } catch (e) {
                  message.error("Không thể cập nhật trạng thái xác nhận QLCL");
                } finally {
                  setLoadingChuyen(false);
                }
              }}
              type="primary"
              style={{ backgroundColor: "#13c2c2", borderColor: "#13c2c2" }}
            >
              Xác nhận QLCL
            </Button>
            <Button
              onClick={async () => {
                if (
                  !selectedProcessedKeys ||
                  selectedProcessedKeys.length === 0
                ) {
                  message.warning("Vui lòng chọn ít nhất một dòng để xác nhận");
                  return;
                }
                try {
                  setLoadingChuyen(true);
                  const source =
                    filteredChuyenData.length > 0
                      ? filteredChuyenData
                      : chuyenData;
                  const idsPayload = source
                    .filter((r: any) => selectedProcessedKeys.includes(r.key))
                    .map((r: any) => ({
                      id: Number(r.id || 0),
                      tinhTrangCTD: 1,
                    }));
                  if (idsPayload.length === 0) {
                    message.warning("Không có dòng hợp lệ để xác nhận");
                    setLoadingChuyen(false);
                    return;
                  }
                  await CtdPhoiNongApi.updateStatus(idsPayload);
                  const next = source.map((r: any) =>
                    selectedProcessedKeys.includes(r.key)
                      ? { ...r, tinhTrangCTD: 1, tinhTrang: 1 }
                      : r
                  );
                  if (filteredChuyenData.length > 0) {
                    setFilteredChuyenData(next);
                  } else {
                    setChuyenData(next);
                  }
                  setSelectedProcessedKeys([]);
                  message.success("Đã xác nhận các dòng đã chọn");
                } catch (e) {
                  message.error("Không thể cập nhật trạng thái xác nhận CTD");
                } finally {
                  setLoadingChuyen(false);
                }
              }}
              type="primary"
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Xác nhận
            </Button>
            <Button
              onClick={handleRecall}
              danger
              type="primary"
              style={{
                backgroundColor: "#ff4d4f",
                borderColor: "#ff4d4f",
              }}
            >
              Thu hồi
            </Button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <Table
              size="small"
              pagination={false}
              bordered
              loading={false}
              rowKey="key"
              rowSelection={{
                selectedRowKeys: selectedProcessedKeys,
                onChange: (keys: Key[]) => setSelectedProcessedKeys(keys),
                getCheckboxProps: (record: any) => ({
                  disabled: Number(record.tinhTrang || 0) == 1,
                }),
              }}
              dataSource={chuyenData}
              scroll={{ x: 1200 }}
              columns={[
                {
                  title: "Trạng thái QLCL",
                  dataIndex: "tinhTrangQLCL",
                  width: 130,
                  render: (val: any) => {
                    const isDone = Number(val || 0) === 1;
                    const style = isDone
                      ? {
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "#d9d9d9",
                          borderColor: "#d9d9d9",
                          color: "#333",
                        };
                    return (
                      <Button size="small" disabled style={style}>
                        {isDone ? "Đã xác nhận" : "Chưa xử lý"}
                      </Button>
                    );
                  },
                },
                {
                  title: "Trạng thái CTD",
                  dataIndex: "tinhTrangCTD",
                  width: 130,
                  render: (val: any) => {
                    const isDone = Number(val || 0) === 1;
                    const style = isDone
                      ? {
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                          color: "#fff",
                        }
                      : {
                          backgroundColor: "#d9d9d9",
                          borderColor: "#d9d9d9",
                          color: "#333",
                        };
                    return (
                      <Button size="small" disabled style={style}>
                        {isDone ? "Đã xác nhận" : "Chưa xử lý"}
                      </Button>
                    );
                  },
                },
                { title: "Mẻ", dataIndex: "me", width: 120 },
                { title: "Mác", dataIndex: "mac", width: 140 },
                { title: "Kích thước", dataIndex: "kichThuoc", width: 160 },
                { title: "Đúc", dataIndex: "duc", width: 90 },
                { title: "NMC", dataIndex: "nmc", width: 90 },
                {
                  title: "Loại 1",
                  children: [
                    {
                      title: "ST",
                      dataIndex: "ST_LoaiI",
                      width: 90,
                      render: (val: any) => (
                        <Typography.Text type={val > 0 ? "success" : undefined}>
                          {val}
                        </Typography.Text>
                      ),
                    },
                    {
                      title: "KL",
                      dataIndex: "KL_LoaiI",
                      width: 110,
                      render: (val: any) => (
                        <Typography.Text type="danger">{val}</Typography.Text>
                      ),
                    },
                  ],
                },
                {
                  title: "Loại 2",
                  children: [
                    {
                      title: "ST",
                      dataIndex: "ST_LoaiII",
                      width: 90,
                      render: (val: any) => (val ? val : "?"),
                    },
                    {
                      title: "KL",
                      dataIndex: "KL_LoaiII",
                      width: 110,
                      render: (val: any) => (val ? val : "?"),
                    },
                  ],
                },
                {
                  title: "Loại 3",
                  children: [
                    {
                      title: "ST",
                      dataIndex: "ST_LoaiIII",
                      width: 90,
                      render: (val: any) => (val ? val : "?"),
                    },
                    {
                      title: "KL",
                      dataIndex: "KL_LoaiIII",
                      width: 110,
                      render: (val: any) => (val ? val : "?"),
                    },
                  ],
                },
                {
                  title: "Tổng số thanh",
                  dataIndex: "tongSoThanh",
                  width: 120,
                  align: "center",
                  render: (val: any) => (
                    <Typography.Text strong>{val}</Typography.Text>
                  ),
                },
                {
                  title: "Tổng khối lượng",
                  dataIndex: "tongKhoi",
                  width: 140,
                  align: "center",
                  render: (val: any) => (
                    <Typography.Text type="danger">{val}</Typography.Text>
                  ),
                },
                {
                  title: "Ghi chú",
                  dataIndex: "ghiChu",
                  width: 180,
                  render: (val: any) => val || "-",
                },
              ]}
            />
          </div>
        </div>

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
              const stLoai1 = Number(row.ST_LoaiI || 0);
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
              ...chuyenData,
              ...selectedRows.map((row) => {
                const v = partialValues[String(row.key)] || {};
                const sum = Number(v.chuyenST || 0);
                const totalRowST =
                  Number(row.ST_LoaiI || 0) +
                  Number(row.ST_LoaiII || 0) +
                  Number(row.ST_LoaiIII || 0);
                const stChuaChuyen = Math.max(totalRowST - sum, 0);
                return {
                  ...row,
                  isThung: true,
                  chuyenHet: false,
                  tinhTrang: 2,
                  tongSoThanh: sum,
                  stChuaChuyen,
                  stBKM:
                    Number(row.ST_LoaiI || 0) +
                    Number(row.ST_LoaiII || 0) +
                    Number(row.ST_LoaiIII || 0),
                  ngaySX: form.getFieldValue("NgaySX")
                    ? form.getFieldValue("NgaySX").format("YYYY-MM-DD")
                    : null,
                  ca: form.getFieldValue("ca") || null,
                  chuyenMotPhan: {
                    tongChuyen: sum,
                  },
                };
              }),
            ];
            const sums: Record<string, number> = {};
            selectedRows.forEach((r) => {
              const v = partialValues[String(r.key)] || {};
              sums[String(r.key)] = Number(v.chuyenST || 0);
            });
            const nextTable = tableData.map((row) => {
              if (!selectedRowKeys.includes(row.key)) return row;
              const v = partialValues[String(row.key)] || {};
              const sum = Number(v.chuyenST || 0);
              const total = Number(row.soLuong || 0);
              const remaining = total ? Math.max(total - sum, 0) : total;
              const totalRowST =
                Number(row.ST_LoaiI || 0) +
                Number(row.ST_LoaiII || 0) +
                Number(row.ST_LoaiIII || 0);
              const stChuaChuyen = Math.max(totalRowST - sum, 0);
              return {
                ...row,
                soLuong: remaining,
                tinhTrang: 2,
                stChuaChuyen,
                tongSoThanh: sum,
                stBKM:
                  Number(row.ST_LoaiI || 0) +
                  Number(row.ST_LoaiII || 0) +
                  Number(row.ST_LoaiIII || 0),
              };
            });
            setChuyenData(nextThung);
            setTableData(nextTable);
            setPartialOpen(false);
            setSelectedRowKeys([]);
            message.success("Đã chuyển một phần các dòng đã chọn");
            // await saveAfterTransfer(nextTable, nextThung);
            await postBulkTransfers(selectedRows, { sums });
            const stUpdatePayload2 = selectedRows.map((r) => ({
              id: Number(r.idBkPhoiThep || 0),
              sT_DaChuyen: Number(sums[String(r.key)] || 0),
            }));
            if (stUpdatePayload2.length > 0)
              await phoiGiaoNhanApi.stDaChuyenBulk(stUpdatePayload2);
            await reloadChuyenData();
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
                      value={Number(record.ST_LoaiI || 0)}
                      readOnly
                    />
                  ),
                },
                {
                  title: "Loại 2 ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      value={Number(record.ST_LoaiII || 0)}
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
                      value={Number(record.ST_LoaiIII || 0)}
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
                      max={Number(record.ST_LoaiI || 0)}
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
                      {Number(record.ST_LoaiI || 0) +
                        Number(record.ST_LoaiII || 0) +
                        Number(record.ST_LoaiIII || 0)}
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

        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <Button
            onClick={handleSaveOnly}
            icon={<SaveOutlined />}
            style={{
              backgroundColor: "#faad14",
              borderColor: "#faad14",
              color: "#fff",
            }}
          >
            Lưu
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            style={{ backgroundColor: "#1890ff", borderColor: "#1890ff" }}
          >
            Gửi trình ký
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default XuLyPhieuPhoiNong;
