/* eslint-disable @typescript-eslint/no-explicit-any */
import LG_BB_NapLieuLoCao from "../../../utils/BM_config/LG_BB_NapLieuLoCao.json";
import { Button, Card, Space, Table, Tag, Tooltip } from "antd";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import PhieuFilterCard, {
  type FilterFieldConfig,
} from "../../../components/PhieuFilterCard";
import { useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { usePhieuSearchList } from "../../../hooks/usePhieuSearchList";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import useRowSelection from "../../../hooks/useRowSelection";
import useCheckPhieu from "../../../hooks/useCheckPhieu";

const NapLieuLoCao = ({ type }: { type?: string }) => {
  const config = LG_BB_NapLieuLoCao as any;
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};

  const fixedFilters = useMemo(
    () => ({ usercode: userObj?.maNV || "" }),
    [userObj?.maNV]
  );

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange, refetch } =
    usePhieuSearchList({
      maBm: config.code as string,
      fixedFilters,
    });

  const { selectedRowKeys, setSelectedRowKeys, checkboxColumn } = useRowSelection(data as any[]);
  const { checkLoading, handleCheckPhieu } = useCheckPhieu(selectedRowKeys, () => setSelectedRowKeys([]), refetch);

  const statusConfig: Record<string, { color: string; text: string }> = {
    0: { color: "purple", text: "Đang lưu" },
    1: { color: "pink", text: "Đã gửi" },
    2: { color: "blue", text: "Hoàn thành" },
    3: { color: "tomato", text: "Đã thu hồi" },
    4: { color: "yellow", text: "Không xác nhận" },
    5: { color: "green", text: "Chốt" },
    6: { color: "gray", text: "Đang phê duyệt" },
  };

  const approvalStatusConfig: Record<number, { color: string; text: string }> = {
    0: { color: "default", text: "Chưa xác nhận" },
    1: { color: "green", text: "Đã ký" },
    2: { color: "red", text: "Từ chối" },
  };

  type TableRecord = SearchPhieuResponseModel & {
    pheDuyet?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

  const columns = [
    checkboxColumn,
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() => {
            if (type === "viecdentoi") {
              return navigate(`/chitietbienbannaplieulocao/${record.idphieu}`);
            }

            if (record.tinhTrang === 0 || record.tinhTrang === 3 || record.tinhTrang === 7) {
              return navigate(`/taophieubienbannaplieulocao/${record.idphieu}`);
            }

            return navigate(`/chitietbienbannaplieulocao/${record.idphieu}`);
          }}
        >
          {text}
        </b>
      ),
      width: 250,
    },
    {
      title: "Quy trình",
      dataIndex: "maBm",
      key: "maBm",
      width: 220,
      ellipsis: true,
    },
    {
      title: "Lò cao",
      dataIndex: "scope",
      key: "scope",
      width: 120,
      render: (value: number | string) => (value ? `Lò Cao ${value}` : "-"),
    },
    {
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 190,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 150,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    // Cột động phê duyệt từng cấp
    ...config.signatures
      .filter((sig: any) => sig.capDuyet >= 0)
      .sort((a: any, b: any) => a.capDuyet - b.capDuyet)
      .map((sig: any) => ({
        title: `${sig.label} (Cấp ${sig.capDuyet})`,
        key: `approval_${sig.capDuyet}`,
        width: 180,
        ellipsis: true,
        render: (_: unknown, record: TableRecord) => {
          const pheDuyet = record.pheDuyet || [];
          const approvalItem = (pheDuyet as any[]).find(
            (pd: any) => pd.capDuyet === sig.capDuyet,
          );
          if (!approvalItem) return <Tag color="default">Chưa gán</Tag>;
          const status: number = approvalItem.tinhTrang ?? 0;
          const statusText = approvalStatusConfig[status]?.text || `Trạng thái ${status}`;
          const fullText = `${statusText}-${approvalItem.hoVaTen || "N/A"}`;
          return (
            <Tooltip title={fullText}>
              <Tag color={approvalStatusConfig[status]?.color || "default"}>
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: 150,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fullText}
                </span>
              </Tag>
            </Tooltip>
          );
        },
      })),
    {
        title: "Thao tác",
        key: "action",
        width: 90,
        render: (_: unknown, record: TableRecord) => (
          <Space>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/chitietbienbannaplieulocao/${record.idphieu}`)}
            />
          </Space>
        ),
      },
  ];

  const filterFieldsConfig: FilterFieldConfig[] = [
    {
      key: "soPhieu",
      label: "Số phiếu",
      type: "text",
      placeholder: "Số phiếu...",
    },
    {
      key: "ngaySX",
      label: "Ngày sản xuất",
      type: "dateRange",
      placeholder: "Khoảng ngày",
    },
    {
      key: "kip",
      label: "Kíp",
      type: "select",
      placeholder: "Chọn kíp",
      options: [
        { label: "Kíp A", value: "A" },
        { label: "Kíp B", value: "B" },
        { label: "Kíp C", value: "C" },
      ],
    },
    {
      key: "scope",
      label: "Lò cao",
      type: "select",
      placeholder: "Chọn lò cao",
      options: [
        { label: "Lò Cao 1", value: 1 },
        { label: "Lò Cao 2", value: 2 },
        { label: "Lò Cao 3", value: 3 },
        { label: "Lò Cao 4", value: 4 },
        { label: "Lò Cao 5", value: 5 },
        { label: "Lò Cao 6", value: 6 },
      ],
    },
  ];

  return (
    <div>
      <style>{`.row-checked td { background-color: #d9f7be !important; }`}</style>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        selectedRowCount={selectedRowKeys.length}
        checkLoading={checkLoading}
        onCheckPhieu={handleCheckPhieu}
      />
      <Card
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate("/taophieubienbannaplieulocao")}
            >
              Tạo phiếu mới
            </Button>
          </Space>
        }
      >
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
          rowClassName={(record: any) => record.isCheck === 1 ? "row-checked" : ""}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: onPageChange,
          }}
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={9} align="right">
                <span style={{ fontWeight: 500 }}>Tổng: {pagination.total} Phiếu</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </div>
  );
};

export default NapLieuLoCao;
