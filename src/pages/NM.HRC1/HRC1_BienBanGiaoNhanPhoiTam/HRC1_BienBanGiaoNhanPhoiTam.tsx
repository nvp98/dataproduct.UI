import { useState, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import PhieuFilterCard, { type FilterFieldConfig } from "../../../components/PhieuFilterCard";
import type { SearchPhieuResponseModel } from "../../../models/Phieu";
import { PHIEU_STATUS_CONFIG } from "../../../utils/constants/TrangThaiPhieuDisplay";
import { usePhieuSearchListHRC } from "../../../hooks/usePhieuSearchListHRC";
import { BM_CONFIG } from "../../../utils/configs/BieuMauConst";
import { PhieuApi } from "../../../services/PhieuApi";

const MA_BM = BM_CONFIG.HRC1.HRC1_BBGN_PhoiTam as string;

type TableRecord = SearchPhieuResponseModel & {
  pheDuyet?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

// ── Modal tạo phiếu ───────────────────────────────────────────────────────────

interface TaoPhieuModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (idPhieu: string) => void;
}

const TaoPhieuModal = ({ open, onClose, onCreated }: TaoPhieuModalProps) => {
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [taoHaiCa, setTaoHaiCa] = useState(true);

  const handleOk = async () => {
    const values = await form.validateFields();
    const userInfoStr = localStorage.getItem("userinfo");
    const ui = userInfoStr ? JSON.parse(userInfoStr) : {};

    const ngaySX = dayjs(values.ngaySX).format("YYYY-MM-DD");

    const buildPayload = (ca: number) => ({
      maBm: MA_BM,
      NgaySX: ngaySX,
      ca: ca,
      nguoiTaoId: ui.iD_TaiKhoan ?? ui.ID_TaiKhoan ?? null,
      xuongId: ui.iD_PhanXuong ?? null,
      idphongBan: ui.iD_PhongBan ?? null,
      tinhTrang: 1,
      prefix: "BBGN_PhoiTam",
      pheDuyet: [],
    });

    try {
      setCreating(true);

      if (taoHaiCa) {
        // Tạo cả 2 ca song song
        const [res1, res2] = await Promise.all([
          PhieuApi.postData(buildPayload(1)),
          PhieuApi.postData(buildPayload(2)),
        ]);
        const soPhieu1 = (res1 as any)?.soPhieu ?? "Ca 1";
        const soPhieu2 = (res2 as any)?.soPhieu ?? "Ca 2";
        const idPhieu1 = (res1 as any)?.idphieu ?? (res1 as any)?.Idphieu;

        message.success(`Đã tạo phiếu: ${soPhieu1} và ${soPhieu2}`);
        form.resetFields();
        onCreated(idPhieu1);
      } else {
        const ca = values.ca as number;
        const res = await PhieuApi.postData(buildPayload(ca));
        const soPhieu = (res as any)?.soPhieu ?? "";
        const idPhieu = (res as any)?.idphieu ?? (res as any)?.Idphieu;

        message.success(`Đã tạo phiếu: ${soPhieu}`);
        form.resetFields();
        onCreated(idPhieu);
      }
    } catch (err: any) {
      message.error(err?.message ?? "Lỗi tạo phiếu");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Tạo phiếu BB giao nhận phôi tấm"
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={creating}
      okText="Tạo phiếu"
      cancelText="Hủy"
      width={420}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ ngaySX: dayjs(), ca: 1 }}
        style={{ marginTop: 12 }}
      >
        <Form.Item
          name="ngaySX"
          label="Ngày sản xuất"
          rules={[{ required: true, message: "Chọn ngày sản xuất" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 8 }}>
          <Checkbox
            checked={taoHaiCa}
            onChange={(e) => setTaoHaiCa(e.target.checked)}
          >
            Tạo cả 2 ca (Ca ngày + Ca đêm)
          </Checkbox>
        </Form.Item>

        {!taoHaiCa && (
          <Form.Item
            name="ca"
            label="Ca sản xuất"
            rules={[{ required: true, message: "Chọn ca" }]}
          >
            <Radio.Group>
              <Radio value={1}>Ca ngày (1)</Radio>
              <Radio value={2}>Ca đêm (2)</Radio>
            </Radio.Group>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

// ── Danh sách phiếu ───────────────────────────────────────────────────────────

const PhieuListView = ({ type }: { type?: "taoMoi" | "viecdentoi" | "xemphieu" }) => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem("user");
  const userObj = userStr ? JSON.parse(userStr) : {};
  const userInfoStr = localStorage.getItem("userinfo");
  const userInfoObj = userInfoStr ? JSON.parse(userInfoStr) : {};
  const isAdmin = userObj?.role?.includes("admin") || false;

  const currentUserId: number | null =
    userInfoObj?.iD_TaiKhoan ??
    userInfoObj?.ID_TaiKhoan ??
    userInfoObj?.idTaiKhoan ??
    userInfoObj?.IdTaiKhoan ??
    userObj?.iD_TaiKhoan ??
    userObj?.ID_TaiKhoan ??
    null;

  const fixedFilters = useMemo(
    () => ({
      userId: currentUserId,
      loaiVung: type === "xemphieu" ? 3 : type === "viecdentoi" ? 2 : 1,
    }),
    [currentUserId, type]
  );

  const { data, loading, pagination, handleFilter, handleClearFilter, onPageChange } =
    usePhieuSearchListHRC({ maBm: MA_BM, fixedFilters });

  // Modal tạo phiếu
  const [modalOpen, setModalOpen] = useState(false);

  const handleCreated = useCallback((idPhieu: string) => {
    setModalOpen(false);
    if (idPhieu) {
      navigate("/chitietbbgnphoitam_hrc1", { state: { idphieu: idPhieu } });
    }
  }, [navigate]);

  const statusConfig = PHIEU_STATUS_CONFIG;

  const columns = [
    {
      title: <b>Số Phiếu</b>,
      dataIndex: "soPhieu",
      key: "soPhieu",
      render: (text: string, record: TableRecord) => (
        <b
          style={{ color: "#1976d2", cursor: "pointer" }}
          onClick={() =>
            navigate("/chitietbbgnphoitam_hrc1", {
              state: { idphieu: record.idphieu, pheduyet: record?.pheDuyet?.[0] ?? null },
            })
          }
        >
          {text}
        </b>
      ),
      width: 250,
    },
    {
      title: "Ngày SX",
      dataIndex: "ngaySX",
      key: "ngaySX",
      width: 130,
      render: (value: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Ca",
      dataIndex: "ca",
      key: "ca",
      width: 100,
      render: (value: number) => (value === 1 ? "Ca Ngày" : "Ca Đêm"),
    },
    {
      title: "Kíp",
      dataIndex: "kip",
      key: "kip",
      width: 80,
      ellipsis: true,
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
      width: 130,
      render: (status: string) => (
        <Tag color={statusConfig[status]?.color || "default"}>
          {statusConfig[status]?.text || status}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 80,
      render: (_: unknown, record: TableRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() =>
              navigate("/chitietbbgnphoitam_hrc1", { state: { idphieu: record.idphieu } })
            }
          />
        </Space>
      ),
    },
  ];

  const filterFieldsConfig = useMemo(
    (): FilterFieldConfig[] => [
      { key: "soPhieu", label: "Số phiếu", type: "text", placeholder: "Số phiếu..." },
      { key: "ngaySX", label: "Ngày sản xuất", type: "dateRange", placeholder: "Khoảng ngày" },
      {
        key: "ca",
        label: "Ca",
        type: "select",
        options: [
          { label: "Ca ngày (1)", value: 1 },
          { label: "Ca đêm (2)", value: 2 },
        ],
      },
    ],
    []
  );

  return (
    <div>
      <PhieuFilterCard
        title="BB giao nhận phôi tấm HRC1"
        onFilter={handleFilter}
        onClearFilter={handleClearFilter}
        filterFields={filterFieldsConfig}
        mergeFilters={{ usercode: userObj?.maNV || "" }}
        showCreateButton={isAdmin}
        onCreateClick={() => setModalOpen(true)}
        createButtonText="Tạo phiếu mới"
      />
      <Card>
        <Table<TableRecord>
          columns={columns}
          dataSource={data as TableRecord[]}
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} phiếu`,
            onChange: onPageChange,
          }}
          scroll={{ x: 1000 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={7} align="right">
                <span style={{ fontWeight: 500 }}>Tổng: {pagination.total} Phiếu</span>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <TaoPhieuModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

// ── Entry component ───────────────────────────────────────────────────────────

const HRC1_BienBanGiaoNhanPhoiTam = ({ type }: { type?: string }) => {
  if (type === "viecdentoi" || type === "xemphieu") {
    return <PhieuListView type={type} />;
  }

  return <PhieuListView type="taoMoi" />;
};

export default HRC1_BienBanGiaoNhanPhoiTam;
