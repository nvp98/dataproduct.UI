/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button, Card, Space, Table, Tag, Tooltip, message } from "antd";
import { EyeOutlined, FileExcelOutlined, PlusOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import HRC1_BCSX_DPV from "../../../utils/BM_config/HRC1_BCSX_DPV.json";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import useRowSelection from "../../../hooks/useRowSelection";
import useCheckPhieu from "../../../hooks/useCheckPhieu";
import { PhieuApi } from "../../../services/PhieuApi";
import { DUONG_DAN_BCSX } from "./duongDan";

// Danh sách Biên bản chốt số liệu Xưởng ĐPV (BM.14/QT.05.11, MaBM HRC1_BCSX_DPV).
// type: undefined = việc tôi bắt đầu, "viecdentoi", "xemphieu".

const config = HRC1_BCSX_DPV as any;

const statusConfig: Record<string, { color: string; text: string }> = {
  0: { color: "purple", text: "Đang lưu" },
  1: { color: "pink", text: "Đã gửi" },
  2: { color: "blue", text: "Hoàn thành" },
  3: { color: "tomato", text: "Đã thu hồi" },
  4: { color: "yellow", text: "Không xác nhận" },
  5: { color: "green", text: "Chốt" },
  6: { color: "gray", text: "Đang phê duyệt" },
  7: { color: "orange", text: "Hiệu chỉnh" },
};

const approvalStatusConfig: Record<number, { color: string; text: string }> = {
  0: { color: "default", text: "Chưa xác nhận" },
  1: { color: "green", text: "Đã ký" },
  2: { color: "red", text: "Từ chối" },
};

type TableRecord = SearchPhieuResponseModel & { pheDuyet?: Array<Record<string, unknown>>; [key: string]: unknown };

const BCSXDPV = ({ type }: { type?: string }) => {
  const navigate = useNavigate();
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};
  const currentUserId: number | null = userInfoObj?.iD_TaiKhoan ?? userInfoObj?.ID_TaiKhoan ?? userInfoObj?.idTaiKhoan ?? null;

  const fixedFilters = useMemo(
    () => ({ userId: currentUserId, loaiVung: type === "xemphieu" ? 3 : type === "viecdentoi" ? 2 : 1 }),
    [currentUserId, type]
  );

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange, refetch } = usePhieuSearchListHRC({
    maBm: config.code as string,
    fixedFilters,
    persistKey: true,
  });

  const { selectedRowKeys, setSelectedRowKeys, checkboxColumn } = useRowSelection(data as any[]);
  const { checkLoading, handleCheckPhieu } = useCheckPhieu(selectedRowKeys, () => setSelectedRowKeys([]), refetch);

  // Khoảng ngày đang chọn ở bộ lọc → dùng cho Excel tổng hợp
  const [khoangNgay, setKhoangNgay] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const moPhieu = (record: TableRecord) => {
    const suaDuoc = record.tinhTrang === 0 || record.tinhTrang === 3 || record.tinhTrang === 7;
    navigate(`${!type && suaDuoc ? DUONG_DAN_BCSX.tao : DUONG_DAN_BCSX.chiTiet}/${record.idphieu}`);
  };

  const columns = [
    checkboxColumn,
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      width: 230,
      render: (text: string, record: TableRecord) => (
        <b style={{ color: "#1976d2", cursor: "pointer" }} onClick={() => moPhieu(record)}>
          {text}
        </b>
      ),
    },
    {
      title: "Ngày sản xuất",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 130,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Kỳ chốt",
      key: "ky",
      width: 230,
      render: (_: unknown, r: TableRecord) =>
        r.ngaySX
          ? `08h ${dayjs(r.ngaySX as string).format("DD/MM")} → 08h ${dayjs(r.ngaySX as string).add(1, "day").format("DD/MM/YYYY")}`
          : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "tinhTrang",
      key: "tinhTrang",
      width: 140,
      render: (status: string) => <Tag color={statusConfig[status]?.color || "default"}>{statusConfig[status]?.text || status}</Tag>,
    },
    ...config.signatures
      .slice()
      .sort((a: any, b: any) => a.capDuyet - b.capDuyet)
      .map((sig: any) => ({
        title: `${sig.label} (Cấp ${sig.capDuyet})`,
        key: `approval_${sig.capDuyet}`,
        width: 190,
        ellipsis: true,
        render: (_: unknown, record: TableRecord) => {
          const item = ((record.pheDuyet || []) as any[]).find((pd: any) => pd.capDuyet === sig.capDuyet);
          if (!item) return <Tag color="default">Chưa gán</Tag>;
          const st: number = item.tinhTrang ?? 0;
          const text = `${approvalStatusConfig[st]?.text || `Trạng thái ${st}`} - ${item.hoVaTen || "N/A"}`;
          return (
            <Tooltip title={text}>
              <Tag color={approvalStatusConfig[st]?.color || "default"}>
                <span style={{ display: "inline-block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {text}
                </span>
              </Tag>
            </Tooltip>
          );
        },
      })),
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: unknown, record: TableRecord) => (
        <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`${DUONG_DAN_BCSX.chiTiet}/${record.idphieu}`)} />
      ),
    },
  ];

  const filterFieldsConfig: FilterFieldConfig[] = [
    { key: "soPhieu", label: "Số phiếu", type: "text", placeholder: "Số phiếu..." },
    { key: "ngaySX", label: "Ngày sản xuất", type: "dateRange", placeholder: "Khoảng ngày" },
  ];

  const handleExportTongHop = async () => {
    const tu = khoangNgay?.[0] ?? dayjs().startOf("month");
    const den = khoangNgay?.[1] ?? dayjs();
    setExportLoading(true);
    try {
      const res = await PhieuApi.exportDynamicExcelTH({
        maBm: config.code,
        fromDate: tu.format("YYYY-MM-DD"),
        toDate: den.format("YYYY-MM-DD"),
      });
      const blob = new Blob([res as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BBChotSoLieu_DPV_TongHop_${tu.format("YYYYMMDD")}_${den.format("YYYYMMDD")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Không xuất được Excel tổng hợp.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div>
      <style>{`.row-checked td { background-color: #d9f7be !important; }`}</style>
      <PhieuFilterCard
        title={config.title}
        onFilter={handleFilter}
        onClearFilter={() => {
          setKhoangNgay(null);
          handleClearFilter();
        }}
        onFilterFieldChange={(key, value) => {
          if (key === "ngaySX") setKhoangNgay((value as [Dayjs | null, Dayjs | null] | null) ?? null);
        }}
        filterFields={filterFieldsConfig}
        mergeFilters={{}}
        selectedRowCount={selectedRowKeys.length}
        checkLoading={checkLoading}
        onCheckPhieu={handleCheckPhieu}
      />
      <Card
        extra={
          <Space>
            <Tooltip title="Gộp các phiếu theo khoảng Ngày sản xuất đang lọc (mặc định: đầu tháng → hôm nay)">
              <Button icon={<FileExcelOutlined />} loading={exportLoading} onClick={handleExportTongHop}>
                Excel tổng hợp
              </Button>
            </Tooltip>
            {!type && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(DUONG_DAN_BCSX.tao)}>
                Tạo phiếu mới
              </Button>
            )}
          </Space>
        }
      >
        <Table<TableRecord>
          rowKey="idphieu"
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
          rowClassName={(record: any) => (record.isCheck === 1 ? "row-checked" : "")}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: onPageChange,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>
    </div>
  );
};

export default BCSXDPV;
