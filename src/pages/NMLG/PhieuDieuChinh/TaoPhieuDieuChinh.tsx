/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_PhieuDieuChinh from "../../../utils/BM_config/LG_PhieuDieuChinh.json";
import { Button, Card, Form, Input, Space, Tabs, Typography, message } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  phieuDieuChinhApi,
  LOAI_BBGN_NHAP,
  LOAI_BBGN_XUAT,
  type DongBoBBGNResult,
  type LoaiBBGN,
} from "../../../services/PhieuDieuChinhApi";
import { TaiKhoanApi } from "../../../services/TaiKhoanService";
import { taoItemsLuu, type BBGNRow } from "./BBGNDieuChinhTable";
import BBGNTab from "../../../components/PhieuDieuChinh/BBGNTab";
import NoiBoTab from "../../../components/PhieuDieuChinh/NoiBoTab";
import type { XuongItem } from "../../../components/PhieuDieuChinh/XuongTabs";
import { chiTietDtoToRows, renumberThuTu, toNum, LOAI_NOI_BO, type TableRow } from "../../../components/PhieuDieuChinh/noiBoUtils";
import "../../../styles/phieuDieuChinhCompact.css";

const getUserInfo = () => {
  const stored = localStorage.getItem("userinfo");
  return stored ? JSON.parse(stored) : {};
};



// Phiếu có 3 phần, mỗi phần chia tab theo xưởng của phòng ban: Nhập, Xuất (BBGNTab) và Nội bộ - Xuất vào sản xuất (NoiBoTab).
// Khóa trong loadedTabsRef: chi tiết Nội bộ của cả phiếu đã được tải
const TAI_CHI_TIET_NOI_BO = "noibo";


// config: cấu hình biểu mẫu (mặc định phiếu NM.LG). Phiếu theo phòng ban (vd NMTKVV) truyền config có
// ID_PhongBan → phạm vi là các xưởng của phòng ban đó, chia tab theo xưởng, chỉ có Nhập / Xuất.
const TaoPhieuDieuChinh = ({ config: configProp }: { config?: any }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = configProp ?? (LG_PhieuDieuChinh as any);
  // ID_PhongBan (từ file cấu hình): giới hạn lò cao/xưởng của phiếu theo bảng LG_PDC_Scope_PhongBan.
  // Nhập / Xuất luôn chia tab theo xưởng của phòng ban (bảng LG_PDC_Scope_PhongBan, cột ID_Xuong).
  // coNoiBo: phiếu có thêm tab Nội bộ - Xuất vào sản xuất. Nội bộ dùng CHUNG danh sách xưởng với Nhập / Xuất
  // (mỗi xưởng 1 tab); idLoCao của dòng Nội bộ chính là ID xưởng nhận (cột đóng vai trò khóa tab).
  const phamViPhongBanId: number | undefined = config.ID_PhongBan ?? undefined;
  const coNoiBo = config.coNoiBo === true;
  const taoPath: string = config.taoPath ?? "/taophieudieuchinh";
  const [form] = Form.useForm();

  const [tableData, setTableData] = useState<TableRow[]>([]);
  // ID các dòng đã lưu mà server trả về lần tải gần nhất. Khi Lưu, dòng nào có ở đây mà không còn
  // trong bảng = người dùng đã xóa → gửi deletedIds để BE xóa mềm (không suy ra từ "vắng mặt").
  const loadedIdsRef = useRef<Set<number>>(new Set());
  const applyServerRows = useCallback((rows: TableRow[]) => {
    loadedIdsRef.current = new Set(rows.filter((r) => r.id != null).map((r) => Number(r.id)));
    setTableData(rows);
  }, []);
  // Tab xưởng dùng chung cho cả 3 phần Nhập / Xuất / Nội bộ (activeXuong giữ nguyên khi đổi phần).
  // Chi tiết Nội bộ tải 1 lần cho cả phiếu (loadedTabsRef ghi nhớ đã tải để không ghi đè phần đang sửa chưa lưu);
  // chiTietVersion tăng mỗi lần tải lại phiếu.
  const [xuongList, setXuongList] = useState<XuongItem[]>([]);
  const [activeXuong, setActiveXuong] = useState<string>("");
  const loadedTabsRef = useRef<Set<string>>(new Set());
  const [chiTietVersion, setChiTietVersion] = useState(0);
  // Phần Nhập / Xuất lấy từ BBGN theo các xưởng của lò cao (tải về để hiển thị + nhập; số điều chỉnh lưu vào
  // LG_PhieuDieuChinh_ChiTiet loại 1/3 của phiếu này). activeSection = phần đang mở: "nhan" | "xuat" | "noibo".
  const [bbgnNhan, setBbgnNhan] = useState<BBGNRow[]>([]);
  const [bbgnXuat, setBbgnXuat] = useState<BBGNRow[]>([]);
  const [loadingBbgn, setLoadingBbgn] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("nhan");
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
  }>({});

  const currentUserInfo = useMemo(() => getUserInfo(), []);

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

  const headerFields = config.headerFields as any[];

  const table1Section = useMemo(
    () => config.layout.find((s: any) => s.sectionType === "table" && s.key === "table1"),
    [config.layout]
  );


  // ─── Danh sách tài khoản (để hiển thị tên Người điều chỉnh giao/nhận) ──────
  // Tải 1 lần cho cả trang thay vì để từng dòng tự gọi API riêng (trước đây mỗi dòng dùng
  // CustomChonNguoiKy, 35 dòng x 2 cột = 70 lần gọi /api/TaiKhoan/nguoiky cùng lúc).
  const [nguoiKyMap, setNguoiKyMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    TaiKhoanApi.getData({})
      .then((res: any) => {
        const map = new Map<number, string>();
        (Array.isArray(res) ? res : []).forEach((x: any) => {
          map.set(x.iD_TaiKhoan, `${x.tenTaiKhoan} - ${x.hoVaTen}`);
        });
        setNguoiKyMap(map);
      })
      .catch(() => setNguoiKyMap(new Map()));
  }, []);


  // Tải phần Nhập / Xuất để hiển thị và nhập số điều chỉnh (kèm số của cả 2 bên). Thiếu ngày thì để trống.
  // - Phiếu đã lưu (có idPhieu): đọc các dòng phiếu đang giữ trong database — bản chụp ghi lúc "Tải dữ liệu nguồn".
  // - Phiếu mới (chưa có idPhieu): xem trước thẳng từ nguồn BBGN theo các xưởng của phòng ban, chưa ghi gì.
  const loadBBGN = useCallback(
    async (p: { ngay?: any; idPhieu?: string }) => {
      if (!p.ngay) {
        setBbgnNhan([]);
        setBbgnXuat([]);
        return { nhan: 0, xuat: 0 };
      }
      const ngay = p.ngay?.format ? p.ngay.format("YYYY-MM-DD") : dayjs(p.ngay).format("YYYY-MM-DD");
      const params = {
        ngay,
        idPhongBan: phamViPhongBanId,
        idPhieu: p.idPhieu || undefined,
      };
      setLoadingBbgn(true);
      try {
        const [nhan, xuat] = await Promise.all([
          phieuDieuChinhApi.getBBGN(LOAI_BBGN_NHAP, params),
          phieuDieuChinhApi.getBBGN(LOAI_BBGN_XUAT, params),
        ]);
        const nhanRows = (Array.isArray(nhan) ? nhan : []).map((r) => ({ ...r }));
        const xuatRows = (Array.isArray(xuat) ? xuat : []).map((r) => ({ ...r }));
        setBbgnNhan(nhanRows);
        setBbgnXuat(xuatRows);
        return { nhan: nhanRows.length, xuat: xuatRows.length };
      } finally {
        setLoadingBbgn(false);
      }
    },
    [phamViPhongBanId]
  );

  // Tải dữ liệu nguồn (Ngày) — 1 nút bấm tải cả 3 phần:
  // - Nhập / Xuất: dòng BBGN theo các xưởng của lò cao (xem loadBBGN), số điều chỉnh để người dùng tự nhập.
  // - Nội bộ - Xuất vào sản xuất: Nạp liệu lò cao, chia theo lò cao.
  //
  // Phiếu ĐÃ LƯU (có idphieu): backend tự đọc Ngày từ BmPhieu, insert/khớp phần Nội bộ thẳng vào
  // LG_PhieuDieuChinh_ChiTiet rồi trả về toàn bộ chi tiết đã lưu nên ghi đè thẳng là an toàn.
  // Phiếu MỚI (chưa có idphieu): phần Nội bộ giữ tạm ở bộ nhớ trình duyệt, lưu cùng lúc với phiếu khi Lưu/Gửi.
  const handleLoadFromSource = useCallback(async () => {
    const ngayValue = form.getFieldValue("NgaySX");
    if (!ngayValue) {
      message.warning("Vui lòng chọn Ngày trước khi tải dữ liệu nguồn");
      return;
    }

    try {
      setLoading(true);

      // Nhập / Xuất. Phiếu đã lưu: ghi các dòng BBGN vào database cho phiếu rồi hiển thị từ database (người dùng điều
      // chỉnh trên các dòng đó và Lưu để cập nhật). Phiếu mới chưa có id: chỉ xem trước từ nguồn, chưa ghi được.
      let boQua = 0;
      if (idphieu && phamViPhongBanId != null) {
        const userInfo = getUserInfo();
        const ngayChuoi = ngayValue?.format ? ngayValue.format("YYYY-MM-DD") : dayjs(ngayValue).format("YYYY-MM-DD");
        // Interceptor của apiService trả thẳng dữ liệu (response.data) dù kiểu khai báo là AxiosResponse
        const kq = (await phieuDieuChinhApi.dongBoBBGN(idphieu, {
          idPhongBan: phamViPhongBanId,
          ngay: ngayChuoi,
          idNguoiThucHien: userInfo?.iD_TaiKhoan ?? null,
        })) as unknown as DongBoBBGNResult;
        boQua = kq?.soDongBoQua ?? 0;
      }
      const dem = await loadBBGN({ ngay: ngayValue, idPhieu: idphieu });
      const hauTo =
        (boQua > 0 ? `; bỏ qua ${boQua} dòng đang do phiếu khác giữ` : "") +
        (!idphieu ? " — chỉ xem trước, hãy lưu phiếu rồi tải lại để ghi vào hệ thống" : "");

      // Phiếu không có phần Nội bộ (Nạp liệu lò cao) chỉ có Nhập / Xuất
      if (!coNoiBo) {
        if (dem.nhan + dem.xuat > 0) {
          message.success(`Đã tải dữ liệu nguồn (Nhập: ${dem.nhan}, Xuất: ${dem.xuat} dòng${hauTo})`);
        } else {
          message.info("Không có dữ liệu nguồn cho Ngày đã chọn");
        }
        return;
      }

      // Nội bộ - Xuất vào sản xuất
      let soDongNoiBo: number;
      if (idphieu) {
        const userInfo = getUserInfo();
        const nguoiThucHien = userInfo?.hoVaTen ?? userInfo?.tenDangNhap ?? null;
        const chiTietRes = await phieuDieuChinhApi.syncTuNapLieuLoCao(idphieu, nguoiThucHien, phamViPhongBanId);
        const rows = chiTietDtoToRows(Array.isArray(chiTietRes) ? chiTietRes : []);
        applyServerRows(rows);
        // Đồng bộ trả về chi tiết của mọi lò cao → không cần tải lại từng tab
        loadedTabsRef.current = new Set([TAI_CHI_TIET_NOI_BO]);
        soDongNoiBo = rows.length;
      } else {
        const ngay = ngayValue?.format ? ngayValue.format("YYYY-MM-DD") : String(ngayValue);
        const res = await phieuDieuChinhApi.getNapLieuLoCao({
          ngay,
          idPhongBan: phamViPhongBanId,
        });
        const rows = (Array.isArray(res) ? res : []).map((r, idx) => ({
          key: `naplieulocao-${r.idCtBBGN ?? idx}`,
          // Khóa liên kết ngược tới dòng nguồn — phiếu chưa lưu nên chưa insert được vào
          // LG_PhieuDieuChinh_ChiTiet, nhưng vẫn giữ lại trong bộ nhớ để gửi kèm khi Lưu phiếu.
          idCtBBGN: r.idCtBBGN ?? null,
          idLoCao: r.idLoCao ?? null,
          idCa: r.idCa ?? null,
          idNVL: r.idVatTu ?? null,
          tenNVL: r.tenVatTu ?? "",
          loaiDieuChinh: LOAI_NOI_BO,
          idNVLChiTiet: null,
          idNhomNVL: null,
          dvt: "",
          maLo: r.maLo ?? "",
          thuTu: idx + 1,
          phongBanXuat: r.tenPhongBanGiao ?? "",
          xuongXuat: r.tenXuongGiao ?? "",
          khoiLuongXuat: null,
          khoiLuongQuyKhoXuat: null,
          phongBanNhap: r.tenPhongBanNhan ?? "",
          xuongNhap: r.tenXuongNhan ?? "",
          khoiLuongNhap: null,
          khoiLuongQuyKhoNhap: null,
          doAm: null,
          viTri: "",
          phanLoai: "",
          // Ghi chú không lấy từ nguồn — là trường để người dùng tự nhập tại Phiếu điều chỉnh.
          ghiChu: "",
          nguoiDieuChinhNhan: null,
          thoiGianDieuChinhNhan: null,
        }));
        setTableData(rows);
        soDongNoiBo = rows.length;
      }

      const tong = dem.nhan + dem.xuat + soDongNoiBo;
      if (tong > 0) {
        message.success(`Đã tải dữ liệu nguồn (Nhập: ${dem.nhan}, Xuất: ${dem.xuat}, Nội bộ: ${soDongNoiBo} dòng${hauTo})`);
      } else {
        message.info("Không có dữ liệu nguồn cho Ngày đã chọn");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Không thể tải dữ liệu nguồn");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, applyServerRows, loadBBGN, coNoiBo, phamViPhongBanId]);

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
          ((res as any)?.pheDuyet || []).forEach((pd: any) => {
            const sig = config.signatures.find(
              (s: any) => getCapDuyet(s) === pd.capDuyet && s.type === "selectNguoiKy"
            );
            if (sig && pd.nguoiDuyetId) signatureFields[sig.key] = pd.nguoiDuyetId;
          });

          const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
          const parsedDates: Record<string, any> = {};
          dateFields.forEach((k: string) => {
            if (data[k]) {
              const parsed = dayjs(data[k]);
              parsedDates[k] = parsed.isValid() ? parsed : null;
            }
          });

          const tinhTrang = (res as any)?.tinhTrang ?? TrangThaiPhieuConst.DangLuu;
          form.setFieldsValue({
            ...data,
            ...signatureFields,
            ...parsedDates,
            idphieu: (res as any)?.idphieu || "",
          });

          if (tinhTrang === TrangThaiPhieuConst.DangLuu) {
            const overrides: Record<string, any> = {};
            config.signatures
              .filter((sig: any) => getCapDuyet(sig) === 0)
              .forEach((sig: any) => {
                overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
              });
            if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
          }

          // Phần Nhập / Xuất lấy từ BBGN theo Ngày của phiếu (kèm số điều chỉnh đã lưu của 2 bên)
          loadBBGN({ ngay: data.NgaySX, idPhieu }).catch((err: any) =>
            message.error(err?.response?.data?.message || "Không thể tải dữ liệu Nhập/Xuất từ BBGN")
          );

          // Nguồn sự thật của bảng chi tiết là LG_PhieuDieuChinh_ChiTiet, tải THEO TỪNG TAB lò cao (BE lọc
          // theo idLoCao) bởi effect bên dưới — ở đây chỉ xóa dữ liệu cũ và báo tải lại.
          loadedTabsRef.current = new Set();
          loadedIdsRef.current = new Set();
          setTableData([]);
          setChiTietVersion((v) => v + 1);

          setPhieuInfo({
            tinhTrang,
            nguoiTaoId: (res as any)?.nguoiTaoId ?? null,
            idphongBan: (res as any)?.idphongBan ?? null,
            pheDuyet: (res as any)?.pheDuyet || data.pheDuyet || [],
            isClone: (res as any)?.isClone ?? false,
          });
        }
      } else {
        setPhieuInfo({});
        loadedTabsRef.current = new Set();
        loadedIdsRef.current = new Set();
        setTableData([]);
        setBbgnNhan([]);
        setBbgnXuat([]);
        setTimeout(() => {
          const overrides: Record<string, any> = {};
          config.signatures
            .filter((sig: any) => getCapDuyet(sig) === 0)
            .forEach((sig: any) => {
              overrides[sig.key] = currentUserInfo?.iD_TaiKhoan ?? null;
            });
          if (Object.keys(overrides).length > 0) form.setFieldsValue(overrides);
        }, 300);
      }
    } catch {
      message.error("Không thể tải dữ liệu ban đầu!");
    } finally {
      setLoading(false);
    }
  }, [form, idphieu, config.signatures, config.headerFields, currentUserInfo, getCapDuyet, applyServerRows, loadBBGN]);

  useEffect(() => {
    initData();
  }, [initData]);

  const getFormData = useCallback(async () => {
    const userInfo = getUserInfo();
    const formData = await form.validateFields();

    // Loại số điều chỉnh = "Sau ẩm" (value "2") bắt buộc phải nhập Độ ẩm — nếu không thì
    // KL quy khô Nhập không tính được (xem recomputeRows). Chặn lưu và báo rõ dòng nào thiếu.
    const invalidDoAmRows = tableData
      .map((row, idx) => ({ row, idx }))
      .filter(({ row }) => String(row.loaiSoDieuChinh) === "2" && toNum(row.doAm) === null);
    if (invalidDoAmRows.length > 0) {
      const rowsText = invalidDoAmRows.map(({ row, idx }) => row.thuTu ?? idx + 1).join(", ");
      message.error(`Vui lòng nhập Độ ẩm cho dòng ${rowsText} (Loại số điều chỉnh = Sau ẩm)`);
      throw new Error("Thiếu Độ ẩm ở các dòng Sau ẩm");
    }

    const pheDuyetFlow = config.signatures.map((s: any) => ({
      capDuyet: getCapDuyet(s),
      maKyDuyet: s.key,
      nguoiDuyetId: form.getFieldValue(s.key),
      tinhTrang: 0,
      ghiChu: "",
    }));

    const processedTable1 = renumberThuTu(tableData).map((row) => {
      const r = { ...row };
      delete r.key;
      return r;
    });

    const dateFields = config.headerFields.filter((f: any) => f.type === "date").map((f: any) => f.key);
    const formattedDates: Record<string, any> = {};
    dateFields.forEach((k: string) => {
      if (formData[k]) formattedDates[k] = formData[k].format("YYYY-MM-DD");
    });

    return {
      ...formData,
      ...formattedDates,
      dvt: "Tấn",
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      nguoiTaoId: userInfo.iD_TaiKhoan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: (config as any).prefix,
    };
  }, [form, config, tableData, getCapDuyet]);

  // Ghi đè toàn bộ chi tiết vào LG_PhieuDieuChinh_ChiTiet sau khi BmPhieu (header) đã lưu —
  // gọi lại từ phieuActionService (customPutApi) mỗi lần bấm Lưu/Gửi.
  const saveChiTiet = useCallback(async (phieuId: string, formDataParam: Record<string, unknown>) => {
    const userInfo = getUserInfo();

    // Lưu số điều chỉnh Nhập / Xuất vào phiếu này TRƯỚC: nếu bên kia (bên đối tác) đã nhập mà khối lượng
    // khác nhau thì BE trả 400 → báo rõ dòng nào và dừng, không lưu tiếp phần Nội bộ.
    const phanBBGN: { loai: LoaiBBGN; rows: BBGNRow[]; setRows: (r: BBGNRow[]) => void }[] = [
      { loai: LOAI_BBGN_NHAP, rows: bbgnNhan, setRows: setBbgnNhan },
      { loai: LOAI_BBGN_XUAT, rows: bbgnXuat, setRows: setBbgnXuat },
    ];
    for (const { loai, rows: bbgnRows, setRows } of phanBBGN) {
      const itemsBBGN = taoItemsLuu(loai, bbgnRows);
      if (itemsBBGN.length === 0) continue;
      try {
        await phieuDieuChinhApi.saveBBGN(loai, phieuId, itemsBBGN, userInfo?.iD_TaiKhoan ?? null, phamViPhongBanId);
        setRows(bbgnRows.map((r) => ({ ...r, dirty: false })));
      } catch (err: any) {
        const noiDung = err?.response?.data?.message || "Không thể lưu số điều chỉnh " + (loai === LOAI_BBGN_NHAP ? "Nhập" : "Xuất");
        message.error({
          content: <div style={{ whiteSpace: "pre-line", textAlign: "left" }}>{noiDung}</div>,
          duration: 8,
        });
        throw err;
      }
    }

    // Phiếu không có phần Nội bộ chỉ có Nhập / Xuất (đã lưu ở trên), không có chi tiết Nội bộ để lưu
    if (!coNoiBo) return;

    const rows = (formDataParam.table1 as TableRow[]) || [];
    const currentIds = new Set(rows.filter((r) => r.id != null).map((r) => Number(r.id)));
    const deletedIds = [...loadedIdsRef.current].filter((id) => !currentIds.has(id));

    const items = rows.map((row) => ({
      id: row.id != null ? Number(row.id) : null,
      thoiGianSua: row.thoiGianSua ?? null,
      idNVL: row.idNVL ?? null,
      tenNVL: row.tenNVL ?? "",
      idNVLChiTiet: row.idNVLChiTiet != null && row.idNVLChiTiet !== "" ? Number(row.idNVLChiTiet) : null,
      idNhomNVL: row.idNhomNVL ?? null,
      dvt: "Tấn",
      maLo: row.maLo ?? null,
      thuTu: row.thuTu ?? null,
      loaiDieuChinh: row.loaiDieuChinh != null && row.loaiDieuChinh !== "" ? Number(row.loaiDieuChinh) : null,
      loaiSoDieuChinh: row.loaiSoDieuChinh != null && row.loaiSoDieuChinh !== "" ? Number(row.loaiSoDieuChinh) : null,
      phongBanXuat: row.phongBanXuat ?? null,
      xuongXuat: row.xuongXuat ?? null,
      khoiLuongXuat: row.khoiLuongXuat != null && row.khoiLuongXuat !== "" ? Number(row.khoiLuongXuat) : null,
      khoiLuongQuyKhoXuat:
        row.khoiLuongQuyKhoXuat != null && row.khoiLuongQuyKhoXuat !== "" ? Number(row.khoiLuongQuyKhoXuat) : null,
      phongBanNhap: row.phongBanNhap ?? null,
      xuongNhap: row.xuongNhap ?? null,
      khoiLuongNhap: row.khoiLuongNhap != null && row.khoiLuongNhap !== "" ? Number(row.khoiLuongNhap) : null,
      khoiLuongQuyKhoNhap:
        row.khoiLuongQuyKhoNhap != null && row.khoiLuongQuyKhoNhap !== "" ? Number(row.khoiLuongQuyKhoNhap) : null,
      doAm: row.doAm != null && row.doAm !== "" ? Number(row.doAm) : null,
      viTri: row.viTri ?? null,
      phanLoai: row.phanLoai ?? null,
      ghiChu: row.ghiChu ?? null,
      nguoiDieuChinhNhan:
        row.nguoiDieuChinhNhan != null && row.nguoiDieuChinhNhan !== "" ? Number(row.nguoiDieuChinhNhan) : null,
      thoiGianDieuChinhNhan: row.thoiGianDieuChinhNhan ?? null,
      idCtBBGN: row.idCtBBGN ?? null,
      idLoCao: row.idLoCao != null && row.idLoCao !== "" ? Number(row.idLoCao) : null,
      idCa: row.idCa != null && row.idCa !== "" ? Number(row.idCa) : null,
      idPhongBan: phamViPhongBanId ?? null,
    }));

    try {
      await phieuDieuChinhApi.saveChiTiet(phieuId, items, userInfo?.hoVaTen ?? userInfo?.tenDangNhap ?? null, deletedIds);
    } catch (err: any) {
      // 409: có dòng đã bị người khác sửa/xóa — báo rõ và tải lại phiếu để thấy số liệu mới nhất,
      // thay vì ghi đè mất thay đổi của họ. Ném lại lỗi để luồng Lưu/Gửi dừng, không đổi trạng thái.
      if (err?.response?.status === 409) {
        message.error(err.response.data?.message || "Dữ liệu đã bị người khác thay đổi, vui lòng tải lại phiếu");
        await initData();
      }
      throw err;
    }
  }, [initData, bbgnNhan, bbgnXuat, coNoiBo, phamViPhongBanId]);

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
        navigate(`${taoPath}/${context.newPhieuId}`, { replace: true });
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
      phieuMaBm: config.code,
      pheDuyet: phieuInfo.pheDuyet ?? [],
      customPutApi: saveChiTiet,
      onStatusChange: handleStatusChange,
      onSuccess: handleActionSuccess,
      onError: (error) => { console.error("Action error:", error); },
    });

    if (buttons.length === 0) return null;
    return phieuActionService.renderActionButtons(buttons, idphieu || "", getFormData);
  }, [idphieu, phieuInfo, getFormData, saveChiTiet, handleStatusChange, handleActionSuccess, config.code]);

  // ─── Tab lò cao × tab con loại điều chỉnh ───────────────────────────────────
  // 1 phiếu duy nhất (1 header, 1 lần Lưu) nhưng chia bảng chi tiết thành các Tab theo lò cao (danh
  // sách + tên lấy từ API; dòng thuộc lò cao nào do BE tra từ xưởng nhận, lưu ở idLoCao). Trong mỗi lò
  // cao, bảng chi tiết chia 2 tab con theo "Loại điều chỉnh" (Nhập - Xuất / Nội bộ - Xuất SX).

  // Tab xưởng của phần Nhập / Xuất: mỗi xưởng của phòng ban (ID_Xuong trong LG_PDC_Scope_PhongBan) 1 tab
  useEffect(() => {
    if (phamViPhongBanId == null) {
      setXuongList([]);
      setActiveXuong("");
      return;
    }
    let huy = false;
    phieuDieuChinhApi
      .getDanhMucXuong(phamViPhongBanId)
      .then((res) => {
        if (huy) return;
        const list: XuongItem[] = (Array.isArray(res) ? res : [])
          .map((x) => ({ id: Number(x.id), tenXuong: x.ten }))
          .filter((x) => Number.isFinite(x.id))
          .sort((a, b) => a.id - b.id);
        setXuongList(list);
        setActiveXuong((cur) => (cur && list.some((x) => String(x.id) === cur) ? cur : list.length ? String(list[0].id) : ""));
      })
      .catch(() => {
        if (huy) return;
        setXuongList([]);
        message.error("Không tải được danh sách xưởng");
      });
    return () => {
      huy = true;
    };
  }, [phamViPhongBanId]);

  // Chi tiết Nội bộ của phiếu đã lưu: tải 1 lần cho cả phiếu (BE chỉ trả dòng loại Nội bộ), vào chung tableData.
  // Tab xưởng dùng chung với Nhập / Xuất nên không cần tải theo từng tab; chỉ tải lại khi tải lại phiếu
  // (chiTietVersion) — tải lại sẽ ghi đè phần đang sửa chưa lưu nên đổi tab không gọi lại.
  useEffect(() => {
    if (!coNoiBo || !idphieu || loadedTabsRef.current.has(TAI_CHI_TIET_NOI_BO)) return;
    loadedTabsRef.current.add(TAI_CHI_TIET_NOI_BO); // đánh dấu trước để không gọi trùng khi effect chạy lại
    let huy = false;
    let xong = false;
    setLoading(true);
    phieuDieuChinhApi
      .getChiTiet(idphieu)
      .then((res) => {
        xong = true;
        if (huy) return;
        const rows = chiTietDtoToRows(Array.isArray(res) ? res : []);
        rows.forEach((r) => r.id != null && loadedIdsRef.current.add(Number(r.id)));
        const ids = new Set(rows.map((r) => r.id));
        setTableData((prev) => [...prev.filter((p) => p.id == null || !ids.has(p.id)), ...rows]);
      })
      .catch(() => {
        loadedTabsRef.current.delete(TAI_CHI_TIET_NOI_BO); // cho phép thử lại
        if (!huy) message.error("Không thể tải chi tiết Nội bộ");
      })
      .finally(() => !huy && setLoading(false));
    return () => {
      huy = true;
      if (!xong) loadedTabsRef.current.delete(TAI_CHI_TIET_NOI_BO);
    };
  }, [idphieu, chiTietVersion, coNoiBo]);



  return (
    <Card style={{ margin: 16, boxShadow: "0 2px 8px #f0f1f2" }} styles={{ body: { padding: 12 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{config.title}</Typography.Title>
        {idphieu && <Typography.Text strong>Số phiếu: {soPhieu}</Typography.Text>}
      </div>

      <Form form={form} layout="vertical" className="pdc-compact">
        <Form.Item name="idphieu" hidden><Input type="hidden" /></Form.Item>

        {/* Ngày + hành động gộp chung 1 khu vực gọn — nhường chiều cao còn lại cho bảng */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {headerFields.map((f: any, idx: number) => (
              <div key={f.key || idx} style={{ width: 140 }}>
                <CustomFormItem field={f} idx={idx} disabled={isFormLocked} />
              </div>
            ))}
          </div>
          <Space wrap size="small" style={{ marginLeft: "auto" }}>
            <Button
              size="small"
              type="primary"
              icon={<FilterOutlined />}
              onClick={handleLoadFromSource}
              disabled={isFormLocked}
              loading={loading}
            >
              Tải dữ liệu
            </Button>
            {actionButtons}
          </Space>
        </div>

        {(table1Section || !coNoiBo) && (
          <Tabs
            activeKey={activeSection}
            onChange={setActiveSection}
            items={[
              {
                key: "nhan",
                label: "Nhập",
                children: (
                  <BBGNTab
                    loai={LOAI_BBGN_NHAP}
                    rows={bbgnNhan}
                    onChange={setBbgnNhan}
                    editable={!isFormLocked}
                    nguoiKyMap={nguoiKyMap}
                    loading={loadingBbgn}
                    xuongList={xuongList}
                    activeXuong={activeXuong}
                    onChangeXuong={setActiveXuong}
                    idphieu={idphieu}
                    idNguoiThucHien={currentUserInfo?.iD_TaiKhoan ?? null}
                  />
                ),
              },
              {
                key: "xuat",
                label: "Xuất",
                children: (
                  <BBGNTab
                    loai={LOAI_BBGN_XUAT}
                    rows={bbgnXuat}
                    onChange={setBbgnXuat}
                    editable={!isFormLocked}
                    nguoiKyMap={nguoiKyMap}
                    loading={loadingBbgn}
                    xuongList={xuongList}
                    activeXuong={activeXuong}
                    onChangeXuong={setActiveXuong}
                    idphieu={idphieu}
                    idNguoiThucHien={currentUserInfo?.iD_TaiKhoan ?? null}
                  />
                ),
              },
              // Phiếu theo phòng ban (vd NMTKVV) không có phần Nội bộ - Xuất vào sản xuất
              ...(!coNoiBo ? [] : [{
                key: "noibo",
                label: "Nội bộ - Xuất vào sản xuất",
                children: (
                  <NoiBoTab
                    tableData={tableData}
                    setTableData={setTableData}
                    table1Section={table1Section}
                    xuongList={xuongList}
                    activeXuong={activeXuong}
                    onChangeXuong={setActiveXuong}
                    locked={isFormLocked}
                    loading={loading}
                    nguoiKyMap={nguoiKyMap}
                    currentUserId={currentUserInfo?.iD_TaiKhoan}
                  />
                ),
              }]),
            ]}
          />
        )}

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {config.signatures?.map((sig: any, i: number) => {
            const capDuyet = getCapDuyet(sig);
            const isLevelZero = capDuyet === 0;
            const autoValue = isLevelZero ? currentUserInfo?.iD_TaiKhoan ?? null : undefined;
            const duyet = phieuInfo.pheDuyet?.find((p: any) => p.capDuyet === capDuyet);

            return (
              <Space key={sig.key || i} direction="vertical" align="center">
                <CustomFormItem
                  field={sig}
                  idx={i}
                  disabled={isLevelZero || isSignatureReadonly || isFormLocked}
                  initialValue={autoValue ?? form.getFieldValue(sig.key)}
                />
                {idphieu && duyet && (
                  <Typography.Text type="secondary">
                    {duyet?.tinhTrang === 1 ? "Đã ký" : duyet?.tinhTrang === 2 ? "Đã từ chối" : "Chưa xử lý"}
                  </Typography.Text>
                )}
              </Space>
            );
          })}
        </div>
      </Form>
    </Card>
  );
};

export default TaoPhieuDieuChinh;
