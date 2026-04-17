export interface ThongKeHeaderColumn {
  dataIndex: string;
  title: string;
  width?: number;
  children?: ThongKeHeaderColumn[];
}

export const Header_TieuHaoLoThoi_HRC1: ThongKeHeaderColumn[] = [
  { dataIndex: "ngaySx", title: "Ngày", width: 120 },
  { dataIndex: "ca", title: "Ca", width: 80 },
  { dataIndex: "kip", title: "Kíp", width: 80 },
  { dataIndex: "meThoi", title: "Mẻ thổi", width: 100 },
  { dataIndex: "macThep", title: "Mác thép", width: 120 },
  { dataIndex: "klGangLong", title: "Gang lỏng", width: 90 },
  { dataIndex: "klThepPhe", title: "Thép phế", width: 90 },
];
