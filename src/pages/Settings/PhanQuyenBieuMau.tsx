import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Space,
  Spin,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { BmQuyenXlApi } from "../../services/BmQuyenXlApi";
import { TaiKhoanApi } from "../../services/TaiKhoanService";
import { bmQuyenConfig } from "../../utils/configs/bmQuyenConfig";
import { isAdminUser } from "../../utils/helpers/checkAdminRole";

const ALL_KHU_VUC = "ALL";

interface SubRow {
  key: string;
  maKhuVucs: string[];
  quyenChucNangs: number[];
}

interface BmRow {
  key: string;
  maBm?: string;
  subRows: SubRow[];
  khuVucPhus: string[];
}

// ── helpers ────────────────────────────────────────────────────────────────

const getScopeOptions = (maBm?: string) => {
  const bm = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
  return [
    { value: ALL_KHU_VUC, label: "Tất cả" },
    ...(bm?.scope ?? []).map((s) => ({ value: s.maKhuVuc, label: s.tenKhuVuc })),
  ];
};

const getKhuVucPhuOptions = (maBm?: string) => {
  const bm = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
  return (bm?.khuVucPhus ?? []).map((k) => ({ value: k.khuVucPhu, label: k.tenKhuVuc }));
};

const hasKhuVucPhu = (maBm?: string) => {
  const bm = bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm);
  return (bm?.khuVucPhus?.length ?? 0) > 0;
};

const getBmName = (maBm: string) =>
  bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm)?.tenBm ?? maBm;

const getBmNhom = (maBm: string) =>
  bmQuyenConfig.danhSachBieuMau.find((b) => b.maBm === maBm)?.nhom ?? "";

const makeKey = () => Date.now().toString() + Math.random().toString(36).slice(2);
const makeSubRow = (): SubRow => ({ key: makeKey(), maKhuVucs: [], quyenChucNangs: [] });
const makeBmRow = (): BmRow => ({ key: makeKey(), subRows: [makeSubRow()], khuVucPhus: [] });

/**
 * Reconstruct BmRows từ danh sách flat records của một user.
 * Thuật toán:
 *  1. Group theo maBm
 *  2. Trong mỗi BM, group theo quyenChucNang → map kv list
 *  3. Merge những quyen có cùng tập KV → 1 SubRow
 */
function buildBmRowsFromRecords(records: any[]): BmRow[] {
  const byBm = new Map<string, any[]>();
  for (const rec of records) {
    const bm = rec.maBm ?? "";
    if (!byBm.has(bm)) byBm.set(bm, []);
    byBm.get(bm)!.push(rec);
  }

  return Array.from(byBm.entries()).map(([maBm, recs]) => {
    // quyen → danh sách KV có quyen đó
    const byQuyen = new Map<number, string[]>();
    for (const rec of recs) {
      const q = rec.quyenChucNang as number;
      const kv: string = rec.maKhuVuc ?? ALL_KHU_VUC;
      if (!byQuyen.has(q)) byQuyen.set(q, []);
      byQuyen.get(q)!.push(kv);
    }

    // Merge các quyen có cùng tập KV (sorted) vào 1 SubRow
    const byKvSet = new Map<string, { kvs: string[]; quyens: number[] }>();
    for (const [quyen, kvs] of byQuyen) {
      const kvsSorted = [...new Set(kvs)].sort();
      const key = kvsSorted.join("|");
      if (!byKvSet.has(key)) byKvSet.set(key, { kvs: kvsSorted, quyens: [] });
      byKvSet.get(key)!.quyens.push(quyen);
    }

    const subRows: SubRow[] = Array.from(byKvSet.values()).map(({ kvs, quyens }) => ({
      key: makeKey(),
      maKhuVucs: kvs,
      quyenChucNangs: quyens,
    }));

    const khuVucPhus = [...new Set(
      recs.map((r: any) => r.khuVucPhu).filter((k: any): k is string => !!k)
    )];

    return { key: makeKey(), maBm, subRows, khuVucPhus };
  });
}

// ── styles ─────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "4px 8px",
  textAlign: "left",
  color: "#8c8c8c",
  fontWeight: 400,
  fontSize: 13,
  borderBottom: "1px solid #f0f0f0",
};

const tdStyle: React.CSSProperties = { padding: "4px 8px", verticalAlign: "top" };

// ── component ──────────────────────────────────────────────────────────────

const PhanQuyenBieuMau = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserRecordIds, setEditingUserRecordIds] = useState<number[]>([]);
  const [form] = Form.useForm();
  const [bmRows, setBmRows] = useState<BmRow[]>([]);
  const [filterBmInModal, setFilterBmInModal] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterTaiKhoan, setFilterTaiKhoan] = useState<number | undefined>();

  useEffect(() => {
    const userStr = localStorage.getItem("userinfo");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await BmQuyenXlApi.getAll();
      const arr = Array.isArray(res) ? res : (res as any)?.data ?? [];
      setDataSource(arr);
    } catch {
      message.error("Không thể tải dữ liệu phân quyền");
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await TaiKhoanApi.getData();
      setUsers(Array.isArray(res) ? res : (res as any)?.data ?? []);
    } catch {
      message.error("Không thể tải danh sách tài khoản");
    }
  };

  useEffect(() => {
    loadData();
    loadUsers();
  }, []);

  // ── group dataSource theo user ─────────────────────────────────────────────

  const userRows = useMemo(() => {
    const byUser = new Map<number, any[]>();
    for (const item of dataSource) {
      const id = item.idTaiKhoan ?? item.IdTaiKhoan;
      if (id == null) continue;
      if (!byUser.has(id)) byUser.set(id, []);
      byUser.get(id)!.push(item);
    }
    return Array.from(byUser.entries()).map(([idTaiKhoan, records]) => ({
      idTaiKhoan,
      soLuong: records.length,
    }));
  }, [dataSource]);

  const filteredUserRows = useMemo(
    () =>
      filterTaiKhoan
        ? userRows.filter((r) => r.idTaiKhoan === filterTaiKhoan)
        : userRows,
    [userRows, filterTaiKhoan]
  );

  // ── BmRow helpers ──────────────────────────────────────────────────────────

  const addBmRow = () => {
    setFilterBmInModal(undefined);
    setBmRows((prev) => [...prev, makeBmRow()]);
  };

  const removeBmRow = (bmKey: string) =>
    setBmRows((prev) => prev.filter((r) => r.key !== bmKey));

  const updateBmRow = (bmKey: string, patch: Partial<BmRow>) =>
    setBmRows((prev) => prev.map((r) => (r.key === bmKey ? { ...r, ...patch } : r)));

  const addSubRow = (bmKey: string) =>
    setBmRows((prev) =>
      prev.map((r) => (r.key === bmKey ? { ...r, subRows: [...r.subRows, makeSubRow()] } : r))
    );

  const removeSubRow = (bmKey: string, subKey: string) =>
    setBmRows((prev) =>
      prev.map((r) => {
        if (r.key !== bmKey || r.subRows.length <= 1) return r;
        return { ...r, subRows: r.subRows.filter((s) => s.key !== subKey) };
      })
    );

  const updateSubRow = (bmKey: string, subKey: string, patch: Partial<SubRow>) =>
    setBmRows((prev) =>
      prev.map((r) =>
        r.key !== bmKey
          ? r
          : { ...r, subRows: r.subRows.map((s) => (s.key === subKey ? { ...s, ...patch } : s)) }
      )
    );

  const handleKhuVucChange = (bmKey: string, subKey: string, newValues: string[]) => {
    const prev =
      bmRows.find((r) => r.key === bmKey)?.subRows.find((s) => s.key === subKey)?.maKhuVucs ?? [];
    let result = newValues;
    if (newValues.includes(ALL_KHU_VUC) && newValues.length > 1) {
      result = !prev.includes(ALL_KHU_VUC)
        ? [ALL_KHU_VUC]
        : newValues.filter((v) => v !== ALL_KHU_VUC);
    }
    updateSubRow(bmKey, subKey, { maKhuVucs: result });
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUserRecordIds([]);
    form.resetFields();
    setBmRows([makeBmRow()]);
    setFilterBmInModal(undefined);
    setModalOpen(true);
  };

  const handleEdit = async (idTaiKhoan: number) => {
    setIsEditing(true);
    setFilterBmInModal(undefined);
    form.setFieldsValue({ idTaiKhoan });
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await BmQuyenXlApi.getByTaiKhoan(idTaiKhoan);
      const records: any[] = Array.isArray(res) ? res : (res as any)?.data ?? [];
      const ids = records.map((r: any) => r.id ?? r.Id).filter(Boolean);
      setEditingUserRecordIds(ids);
      setBmRows(buildBmRowsFromRecords(records));
    } catch {
      message.error("Không thể tải dữ liệu quyền của tài khoản");
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setIsEditing(false);
    setEditingUserRecordIds([]);
    form.resetFields();
    setBmRows([]);
    setFilterBmInModal(undefined);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      await form.validateFields();
      const invalid = bmRows.some(
        (bmRow) =>
          !bmRow.maBm ||
          bmRow.subRows.some((s) => s.maKhuVucs.length === 0 || s.quyenChucNangs.length === 0)
      );
      if (invalid) {
        message.warning("Vui lòng điền đủ thông tin cho tất cả các biểu mẫu");
        return;
      }

      const { idTaiKhoan } = form.getFieldsValue();
      await BmQuyenXlApi.bulkSave({
        idTaiKhoan,
        idsToDelete: editingUserRecordIds,
        items: bmRows.flatMap((bmRow) =>
          bmRow.subRows.map((subRow) => ({
            maBm: bmRow.maBm!,
            maKhuVucs: subRow.maKhuVucs,
            quyenChucNangs: subRow.quyenChucNangs,
            khuVucPhus: bmRow.khuVucPhus,
          }))
        ),
      });

      message.success(isEditing ? "Cập nhật quyền thành công" : "Thêm quyền thành công");
      closeModal();
      loadData();
    } catch (err: any) {
      message.error(err?.response?.data ?? "Có lỗi xảy ra");
    }
  };

  // ── Delete toàn bộ quyền của user ─────────────────────────────────────────

  const handleDeleteUser = async (idTaiKhoan: number) => {
    if (!isAdminUser(currentUser)) {
      message.error("Bạn không có quyền thực hiện thao tác này");
      return;
    }
    try {
      await BmQuyenXlApi.deleteByTaiKhoan(idTaiKhoan);
      message.success("Đã xóa toàn bộ quyền của tài khoản");
      loadData();
    } catch {
      message.error("Không thể xóa quyền");
    }
  };

  // ── Modal search options ───────────────────────────────────────────────────

  const modalBmSearchOptions = useMemo(
    () =>
      bmRows
        .filter((r) => !!r.maBm)
        .map((r) => ({
          value: r.maBm!,
          label: `[${getBmNhom(r.maBm!)}] ${getBmName(r.maBm!)}`,
        })),
    [bmRows]
  );

  const visibleBmRows = useMemo(
    () => (filterBmInModal ? bmRows.filter((r) => r.maBm === filterBmInModal) : bmRows),
    [bmRows, filterBmInModal]
  );

  // Hiện cột Khu vực phụ khi có ít nhất 1 biểu mẫu trong danh sách có cấu hình khuVucPhus
  const showKhuVucPhuCol = useMemo(
    () => bmRows.some((r) => hasKhuVucPhu(r.maBm)),
    [bmRows]
  );

  // ── Main table columns ─────────────────────────────────────────────────────

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      title: "Tài khoản",
      dataIndex: "idTaiKhoan",
      key: "idTaiKhoan",
      render: (id: number) => {
        const u = users.find((u) => u.iD_TaiKhoan === id);
        return u ? `${u.tenTaiKhoan} - ${u.hoVaTen}` : id;
      },
    },
    {
      title: "Số quyền",
      dataIndex: "soLuong",
      key: "soLuong",
      width: 110,
      render: (n: number) => `${n} quyền`,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.idTaiKhoan)}
            title="Xem / chỉnh sửa quyền"
          />
          <Popconfirm
            title="Xóa toàn bộ quyền của tài khoản này?"
            onConfirm={() => handleDeleteUser(record.idTaiKhoan)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Main table */}
      <Card
        title="Phân quyền xử lý biểu mẫu"
        extra={
          <Space>
            <Select
              placeholder="Lọc theo tài khoản"
              allowClear
              style={{ width: 260 }}
              value={filterTaiKhoan}
              onChange={setFilterTaiKhoan}
              showSearch
              optionFilterProp="label"
              filterOption={(input, opt) =>
                (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={users.map((u) => ({
                value: u.iD_TaiKhoan,
                label: `${u.tenTaiKhoan} - ${u.hoVaTen}`,
              }))}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm quyền
            </Button>
          </Space>
        }
      >
        <Table
          loading={loading}
          dataSource={filteredUserRows}
          columns={columns}
          rowKey="idTaiKhoan"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (t) => `Tổng: ${t} tài khoản`,
          }}
        />
      </Card>

      {/* Modal thêm / sửa */}
      <Modal
        title={isEditing ? "Cập nhật quyền xử lý" : "Thêm quyền xử lý"}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        okText={isEditing ? "Cập nhật" : "Thêm"}
        cancelText="Hủy"
        width="90vw"
        style={{ maxWidth: 1400 }}
        destroyOnClose
        okButtonProps={{ disabled: modalLoading }}
      >
        <Spin spinning={modalLoading}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="idTaiKhoan"
              label="Tài khoản"
              rules={[{ required: true, message: "Vui lòng chọn tài khoản" }]}
            >
              <Select
                showSearch
                placeholder="Chọn tài khoản"
                optionFilterProp="label"
                disabled={isEditing}
                filterOption={(input, opt) =>
                  (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={users.map((u) => ({
                  value: u.iD_TaiKhoan,
                  label: `${u.tenTaiKhoan} - ${u.hoVaTen}`,
                }))}
              />
            </Form.Item>
          </Form>

          {/* Tìm nhanh biểu mẫu trong modal */}
          {bmRows.some((r) => r.maBm) && (
            <div style={{ marginBottom: 8 }}>
              <Select
                allowClear
                showSearch
                style={{ width: "100%" }}
                placeholder="Tìm nhanh biểu mẫu trong danh sách..."
                value={filterBmInModal}
                onChange={setFilterBmInModal}
                optionFilterProp="label"
                options={modalBmSearchOptions}
              />
            </div>
          )}

          {/* Bảng phân quyền */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: showKhuVucPhuCol ? "25%" : "30%" }}>Biểu mẫu</th>
                {showKhuVucPhuCol && <th style={{ ...thStyle, width: "18%" }}>Khu vực phụ</th>}
                <th style={{ ...thStyle, width: showKhuVucPhuCol ? "25%" : "34%" }}>Khu vực</th>
                <th style={{ ...thStyle, width: showKhuVucPhuCol ? "20%" : "24%" }}>Quyền chức năng</th>
                <th style={{ ...thStyle, width: "12%" }} />
              </tr>
            </thead>
            <tbody>
              {visibleBmRows.flatMap((bmRow) =>
                bmRow.subRows.map((subRow, subIdx) => (
                  <tr
                    key={subRow.key}
                    style={
                      subIdx === 0 && bmRows.indexOf(bmRow) > 0
                        ? { borderTop: "2px solid #f0f0f0" }
                        : undefined
                    }
                  >
                    {subIdx === 0 && (
                      <td
                        rowSpan={bmRow.subRows.length}
                        style={{ ...tdStyle, borderRight: "1px solid #f0f0f0" }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Select
                            style={{ flex: 1, minWidth: 0 }}
                            placeholder="Chọn biểu mẫu"
                            showSearch
                            optionFilterProp="label"
                            value={bmRow.maBm}
                            onChange={(v) => updateBmRow(bmRow.key, { maBm: v, khuVucPhus: [] })}
                            options={bmQuyenConfig.danhSachBieuMau.map((bm) => ({
                              value: bm.maBm,
                              label: `[${bm.nhom}] ${bm.tenBm}`,
                            }))}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeBmRow(bmRow.key)}
                            title="Xóa biểu mẫu này"
                          />
                        </div>
                      </td>
                    )}

                    {subIdx === 0 && showKhuVucPhuCol && (
                      <td
                        rowSpan={bmRow.subRows.length}
                        style={{ ...tdStyle, borderRight: "1px solid #f0f0f0" }}
                      >
                        {hasKhuVucPhu(bmRow.maBm) && (
                          <Select
                            mode="multiple"
                            style={{ width: "100%" }}
                            placeholder="Chọn khu vực phụ"
                            value={bmRow.khuVucPhus}
                            options={getKhuVucPhuOptions(bmRow.maBm)}
                            onChange={(vals) => updateBmRow(bmRow.key, { khuVucPhus: vals })}
                          />
                        )}
                      </td>
                    )}

                    <td style={tdStyle}>
                      <Select
                        mode="multiple"
                        style={{ width: "100%" }}
                        placeholder={bmRow.maBm ? "Chọn khu vực" : "Chọn biểu mẫu trước"}
                        disabled={!bmRow.maBm}
                        value={subRow.maKhuVucs}
                        options={getScopeOptions(bmRow.maBm)}
                        onChange={(vals) => handleKhuVucChange(bmRow.key, subRow.key, vals)}
                      />
                    </td>

                    <td style={tdStyle}>
                      <Select
                        mode="multiple"
                        style={{ width: "100%" }}
                        placeholder="Chọn quyền"
                        value={subRow.quyenChucNangs}
                        onChange={(vals) =>
                          updateSubRow(bmRow.key, subRow.key, { quyenChucNangs: vals })
                        }
                        options={bmQuyenConfig.danhSachQuyenChucNang}
                      />
                    </td>

                    <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                      {subIdx === 0 && (
                        <Button
                          type="text"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addSubRow(bmRow.key)}
                          title="Thêm quyền con"
                        />
                      )}
                      {bmRow.subRows.length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MinusCircleOutlined />}
                          onClick={() => removeSubRow(bmRow.key, subRow.key)}
                          title="Xóa dòng quyền này"
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addBmRow}
            style={{ width: "100%" }}
          >
            Thêm biểu mẫu
          </Button>
        </Spin>
      </Modal>
    </div>
  );
};

export default PhanQuyenBieuMau;
