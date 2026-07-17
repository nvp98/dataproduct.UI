import { Button, Card, Checkbox, message, Modal, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import "../styles/readonly.css";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, {
  type FilterFieldConfig,
  type PhieuFilterValues,
} from "./PhieuFilterCard";
import type {
  SearchPhieuByUserRequest,
  SearchPhieuRequest,
  SearchPhieuResponseModel,
} from "../models/Phieu";
import { PhieuApi } from "../services/PhieuApi";
import { TrangThaiPhieuConst } from "../utils/constants/TrangThaiPhieuConstant";
import { usePhieuSearchListHRC } from "../hooks/usePhieuSearchListHRC";
import {
  buildDefaultColumns,
  defaultComputeFixedFilters,
  defaultTransformFilters,
  getDefaultFilterFields,
} from "../utils/ConfigDefault/thongKePhieuDefaults";

export type TableRecord = SearchPhieuResponseModel & {
  pheDuyet?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export interface ChotBatchFailure {
  idPhieu: string;
  soPhieu: string;
  lyDo: string[];
}

export interface ChotResult {
  successCount: number;
  failures: ChotBatchFailure[];
}

export interface ExtraActionsCtx {
  selectedKeys: string[];
  data: TableRecord[];
  refetch: () => void;
  /** maBm chung nếu tất cả phiếu đang chọn cùng loại biểu mẫu, ngược lại null. */
  selectedMaBm: string | null;
}

export interface ThongKePhieuCommonProps {
  /** Danh sách mã biểu mẫu tham gia thống kê — bắt buộc truyền. */
  maBmList: string[];
  title: string;
  type?: string;
  /** maBm -> route chi tiết, dùng khi click vào Số phiếu. */
  mabmDetailRoute?: Record<string, string>;
  /** Cột dữ liệu nghiệp vụ (không bao gồm cột checkbox — cột này luôn được thêm tự động).
   *  Không truyền sẽ dùng bộ cột mặc định: Số phiếu, Quy trình, Ngày lập phiếu, Ca, Trạng thái. */
  columns?: ColumnsType<TableRecord>;
  /** Cấu hình các field của form tìm kiếm. Không truyền sẽ dùng mặc định:
   *  Ngày sản xuất, Ca, Số phiếu, Tình trạng. */
  filterFields?: FilterFieldConfig[];
  transformFilters?: (
    filters: PhieuFilterValues,
  ) => Partial<SearchPhieuRequest>;
  computeFixedFilters?: (
    currentUserId: number | null,
  ) => Partial<SearchPhieuByUserRequest>;
  mergeFilters?: PhieuFilterValues;
  persistKey?: boolean;
  /** Xử lý chốt phiếu tùy biến — trả về số phiếu thành công + danh sách thất bại.
   *  Không truyền sẽ dùng mặc định: PhieuApi.chotNhieuPhieu(ids, DaChot). */
  onChotPhieu?: (
    ids: string[],
    dataMap: Map<string, TableRecord>,
  ) => Promise<ChotResult>;
  /** Tương tự onChotPhieu nhưng cho hủy chốt. Mặc định chuyển trạng thái về HoanThanh. */
  onHuyChotPhieu?: (
    ids: string[],
    dataMap: Map<string, TableRecord>,
  ) => Promise<ChotResult>;
  /** Render thêm các nút thao tác hàng loạt (vd: Export Excel, Làm mới dữ liệu...). */
  renderExtraActions?: (ctx: ExtraActionsCtx) => ReactNode;
  onFilterFieldChange?: (key: string, value: unknown) => void;
  /** Cho phép click cả dòng để toggle chọn (mặc định false — chỉ checkbox mới toggle). */
  rowClickToggleSelect?: boolean;
  scrollX?: number;
}

const showBatchResult = (
  successCount: number,
  failures: ChotBatchFailure[],
  action: "chốt" | "hủy chốt",
) => {
  if (failures.length === 0) {
    message.success(
      `${action === "chốt" ? "Chốt" : "Hủy chốt"} ${successCount} phiếu thành công`,
    );
    return;
  }
  Modal.warning({
    title: `${action === "chốt" ? "Chốt" : "Hủy chốt"} ${successCount} phiếu thành công — ${failures.length} phiếu thất bại`,
    width: 600,
    content: (
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {failures.map((f) => (
          <div key={f.idPhieu} style={{ marginBottom: 6 }}>
            <b>{f.soPhieu}</b>: {f.lyDo.join("; ")}
          </div>
        ))}
      </div>
    ),
  });
};

const defaultChotHandler =
  (status: number) =>
  async (ids: string[]): Promise<ChotResult> => {
    await PhieuApi.chotNhieuPhieu(ids, status);
    return { successCount: ids.length, failures: [] };
  };

const ThongKePhieuCommon = ({
  maBmList,
  title,
  type,
  mabmDetailRoute = {},
  columns,
  filterFields,
  transformFilters = defaultTransformFilters,
  computeFixedFilters = defaultComputeFixedFilters,
  mergeFilters,
  persistKey = true,
  onChotPhieu,
  onHuyChotPhieu,
  renderExtraActions,
  onFilterFieldChange,
  rowClickToggleSelect = false,
  scrollX = 1100,
}: ThongKePhieuCommonProps) => {
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

  const fixedFilters = useMemo(
    () => computeFixedFilters(currentUserId),
    [computeFixedFilters, currentUserId],
  );

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [chotLoading, setChotLoading] = useState(false);

  const {
    data,
    loading,
    pagination,
    handleFilter,
    handleClearFilter,
    onPageChange,
    refetch,
  } = usePhieuSearchListHRC({
    maBmList,
    fixedFilters,
    transformFilters,
    persistKey: persistKey ? true : undefined,
  });

  const tableData = data as TableRecord[];

  const isAllSelected =
    tableData.length > 0 && tableData.every((r) => selectedKeys.has(r.idphieu));
  const isIndeterminate =
    !isAllSelected && tableData.some((r) => selectedKeys.has(r.idphieu));

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
      setSelectedKeys(
        checked ? new Set(tableData.map((r) => r.idphieu)) : new Set(),
      );
    },
    [tableData],
  );

  const handlePageChange = useCallback(
    (page: number, pageSize: number) => {
      setSelectedKeys(new Set());
      onPageChange(page, pageSize);
    },
    [onPageChange],
  );

  const runBatchAction = useCallback(
    (
      handler:
        | ((
            ids: string[],
            dataMap: Map<string, TableRecord>,
          ) => Promise<ChotResult>)
        | undefined,
      defaultHandler: (ids: string[]) => Promise<ChotResult>,
      action: "chốt" | "hủy chốt",
    ) => {
      if (selectedKeys.size === 0) return;
      Modal.confirm({
        title: `Xác nhận ${action} phiếu`,
        content: `Bạn có chắc muốn ${action} ${selectedKeys.size} phiếu đã chọn?`,
        okText: action === "chốt" ? "Chốt" : "Hủy chốt",
        okType: action === "chốt" ? "danger" : "primary",
        cancelText: action === "chốt" ? "Hủy" : "Đóng",
        onOk: async () => {
          try {
            setChotLoading(true);
            const dataMap = new Map(tableData.map((r) => [r.idphieu, r]));
            const ids = [...selectedKeys];
            const result = handler
              ? await handler(ids, dataMap)
              : await defaultHandler(ids);
            setSelectedKeys(new Set());
            refetch();
            showBatchResult(result.successCount, result.failures, action);
          } catch {
            message.error(
              `${action === "chốt" ? "Chốt" : "Hủy chốt"} phiếu thất bại. Vui lòng thử lại.`,
            );
          } finally {
            setChotLoading(false);
          }
        },
      });
    },
    [selectedKeys, tableData, refetch],
  );

  const handleChotPhieu = useCallback(
    () =>
      runBatchAction(
        onChotPhieu,
        defaultChotHandler(TrangThaiPhieuConst.DaChot),
        "chốt",
      ),
    [runBatchAction, onChotPhieu],
  );

  const handleHuyChotPhieu = useCallback(
    () =>
      runBatchAction(
        onHuyChotPhieu,
        defaultChotHandler(TrangThaiPhieuConst.HoanThanh),
        "hủy chốt",
      ),
    [runBatchAction, onHuyChotPhieu],
  );

  const selectedMaBm = useMemo(() => {
    if (selectedKeys.size === 0) return null;
    const dataMap = new Map(
      tableData.map((r) => [r.idphieu, r.maBm as string]),
    );
    const maBms = new Set(
      [...selectedKeys]
        .map((id) => dataMap.get(id))
        .filter(Boolean) as string[],
    );
    return maBms.size === 1 ? [...maBms][0] : null;
  }, [selectedKeys, tableData]);

  const businessColumns = useMemo(
    () =>
      columns ??
      buildDefaultColumns({
        mabmDetailRoute,
        type,
        navigate,
        rowClickToggleSelect,
      }),
    [columns, mabmDetailRoute, type, navigate, rowClickToggleSelect],
  );

  const tableColumns = useMemo<ColumnsType<TableRecord>>(
    () => [
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
        render: (_: unknown, record: TableRecord) => {
          const checkbox = (
            <Checkbox
              checked={selectedKeys.has(record.idphieu)}
              onChange={() => toggleSelect(record.idphieu)}
            />
          );
          return rowClickToggleSelect ? (
            <span onClick={(e) => e.stopPropagation()}>{checkbox}</span>
          ) : (
            checkbox
          );
        },
      },
      ...businessColumns,
    ],
    [
      isAllSelected,
      isIndeterminate,
      handleSelectAll,
      selectedKeys,
      toggleSelect,
      businessColumns,
      rowClickToggleSelect,
    ],
  );

  const effectiveFilterFields = filterFields ?? getDefaultFilterFields();
  const effectiveMergeFilters = {
    usercode: userObj?.maNV || "",
    ...mergeFilters,
  };

  return (
    <div>
      <PhieuFilterCard
        title={title}
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={effectiveFilterFields}
        mergeFilters={effectiveMergeFilters}
        showCreateButton={false}
        onCreateClick={() => {}}
        createButtonText=""
        storageKey={true}
        onFilterFieldChange={onFilterFieldChange}
      />
      <Card>
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            gap: 12,
            justifyContent: "flex-start",
          }}
        >
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
          {renderExtraActions?.({
            selectedKeys: [...selectedKeys],
            data: tableData,
            refetch,
            selectedMaBm,
          })}
        </div>
        <Table<TableRecord>
          columns={tableColumns}
          rowClassName={(record: TableRecord) =>
            (record.isCheck as number) === 1 ? "row-checked" : ""
          }
          dataSource={tableData}
          loading={loading}
          rowKey="idphieu"
          onRow={
            rowClickToggleSelect
              ? (record) => ({
                  onClick: () => toggleSelect(record.idphieu),
                  style: { cursor: "pointer" },
                })
              : undefined
          }
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: handlePageChange,
          }}
          scroll={{ x: scrollX }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell
                index={0}
                colSpan={tableColumns.length}
                align="right"
              >
                <span style={{ fontWeight: 500 }}>
                  Tổng: {pagination.total} Phiếu
                </span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default ThongKePhieuCommon;
