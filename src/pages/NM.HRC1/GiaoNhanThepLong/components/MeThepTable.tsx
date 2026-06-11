import { Table } from "antd";
import type { TableColumnsType } from "antd";
import type { HTMLAttributes, ReactNode } from "react";
import type { HRC1_MeThepVm } from "../../../../services/HRC1_BBGNApi";

interface MeThepTableProps {
  columns: TableColumnsType<HRC1_MeThepVm>;
  dataSource: HRC1_MeThepVm[];
  rowKey?: string | ((r: HRC1_MeThepVm) => string);
  scrollX?: number;
  scrollY?: number | string;
  onRow?: (r: HRC1_MeThepVm) => HTMLAttributes<HTMLElement>;
  summary?: (pageData: readonly HRC1_MeThepVm[]) => ReactNode;
}

const MeThepTable = ({
  columns,
  dataSource,
  rowKey = "id",
  scrollX = 1200,
  scrollY,
  onRow,
  summary,
}: MeThepTableProps) => (
  <Table
    columns={columns}
    dataSource={dataSource}
    rowKey={rowKey}
    size="small"
    scroll={{ x: scrollX, y: scrollY }}
    pagination={false}
    onRow={onRow}
    summary={summary}
  />
);

export default MeThepTable;
