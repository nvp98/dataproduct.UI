import { DynamicForm } from "../../components/DynamicFormCustom";

const DemoFormPage = () => {
  const formDefinition = {
    formCode: "PHIEU_CA_SX",
    fields: [
      {
        key: "shiftCode",
        label: "Ca",
        type: "select",
        options: ["1A", "2A", "3A"],
      },
      {
        key: "machineList",
        label: "Danh sách máy",
        type: "table",
        dataSource: {
          type: "api",
          url: "https://localhost:44387/api/MockDatas/machines",
          params: { shiftCode: "@shiftCode" },
        },
        columns: [
          { key: "machineCode", label: "Mã máy", type: "text" },
          { key: "machineName", label: "Tên máy", type: "text" },
          { key: "outputQty", label: "Sản lượng", type: "number" },
        ],
      },
    ],
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Demo Phiếu Ca Sản Xuất</h2>
      <DynamicForm
        formDefinition={formDefinition}
        onSubmit={(data: any) => console.log(data)}
      />
    </div>
  );
};

export default DemoFormPage;
