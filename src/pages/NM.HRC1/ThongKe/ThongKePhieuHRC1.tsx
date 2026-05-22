import { Button, Card, Checkbox, message, Modal, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { PhieuApi } from "../../../services/PhieuApi";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { TrangThaiPhieuConst } from "../../../utils/constants/TrangThaiPhieuConstant";
import type { PhieuFilterValues } from "../../../components/PhieuFilterCard";
import type { SearchPhieuRequest } from "../../../models/Phieu";
import { getThongTinUser } from "../../../utils/constants/GetThongTinLocalStore";
import { isAdminUser } from "../../../utils/helpers/checkAdminRole";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";
import { MayDucServiceApi } from "../../../services/MayDucServiceApi";
import type { NhaMayEnum } from "../../../models/SiloModel";

const MABM_DETAIL_ROUTE: Record<string, string> = {
  HRC1_BB_Lothoi: "/taotieuhaolothoi",
  HRC1_BBGN_ThepLong: "/chitietgiaonhantheplong_hrc1",
};

const MABM_LIST: string[] = [
  BM_CONFIG.HRC1.HRC1_BB_Lothoi,
  BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
];

const LOAI_BM_TO_MABM: Record<string, string> = {
  LoThoi: BM_CONFIG.HRC1.HRC1_BB_Lothoi,
  BBGN_ThepLong: BM_CONFIG.HRC1.HRC1_BBGN_ThepLong,
};

const TINH_TRANG_OPTIONS = [
  { label: "Đang lưu", value: TrangThaiPhieuConst.DangLuu },
  { label: "Đã gửi", value: TrangThaiPhieuConst.DaGui },
  { label: "Hoàn thành", value: TrangThaiPhieuConst.HoanThanh },
  { label: "Đã thu hồi", value: TrangThaiPhieuConst.DaThuHoi },
  { label: "Đã chốt", value: TrangThaiPhieuConst.DaChot },
  { label: "Đang phê duyệt", value: TrangThaiPhieuConst.DangPheDuyet },
  { label: "Hiệu chỉnh", value: TrangThaiPhieuConst.HieuChinh },
];

const normalizeNum = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

interface ThongKePhieuHRC1Props {
  type?: string;
}

type TableRecord = SearchPhieuResponseModel & {
  pheDuyet?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const ThongKePhieuHRC1 = ({ type }: ThongKePhieuHRC1Props) => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};

  const currentUserId: number | null =
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userObj?.iD_TaiKhoan ??
    userObj?.ID_TaiKhoan ??
    null;

  const fixedFilters = useMemo(() => {
    const u = getThongTinUser();
    const canThongKe =
      u.tenNgan === "P.KH" || u.iD_PhongBan === 70 || isAdminUser(u);
    if (canThongKe) {
      return { userId: currentUserId, loaiVung: 4, isThongKeUser: true };
    }
    return { userId: currentUserId, loaiVung: 1 };
  }, [currentUserId]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [chotLoading, setChotLoading] = useState(false);
  const [selectedLoaiBM, setSelectedLoaiBM] = useState<string[]>([]);
  const [mayDucOptions, setMayDucOptions] = useState<Array<{ label: string; value: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await MayDucServiceApi.search({
          nhaMay: 1 as NhaMayEnum,
          isLock: false,
          page: 1,
          pageSize: 200,
        });
        if (cancelled) return;
        setMayDucOptions((res.data || []).map((x) => ({ label: x.tenMayDuc, value: x.id })));
      } catch (error) {
        console.error("Load máy đúc options failed:", error);
        if (!cancelled) setMayDucOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const transformFilters = useCallback((filters: PhieuFilterValues): Partial<SearchPhieuRequest> => {
    const loaiBMList = (filters.loaiBM as (string | number)[] | undefined) ?? [];
    const maBmList = loaiBMList.length > 0
      ? loaiBMList.map((k) => LOAI_BM_TO_MABM[String(k)]).filter(Boolean)
      : null;
    return {
      tuNgay: (filters.ngaySXFrom || filters.fromDate || null) as string | null,
      denNgay: (filters.ngaySXTo || filters.toDate || null) as string | null,
      ca: normalizeNum(filters.ca),
      scope: normalizeNum(filters.scope),
      searchText: (filters.soPhieu || null) as string | null,
      tinhTrang: normalizeNum(filters.tinhTrang),
      ...(maBmList ? { maBmList, maBm: null } : {}),
    };
  }, []);

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange, refetch } =
    usePhieuSearchListHRC({
      maBmList: MABM_LIST,
      fixedFilters,
      transformFilters,
    });

  const statusConfig = PHIEU_STATUS_CONFIG;

  const isAllSelected = data.length > 0 && data.every((r) => selectedKeys.has(r.idphieu));
  const isIndeterminate = !isAllSelected && data.some((r) => selectedKeys.has(r.idphieu));

  const toggleSelect = useCallback((id: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedKeys(new Set((data as TableRecord[]).map((r) => r.idphieu)));
      } else {
        setSelectedKeys(new Set());
      }
    },
    [data]
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setSelectedKeys(new Set());
      onPageChange(page, pageSize);
    },
    [onPageChange]
  );

  const handleChotPhieu = useCallback(() => {
    if (selectedKeys.size === 0) return;
    Modal.confirm({
      title: "Xác nhận chốt phiếu",
      content: `Bạn có chắc muốn chốt ${selectedKeys.size} phiếu đã chọn?`,
      okText: "Chốt",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setChotLoading(true);
          await PhieuApi.chotNhieuPhieu([...selectedKeys], TrangThaiPhieuConst.DaChot);
          message.success(`Chốt ${selectedKeys.size} phiếu thành công`);
          setSelectedKeys(new Set());
          refetch();
        } catch {
          message.error("Chốt phiếu thất bại. Vui lòng thử lại.");
        } finally {
          setChotLoading(false);
        }
      },
    });
  }, [selectedKeys, refetch]);

  const handleHuyChotPhieu = useCallback(() => {
    if (selectedKeys.size === 0) return;
    Modal.confirm({
      title: "Xác nhận hủy chốt phiếu",
      content: `Bạn có chắc muốn hủy chốt ${selectedKeys.size} phiếu đã chọn?`,
      okText: "Hủy chốt",
      okType: "primary",
      cancelText: "Đóng",
      onOk: async () => {
        try {
          setChotLoading(true);
          await PhieuApi.chotNhieuPhieu([...selectedKeys], TrangThaiPhieuConst.HoanThanh);
          message.success(`Hủy chốt ${selectedKeys.size} phiếu thành công`);
          setSelectedKeys(new Set());
          refetch();
        } catch {
          message.error("Hủy chốt phiếu thất bại. Vui lòng thử lại.");
        } finally {
          setChotLoading(false);
        }
      },
    });
  }, [selectedKeys, refetch]);

  const columns = [
    {
      title: (
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      dataIndex: "select",
      key: "select",
      width: 50,
      fixed: "left" as const,
      render: (_: unknown, record: TableRecord) => (
        <Checkbox
          checked={selectedKeys.has(record.idphieu)}
          onChange={() => toggleSelect(record.idphieu)}
        />
      ),
    },
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 300,
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            const route = MABM_DETAIL_ROUTE[record.maBm as string];
            if (!route) return;
            if (type === "viecdentoi") {
              navigate(route, {
                state: {
                  idphieu: record.idphieu,
                  pheduyet: record?.pheDuyet?.[0] ?? null,
                },
              });
            } else {
              navigate(route, { state: { idphieu: record.idphieu } });
            }
          }}
        >
          {text}
        </b>
      ),
    },
    {
      title: "Quy trình",
      dataIndex: "maBm",
      key: "maBm",
      width: 250,
      ellipsis: true,
    },
    {
      title: "Ngày lập phiếu",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 200,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 200,
      render: (value: number) => (value === 1 ? "(1) Ca Ngày" : value === 2 ? "(2) Ca Đêm" : "-"),
    },
    {
      title: "Khu vực",
      dataIndex: "tenScope",
      key: "tenScope",
      width: 200,
      ellipsis: true,
      render: (value: string | null | undefined, record: { scope?: number | string | null, maBm?: string | null }) => {
        if (value) return value;
        if (record.scope !== null && record.scope !== undefined) return record.scope;
        return null;
      },
    },
    {
      title: "Người tạo",
      dataIndex: "nguoiTaoId",
      key: "nguoiTaoId",
      width: 200,
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 200,
      render: (status: number) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
  ];

  const filterFieldsConfig = useMemo<FilterFieldConfig[]>(() => {
    const fields: FilterFieldConfig[] = [
      {
        key: "loaiBM",
        label: "Loại biểu mẫu",
        type: "multiselect",
        options: [
          { label: "Lò thổi", value: "LoThoi" },
          { label: "Giao nhận thép lỏng", value: "BBGN_ThepLong" },
        ],
      },
      {
        key: "ngaySX",
        label: "Ngày sản xuất",
        type: "dateRange",
        placeholder: "Khoảng ngày",
      },
      {
        key: "ca",
        label: "Ca",
        type: "select",
        options: [
          { label: "Ca ngày (1)", value: 1 },
          { label: "Ca đêm (2)", value: 2 },
        ],
      },
      {
        key: "soPhieu",
        label: "Số phiếu",
        type: "text",
        placeholder: "Số phiếu...",
      },
    ];

    // Scope options: LoThoi không có scope, BBGN_ThepLong dùng máy đúc
    const scopeOptionsMap: Record<string, { label: string; value: number }[]> = {
      BBGN_ThepLong: mayDucOptions,
    };
    const scopeOptions = selectedLoaiBM.length === 0
      ? mayDucOptions
      : selectedLoaiBM.length === 1
        ? (scopeOptionsMap[selectedLoaiBM[0]] ?? [])
        : (() => {
            const seen = new Set<number>();
            return selectedLoaiBM
              .flatMap((k) => scopeOptionsMap[k] ?? [])
              .filter((o) => {
                if (seen.has(o.value)) return false;
                seen.add(o.value);
                return true;
              });
          })();

    if (scopeOptions.length > 0) {
      fields.push({
        key: "scope",
        label: "Máy đúc",
        type: "select",
        options: scopeOptions,
      });
    }

    fields.push({
      key: "tinhTrang",
      label: "Tình trạng",
      type: "select",
      options: TINH_TRANG_OPTIONS,
    });

    return fields;
  }, [mayDucOptions, selectedLoaiBM]);

  return (
    <div>
      <PhieuFilterCard
        title="Tổng hợp phiếu HRC1"
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        showCreateButton={false}
        onCreateClick={() => {}}
        createButtonText=""
        onFilterFieldChange={(key, value) => {
          if (key === "loaiBM") setSelectedLoaiBM(Array.isArray(value) ? value.map(String) : []);
        }}
      />
      <Card>
        <div style={{ marginBottom: 12, display: "flex", gap: 12, justifyContent: "flex-start" }}>
          <Button
            type="primary"
            disabled={selectedKeys.size === 0}
            loading={chotLoading}
            onClick={handleChotPhieu}
          >
            Chốt phiếu ({selectedKeys.size})
          </Button>
          <Button
            type="primary"
            danger
            disabled={selectedKeys.size === 0}
            loading={chotLoading}
            onClick={handleHuyChotPhieu}
          >
            Hủy chốt ({selectedKeys.size})
          </Button>
        </div>
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
          rowKey="idphieu"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: handlePageChange,
          }}
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8} align="right">
                <span style={{ fontWeight: 500 }}>Tổng: {pagination.total} Phiếu</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default ThongKePhieuHRC1;
