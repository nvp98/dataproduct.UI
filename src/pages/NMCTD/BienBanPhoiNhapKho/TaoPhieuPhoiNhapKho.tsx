/* eslint-disable @typescript-eslint/no-explicit-any */
import HRC1_BB_GiaoNhanPhoiNhapKho from "../../../utils/BM_config/HRC1_BB_GiaoNhanPhoiNhapKho.json";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Typography,
  message,
  Table,
  DatePicker,
  Select,
} from "antd";
import { FilePdfOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import CustomFormItem from "../../../components/CustomFormItem";
import { PhieuApi } from "../../../services/PhieuApi";
import { useNavigate, useParams } from "react-router-dom";
import CustomFormTable from "../../../components/CustomFormTable";
import type { PheDuyetItem } from "../../../services/PhieuActionService";
import { phieuActionService } from "../../../services/PhieuActionService";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import {
  phoiNhapKhoApi,
  type InsertPhoiNhapKhoRequest,
  type PhoiNhapKhoListItem,
} from "../../../services/BMDucCTDApi";

interface TableRow {
  key?: string;
  [key: string]: any;
}

interface ChuyenThanhItem {
  rowKey: string | number;
  me: string;
  mac: string;
  kichThuoc: string;
  soThanhDangCoLoai1: number;
  soThanhDangCoLoai2: number;
  soThanhDangCoLoai2TP: number;
  soThanhDangCoPhoiNgan: number;
  soThanhDangCoLoai3: number;
  soThanhGiaoLoai1: number;
  soThanhGiaoLoai2: number;
  soThanhGiaoLoai2TP: number;
  soThanhGiaoPhoiNgan: number;
  soThanhGiaoLoai3: number;
}

const TaoPhieuPhoiNhapKho = ({ type }: { type?: string }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const idphieu = id;

  const config = HRC1_BB_GiaoNhanPhoiNhapKho;
  const [form] = Form.useForm();
  const isViecDenToi = type === "viecdentoi";

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soPhieu, setSoPhieu] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<
    Array<string | number>
  >([]);
  const [selectedNhanPhoiRowKeys, setSelectedNhanPhoiRowKeys] = useState<
    Array<string | number>
  >([]);
  const [isChuyenModalOpen, setIsChuyenModalOpen] = useState(false);
  const [chuyenThanhItems, setChuyenThanhItems] = useState<ChuyenThanhItem[]>(
    [],
  );
  const [nhanPhoiData, setNhanPhoiData] = useState<PhoiNhapKhoListItem[]>([]);
  const [nhanPhoiLoading, setNhanPhoiLoading] = useState(false);
  const [phieuInfo, setPhieuInfo] = useState<{
    tinhTrang?: number;
    nguoiTaoId?: number | null;
    idphongBan?: number | null;
    pheDuyet?: PheDuyetItem[];
    isClone?: boolean;
    idPhieuGoc?: string | null;
  }>({});

  // ★ Ref luôn tươi – tránh stale closure trong handleStatusChange
  const phieuInfoRef = useRef(phieuInfo);
  useEffect(() => {
    phieuInfoRef.current = phieuInfo;
  }, [phieuInfo]);

  // Theo dõi thay đổi trên các field chính
  const kip = Form.useWatch("kip", form);
  const ca = Form.useWatch("ca", form);
  const mayduc = Form.useWatch("mayduc", form);
  const ngaySX = Form.useWatch("NgaySX", form);
  const ngayNhanPhoiWatch = Form.useWatch("ngayNhanPhoi", form);
  const caNhanPhoiWatch = Form.useWatch("caNhanPhoi", form);

  useEffect(() => {
    const ngaySXValue = ngaySX;
    const caValue = ca;

    if (!ngaySXValue || !caValue) return;

    form.setFieldsValue({
      ngayNhanPhoi: dayjs(ngaySXValue).isValid() ? dayjs(ngaySXValue) : null,
      caNhanPhoi: caValue,
    });
  }, [form, ngaySX, ca]);

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

  const isTransferableRow = useCallback((row: TableRow) => {
    const availableLoai1 = Math.max(
      0,
      Number(row.stLoai1 || 0) -
        Number(row.stDachuyenLoai1 || row.stDaChuyenLoai1 || 0),
    );
    const availableLoai2 = Math.max(
      0,
      Number(row.stLoai2 || 0) -
        Number(row.stDachuyenLoai2 || row.stDaChuyenLoai2 || 0),
    );
    const availableLoai2TP = Math.max(
      0,
      Number(row.stLoai2tp || row.stLoai2TP || 0) -
        Number(
          row.stDachuyenLoai2tp ||
            row.stDachuyenLoai2TP ||
            row.stDaChuyenLoai2tp ||
            row.stDaChuyenLoai2TP ||
            0,
        ),
    );
    const availablePhoiNgan = Math.max(
      0,
      Number(row.stPhoiNgan || 0) -
        Number(row.stDachuyenPhoiNgan || row.stDaChuyenPhoiNgan || 0),
    );
    const availableLoai3 = Math.max(
      0,
      Number(row.stLoai3 || 0) -
        Number(row.stDachuyenLoai3 || row.stDaChuyenLoai3 || 0),
    );

    return (
      availableLoai1 > 0 ||
      availableLoai2 > 0 ||
      availableLoai2TP > 0 ||
      availablePhoiNgan > 0 ||
      availableLoai3 > 0
    );
  }, []);

  const handleOpenModalChuyenThanh = useCallback(() => {
    const ngayNhanPhoiValue = form.getFieldValue("ngayNhanPhoi");
    const caNhanPhoiValue = form.getFieldValue("caNhanPhoi");

    if (!ngayNhanPhoiValue) {
      message.warning("Vui lòng chọn Ngày nhận phôi trước khi chuyển");
      return;
    }

    if (!caNhanPhoiValue) {
      message.warning("Vui lòng chọn Ca nhận phôi trước khi chuyển");
      return;
    }

    if (!selectedRowKeys.length) {
      message.warning("Vui lòng chọn ít nhất 1 dòng để chuyển thanh");
      return;
    }

    const selectedKeySet = new Set(selectedRowKeys.map((k) => String(k)));
    const selectedRows = tableData.filter((row, index) => {
      const rowKey = (row.key ?? row.id ?? index) as string | number;
      return selectedKeySet.has(String(rowKey));
    });

    if (!selectedRows.length) {
      message.warning("Không tìm thấy dữ liệu dòng đã chọn");
      return;
    }

    const getAvailable = (total: number, transferred: number) =>
      Math.max(0, total - transferred);

    const items = selectedRows.map((row) => {
      const soThanhDangCoLoai1 = getAvailable(
        Number(row.stLoai1 || 0),
        Number(row.stDachuyenLoai1 || row.stDaChuyenLoai1 || 0),
      );
      const soThanhDangCoLoai2 = getAvailable(
        Number(row.stLoai2 || 0),
        Number(row.stDachuyenLoai2 || row.stDaChuyenLoai2 || 0),
      );
      const soThanhDangCoLoai2TP = getAvailable(
        Number(row.stLoai2tp || row.stLoai2TP || 0),
        Number(
          row.stDachuyenLoai2tp ||
            row.stDachuyenLoai2TP ||
            row.stDaChuyenLoai2tp ||
            row.stDaChuyenLoai2TP ||
            0,
        ),
      );
      const soThanhDangCoPhoiNgan = getAvailable(
        Number(row.stPhoiNgan || 0),
        Number(row.stDachuyenPhoiNgan || row.stDaChuyenPhoiNgan || 0),
      );
      const soThanhDangCoLoai3 = getAvailable(
        Number(row.stLoai3 || 0),
        Number(row.stDachuyenLoai3 || row.stDaChuyenLoai3 || 0),
      );

      return {
        rowKey: (row.key ?? row.id) as string | number,
        me: String(row.me ?? ""),
        mac: String(row.mac ?? ""),
        kichThuoc: String(row.kichThuoc ?? ""),
        soThanhDangCoLoai1,
        soThanhDangCoLoai2,
        soThanhDangCoLoai2TP,
        soThanhDangCoPhoiNgan,
        soThanhDangCoLoai3,
        soThanhGiaoLoai1: soThanhDangCoLoai1,
        soThanhGiaoLoai2: soThanhDangCoLoai2,
        soThanhGiaoLoai2TP: soThanhDangCoLoai2TP,
        soThanhGiaoPhoiNgan: soThanhDangCoPhoiNgan,
        soThanhGiaoLoai3: soThanhDangCoLoai3,
      };
    });

    setChuyenThanhItems(items);
    setIsChuyenModalOpen(true);
  }, [form, selectedRowKeys, tableData]);

  const handleChangeSoThanhGiao = useCallback(
    (
      rowKey: string | number,
      giaoField:
        | "soThanhGiaoLoai1"
        | "soThanhGiaoLoai2"
        | "soThanhGiaoLoai2TP"
        | "soThanhGiaoPhoiNgan"
        | "soThanhGiaoLoai3",
      maxValue: number,
      value: number | null,
    ) => {
      setChuyenThanhItems((prev) =>
        prev.map((item) => {
          if (item.rowKey !== rowKey) return item;
          const rawValue = Number(value ?? 0);
          const nextValue = Math.max(
            0,
            Math.min(rawValue, Number(maxValue || 0)),
          );
          return { ...item, [giaoField]: nextValue };
        }),
      );
    },
    [],
  );

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
      const ngaySXFormatted = ngaySXValue?.format
        ? ngaySXValue.format("YYYY-MM-DD")
        : ngaySXValue;

      const params = {
        kip,
        ca: Number(ca),
        mayduc: Number(mayduc),
        ngaySX: ngaySXFormatted,
      };

      const response = await phoiNhapKhoApi.getByKipNgay(params);

      if (response && Array.isArray(response)) {
        const updatedData = response.map((newRow: any, index: number) => {
          // Tìm record hiện tại có cùng điều kiện nếu cần
          const existingRow = tableData.find(
            (row: any) => row.id === newRow.id,
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
        message.success(
          `Cập nhật dữ liệu thành công! Có ${updatedData.length} bản ghi`,
        );
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
  }, [kip, ca, mayduc, form, tableData]);

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
                (s) => s.capDuyet === pd.capDuyet && s.type === "selectNguoiKy",
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

          // Parse ngayNhanPhoi (ngoài config headerFields)
          if (data.ngayNhanPhoi) {
            const parsed = dayjs(data.ngayNhanPhoi);
            parsedDates.ngayNhanPhoi = parsed.isValid() ? parsed : null;
          }

          // ★ Mặc định gán các trường filter nếu có dữ liệu (từ res hoặc data)
          const filterDefaults: Record<string, any> = {};

          // Lấy từ res trực tiếp (API response) hoặc từ data (jsonData)
          const ngaySXValue =
            (res as any)?.ngaySX || data?.NgaySX || data?.ngaySX;
          if (ngaySXValue) {
            filterDefaults.NgaySX = dayjs(ngaySXValue).isValid()
              ? dayjs(ngaySXValue)
              : null;
          }

          const caValue = (res as any)?.ca || data?.ca || data?.Ca;
          if (caValue) {
            filterDefaults.ca = caValue;
          }

          const kipValue = (res as any)?.kip || data?.kip || data?.Kip;
          if (kipValue) {
            filterDefaults.kip = kipValue;
          }

          const mayDucValue =
            (res as any)?.mayDuc ||
            (res as any)?.mayduc ||
            data?.mayduc ||
            data?.mayDuc ||
            data?.MayDuc;
          if (mayDucValue) {
            filterDefaults.mayduc = mayDucValue;
          }

          if (filterDefaults.NgaySX) {
            filterDefaults.ngayNhanPhoi = filterDefaults.NgaySX;
          }

          if (filterDefaults.ca) {
            filterDefaults.caNhanPhoi = filterDefaults.ca;
          }

          const formValues = {
            ...data,
            ...signatureFields,
            ...parsedDates,
            ...filterDefaults,
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
            // ★ Đọc cả 3 biến thể tên field để an toàn
            idPhieuGoc:
              (res as any)?.idPhieuGoc ??
              (res as any)?.iD_PhieuGoc ??
              (res as any)?.ID_PhieuGoc ??
              null,
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

  /** Load dữ liệu nhận phôi từ API theo ngày/ca nhận phôi */
  const loadNhanPhoiData = useCallback(async () => {
    const ngayNhanPhoiValue = form.getFieldValue("ngayNhanPhoi");
    const caNhanPhoiValue = form.getFieldValue("caNhanPhoi");
    const mayDucValue = form.getFieldValue("mayduc");

    if (!ngayNhanPhoiValue || !caNhanPhoiValue) {
      setNhanPhoiData([]);
      return;
    }

    const fromDate = ngayNhanPhoiValue?.format
      ? ngayNhanPhoiValue.format("YYYY-MM-DD")
      : String(ngayNhanPhoiValue);

    try {
      setNhanPhoiLoading(true);
      const res = await phoiNhapKhoApi.getPhoiNhapKhoList({
        fromDate,
        toDate: fromDate,
        ca: Number(caNhanPhoiValue || 0),
        ...(Number(mayDucValue || 0) > 0
          ? { mayDuc: Number(mayDucValue) }
          : {}),
        page: 1,
        pageSize: 200,
      });
      const rows = (res as any)?.data ?? [];
      setNhanPhoiData(Array.isArray(rows) ? rows : []);
      setSelectedNhanPhoiRowKeys([]);
    } catch {
      // silent — bảng nhận phôi không block form chính
    } finally {
      setNhanPhoiLoading(false);
    }
  }, [form]);

  useEffect(() => {
    loadNhanPhoiData();
  }, [loadNhanPhoiData, ngayNhanPhoiWatch, caNhanPhoiWatch, mayduc]);

  const handleSearchNhanPhoi = useCallback(async () => {
    const ngayNhanPhoiValue = form.getFieldValue("ngayNhanPhoi");
    const caNhanPhoiValue = form.getFieldValue("caNhanPhoi");
    const mayDucValue = form.getFieldValue("mayduc");

    if (!ngayNhanPhoiValue) {
      message.warning("Vui lòng chọn Ngày nhận phôi trước khi tìm kiếm");
      return;
    }

    if (!caNhanPhoiValue) {
      message.warning("Vui lòng chọn Ca nhận phôi trước khi tìm kiếm");
      return;
    }

    if (!mayDucValue) {
      message.warning("Vui lòng chọn Máy đúc trước khi tìm kiếm");
      return;
    }

    await loadNhanPhoiData();
  }, [form, loadNhanPhoiData]);

  const handleThuHoiNhanPhoi = useCallback(() => {
    if (!selectedNhanPhoiRowKeys.length) {
      message.warning("Vui lòng chọn ít nhất 1 dòng để thu hồi");
      return;
    }

    const selectedIds = nhanPhoiData
      .filter((row) => selectedNhanPhoiRowKeys.includes(row.id))
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id));

    if (!selectedIds.length) {
      message.warning("Không tìm thấy dòng hợp lệ để thu hồi");
      return;
    }

    Modal.confirm({
      title: "Xác nhận thu hồi",
      content: `Bạn có chắc muốn thu hồi ${selectedIds.length} dòng đã nhận phôi?`,
      okText: "Thu hồi",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setNhanPhoiLoading(true);
          const payload = {
            ids: selectedIds,
          };
          await phoiNhapKhoApi.thuHoiPhoiNhapKho(payload);
          message.success("Thu hồi dữ liệu nhận phôi thành công");
          setSelectedNhanPhoiRowKeys([]);
          await loadNhanPhoiData();
        } catch (error: any) {
          message.error(
            error?.response?.data?.message ||
              error?.message ||
              "Thu hồi dữ liệu nhận phôi thất bại",
          );
        } finally {
          setNhanPhoiLoading(false);
        }
      },
    });
  }, [selectedNhanPhoiRowKeys, nhanPhoiData, loadNhanPhoiData]);

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

    // Format ngayNhanPhoi (ngoài config headerFields)
    if (formData.ngayNhanPhoi?.format) {
      formattedDates.ngayNhanPhoi = formData.ngayNhanPhoi.format("YYYY-MM-DD");
    }

    return {
      ...formData,
      ...formattedDates,
      maBm: config.code,
      xuongId: userInfo.iD_PhanXuong ?? null,
      idphongBan: userInfo.iD_PhongBan ?? null,
      table1: processedTable1,
      pheDuyet: pheDuyetFlow,
      prefix: config.prefix,
    };
  }, [
    getUserInfo,
    form,
    config.signatures,
    config.code,
    config.headerFields,
    config.prefix,
    tableData,
  ]);

  const handleStatusChange = useCallback(
    async (idPhieu: string, newStatus: number) => {
      const { isClone, idPhieuGoc } = phieuInfoRef.current; // ★ luôn fresh

      try {
        const formValues = await form.validateFields();

        // ── HoanThanh → INSERT ───────────────────────────────────────────
        // if (newStatus === TrangThaiPhieuConst.HoanThanh) {
        //   await phoiNhapKhoApi.insertPhoiNhapKho({
        //     idPhieu,
        //     soPhieu: soPhieu || "",
        //     ngaySX: formValues.NgaySX
        //       ? formValues.NgaySX.format("YYYY-MM-DD")
        //       : "",
        //     kip: formValues.kip || "",
        //     ca: formValues.ca || 0,
        //     mayDuc: formValues.mayDuc || 0,
        //     table1: tableData.map((row) => ({
        //       me: row.me || "",
        //       mac: row.mac || "",
        //       kichThuoc: row.kichThuoc || "",
        //       stLoai1: Number(row.stLoai1) || 0,
        //       klLoai1: Number(row.klLoai1) || 0,
        //       stPhoiNgan: Number(row.stPhoiNgan) || 0,
        //       cdPhoiNgan: Number(row.cdPhoiNgan) || 0,
        //       klPhoiNgan: Number(row.klPhoiNgan) || 0,
        //       stLoai2: Number(row.stLoai2) || 0,
        //       klLoai2: Number(row.klLoai2) || 0,
        //       stLoai2tp: Number(row.stLoai2tp) || 0,
        //       klLoai2tp: Number(row.klLoai2tp) || 0,
        //       stLoai3: Number(row.stLoai3) || 0,
        //       klLoai3: Number(row.klLoai3) || 0,
        //       tongSoThanh: Number(row.tongSoThanh) || 0,
        //       tongKhoiLuong: Number(row.tongKhoiLuong) || 0,
        //     })),
        //   });
        //   message.success("Đã insert dữ liệu phôi nhập kho thành công!");
        //   return;
        // }

        // ── DaThuHoi → DELETE (+ RESTORE cha nếu là clone) ───────────────
        if (newStatus === TrangThaiPhieuConst.DaThuHoi) {
          await phoiNhapKhoApi.deletePhoiNhapKhoByIdPhieu(idPhieu);
          message.success("Đã xóa dữ liệu phôi nhập kho!");
          if (isClone && idPhieuGoc) {
            await phoiNhapKhoApi.restorePhoiNhapKhoByIdPhieu(idPhieuGoc);
            message.success("Đã khôi phục dữ liệu phiếu cha!");
          }
          return;
        }

        // ── KhongXacNhan → DELETE clone + RESTORE cha ────────────────────
        if (newStatus === TrangThaiPhieuConst.KhongXacNhan) {
          if (isClone && idPhieuGoc) {
            try {
              await phoiNhapKhoApi.deletePhoiNhapKhoByIdPhieu(idPhieu);
            } catch {
              // clone chưa có data → không sao
            }
            await phoiNhapKhoApi.restorePhoiNhapKhoByIdPhieu(idPhieuGoc);
            message.success(
              "Đã khôi phục dữ liệu phôi nhập kho của phiếu cha!",
            );
          }
        }
      } catch (error: any) {
        console.error("❌ Error in handleStatusChange:", error);
        message.error(
          `Lỗi: ${error?.response?.data?.message || error?.message || "Không xác định"}`,
        );
      }
    },
    [form, soPhieu, tableData],
    // ★ KHÔNG đưa phieuInfo vào deps – đọc từ phieuInfoRef.current
  );

  const handleActionSuccess = useCallback(
    async (context?: { newPhieuId?: string }) => {
      // ── DeNghiHieuChinh → navigate sang clone (giữ nguyên data cha) ─────
      if (context?.newPhieuId) {
        navigate(`/taophieubienbanphoinapkho/${context.newPhieuId}`, {
          replace: true,
        });
        return;
      }

      if (!idphieu) return;

      try {
        // ★ Đọc prevStatus từ ref để luôn fresh, tránh stale closure
        const prevStatus = phieuInfoRef.current.tinhTrang;

        const res: any = await PhieuApi.getDetail(idphieu);
        const newStatus = res?.tinhTrang;

        // ── HoanThanh → INSERT + HIDE cha (nếu là clone) ─────────────────
        if (
          newStatus === TrangThaiPhieuConst.HoanThanh &&
          prevStatus !== TrangThaiPhieuConst.HoanThanh
        ) {
          await handleStatusChange(idphieu, TrangThaiPhieuConst.HoanThanh);

          // Dùng res (fresh từ API) để lấy idPhieuGoc, không dùng closure cũ
          const parentId =
            res?.idPhieuGoc ?? res?.iD_PhieuGoc ?? res?.ID_PhieuGoc;
          if (res?.isClone && parentId) {
            try {
              await phoiNhapKhoApi.hidePhoiNhapKhoByIdPhieu(parentId);
            } catch {
              // cha chưa có data → không block flow
            }
          }
        }

        // ── KhongXacNhan → đã xử lý trong handleStatusChange, skip ────────
      } catch {
        // bỏ qua lỗi fetch
      }

      await initData();
    },
    [navigate, initData, idphieu, handleStatusChange],
    // phieuInfoRef không cần deps – dùng ref
  );

  const handleExportPdf = async () => {
    if (!idphieu) {
      message.warning("Vui lòng lưu phiếu trước khi xuất PDF!");
      return;
    }

    try {
      setLoading(true);
      const response = await phoiNhapKhoApi.exportPhoiNhapKhoPdf({
        NgaySX: form.getFieldValue("NgaySX")
          ? form.getFieldValue("NgaySX").format("YYYY-MM-DD")
          : undefined,
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

    return phieuActionService.renderActionButtons(
      buttons,
      idphieu || "",
      getFormData,
    );
  }, [
    getUserInfo,
    idphieu,
    phieuInfo,
    getFormData,
    handleStatusChange,
    handleActionSuccess,
  ]);

  const tableSection = config.layout.find(
    (section: any) =>
      section.sectionType === "table" && section.key === "table1",
  );

  const tableColumns = useMemo(() => {
    const sourceColumns = tableSection?.columns || [];
    const mergedColumns: any[] = [];

    for (let index = 0; index < sourceColumns.length; index += 1) {
      const column = sourceColumns[index];
      const nextColumn = sourceColumns[index + 1];

      if (column?.dataIndex === "ngaySX" && nextColumn?.dataIndex === "ca") {
        mergedColumns.push({
          ...column,
          title: "Ngày/Ca SX",
          dataIndex: "ngayCaSX",
          width: 170,
        });
        index += 1;
        continue;
      }

      if (column?.dataIndex === "ca") {
        continue;
      }

      mergedColumns.push(column);
    }

    return mergedColumns;
  }, [tableSection?.columns]);

  const displayTableData = useMemo(
    () =>
      tableData.map((row) => {
        const ngaySXValue = row.ngaySX ? String(row.ngaySX) : "";
        const caValue =
          row.ca !== null && row.ca !== undefined && row.ca !== ""
            ? `Ca ${row.ca}`
            : "";

        return {
          ...row,
          ngayCaSX:
            ngaySXValue && caValue
              ? `${ngaySXValue} - ${caValue}`
              : ngaySXValue || caValue,
        };
      }),
    [tableData],
  );

  const handleConfirmChuyenThanh = useCallback(() => {
    const saveChuyenThanh = async () => {
      if (!chuyenThanhItems.length) {
        setIsChuyenModalOpen(false);
        return;
      }

      const ngayNhanPhoiValue = form.getFieldValue("ngayNhanPhoi");
      const caNhanPhoiValue = form.getFieldValue("caNhanPhoi");
      const mayDucValue = form.getFieldValue("mayduc");

      if (!ngayNhanPhoiValue) {
        message.warning("Vui lòng chọn Ngày nhận phôi trước khi chuyển");
        return;
      }

      if (!caNhanPhoiValue) {
        message.warning("Vui lòng chọn Ca nhận phôi trước khi chuyển");
        return;
      }

      const ngayNhanPhoi = ngayNhanPhoiValue?.format
        ? ngayNhanPhoiValue.format("YYYY-MM-DD")
        : ngayNhanPhoiValue;

      const payload: InsertPhoiNhapKhoRequest = {
        idPhieu: idphieu || "",
        soPhieu: soPhieu || "",
        ngaySX: ngayNhanPhoi,
        ca: Number(caNhanPhoiValue || 0),
        kip: String(form.getFieldValue("kip") || ""),
        mayDuc: Number(mayDucValue || 0),
        nguoiTaoId: Number(getUserInfo()?.iD_TaiKhoan || 0),
        table1: chuyenThanhItems.map((item) => {
          const tongSoThanh =
            Number(item.soThanhGiaoLoai1 || 0) +
            Number(item.soThanhGiaoLoai2 || 0) +
            Number(item.soThanhGiaoLoai2TP || 0) +
            Number(item.soThanhGiaoPhoiNgan || 0) +
            Number(item.soThanhGiaoLoai3 || 0);

          return {
            soPhieu: soPhieu || "",
            ngaySX: ngayNhanPhoi,
            ca: Number(caNhanPhoiValue || 0),
            kip: String(form.getFieldValue("kip") || ""),
            mayDuc: Number(mayDucValue || 0),
            me: item.me,
            mac: item.mac,
            kichThuoc: item.kichThuoc,
            stLoai1: Number(item.soThanhGiaoLoai1 || 0),
            klLoai1: 0,
            stPhoiNgan: Number(item.soThanhGiaoPhoiNgan || 0),
            klPhoiNgan: 0,
            cdPhoiNgan: 0,
            stLoai2: Number(item.soThanhGiaoLoai2 || 0),
            klLoai2: 0,
            stLoai2TP: Number(item.soThanhGiaoLoai2TP || 0),
            klLoai2TP: 0,
            stLoai3: Number(item.soThanhGiaoLoai3 || 0),
            klLoai3: 0,
            tongSoThanh,
            tongKhoiLuong: 0,
          };
        }),
      };

      try {
        setLoading(true);
        await phoiNhapKhoApi.insertPhoiNhapKho(payload);
        message.success(
          "Đã chuyển thanh và lưu dữ liệu phôi nhập kho thành công!",
        );
        setSelectedRowKeys([]);
        setIsChuyenModalOpen(false);
        setChuyenThanhItems([]);
        await loadDataFromAPI();
        await loadNhanPhoiData();
      } catch (error: any) {
        message.error(
          error?.response?.data?.message ||
            error?.message ||
            "Chuyển thanh thất bại",
        );
      } finally {
        setLoading(false);
      }
    };

    void saveChuyenThanh();
  }, [
    chuyenThanhItems,
    form,
    getUserInfo,
    idphieu,
    soPhieu,
    loadDataFromAPI,
    loadNhanPhoiData,
  ]);

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
            {/* {config.title} */}
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
              disabled={true}
            />
          ))}
        </div>

        {/* Nút Filter */}
        <div
          style={{ marginTop: 16, marginBottom: 16, display: "flex", gap: 8 }}
        >
          {
            <>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleFilter}
                disabled={isFormLocked}
                loading={loading}
              >
                Tải dữ liệu
              </Button>
              {idphieu &&
                (currentTinhTrang === TrangThaiPhieuConst.HoanThanh ||
                  currentTinhTrang === TrangThaiPhieuConst.DaChot) && (
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
            </>
          }
        </div>

        {!isViecDenToi && (
          <div style={{ marginBottom: 12 }}>
            <Button
              onClick={handleOpenModalChuyenThanh}
              disabled={isFormLocked || selectedRowKeys.length === 0}
            >
              Chuyển thanh
            </Button>
          </div>
        )}

        {!isViecDenToi &&
          /* TABLE - danh sách phôi */
          config.layout.map((layout, idx) => (
            <div key={idx}>
              {layout.sectionType === "table" && (
                <CustomFormTable
                  columns={tableColumns}
                  initialData={displayTableData}
                  onDataChange={(rows) => setTableData(rows as TableRow[])}
                  addRowButtonText="+ Thêm dòng"
                  showAddButton={false}
                  showDeleteButton={false}
                  selectionEnabled={true}
                  selectedRowKeys={selectedRowKeys}
                  onSelectionChange={(keys) => setSelectedRowKeys(keys)}
                  isRowSelectable={isTransferableRow}
                  minRows={0}
                  editable={false}
                  loading={loading}
                  //  selectionEnabled={false}
                  summary={(pageData) => {
                    // Tính tổng cho từng cột số
                    const totals = {
                      stLoai1: 0,
                      stDachuyenLoai1: 0,
                      klLoai1: 0,
                      stPhoiNgan: 0,
                      stDachuyenPhoiNgan: 0,
                      klPhoiNgan: 0,
                      cdPhoiNgan: 0,
                      stLoai2: 0,
                      stDachuyenLoai2: 0,
                      klLoai2: 0,
                      stLoai2tp: 0,
                      stDachuyenLoai2tp: 0,
                      klLoai2tp: 0,
                      stLoai3: 0,
                      stDachuyenLoai3: 0,
                      klLoai3: 0,
                      tongSoThanh: 0,
                      tongKhoiLuong: 0,
                    };

                    pageData.forEach((row: any) => {
                      totals.stLoai1 += Number(row.stLoai1) || 0;
                      totals.stDachuyenLoai1 +=
                        Number(row.stDachuyenLoai1) || 0;
                      totals.klLoai1 += Number(row.klLoai1) || 0;
                      totals.stPhoiNgan += Number(row.stPhoiNgan) || 0;
                      totals.stDachuyenPhoiNgan +=
                        Number(row.stDachuyenPhoiNgan) || 0;
                      totals.klPhoiNgan += Number(row.klPhoiNgan) || 0;
                      totals.cdPhoiNgan += Number(row.cdPhoiNgan) || 0;
                      totals.stLoai2 += Number(row.stLoai2) || 0;
                      totals.stDachuyenLoai2 +=
                        Number(row.stDachuyenLoai2) || 0;
                      totals.klLoai2 += Number(row.klLoai2) || 0;
                      totals.stLoai2tp += Number(row.stLoai2tp) || 0;
                      totals.stDachuyenLoai2tp +=
                        Number(row.stDachuyenLoai2tp) || 0;
                      totals.klLoai2tp += Number(row.klLoai2tp) || 0;
                      totals.stLoai3 += Number(row.stLoai3) || 0;
                      totals.stDachuyenLoai3 +=
                        Number(row.stDachuyenLoai3) || 0;
                      totals.klLoai3 += Number(row.klLoai3) || 0;
                      totals.tongSoThanh += Number(row.tongSoThanh) || 0;
                      totals.tongKhoiLuong += Number(row.tongKhoiLuong) || 0;
                    });

                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row
                          style={{
                            backgroundColor: "#fafafa",
                            fontWeight: "bold",
                          }}
                        >
                          <Table.Summary.Cell
                            index={0}
                            colSpan={3}
                            align="center"
                          >
                            TỔNG CỘNG
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            {totals.stLoai1.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            {totals.stDachuyenLoai1.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            {totals.klLoai1.toLocaleString("en-US")}
                          </Table.Summary.Cell>

                          <Table.Summary.Cell index={4} align="right">
                            {totals.stLoai2.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            {totals.stDachuyenLoai2.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            {totals.klLoai2.toLocaleString("en-US")}
                          </Table.Summary.Cell>

                          <Table.Summary.Cell index={7} align="right">
                            {totals.stLoai2tp.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={8} align="right">
                            {totals.stDachuyenLoai2tp.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={9} align="right">
                            {totals.klLoai2tp.toLocaleString("en-US")}
                          </Table.Summary.Cell>

                          <Table.Summary.Cell index={10} align="right">
                            {totals.stPhoiNgan.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={11} align="right">
                            {totals.stDachuyenPhoiNgan.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={12} align="right">
                            {totals.cdPhoiNgan.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={13} align="right">
                            {totals.klPhoiNgan.toLocaleString("en-US")}
                          </Table.Summary.Cell>

                          <Table.Summary.Cell index={14} align="right">
                            {totals.stLoai3.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={15} align="right">
                            {totals.stDachuyenLoai3.toLocaleString("en-US")}
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={16} align="right">
                            {totals.klLoai3.toLocaleString("en-US")}
                          </Table.Summary.Cell>

                          <Table.Summary.Cell index={17} align="right">
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

        {/* VÙNG NHẬN PHÔI */}
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            background: "#fafafa",
          }}
        >
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            Vùng nhận phôi
          </Typography.Title>

          {/* Ngày ca nhận phôi */}
          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <Form.Item
              label="Ngày nhận phôi"
              name="ngayNhanPhoi"
              style={{ marginBottom: 0, minWidth: 200 }}
            >
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                disabled
              />
            </Form.Item>
            <Form.Item
              label="Ca nhận phôi"
              name="caNhanPhoi"
              style={{ marginBottom: 0, minWidth: 160 }}
            >
              <Select
                allowClear
                placeholder="Chọn ca"
                disabled
                options={[
                  { label: "Ca Ngày", value: 1 },
                  { label: "Ca Đêm", value: 2 },
                ]}
              />
            </Form.Item>
            <div style={{ display: "flex", alignItems: "end" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  type="primary"
                  icon={<FilterOutlined />}
                  loading={nhanPhoiLoading}
                  onClick={handleSearchNhanPhoi}
                >
                  Tìm kiếm
                </Button>
                <Button
                  danger
                  disabled={
                    isFormLocked ||
                    nhanPhoiLoading ||
                    selectedNhanPhoiRowKeys.length === 0
                  }
                  onClick={handleThuHoiNhanPhoi}
                >
                  Thu hồi
                </Button>
              </div>
            </div>
          </div>

          {/* Bảng dữ liệu nhận phôi */}
          <Table<PhoiNhapKhoListItem>
            loading={nhanPhoiLoading}
            dataSource={nhanPhoiData}
            rowKey="id"
            rowSelection={
              isFormLocked
                ? undefined
                : {
                    selectedRowKeys: selectedNhanPhoiRowKeys,
                    onChange: (keys: any[]) => setSelectedNhanPhoiRowKeys(keys),
                  }
            }
            size="small"
            pagination={false}
            scroll={{ x: "max-content" }}
            bordered
            summary={(pageData) => {
              const t = {
                stLoai1: 0,
                klLoai1: 0,
                stLoai2: 0,
                klLoai2: 0,
                stLoai2TP: 0,
                klLoai2TP: 0,
                stPhoiNgan: 0,
                cdPhoiNgan: 0,
                klPhoiNgan: 0,
                stLoai3: 0,
                klLoai3: 0,
                tongSoThanh: 0,
                tongKhoiLuong: 0,
              };
              pageData.forEach((r) => {
                t.stLoai1 += r.stLoai1 ?? 0;
                t.klLoai1 += r.klLoai1 ?? 0;
                t.stLoai2 += r.stLoai2 ?? 0;
                t.klLoai2 += r.klLoai2 ?? 0;
                t.stLoai2TP += r.stLoai2TP ?? 0;
                t.klLoai2TP += r.klLoai2TP ?? 0;
                t.stPhoiNgan += r.stPhoiNgan ?? 0;
                t.cdPhoiNgan += r.cdPhoiNgan ?? 0;
                t.klPhoiNgan += r.klPhoiNgan ?? 0;
                t.stLoai3 += r.stLoai3 ?? 0;
                t.klLoai3 += r.klLoai3 ?? 0;
                t.tongSoThanh += r.tongSoThanh ?? 0;
                t.tongKhoiLuong += r.tongKhoiLuong ?? 0;
              });
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row
                    style={{ fontWeight: "bold", background: "#fafafa" }}
                  >
                    <Table.Summary.Cell index={0} colSpan={3} align="center">
                      TỔNG CỘNG
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      {t.stLoai1.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      {t.klLoai1.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      {t.stLoai2.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      {t.klLoai2.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      {t.stLoai2TP.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      {t.klLoai2TP.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right">
                      {t.stPhoiNgan.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right">
                      {t.cdPhoiNgan.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right">
                      {t.klPhoiNgan.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="right">
                      {t.stLoai3.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="right">
                      {t.klLoai3.toLocaleString()}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} align="right">
                      {t.tongKhoiLuong.toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
            columns={[
              { title: "Mẻ", dataIndex: "me", width: 110, fixed: "left" },
              { title: "Mác thép", dataIndex: "mac", width: 80 },
              { title: "Kích thước", dataIndex: "kichThuoc", width: 130 },
              {
                title: "Loại I",
                children: [
                  {
                    title: "Số thanh",
                    dataIndex: "stLoai1",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "KL (kg)",
                    dataIndex: "klLoai1",
                    width: 100,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                ],
              },
              {
                title: "Loại II BM",
                children: [
                  {
                    title: "Số thanh",
                    dataIndex: "stLoai2",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "KL (kg)",
                    dataIndex: "klLoai2",
                    width: 100,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                ],
              },
              {
                title: "Loại II TPHH",
                children: [
                  {
                    title: "Số thanh",
                    dataIndex: "stLoai2TP",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "KL (kg)",
                    dataIndex: "klLoai2TP",
                    width: 100,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                ],
              },
              {
                title: "Phôi ngắn",
                children: [
                  {
                    title: "Số thanh",
                    dataIndex: "stPhoiNgan",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "CD (m)",
                    dataIndex: "cdPhoiNgan",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "KL (kg)",
                    dataIndex: "klPhoiNgan",
                    width: 100,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                ],
              },
              {
                title: "Loại III",
                children: [
                  {
                    title: "Số thanh",
                    dataIndex: "stLoai3",
                    width: 80,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                  {
                    title: "KL (kg)",
                    dataIndex: "klLoai3",
                    width: 100,
                    align: "right" as const,
                    render: (v: number) => v?.toLocaleString(),
                  },
                ],
              },
              {
                title: "Tổng KL (kg)",
                dataIndex: "tongKhoiLuong",
                width: 120,
                align: "right" as const,
                render: (v: number) => v?.toLocaleString(),
              },
            ]}
          />
        </div>

        {!isViecDenToi && (
          /* SIGNATURES - ký tên */
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
                ? (currentUserInfo?.iD_TaiKhoan ?? null)
                : undefined;

              // Lấy thông tin phê duyệt
              const duyet = phieuInfo.pheDuyet?.find(
                (p: any) => p.capDuyet === sig.capDuyet,
              );

              return (
                <div key={sig.key || i}>
                  <CustomFormItem
                    field={sig}
                    idx={i}
                    disabled={
                      isLevelZero || isSignatureReadonly || isFormLocked
                    }
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
        )}

        <Modal
          title="Chuyển thanh"
          open={isChuyenModalOpen}
          onCancel={() => setIsChuyenModalOpen(false)}
          onOk={handleConfirmChuyenThanh}
          okText="Xác nhận"
          cancelText="Đóng"
          width={1300}
        >
          <Table<ChuyenThanhItem>
            dataSource={chuyenThanhItems}
            rowKey="rowKey"
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "Mẻ",
                dataIndex: "me",
                key: "me",
                width: 120,
              },
              {
                title: "Mác",
                dataIndex: "mac",
                key: "mac",
                width: 100,
              },
              {
                title: "Kích thước",
                dataIndex: "kichThuoc",
                key: "kichThuoc",
                width: 140,
              },
              {
                title: "Loại I",
                children: [
                  {
                    title: "Chưa chuyển",
                    dataIndex: "soThanhDangCoLoai1",
                    key: "soThanhDangCoLoai1",
                    width: 110,
                    align: "right",
                    render: (value: number) =>
                      value > 0 ? value.toLocaleString() : "",
                  },
                  {
                    title: "Số giao",
                    dataIndex: "soThanhGiaoLoai1",
                    key: "soThanhGiaoLoai1",
                    width: 120,
                    align: "right",
                    render: (_: number, record: ChuyenThanhItem) =>
                      record.soThanhDangCoLoai1 > 0 ? (
                        <InputNumber
                          min={0}
                          max={Math.max(0, record.soThanhDangCoLoai1)}
                          value={record.soThanhGiaoLoai1}
                          onChange={(value) =>
                            handleChangeSoThanhGiao(
                              record.rowKey,
                              "soThanhGiaoLoai1",
                              Math.max(0, record.soThanhDangCoLoai1),
                              value,
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        ""
                      ),
                  },
                ],
              },
              {
                title: "Loại II BM",
                children: [
                  {
                    title: "Đang có",
                    dataIndex: "soThanhDangCoLoai2",
                    key: "soThanhDangCoLoai2",
                    width: 110,
                    align: "right",
                    render: (value: number) =>
                      value > 0 ? value.toLocaleString() : "",
                  },
                  {
                    title: "Số giao",
                    dataIndex: "soThanhGiaoLoai2",
                    key: "soThanhGiaoLoai2",
                    width: 120,
                    align: "right",
                    render: (_: number, record: ChuyenThanhItem) =>
                      record.soThanhDangCoLoai2 > 0 ? (
                        <InputNumber
                          min={0}
                          max={Math.max(0, record.soThanhDangCoLoai2)}
                          value={record.soThanhGiaoLoai2}
                          onChange={(value) =>
                            handleChangeSoThanhGiao(
                              record.rowKey,
                              "soThanhGiaoLoai2",
                              Math.max(0, record.soThanhDangCoLoai2),
                              value,
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        ""
                      ),
                  },
                ],
              },
              {
                title: "Loại II TPHH",
                children: [
                  {
                    title: "Đang có",
                    dataIndex: "soThanhDangCoLoai2TP",
                    key: "soThanhDangCoLoai2TP",
                    width: 110,
                    align: "right",
                    render: (value: number) =>
                      value > 0 ? value.toLocaleString() : "",
                  },
                  {
                    title: "Số giao",
                    dataIndex: "soThanhGiaoLoai2TP",
                    key: "soThanhGiaoLoai2TP",
                    width: 120,
                    align: "right",
                    render: (_: number, record: ChuyenThanhItem) =>
                      record.soThanhDangCoLoai2TP > 0 ? (
                        <InputNumber
                          min={0}
                          max={Math.max(0, record.soThanhDangCoLoai2TP)}
                          value={record.soThanhGiaoLoai2TP}
                          onChange={(value) =>
                            handleChangeSoThanhGiao(
                              record.rowKey,
                              "soThanhGiaoLoai2TP",
                              Math.max(0, record.soThanhDangCoLoai2TP),
                              value,
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        ""
                      ),
                  },
                ],
              },
              {
                title: "Phôi ngắn",
                children: [
                  {
                    title: "Đang có",
                    dataIndex: "soThanhDangCoPhoiNgan",
                    key: "soThanhDangCoPhoiNgan",
                    width: 110,
                    align: "right",
                    render: (value: number) =>
                      value > 0 ? value.toLocaleString() : "",
                  },
                  {
                    title: "Số giao",
                    dataIndex: "soThanhGiaoPhoiNgan",
                    key: "soThanhGiaoPhoiNgan",
                    width: 120,
                    align: "right",
                    render: (_: number, record: ChuyenThanhItem) =>
                      record.soThanhDangCoPhoiNgan > 0 ? (
                        <InputNumber
                          min={0}
                          max={Math.max(0, record.soThanhDangCoPhoiNgan)}
                          value={record.soThanhGiaoPhoiNgan}
                          onChange={(value) =>
                            handleChangeSoThanhGiao(
                              record.rowKey,
                              "soThanhGiaoPhoiNgan",
                              Math.max(0, record.soThanhDangCoPhoiNgan),
                              value,
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        ""
                      ),
                  },
                ],
              },
              {
                title: "Loại III",
                children: [
                  {
                    title: "Đang có",
                    dataIndex: "soThanhDangCoLoai3",
                    key: "soThanhDangCoLoai3",
                    width: 110,
                    align: "right",
                    render: (value: number) =>
                      value > 0 ? value.toLocaleString() : "",
                  },
                  {
                    title: "Số giao",
                    dataIndex: "soThanhGiaoLoai3",
                    key: "soThanhGiaoLoai3",
                    width: 120,
                    align: "right",
                    render: (_: number, record: ChuyenThanhItem) =>
                      record.soThanhDangCoLoai3 > 0 ? (
                        <InputNumber
                          min={0}
                          max={Math.max(0, record.soThanhDangCoLoai3)}
                          value={record.soThanhGiaoLoai3}
                          onChange={(value) =>
                            handleChangeSoThanhGiao(
                              record.rowKey,
                              "soThanhGiaoLoai3",
                              Math.max(0, record.soThanhDangCoLoai3),
                              value,
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      ) : (
                        ""
                      ),
                  },
                ],
              },
            ]}
          />
        </Modal>
      </Form>
    </Card>
  );
};

export default TaoPhieuPhoiNhapKho;
