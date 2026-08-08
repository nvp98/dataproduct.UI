export interface ThongKeHeaderColumn {
  dataIndex: string;
  title: string;
  width?: number;
  children?: ThongKeHeaderColumn[];
}

export const Header_TieuHaoLoThoi_HRC1: ThongKeHeaderColumn[] = [
  { dataIndex: "ngaySanXuat", title: "Ngày SX", width: 110 },
  { dataIndex: "ca", title: "Ca", width: 70 },
  { dataIndex: "scope", title: "Lò thổi", width: 90 },
  { dataIndex: "meThoi", title: "Mẻ thổi", width: 110 },
  { dataIndex: "macThep", title: "Mác thép", width: 110 },
  { dataIndex: "klGang", title: "Gang lỏng", width: 100 },
  { dataIndex: "klThepPhe", title: "Thép phế", width: 100 },
];

export const Header_TieuHaoTinhLuyen_LF_HRC1: ThongKeHeaderColumn[] = [
  { dataIndex: "ngaySanXuat", title: "Ngày SX", width: 110 },
  { dataIndex: "ca", title: "Ca", width: 70 },
  { dataIndex: "scope", title: "Tổ tinh luyện", width: 100 },
  { dataIndex: "meThoi", title: "Mẻ nấu", width: 110 },
  { dataIndex: "macThep", title: "Mác thép", width: 110 },
  { dataIndex: "klThepLong", title: "Thép lỏng", width: 100 },
];
