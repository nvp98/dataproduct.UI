import { Table } from "antd";
import type { TableColumnsType } from "antd";
import type { HTMLAttributes } from "react";
import type { HRC1_MeThepVm } from "../../../../services/HRC1_BBGNApi";

interface MeThepTableProps {
  columns: TableColumnsType<HRC1_MeThepVm>;
  dataSource: HRC1_MeThepVm[];
  rowKey?: string | ((r: HRC1_MeThepVm) => string);
  scrollX?: number;
  onRow?: (r: HRC1_MeThepVm) => HTMLAttributes<HTMLElement>;
}

const MeThepTable = ({
  columns,
  dataSource,
  rowKey = "id",
  scrollX = 1200,
  onRow,
}: MeThepTableProps) => (
  <Table
    columns={columns}
    dataSource={dataSource}
    rowKey={rowKey}
    size="small"
    scroll={{ x: scrollX }}
    pagination={false}
    onRow={onRow}
  />
);

export default MeThepTable;
