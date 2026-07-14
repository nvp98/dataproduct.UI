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
  Row,
  Col,
  Space,
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
  DownloadOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import { CtdPhoiNongApi } from "../../../services/CtdPhoiNongApi";
import { getFileNameFromContentDisposition } from "../../../utils/helpers";
import { PheDuyetApi } from "../../../services/PheDuyetApi";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";

const TaoPhieuPhoiNong = () => {
  const location = useLocation();
  const { idphieu, thongtinphieu, type, userInfo } = location.state || {};
  // console.log(thongtinphieu);
  const thongtinuser = getThongTinUser();
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
        ST_ChuyenI?: number;
        ST_ChuyenII?: number;
        ST_ChuyenIII?: number;
      }
    >
  >({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<
    Array<string | number>
  >([]);
  const [, setLoadingChuyen] = useState(false);
  const [filterXuong, setFilterXuong] = useState("");
  const [filterNgay, setFilterNgay] = useState(dayjs());
  const [filterCa, setFilterCa] = useState("");
  const [filterMe, setFilterMe] = useState("");
  const [filteredChuyenData, setFilteredChuyenData] = useState<any[]>([]);
  const [selectedProcessedKeys, setSelectedProcessedKeys] = useState<Key[]>([]);
  const [pheDuyetFromApi, setPheDuyetFromApi] = useState<any[]>([]);
  const isViecDenToi = String(type || "") === "viecdentoi";

  // Theo dõi thay đổi trên các field chính
  const ngaySX = Form.useWatch("NgaySX", form);
  const ca = Form.useWatch("ca", form);

  /**
   * Tính toán ca hiện tại + 2 ca liền kề sau
   * VD: Ca ngày 14 -> [Ca ngày 14, Ca đêm 14, Ca ngày 15]
   *     Ca đêm 14 -> [Ca đêm 14, Ca ngày 15, Ca đêm 15]
   */
  const getValidNextShifts = () => {
    if (!ngaySX || !ca) return null;

    const currentDate = dayjs(ngaySX);
    const currentShift = Number(ca);

    if (currentShift === 1) {
      // Ca ngày -> ca hiện tại + 2 ca liền kề: ca ngày, ca đêm cùng ngày, ca ngày hôm sau
      return [
        { date: currentDate, shift: 1 },
        { date: currentDate, shift: 2 },
        { date: currentDate.add(1, "day"), shift: 1 },
      ];
    } else {
      // Ca đêm -> ca hiện tại + 2 ca liền kề: ca đêm, ca ngày hôm sau, ca đêm hôm sau
      return [
        { date: currentDate, shift: 2 },
        { date: currentDate.add(1, "day"), shift: 1 },
        { date: currentDate.add(1, "day"), shift: 2 },
      ];
    }
  };

  const validShifts = getValidNextShifts();

  // Kiểm tra ngày có hợp lệ không
  const isDateValid = (date: dayjs.Dayjs) => {
    if (!validShifts) return true;
    return validShifts.some((vs) => vs.date.isSame(date, "day"));
  };

  // Kiểm tra ca có hợp lệ không với ngày đã chọn
  const isShiftValid = (shift: number) => {
    if (!validShifts || !filterNgay) return true;
    return validShifts.some(
      (vs) => vs.date.isSame(filterNgay, "day") && vs.shift === shift,
    );
  };

  // Reset filterCa khi filterNgay thay đổi và ca hiện tại không hợp lệ
  useEffect(() => {
    if (!isViecDenToi && filterCa && filterNgay) {
      const shiftNum = Number(filterCa);
      if (!isShiftValid(shiftNum)) {
        setFilterCa("");
      }
    }
  }, [filterNgay]);

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
          donTrongPhoi: 0,
        },
      ];
    }
    return (res || []).map((item: any) => {
      console.log("item", item);
      const ST_LoaiI = Number(item.loaiChatLuong == 1 ? item.soThanh : 0);
      const ST_LoaiII = Number(item.loaiChatLuong == 2 ? item.soThanh : 0);
      const ST_LoaiIII = Number(item.loaiChatLuong == 3 ? item.soThanh : 0);
      const KL_LoaiI = Number(item.loaiChatLuong == 1 ? item.tongKhoiLuog : 0);
      const KL_LoaiII = Number(item.loaiChatLuong == 2 ? item.tongKhoiLuog : 0);
      const KL_LoaiIII = Number(
        item.loaiChatLuong == 3 ? item.tongKhoiLuog : 0,
      );
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
        vanChuyen: item.vanChuyen,
        kichThuoc: item.kichThuoc ?? "",
        idBkPhoiThep: item.idBkPhoiThep ?? item.IdBkPhoiThep ?? item.id ?? 0,
        ST_LoaiI,
        KL_LoaiI: KL_LoaiI,
        ST_LoaiII,
        KL_LoaiII: KL_LoaiII,
        ST_LoaiIII,
        KL_LoaiIII: KL_LoaiIII,
        tongKhoi: Number(item.tongKhoiLuong ?? item.tongKhoiLuog ?? 0),
        tongSoThanh,
        stChuaChuyen,
        stDaChuyen: item.stDaChuyen ?? 0,
        stBKM: tongSoThanhBKM,
        tinhTrang: tinhtrang,
        ghiChu: item.GhiChu ?? "",
        donTrongPhoi: Number(item.donTrongPhoi || 0),
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
    opts?: { sum?: number; ngaySx?: string; ca?: string | number },
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
      Number(row.ST_LoaiI || 0) +
      Number(row.ST_LoaiII || 0) +
      Number(row.ST_LoaiIII || 0);
    // const loai1St = Number(row.ST_LoaiI || row.loaiI_TP || 0);
    // const loai1Kl = Number(row.KL_LoaiI || row.loaiI_BM || 0);
    // const kgPer1 = loai1St > 0 ? loai1Kl / loai1St : 0;
    const khoiLuongChuyenLoai1 =
      Number(row.ST_LoaiI || 0) > 0
        ? Number((row.ST_LoaiI * row.donTrongPhoi).toFixed(2))
        : 0;
    const khoiLuongChuyenLoai2 =
      Number(row.ST_LoaiII || 0) > 0
        ? Number((row.ST_LoaiII * row.donTrongPhoi).toFixed(2))
        : 0;
    const khoiLuongChuyenLoai3 =
      Number(row.ST_LoaiIII || 0) > 0
        ? Number((row.ST_LoaiIII * row.donTrongPhoi).toFixed(2))
        : 0;
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
      soThanhLoai1: Number(row.ST_LoaiI || 0), // chuyển theo Loại 1
      khoiLuongLoai1: khoiLuongChuyenLoai1,
      soThanhLoai2: Number(row.ST_LoaiII || row.loaiII_TP || 0),
      khoiLuongLoai2: khoiLuongChuyenLoai2,
      soThanhLoai3: Number(row.ST_LoaiIII || row.loaiIII_TP || 0),
      khoiLuongLoai3: khoiLuongChuyenLoai3,
      tongSt: sum,
      tongKl:
        khoiLuongChuyenLoai1 + khoiLuongChuyenLoai2 + khoiLuongChuyenLoai3,
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
    },
  ) => {
    try {
      const payload = rows.map((r) =>
        mapRowToCtdPhoiNong(r, {
          sum: opts?.sums ? Number(opts.sums[String(r.key)] || 0) : undefined,
          ngaySx: filterNgay?.format("YYYY-MM-DD") ?? null,
          ca: filterCa ?? null,
        }),
      );
      console.log("➡️ Payload gửi sang CtdPhoiNong/bulk: rows", rows);
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
      vanChuyen: item.vanChuyen ?? "",
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
      ngayDuc: item.ngayDuc ?? null,
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
          config.code === "CTD_BB_Phoinong",
      );
      if (!tablePhoiNong) return; // check đúng bảng phôi nóng

      if (tablePhoiNong && tablePhoiNong.dataSource.url !== "") {
        const res = await phoiGiaoNhanApi.getData(params);
        const apiRows = mapApiToTable(res as any) ?? [];
        // const readonlyKeys = getReadonlyFields(tablePhoiNong.columns || []);
        setTableData(() => {
          // return apiRows;
          return apiRows.map((row: any) => ({
            ...row,
            vanChuyen: mapXuogCan(row.vanChuyen),
          }));
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

          // Lưu pheDuyet từ API nếu có
          if ((res as any)?.pheDuyet && Array.isArray((res as any)?.pheDuyet)) {
            setPheDuyetFromApi((res as any).pheDuyet);
            console.log("✅ Đã load pheDuyet từ API:", (res as any).pheDuyet);
          }

          // data.Data là phần JSON đã parse (form động)
          const data = (res as any)?.jsonData || {}; //
          // Chuyển chuỗi -> dayjs

          const formValues = {
            ...data,
            idphieu: (res as any)?.idphieu || "",
            NgaySX: (res as any)?.ngaySX
              ? dayjs((res as any)?.ngaySX, "YYYY-MM-DD")
              : null,
            ca: (res as any)?.ca || null,
            mayDuc: (res as any)?.mayDuc || null,
          };

          form.setFieldsValue(formValues);
          if (isViecDenToi) {
            // setFilterNgay(formValues.NgaySX || null);
            setFilterCa(formValues.ca ? String(formValues.ca) : "");
            setFilterXuong(formValues.mayDuc || 0);
          }
          setFilterNgay(formValues.NgaySX || null);
          // setFilterCa(formValues.ca ? String(formValues.ca) : "");

          if (formValues.table1) {
            // dữ liệu này chỉ để tham khảo
            // setTableData(formValues.table1);
          }
          // load bảng dữ liệu dưới khi ở trạng thái xử lý
          if (isViecDenToi) {
            handleFilterChuyenData({
              NgaySX: formValues.NgaySX
                ? formValues.NgaySX.format("YYYY-MM-DD")
                : null,
              Ca: formValues.ca,
              Xuong: formValues.mayDuc,
            });
          }
          // if ((formValues as any).chuyenData) {
          //   setChuyenData((formValues as any).chuyenData);
          // }

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
  const mapXuogCan = (value?: string) => {
    if (!value) return value;
    if (!value.startsWith("NMC")) return value;

    const so = value.replace("NMC", "");
    return so ? `Cán ${so}` : "Cán";
  };
  const enhanceColumns = (cols: any[]) => {
    return (cols || []).map((c: any) => {
      if (c.title === "Mẻ") return { ...c, width: 200, fixed: "left" };
      if (c.title === "Mác") return { ...c, width: 120, fixed: "left" };
      if (c.title === "Kích thước") return { ...c, width: 230 };
      if (c.title === "Đúc") return { ...c, width: 90 };
      if (c.dataIndex == "vanChuyen")
        return {
          ...c,
          width: 90,
        };
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
   * - Cập nhật người xử lý vào pheDuyetFlow nếu có thamSo xacNhanInfo
   */
  const saveAfterTransfer = async (
    nextTable: any[],
    nextThung: any[],
    xacNhanInfo?: { maKyDuyet: string; nguoiXuLyId: number; tinhTrang: number },
  ) => {
    try {
      const values = form.getFieldsValue();

      // Build mới từ config và sau đó map với flow api nếu có
      let pheDuyetFlow: any[];

      // Luôn build mới từ config trước
      pheDuyetFlow = config.signatures
        // .filter((s) => s.isChon)
        .map((s) => ({
          capDuyet: s.capduyet,
          maKyDuyet: s.key,
          nguoiDuyetId: form.getFieldValue(s.key),
          tinhTrang: 0,
          ghiChu: "",
        }));

      // const hasCreator = config.signatures.find(
      //   (x) =>
      //     x.isChon === false &&
      //     x.capduyet === 0 &&
      //     x.maphongBan === (stored ? JSON.parse(stored).tenNgan : ""),
      // );
      // if (hasCreator) {
      //   pheDuyetFlow.unshift({
      //     capDuyet: 0,
      //     maKyDuyet: hasCreator?.key || "",
      //     nguoiDuyetId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
      //     tinhTrang: 1,
      //     ghiChu: "Người tạo phiếu",
      //   });
      // }

      // console.log("🆕 Build pheDuyetFlow từ config:", pheDuyetFlow);

      // Map với dữ liệu từ API nếu có
      if (pheDuyetFromApi && pheDuyetFromApi.length > 0) {
        console.log("📋 Mapping với pheDuyetFlow từ API:", pheDuyetFromApi);

        pheDuyetFlow.forEach((item) => {
          const apiItem = pheDuyetFromApi.find(
            (api) => api.capDuyet === item.capDuyet,
          );
          if (apiItem) {
            item.nguoiDuyetId = apiItem.nguoiDuyetId;
            item.tinhTrang = apiItem.tinhTrang;
            item.ghiChu = apiItem.ghiChu || "";
            console.log(`✅ Đã map cấp ${item.capDuyet} từ API:`, apiItem);
          }
        });
      }

      // Cập nhật người xử lý vào pheDuyetFlow nếu có thông tin xác nhận
      if (xacNhanInfo) {
        const { maKyDuyet, nguoiXuLyId, tinhTrang } = xacNhanInfo;

        console.log("🔍 Tìm kiếm trong config với maKyDuyet:", maKyDuyet);
        console.log("📋 PheDuyetFlow hiện tại:", pheDuyetFlow);

        // Tìm cấp duyệt trong config
        const signatureConfig = config.signatures.find(
          (s) => s.key === maKyDuyet,
        );

        if (!signatureConfig) {
          console.warn(
            `⚠️ Không tìm thấy ${maKyDuyet} trong config signatures`,
          );
          return;
        }

        const capDuyet = signatureConfig.capduyet;

        // Tìm item trong pheDuyetFlow theo cấp duyệt
        const flowItem = pheDuyetFlow.find(
          (item) => item.capDuyet === capDuyet,
        );

        if (flowItem) {
          // Cập nhật item theo cấp duyệt
          flowItem.maKyDuyet = maKyDuyet;
          flowItem.nguoiDuyetId = nguoiXuLyId;
          flowItem.tinhTrang = tinhTrang;
          flowItem.ghiChu =
            tinhTrang === 1
              ? `Đã xác nhận bởi ${maKyDuyet}`
              : `Thu hồi bởi ${maKyDuyet}`;
          console.log(
            `✅ Đã cập nhật cấp ${capDuyet} (${maKyDuyet}):`,
            flowItem,
          );
        } else {
          console.warn(
            `⚠️ Không tìm thấy cấp duyệt ${capDuyet} trong pheDuyetFlow`,
          );
        }

        // Cập nhật người ký vào form
        form.setFieldValue(maKyDuyet, nguoiXuLyId);
        console.log(`📝 Đã cập nhật form field ${maKyDuyet} = ${nguoiXuLyId}`);
      }

      // Cập nhật lại state để sử dụng cho lần sau
      setPheDuyetFromApi(pheDuyetFlow);

      const normalizedTable = (nextTable || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stBKM || 0),
      }));
      const normalizedThung = (nextThung || []).map((r: any) => ({
        ...r,
        stBKM: Number(r.stBKM || 0),
      }));
      const payload = {
        ...values,
        NgaySX: values.NgaySX ? values.NgaySX.format("YYYY-MM-DD") : null,
        maBm: config.code,
        // nguoiTaoId: stored ? JSON.parse(stored).iD_TaiKhoan : null,
        xuongId: thongtinuser.iD_PhanXuong,
        idphongBan: thongtinuser.iD_PhongBan,
        table1: normalizedTable,
        chuyenData: normalizedThung,
        pheDuyet: pheDuyetFlow,
      };
      console.log("📤 Payload gửi lên API:", payload);
      console.log("📋 PheDuyetFlow trong payload:", payload.pheDuyet);

      if (values.idphieu) {
        await PhieuApi.putData(values.idphieu, payload);
        message.success("Đã lưu cập nhật sau khi chuyển");
      }
      // else {
      //   const res = await PhieuApi.postData(payload);
      //   form.setFieldsValue({ idphieu: (res as any)?.idphieu });
      //   setSoPhieu((res as any)?.soPhieu || "");
      //   message.success(
      //     `Đã tạo phiếu và lưu dữ liệu chuyển: ${(res as any)?.soPhieu || ""}`
      //   );
      // }
      // if (values.idphieu) {
      //   await PhieuApi.putData(values.idphieu, payload);
      //   message.success("Đã lưu cập nhật sau khi chuyển hết");
      // } else {
      //   const res = await PhieuApi.postData(payload);
      //   form.setFieldsValue({ idphieu: (res as any)?.idphieu });
      //   setSoPhieu((res as any)?.soPhieu || "");
      //   message.success(
      //     `Đã tạo phiếu và lưu chuyển hết: ${(res as any)?.soPhieu || ""}`
      //   );
      // }
    } catch (e) {
      console.error(e);
      message.error("Không thể lưu dữ liệu sau khi chuyển hết");
    }
  };

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
      "vanChuyen",
      "ST_LoaiI",
      "KL_LoaiI",
      "ST_LoaiII",
      "KL_LoaiII",
      "ST_LoaiIII",
      "KL_LoaiIII",
      "tongKhoi",
      // "tongSoThanh",
      "stChuaChuyen",
      "stBKM",
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
  const handleFilterChuyenData = async (paramsInit: any) => {
    try {
      // setLoadingChuyen(true);
      setChuyenData([]);
      const idVal =
        form.getFieldValue("idphieu") || idphieu || thongtinphieu?.idphieu;
      if (!idVal) {
        message.warning("Chưa có ID phiếu để tải danh sách phôi đã chuyển");
        return;
      }
      // const params = {
      //   NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
      //   Ca: filterCa ? Number(filterCa) : null,
      //   Xuong: filterXuong ? filterXuong : null,
      //   Me: filterMe ? filterMe : null,
      // };
      const rawParams = {
        NgaySX:
          paramsInit?.NgaySX ??
          (filterNgay ? filterNgay.format("YYYY-MM-DD") : undefined),
        Ca: paramsInit?.Ca ?? filterCa,
        Xuong: paramsInit?.Xuong ?? filterXuong,
        Me: filterMe?.trim(),
      };
      const params = Object.fromEntries(
        Object.entries(rawParams).filter(
          ([_, v]) => v !== undefined && v !== null && v !== "",
        ),
      );
      // const params = {
      //   NgaySX: paramsInit?.NgaySX ?? filterNgay.format("YYYY-MM-DD"),
      //   Ca: paramsInit?.Ca ?? filterCa,
      //   Xuong: paramsInit?.Xuong ?? filterXuong,
      //   Me: filterMe ? filterMe : null,
      // };

      const res = await CtdPhoiNongApi.getData(params);
      const rows = mapCtdPhoiNongToRows(res as any);
      setChuyenData(rows);
      setFilteredChuyenData([]);
      setSelectedProcessedKeys([]);
    } catch (e) {
      message.error(
        "Không thể tải danh sách phôi đã chuyển từ API CtdPhoiNong",
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
        const params = {
          NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
          Ca: filterCa ? Number(filterCa) : null,
          Xuong: filterXuong ? filterXuong : null,
        };
        res = await CtdPhoiNongApi.getData(params);
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
        selectedProcessedKeys.includes(r.key),
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
                  : 0,
          ),
        }));
      // console.log("stUpdatePayload", stUpdatePayload);
      if (stUpdatePayload.length > 0) {
        await phoiGiaoNhanApi.stThuHoiBulk(stUpdatePayload);
      }
      await Promise.all(
        selected
          .filter((r: any) => Number(r.id || 0) > 0)
          .map((r: any) => CtdPhoiNongApi.delete(Number(r.id))),
      );
      const updatedChuyenData = chuyenData.filter(
        (r: any) => !selected.find((f: any) => f.key === r.key),
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
        // MayDuc: thongtinphieu?.mayDuc,
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
        (x) => x.isChon === false && x.capduyet === 1,
      );
      if (hasCreator) {
        pheDuyetFlow.unshift({
          capDuyet: 1,
          maKyDuyet: hasCreator?.key || "", //
          nguoiDuyetId: thongtinuser.iD_TaiKhoan,
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
        nguoiTaoId: thongtinuser.iD_TaiKhoan,
        xuongId: thongtinuser.iD_PhanXuong,
        idphongBan: thongtinuser.iD_PhongBan,
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
          `Gửi trình ký thành công: ${(res as any)?.soPhieu || ""}`,
        );
      }
    } catch (error) {
      message.error("Không thể tạo phiếu! Vui lòng thử lại.");
    }
  };
  // Lưu phiếu nhưng không gửi trình ký
  // const handleSaveOnly = async () => {
  //   try {
  //     const stored = thongtinuser;
  //     const values = form.getFieldsValue();
  //     const normalizedTable = (tableData || []).map((r: any) => ({
  //       ...r,
  //       stBKM: Number(r.stBKM || 0),
  //     }));
  //     const normalizedThung = (chuyenData || []).map((r: any) => ({
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
  //     };
  //     if (values.idphieu) {
  //       await PhieuApi.putData(values.idphieu, payload);
  //       await PhieuApi.changeStatus_extended(values.idphieu, {
  //         status: 0,
  //         isLock: 0,
  //         isDelete: 0,
  //       });
  //       message.success("Đã lưu phiếu (chưa gửi trình ký)");
  //     } else {
  //       const res = await PhieuApi.postData(payload);
  //       const newId = (res as any)?.idphieu;
  //       if (newId) form.setFieldsValue({ idphieu: newId });
  //       setSoPhieu((res as any)?.soPhieu || "");
  //       await PhieuApi.changeStatus_extended(newId, {
  //         status: 0,
  //         isLock: 0,
  //         isDelete: 0,
  //       });
  //       message.success(`Đã lưu phiếu: ${(res as any)?.soPhieu || ""}`);
  //     }
  //   } catch (e) {
  //     message.error("Không thể lưu phiếu");
  //   }
  // };

  const checkMaBP = (userInfo: any) => {
    if (!userInfo) return false;

    const tenNgan = (userInfo.tenNgan || userInfo.TenNgan || "")
      .trim()
      .toUpperCase();

    return tenNgan;
  };

  const getSelectedRowsOrWarn = () => {
    if (!filterNgay || !filterCa) {
      message.warning(
        "Vui lòng chọn Ngày và Ca trong vùng 'Danh sách phôi đã chuyển'",
      );
      return null;
    }

    if (!selectedRowKeys || selectedRowKeys.length === 0) {
      message.warning("Vui lòng chọn ít nhất một dòng");
      return null;
    }

    const rows = tableData.filter((r) => selectedRowKeys.includes(r.key));

    const invalid = rows.find((row) => {
      const hasMe = !!row.me;
      const hasMac = !!row.mac;
      const hasAnyTypePair =
        (Number(row.ST_LoaiI || 0) > 0 && Number(row.KL_LoaiI || 0) > 0) ||
        (Number(row.ST_LoaiII || 0) > 0 && Number(row.KL_LoaiII || 0) > 0) ||
        (Number(row.ST_LoaiIII || 0) > 0 && Number(row.KL_LoaiIII || 0) > 0);

      return !(hasMe && hasMac && hasAnyTypePair);
    });

    if (invalid) {
      message.warning(
        "Vui lòng nhập Mẻ, Mác và ít nhất 1 loại có Số thanh & Khối lượng",
      );
      return null;
    }

    return rows;
  };
  // Chuyển hết các dòng đã chọn
  const handleTransferAll = async () => {
    const selectedRows = getSelectedRowsOrWarn();
    if (!selectedRows) return;

    //CHECK TRÙNG MẺ
    const trungMe = checkDaChuyenMeTrongNgayCa(selectedRows);
    if (trungMe) {
      message.warning(
        `Mẻ ${trungMe.me} đã được chuyển phôi trong ngày ${filterNgay.format(
          "DD/MM/YYYY",
        )} ca ${filterCa === "1" ? "Ngày" : "Đêm"}`,
      );
      return;
    }

    // 1. Tính số thanh chuyển = toàn bộ Loại I
    const sums: Record<string, number> = {};
    selectedRows.forEach((r) => {
      sums[String(r.key)] = Number(r.ST_LoaiI || 0);
    });
    // 1Tính số thanh THỰC CHUYỂN (clamp theo tồn)
    const transferRows = selectedRows.map((r) => {
      const soChuyen = Math.min(
        Number(r.ST_LoaiI || 0),
        Number(r.stChuaChuyen || 0),
      );

      sums[String(r.key)] = soChuyen;

      return {
        ...r,
        ST_LoaiI: soChuyen,
      };
    });

    // 2. Update bảng trên (BKMIS)
    const nextTable = tableData.map((row) => {
      if (!selectedRowKeys.includes(row.key)) return row;

      return {
        ...row,
        tongSoThanh: Number(row.ST_LoaiI || 0),
        stChuaChuyen: 0,
        tinhTrang: 1, // đã chuyển hết
      };
    });

    setTableData(nextTable);
    setSelectedRowKeys([]);
    console.log("➡️ selectedRows for CTD:", selectedRows);
    // 3. Gửi CTD
    await postBulkTransfers(transferRows, { sums });

    // 4. Update BK MIS
    const stUpdatePayload = selectedRows.map((r) => ({
      id: Number(r.idBkPhoiThep || 0),
      sT_DaChuyen: sums[String(r.key)],
    }));

    if (stUpdatePayload.length > 0) {
      await phoiGiaoNhanApi.stDaChuyenBulk(stUpdatePayload);
    }

    // 5. Reload danh sách đã chuyển
    await reloadChuyenData();

    // 6. Đồng bộ người tạo phiếu
    const values = form.getFieldsValue();
    if (values.idphieu) {
      try {
        const nguoiTaoId = thongtinuser.iD_TaiKhoan;
        await PhieuApi.syncNguoiTaoPhieu(values.idphieu, nguoiTaoId);
        console.log("📝 Đã đồng bộ người tạo phiếu:", nguoiTaoId);
      } catch (e) {
        console.error("Lỗi khi đồng bộ người tạo:", e);
      }
    }

    message.success("Đã chuyển hết các dòng đã chọn");
  };

  const openPartialTransferModal = () => {
    const selectedRows = getSelectedRowsOrWarn();
    if (!selectedRows) return;

    //CHECK TRÙNG MẺ
    const trungMe = checkDaChuyenMeTrongNgayCa(selectedRows);
    if (trungMe) {
      message.warning(
        `Mẻ ${
          trungMe.me
        } đã được NM.CTD hoặc P.QLCL xác nhận trong ngày ${filterNgay.format(
          "DD/MM/YYYY",
        )} ca ${filterCa === "1" ? "Ngày" : "Đêm"}`,
      );
      return;
    }

    const initVals: Record<string, any> = {};
    selectedRowKeys.forEach((k) => (initVals[String(k)] = {}));

    setPartialValues(initVals);
    setPartialOpen(true);
  };
  // Chuyển một phần các dòng đã chọn
  const handleConfirmPartialTransfer = async () => {
    const selectedRows = tableData.filter((r) =>
      selectedRowKeys.includes(r.key),
    );
    const updatedSelectedRows = selectedRows.map((r) => {
      const v = partialValues[String(r.key)] || {};

      return {
        ...r,
        ST_LoaiI: Number(v.ST_ChuyenI || 0),
        ST_LoaiII: Number(v.ST_ChuyenII || 0),
        ST_LoaiIII: Number(v.ST_ChuyenIII || 0),
        tongSt:
          Number(v.ST_ChuyenI || 0) +
          Number(v.ST_ChuyenII || 0) +
          Number(v.ST_ChuyenIII || 0),
      };
    });
    // 1. Validate
    for (const row of updatedSelectedRows) {
      if (row.tongSt <= 0) {
        message.error("Số thanh chuyển phải lớn hơn 0");
        return;
      }

      // if (row.tongSt > Number(row.ST_LoaiI || 0)) {
      //   message.error("Số thanh chuyển vượt quá số thanh hiện có");
      //   return;
      // }
    }

    // 2. Build sums
    const sums: Record<string, number> = {};
    const ST_LoaiI: Record<string, number> = {};
    const ST_LoaiII: Record<string, number> = {};
    const ST_LoaiIII: Record<string, number> = {};
    selectedRows.forEach((r) => {
      const v = partialValues[String(r.key)] || {};
      ST_LoaiI[String(r.key)] = v.ST_ChuyenI || 0;
      ST_LoaiII[String(r.key)] = v.ST_ChuyenII || 0;
      ST_LoaiIII[String(r.key)] = v.ST_ChuyenIII || 0;
      sums[String(r.key)] =
        Number(v.ST_ChuyenI || 0) +
        Number(v.ST_ChuyenII || 0) +
        Number(v.ST_ChuyenIII || 0);
    });
    // console.log("➡️ updatedSelectedRows:", updatedSelectedRows);
    // 3. Update bảng trên
    // const nextTable = tableData.map((row) => {
    //   if (!selectedRowKeys.includes(row.key)) return row;

    //   const sum = sums[String(row.key)];
    //   const totalRowST =
    //     Number(row.ST_LoaiI || 0) +
    //     Number(row.ST_LoaiII || 0) +
    //     Number(row.ST_LoaiIII || 0);

    //   return {
    //     ...row,
    //     tongSoThanh: sum,
    //     stChuaChuyen: Math.max(totalRowST - sum, 0),
    //     tinhTrang: 2, // chuyển một phần
    //   };
    // });

    // setTableData(nextTable);
    setPartialOpen(false);
    setSelectedRowKeys([]);
    console.log("➡️ updatedSelectedRows for CTD:", updatedSelectedRows);
    // 4. Gửi CTD
    await postBulkTransfers(updatedSelectedRows);

    // 5. Update BK
    const stUpdatePayload = updatedSelectedRows.map((r) => ({
      id: Number(r.idBkPhoiThep || 0),
      sT_DaChuyen: r.tongSt,
    }));
    console.log("stUpdatePayload", stUpdatePayload);
    if (stUpdatePayload.length > 0) {
      await phoiGiaoNhanApi.stDaChuyenBulk(stUpdatePayload);
    }

    await reloadChuyenData();
    fetchTableData({
      NgaySX: ngaySX ? dayjs(ngaySX).format("YYYY-MM-DD") : null,
      Ca: ca,
      LoaiPhoi: 1, // Phoi nong
      // MayDuc: thongtinphieu?.mayDuc,
    });

    // 6. Đồng bộ người tạo phiếu
    const values = form.getFieldsValue();
    if (values.idphieu) {
      try {
        const nguoiTaoId = thongtinuser.iD_TaiKhoan;
        await PhieuApi.syncNguoiTaoPhieu(values.idphieu, nguoiTaoId);
        console.log("📝 Đã đồng bộ người tạo phiếu:", nguoiTaoId);
      } catch (e) {
        console.error("Lỗi khi đồng bộ người tạo:", e);
      }
    }

    message.success("Đã chuyển một phần các dòng đã chọn");
  };

  const checkDaChuyenMeTrongNgayCa = (rows: any[]) => {
    if (!filterNgay || !filterCa) return null;

    const ngay = filterNgay.format("YYYY-MM-DD");
    const caVal = Number(filterCa);
    // tập mẻ đã được CTD hoặc QLCL xác nhận
    // 1️⃣ Tập mẻ đã được xác nhận trong danh sách đã chuyển
    const meDaXacNhan = new Set<string>(
      (chuyenData || [])
        .filter((item: any) => {
          return (
            item.ngaySX === ngay &&
            Number(item.ca) === caVal &&
            String(item.me || "").trim() !== "" &&
            (Number(item.tinhTrangCTD || 0) === 1 ||
              Number(item.tinhTrangQLCL || 0) === 1 ||
              item.ctdXacNhan === true ||
              item.qlclXacNhan === true)
          );
        })
        .map((item: any) => String(item.me).trim()),
    );

    // tìm mẻ bị trùng
    const trungMe = rows.find((r) =>
      meDaXacNhan.has(String(r.me || "").trim()),
    );

    return trungMe || null;
  };

  // Hàm tính tổng dùng chung
  const calcSummary = (rows: any[]) => {
    console.log("Calculating summary for rows:", rows);
    return rows.reduce(
      (acc, r) => {
        acc.ST1 += Number(r.ST_LoaiI || 0);
        acc.ST2 += Number(r.ST_LoaiII || 0);
        acc.ST3 += Number(r.ST_LoaiIII || 0);

        acc.KL1 += Number(r.KL_LoaiI || 0);
        acc.KL2 += Number(r.KL_LoaiII || 0);
        acc.KL3 += Number(r.KL_LoaiIII || 0);
        acc.TongKL += Number(r.tongKhoi || 0);
        acc.TongST += Number(r.tongSoThanh || 0);

        return acc;
      },
      {
        ST1: 0,
        ST2: 0,
        ST3: 0,
        KL1: 0,
        KL2: 0,
        KL3: 0,
        TongKL: 0,
        TongST: 0,
      },
    );
  };

  // const handleExportExcel = async () => {
  //   // Cập nhật lại trạng thái chốt ở các dòng
  //   var params = {
  //     NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
  //     Ca: filterCa ? Number(filterCa) : null,
  //     Xuong: filterXuong || null,
  //   };
  //   await CtdPhoiNongApi.exportExcel(params);
  // };

  const handleExportExcel = async () => {
    try {
      // Cập nhật lại trạng thái chốt ở các dòng
      var params = {
        NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
        Ca: filterCa ? Number(filterCa) : null,
        Xuong: filterXuong || null,
      };
      const response = await CtdPhoiNongApi.exportExcel(params);

      const blob = new Blob([response as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      console.log("blob", blob);
      console.log("response", response.headers);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BM.06-QT.05.11_Bien_ban_giao_nhan_phoi_nong_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Excel failed:", error);
      message.error("Xuất file thất bại!");
    }
  };

  const handleExportExcelPKH = async () => {
    try {
      // Cập nhật lại trạng thái chốt ở các dòng
      var params = {
        NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
        Ca: filterCa ? Number(filterCa) : null,
        Xuong: filterXuong || null,
      };
      const response = await CtdPhoiNongApi.exportExcelPKH(params);

      const blob = new Blob([response as any], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      console.log("blob", blob);
      console.log("response", response.headers);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `TongHop_Bien_ban_giao_nhan_phoi_nong_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Excel failed:", error);
      message.error("Xuất file thất bại!");
    }
  };

  const handleExportPdf = async () => {
    try {
      // Cập nhật lại trạng thái chốt ở các dòng
      var params = {
        NgaySX: filterNgay ? filterNgay.format("YYYY-MM-DD") : null,
        Ca: filterCa ? Number(filterCa) : null,
        Xuong: filterXuong || null,
        id: form.getFieldValue("idphieu") || idphieu || null,
      };
      const response = await CtdPhoiNongApi.exportPdf(params);

      const blob = new Blob([response as any], {
        type: "application/pdf",
      });

      console.log("blob", blob);
      console.log("response", response.headers);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `BM.06-QT.05.11_Bien_ban_giao_nhan_phoi_nong_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Excel failed:", error);
      message.error("Xuất file thất bại!");
    }
  };

  return (
    <Card style={{ margin: -16, boxShadow: "0 2px 8px #f0f1f2" }}>
      {/* Tiêu đề biên bản */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
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
        {/* HEADER - các trường nhập đầu và buttons */}
        {!isViecDenToi && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              marginBottom: 6,
              flexWrap: "wrap",
              maxHeight: 75,
            }}
          >
            {/* Các trường form */}
            <div
              style={{
                display: "flex",
                gap: 12,
                flex: 1,
                flexWrap: "wrap",
              }}
            >
              {config.headerFields.map((f, idx) => {
                if (f.key === "mayduc") return null; // bỏ UI máy đúc
                return (
                  <div key={f.key || idx} style={{ minWidth: "200px" }}>
                    <CustomFormItem field={f} idx={idx} readOnly={true} />
                  </div>
                );
              })}
            </div>
            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Button
                onClick={async () => {
                  fetchTableData({
                    NgaySX: ngaySX ? dayjs(ngaySX).format("YYYY-MM-DD") : null,
                    Ca: ca,
                    LoaiPhoi: 1,
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
              {checkMaBP(userInfo) == "NM.HRC1" && (
                <>
                  <Button
                    onClick={handleTransferAll}
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
                    onClick={openPartialTransferModal}
                    icon={<ArrowRightOutlined />}
                  >
                    Chuyển một phần
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* TABLE - danh sách phôi */}
        {!isViecDenToi &&
          config.layout.map((layout, idx) => (
            <div key={idx}>
              {layout.sectionType === "table" && (
                <>
                  <style>{`
                    .custom-form-table-no-scroll-x {
                      overflow-x: hidden !important;
                      position: relative;
                    }

                    .custom-form-table-no-scroll-x .ant-table-wrapper {
                      overflow-x: hidden !important;
                      width: 100% !important;
                      padding-right: 8px;
                    }

                    .custom-form-table-no-scroll-x .ant-table {
                      overflow-x: hidden !important;
                      width: 100% !important;
                    }

                    .custom-form-table-no-scroll-x .ant-table-container {
                      overflow-x: hidden !important;
                      width: 100% !important;
                    }

                    .custom-form-table-no-scroll-x .ant-table-content {
                      overflow-x: hidden !important;
                      width: 100% !important;
                      padding-right: 0 !important;
                    }

                    .custom-form-table-no-scroll-x .ant-table-body {
                      overflow-x: hidden !important;
                      overflow-y: scroll !important;
                      width: calc(100% + 8px) !important;
                      scrollbar-gutter: stable;
                    }

                    .custom-form-table-no-scroll-x .ant-spin-nested-loading,
                    .custom-form-table-no-scroll-x .ant-spin-container {
                      overflow-x: hidden !important;
                      overflow-y: visible !important;
                      width: 100% !important;
                    }

                    .custom-form-table-no-scroll-x table {
                      width: 100% !important;
                      table-layout: auto;
                    }
                  `}</style>
                  <div className="custom-form-table-no-scroll-x">
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
                      isRowSelectable={(row) =>
                        Number(row.stChuaChuyen || 0) > 0
                      }
                      showStatus={true}
                      stickyHeader={true}
                      scrollY={460}
                      readonlyFields={getReadonlyFields(layout.columns || [])}
                      summary={() => {
                        const s = calcSummary(tableData);
                        return (
                          <Table.Summary>
                            <Table.Summary.Row>
                              <Table.Summary.Cell
                                index={1}
                                colSpan={6}
                                align="center"
                              >
                                <b>Tổng cộng</b>
                              </Table.Summary.Cell>
                              {/* Loại 1 */}
                              <Table.Summary.Cell index={2} align="center">
                                <b>{s.ST1}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} align="right">
                                <b>{(s.KL1 ?? 0).toLocaleString("vi-VN")}</b>
                              </Table.Summary.Cell>

                              {/* Loại 2 */}
                              <Table.Summary.Cell index={4} align="center">
                                <b>{s.ST2}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={5} align="right">
                                <b>{(s.KL2 ?? 0).toLocaleString("vi-VN")}</b>
                              </Table.Summary.Cell>

                              {/* Loại 3 */}
                              <Table.Summary.Cell index={6} align="center">
                                <b>{s.ST3}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={7} align="right">
                                <b>{(s.KL3 ?? 0).toLocaleString("vi-VN")}</b>
                              </Table.Summary.Cell>

                              {/* Tổng */}
                              <Table.Summary.Cell index={8} align="center">
                                <b>{s.TongST}</b>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={9} align="right">
                                <b>{(s.TongKL ?? 0).toLocaleString("vi-VN")}</b>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        );
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}

        {/* TABLE - danh sách đã chuyển */}
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            Danh sách phôi đã chuyển
          </Typography.Title>
          {/* Filter section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 8,
              marginBottom: 8,
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            {/* <div>
              <label style={{ fontSize: 12, fontWeight: "bold" }}>Xưởng</label>
              <Select
                placeholder="Chọn xưởng cán"
                value={filterXuong || undefined}
                onChange={(value) => setFilterXuong(value)}
                size="small"
                allowClear
                style={{ width: "100%" }}
                options={[
                  { label: "Xưởng cán 1", value: "1" },
                  { label: "Xưởng cán 2", value: "2" },
                  { label: "Xưởng cán 3", value: "3" },
                ]}
              />
            </div> */}
            <Row gutter={12} align="bottom">
              {/* Xưởng */}
              <Col style={{ width: 140 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Xưởng
                </div>
                <Select
                  placeholder="Chọn xưởng cán"
                  value={filterXuong || undefined}
                  onChange={setFilterXuong}
                  size="small"
                  style={{ width: "100%" }}
                  allowClear={!isViecDenToi}
                  open={isViecDenToi ? false : undefined}
                  options={[
                    { label: "Xưởng cán 1", value: "1" },
                    { label: "Xưởng cán 2", value: "2" },
                    { label: "Xưởng cán 3", value: "3" },
                  ]}
                />
              </Col>

              {/* Ngày */}
              <Col style={{ width: 140 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Ngày Cán
                </div>
                <DatePicker
                  style={{ width: "100%" }}
                  value={filterNgay}
                  onChange={setFilterNgay}
                  format="YYYY-MM-DD"
                  size="small"
                  open={isViecDenToi ? false : undefined}
                  inputReadOnly={isViecDenToi}
                  allowClear={!isViecDenToi}
                  disabledDate={(current) => {
                    if (isViecDenToi || !validShifts) return false;
                    return !isDateValid(current);
                  }}
                />
              </Col>

              {/* Ca */}
              <Col style={{ width: 120 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Ca
                </div>
                <Select
                  style={{ width: "100%" }}
                  placeholder="Chọn Ca"
                  value={filterCa}
                  onChange={setFilterCa}
                  size="small"
                  allowClear={!isViecDenToi}
                  open={isViecDenToi ? false : undefined}
                  options={[
                    {
                      label: "Ngày",
                      value: "1",
                      disabled:
                        !isViecDenToi && validShifts
                          ? !isShiftValid(1)
                          : undefined,
                    },
                    {
                      label: "Đêm",
                      value: "2",
                      disabled:
                        !isViecDenToi && validShifts
                          ? !isShiftValid(2)
                          : undefined,
                    },
                  ]}
                />
              </Col>

              {/* Mẻ */}
              <Col style={{ width: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Mẻ
                </div>
                <Input
                  placeholder="Mẻ"
                  value={filterMe}
                  onChange={(e) => setFilterMe(e.target.value)}
                  size="small"
                />
              </Col>
              {/* ===== RIGHT: ACTION BUTTONS ===== */}
              <Col>
                <Space size={8}>
                  <Button
                    onClick={handleFilterChuyenData}
                    type="primary"
                    size="small"
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
                  {checkMaBP(userInfo) == "P.QLCL" &&
                    type === "viecdentoi" &&
                    thongtinphieu.tinhTrang != 5 && (
                      <>
                        <Button
                          size="small"
                          onClick={async () => {
                            if (
                              !selectedProcessedKeys ||
                              selectedProcessedKeys.length === 0
                            ) {
                              message.warning(
                                "Vui lòng chọn ít nhất một dòng để QLCL xác nhận",
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
                                .filter((r: any) =>
                                  selectedProcessedKeys.includes(r.key),
                                )
                                .map((r: any) => ({
                                  id: Number(r.id || 0),
                                  tinhTrangQLCL: 1,
                                }));
                              if (idsPayload.length === 0) {
                                message.warning(
                                  "Không có dòng hợp lệ để QLCL xác nhận",
                                );
                                setLoadingChuyen(false);
                                return;
                              }
                              await CtdPhoiNongApi.updateStatus(idsPayload);
                              const next = source.map((r: any) =>
                                selectedProcessedKeys.includes(r.key)
                                  ? { ...r, tinhTrangQLCL: 1 }
                                  : r,
                              );
                              if (filteredChuyenData.length > 0) {
                                setFilteredChuyenData(next);
                              } else {
                                setChuyenData(next);
                              }
                              setSelectedProcessedKeys([]);

                              // Lưu thông tin người xử lý QLCL xác nhận
                              const userId = thongtinuser.iD_TaiKhoan;
                              await saveAfterTransfer(tableData, next, {
                                maKyDuyet: "nguoiKy_QLCL",
                                nguoiXuLyId: userId,
                                tinhTrang: 1,
                              });

                              message.success(
                                "QLCL đã xác nhận các dòng đã chọn",
                              );
                            } catch (e) {
                              message.error(
                                "Không thể cập nhật trạng thái xác nhận QLCL",
                              );
                            } finally {
                              setLoadingChuyen(false);
                            }
                          }}
                          type="primary"
                          style={{
                            backgroundColor: "#13c2c2",
                            borderColor: "#13c2c2",
                          }}
                        >
                          Xác nhận QLCL
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
                            if (
                              !selectedProcessedKeys ||
                              selectedProcessedKeys.length === 0
                            ) {
                              message.warning(
                                "Vui lòng chọn ít nhất một dòng để QLCL xác nhận",
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
                                .filter((r: any) =>
                                  selectedProcessedKeys.includes(r.key),
                                )
                                .map((r: any) => ({
                                  id: Number(r.id || 0),
                                  tinhTrangQLCL: 0,
                                }));
                              if (idsPayload.length === 0) {
                                message.warning(
                                  "Không có dòng hợp lệ để QLCL xác nhận",
                                );
                                setLoadingChuyen(false);
                                return;
                              }
                              await CtdPhoiNongApi.updateStatus(idsPayload);
                              const next = source.map((r: any) =>
                                selectedProcessedKeys.includes(r.key)
                                  ? { ...r, tinhTrangQLCL: 0 }
                                  : r,
                              );
                              if (filteredChuyenData.length > 0) {
                                setFilteredChuyenData(next);
                              } else {
                                setChuyenData(next);
                              }
                              setSelectedProcessedKeys([]);

                              // Lưu thông tin người xử lý QLCL thu hồi
                              const userId = thongtinuser.iD_TaiKhoan;
                              await saveAfterTransfer(tableData, next, {
                                maKyDuyet: "nguoiKy_QLCL",
                                nguoiXuLyId: userId,
                                tinhTrang: 0,
                              });

                              message.success(
                                "QLCL đã xác nhận các dòng đã chọn",
                              );
                            } catch (e) {
                              message.error(
                                "Không thể cập nhật trạng thái xác nhận QLCL",
                              );
                            } finally {
                              setLoadingChuyen(false);
                            }
                          }}
                          type="primary"
                          style={{
                            backgroundColor: "#c21313",
                            borderColor: "#c21313",
                          }}
                        >
                          Thu hồi QLCL
                        </Button>
                      </>
                    )}
                  {checkMaBP(userInfo) == "NM.CTD" &&
                    type === "viecdentoi" &&
                    thongtinphieu.tinhTrang != 5 && (
                      <>
                        <Button
                          size="small"
                          onClick={async () => {
                            if (
                              !selectedProcessedKeys ||
                              selectedProcessedKeys.length === 0
                            ) {
                              message.warning(
                                "Vui lòng chọn ít nhất một dòng để xác nhận",
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
                                .filter((r: any) =>
                                  selectedProcessedKeys.includes(r.key),
                                )
                                .map((r: any) => ({
                                  id: Number(r.id || 0),
                                  tinhTrangCTD: 1,
                                }));
                              if (idsPayload.length === 0) {
                                message.warning(
                                  "Không có dòng hợp lệ để xác nhận",
                                );
                                setLoadingChuyen(false);
                                return;
                              }
                              await CtdPhoiNongApi.updateStatus(idsPayload);
                              const next = source.map((r: any) =>
                                selectedProcessedKeys.includes(r.key)
                                  ? { ...r, tinhTrangCTD: 1 }
                                  : r,
                              );
                              if (filteredChuyenData.length > 0) {
                                setFilteredChuyenData(next);
                              } else {
                                setChuyenData(next);
                              }
                              setSelectedProcessedKeys([]);

                              // Lưu thông tin người xử lý CTD xác nhận
                              const userId = thongtinuser.iD_TaiKhoan;
                              await saveAfterTransfer(tableData, next, {
                                maKyDuyet: "nguoiKy_CTD",
                                nguoiXuLyId: userId,
                                tinhTrang: 1,
                              });

                              message.success("Đã xác nhận các dòng đã chọn");
                            } catch (e) {
                              message.error(
                                "Không thể cập nhật trạng thái xác nhận CTD",
                              );
                            } finally {
                              setLoadingChuyen(false);
                            }
                          }}
                          type="primary"
                          style={{
                            backgroundColor: "#52c41a",
                            borderColor: "#52c41a",
                          }}
                        >
                          Xác nhận
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
                            if (
                              !selectedProcessedKeys ||
                              selectedProcessedKeys.length === 0
                            ) {
                              message.warning(
                                "Vui lòng chọn ít nhất một dòng để xác nhận",
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
                                .filter((r: any) =>
                                  selectedProcessedKeys.includes(r.key),
                                )
                                .map((r: any) => ({
                                  id: Number(r.id || 0),
                                  tinhTrangCTD: 0,
                                }));
                              if (idsPayload.length === 0) {
                                message.warning(
                                  "Không có dòng hợp lệ để xác nhận",
                                );
                                setLoadingChuyen(false);
                                return;
                              }
                              await CtdPhoiNongApi.updateStatus(idsPayload);
                              const next = source.map((r: any) =>
                                selectedProcessedKeys.includes(r.key)
                                  ? { ...r, tinhTrangCTD: 0 }
                                  : r,
                              );
                              if (filteredChuyenData.length > 0) {
                                setFilteredChuyenData(next);
                              } else {
                                setChuyenData(next);
                              }
                              setSelectedProcessedKeys([]);

                              // Lưu thông tin người xử lý CTD thu hồi
                              const userId = thongtinuser.iD_TaiKhoan;
                              await saveAfterTransfer(tableData, next, {
                                maKyDuyet: "nguoiKy_CTD",
                                nguoiXuLyId: userId,
                                tinhTrang: 0,
                              });

                              message.success("Đã xác nhận các dòng đã chọn");
                            } catch (e) {
                              message.error(
                                "Không thể cập nhật trạng thái xác nhận CTD",
                              );
                            } finally {
                              setLoadingChuyen(false);
                            }
                          }}
                          type="primary"
                          style={{
                            backgroundColor: "#c41a1a",
                            borderColor: "#c41a1a",
                          }}
                        >
                          Thu hồi
                        </Button>
                      </>
                    )}
                  {checkMaBP(userInfo) == "P.KH" && type === "viecdentoi" && (
                    <>
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            setLoadingChuyen(true);
                            const source =
                              filteredChuyenData.length > 0
                                ? filteredChuyenData
                                : chuyenData;
                            const allDaXacNhan = source.every(
                              (r: any) =>
                                Number(r.tinhTrangCTD || 0) === 1 &&
                                Number(r.tinhTrangQLCL || 0) === 1,
                            );
                            if (!allDaXacNhan) {
                              message.warning(
                                "Tất cả dòng phải được CTD và QLCL xác nhận trước khi chốt",
                              );
                              setLoadingChuyen(false);
                              return;
                            }
                            // const hasChuaXacNhan = source.some(
                            //   (r: any) =>
                            //     selectedProcessedKeys.includes(r.key) &&
                            //     (Number(r.tinhTrangCTD || 0) === 0 ||
                            //       Number(r.tinhTrangQLCL || 0) === 0)
                            // );

                            // if (hasChuaXacNhan) {
                            //   message.warning(
                            //     "Dữ liệu chưa được CTD/QLCL xác nhận"
                            //   );
                            //   setLoadingChuyen(false);
                            //   return;
                            // }
                            await PhieuApi.changeStatus_extended(
                              thongtinphieu.idphieu,
                              {
                                status: 5,
                                isLock: 0,
                                isDelete: 0,
                              },
                            );

                            // Cập nhật lại trạng thái chốt ở các dòng
                            var params = {
                              NgaySX: filterNgay
                                ? filterNgay.format("YYYY-MM-DD")
                                : null,
                              Ca: filterCa ? Number(filterCa) : null,
                              Xuong: filterXuong || null,
                            };
                            await CtdPhoiNongApi.updateStatusChot(params);

                            // Load lại dữ liệu phiếu sau khi chốt
                            await reloadChuyenData();

                            message.success("Đã chốt phiếu");
                          } catch (e) {
                            message.error(
                              "Có lỗi xảy ra không thể chốt phiếu!",
                            );
                          } finally {
                            setLoadingChuyen(false);
                          }
                        }}
                        type="primary"
                        style={{
                          backgroundColor: "#52c41a",
                          borderColor: "#52c41a",
                        }}
                      >
                        Chốt phiếu
                      </Button>
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            setLoadingChuyen(true);

                            // Cập nhật trạng thái phiếu về trạng thái trước đó (ví dụ: 2 - Hoàn thành)
                            await PhieuApi.changeStatus_extended(
                              thongtinphieu.idphieu,
                              {
                                status: 2,
                                isLock: 0,
                                isDelete: 0,
                              },
                            );

                            // Cập nhật lại trạng thái hủy chốt ở các dòng
                            var params = {
                              NgaySX: filterNgay
                                ? filterNgay.format("YYYY-MM-DD")
                                : null,
                              Ca: filterCa ? Number(filterCa) : null,
                              Xuong: filterXuong || null,
                              status: 0,
                            };
                            await CtdPhoiNongApi.updateStatusChot(params);

                            // Load lại dữ liệu phiếu sau khi hủy chốt
                            await reloadChuyenData();

                            message.success("Đã hủy chốt phiếu");
                          } catch (e) {
                            message.error(
                              "Có lỗi xảy ra không thể hủy chốt phiếu!",
                            );
                          } finally {
                            setLoadingChuyen(false);
                          }
                        }}
                        danger
                        type="primary"
                        style={{
                          backgroundColor: "#ff4d4f",
                          borderColor: "#ff4d4f",
                        }}
                      >
                        Hủy chốt
                      </Button>
                      <Button
                        size="small"
                        onClick={handleExportExcelPKH}
                        type="default"
                        icon={<DownloadOutlined />}
                      >
                        Xuất Excel PKH
                      </Button>
                    </>
                  )}

                  {isViecDenToi && (
                    <>
                      <Button
                        size="small"
                        onClick={handleExportExcel}
                        type="default"
                        icon={<DownloadOutlined />}
                      >
                        Xuất Excel
                      </Button>
                      <Button
                        size="small"
                        onClick={handleExportPdf}
                        type="default"
                        icon={<FilePdfOutlined />}
                      >
                        Xuất Pdf
                      </Button>
                    </>
                  )}

                  {!isViecDenToi && checkMaBP(userInfo) == "NM.HRC1" && (
                    <Button
                      size="small"
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
                  )}
                </Space>
              </Col>
            </Row>
          </div>
          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 8,
              justifyContent: "flex-end",
            }}
          ></div>
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
                  disabled:
                    (!isViecDenToi &&
                      (Number(record.tinhTrangCTD || 0) === 1 ||
                        Number(record.tinhTrangQLCL || 0) === 1)) ||
                    checkMaBP(userInfo) == "P.KH",
                }),
                // getCheckboxProps: (record: any) => ({
                //   disabled: Number(record.tinhTrang || 0) == 1,
                // }),
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
                {
                  title: "Tình trạng",
                  dataIndex: "tinhTrang",
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
                        {isDone ? "Đã chốt" : "Chưa xử lý"}
                      </Button>
                    );
                  },
                },
                { title: "Ngày Đúc", dataIndex: "ngayDuc", width: 160 },
                { title: "Ngày Cán", dataIndex: "ngaySX", width: 160 },
                {
                  title: "Ca",
                  dataIndex: "ca",
                  width: 110,
                  render: (val: any) => (val === 1 ? "Ngày" : "Đêm"),
                },
                { title: "Mẻ", dataIndex: "me", width: 120 },
                { title: "Mác", dataIndex: "mac", width: 140 },
                { title: "Kích thước", dataIndex: "kichThuoc", width: 160 },
                { title: "Đúc", dataIndex: "duc", width: 90 },
                {
                  title: "NMC",
                  dataIndex: "vanChuyen",
                  width: 90,
                  render: (val: any) =>
                    val ? `Cán ${val.replace("NMC", "")}` : "",
                },
                {
                  title: "Loại 1",
                  children: [
                    {
                      title: "ST",
                      dataIndex: "ST_LoaiI",
                      align: "center",
                      width: 90,
                      render: (val: any) => (val ? val : ""),
                    },
                    {
                      title: "KL",
                      align: "center",
                      dataIndex: "KL_LoaiI",
                      width: 110,
                      render: (val: any) =>
                        // <Typography.Text type="danger">{val}</Typography.Text>
                        val !== null && val !== undefined
                          ? Number(val).toLocaleString("vi-VN")
                          : "",
                    },
                  ],
                },
                {
                  title: "Loại 2",
                  children: [
                    {
                      title: "ST",
                      align: "center",
                      dataIndex: "ST_LoaiII",
                      width: 90,
                      render: (val: any) => (val ? val : ""),
                    },
                    {
                      title: "KL",
                      align: "center",
                      dataIndex: "KL_LoaiII",
                      width: 110,
                      render: (val: any) =>
                        val !== null && val !== undefined
                          ? Number(val).toLocaleString("vi-VN")
                          : "",
                    },
                  ],
                },
                {
                  title: "Loại 3",
                  children: [
                    {
                      title: "ST",
                      align: "center",
                      dataIndex: "ST_LoaiIII",
                      width: 90,
                      render: (val: any) => (val ? val : ""),
                    },
                    {
                      title: "KL",
                      align: "center",
                      dataIndex: "KL_LoaiIII",
                      width: 110,
                      render: (val: any) =>
                        val !== null && val !== undefined
                          ? Number(val).toLocaleString("vi-VN")
                          : "",
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
                  render: (val: any) =>
                    // <Typography.Text type="danger">{val}</Typography.Text>

                    val !== null && val !== undefined
                      ? Number(val).toLocaleString("vi-VN")
                      : "",
                },
                {
                  title: "Ghi chú",
                  dataIndex: "ghiChu",
                  width: 180,
                  render: (val: any) => val || "-",
                },
              ]}
              summary={() => {
                const s = calcSummary(chuyenData);
                return (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={1} colSpan={12} align="center">
                        <b>Tổng cộng</b>
                      </Table.Summary.Cell>
                      {/* Loại 1 */}
                      <Table.Summary.Cell index={2} align="center">
                        <b>{s.ST1}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="center">
                        <b>{(s.KL1 ?? 0).toLocaleString("vi-VN")}</b>
                      </Table.Summary.Cell>

                      {/* Loại 2 */}
                      <Table.Summary.Cell index={4} align="center">
                        <b>{s.ST2}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="center">
                        <b>{(s.KL2 ?? 0).toLocaleString("vi-VN")}</b>
                      </Table.Summary.Cell>

                      {/* Loại 3 */}
                      <Table.Summary.Cell index={6} align="center">
                        <b>{s.ST3}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="center">
                        <b>{(s.KL3 ?? 0).toLocaleString("vi-VN")}</b>
                      </Table.Summary.Cell>

                      {/* Tổng */}
                      <Table.Summary.Cell index={8} align="center">
                        <b>{s.TongST}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="center">
                        <b>{(s.TongKL ?? 0).toLocaleString("vi-VN")}</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={10} align="center">
                        {" "}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        </div>

        <Modal
          open={partialOpen}
          title="Chuyển một phần"
          width={1150}
          destroyOnClose
          onCancel={() => setPartialOpen(false)}
          onOk={handleConfirmPartialTransfer}
        >
          <div>
            <div>Thông tin</div>
            <Table
              size="small"
              pagination={false}
              bordered
              rowKey="key"
              style={{ marginBottom: 16 }}
              dataSource={tableData
                .filter((r) => selectedRowKeys.includes(r.key))
                .map((r) => ({ ...r, key: r.key }))}
              columns={[
                {
                  title: "Mẻ",
                  dataIndex: "me",
                  width: 120,
                },
                {
                  title: "Mác",
                  dataIndex: "mac",
                  width: 120,
                },
                {
                  title: "Kích thước",
                  dataIndex: "kichThuoc",
                  width: 160,
                },
                {
                  title: "Loại 1",
                  align: "center",
                  render: (_, r) => r.ST_LoaiI || 0,
                },
                {
                  title: "Loại 2",
                  align: "center",
                  render: (_, r) => r.ST_LoaiII || 0,
                },
                {
                  title: "Loại 3",
                  align: "center",
                  render: (_, r) => r.ST_LoaiIII || 0,
                },
                {
                  title: "Tổng số thanh",
                  align: "center",
                  render: (_, r) =>
                    Number(r.ST_LoaiI || 0) +
                    Number(r.ST_LoaiII || 0) +
                    Number(r.ST_LoaiIII || 0),
                },
              ]}
            />
            <div>Nhập số thanh chuyển:</div>
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
                      // value={Number(record.ST_LoaiI || 0)}
                      // readOnly
                      readOnly={
                        Number(record.ST_LoaiI || 0) === 0 ? true : false
                      }
                      min={0}
                      max={record.stChuaChuyen}
                      onChange={(val) => {
                        const max = Number(record.stChuaChuyen || 0);
                        setPartialValues((p) => ({
                          ...p,
                          [String(record.key)]: {
                            ...p[String(record.key)],
                            ST_ChuyenI: Math.min(Number(val) || 0, max),
                          },
                        }));
                      }}
                    />
                  ),
                },
                {
                  title: "Loại 2 ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      // value={Number(record.ST_LoaiII || 0)}
                      // readOnly
                      readOnly={
                        Number(record.ST_LoaiII || 0) === 0 ? true : false
                      }
                      min={0}
                      max={record.stChuaChuyen}
                      onChange={(val) =>
                        setPartialValues((p) => ({
                          ...p,
                          [String(record.key)]: {
                            ...p[String(record.key)],
                            ST_ChuyenII: Number(val) || 0,
                          },
                        }))
                      }
                    />
                  ),
                },
                {
                  title: "Loại 3 ST",
                  width: 120,
                  render: (_: any, record: any) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      // value={Number(record.ST_LoaiIII || 0)}
                      readOnly={
                        Number(record.ST_LoaiIII || 0) === 0 ? true : false
                      }
                      min={0}
                      max={record.stChuaChuyen}
                      onChange={(val) =>
                        setPartialValues((p) => ({
                          ...p,
                          [String(record.key)]: {
                            ...p[String(record.key)],
                            ST_ChuyenIII: Number(val) || 0,
                          },
                        }))
                      }
                    />
                  ),
                },
                // {
                //   title: "Số thanh chuyển",
                //   width: 160,
                //   render: (_: any, record: any) => (
                //     <InputNumber
                //       min={0}
                //       max={Number(record.ST_LoaiI || 0)}
                //       style={{ width: "100%" }}
                //       value={partialValues[String(record.key)]?.chuyenST || 0}
                //       onChange={(val) =>
                //         setPartialValues((p) => ({
                //           ...p,
                //           [String(record.key)]: {
                //             ...p[String(record.key)],
                //             chuyenST: Number(val) || 0,
                //           },
                //         }))
                //       }
                //     />
                //   ),
                // },
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
                {
                  title: "Số thanh đã chuyển",
                  width: 140,
                  align: "center",
                  render: (_: any, record: any) => (
                    <Typography.Text type="danger">
                      {Number(record.stDaChuyen || 0)}
                    </Typography.Text>
                  ),
                },
                {
                  title: "Số thanh còn lại",
                  width: 140,
                  align: "center",
                  render: (_: any, record: any) => (
                    <Typography.Text type="danger">
                      {Number(record.stChuaChuyen || 0)}
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
        {/* {!isViecDenToi && (
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
        )} */}

        {/* {!isViecDenToi && (
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
        )} */}
      </Form>
    </Card>
  );
};

export default TaoPhieuPhoiNong;
