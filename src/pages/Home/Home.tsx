import { useSelector } from "react-redux";
import type { RootState } from "../../store";
// import EditableTable from '../../components/CustomTable';

// const schema: JSONSchema7 = {
//   title: "Demo Dynamic Form",
//   type: "object",
//   required: ["firstName"],
//   properties: {
//     firstName: { type: "string", title: "First name" },
//     age: { type: "number", title: "Age" },
//     friends: {
//       type: "array",
//       title: "Friends",
//       items: {
//         type: "object",
//         required: ["name"],
//         properties: {
//           name: { type: "string", title: "Friend Name" },
//           email: { type: "string", title: "Email" },
//         },
//       },
//     },
//   },
// };
// const uiSchema = {
//   name: {
//     "ui:placeholder": "Nhập họ và tên...",
//   },
//   age: {
//     "ui:widget": "updown", // widget spinner số thay vì input text
//     "ui:help": "Tuổi phải >= 18",
//   },
//   // email: {
//   //   "ui:widget": "email"    // input type="email"
//   // }
//   friends: {
//     items: {
//       email: {
//         "ui:widget": "email",
//       },
//     },
//   },
// };
// const sampleData = [
//   {
//     me: "M01",
//     mac: "CT3",
//     kichThuoc: "165x12M",
//     loaiI_TP: 56,
//     loaiI_BM: 2.57,
//     loaiII_TP: 50,
//     loaiII_BM: 2.46,
//     loaiIII_TP: 39,
//     loaiIII_BM: 1.88,
//     tongKhoi: 6.91,
//     ghiChu: "Đạt yêu cầu",
//   },
// ];
const HomePage = () => {
  const username = useSelector((state: RootState) => state.auth.username);
  // const dispatch = useDispatch()
  // const handleSubmit = (data: any) => {
  //   console.log("Form data:", data);
  // };
  return (
    <>
      <div>{username}</div>
      <h1 className="text-xl font-bold">Trang chủ </h1>
      {/* <EditableTable /> */}
      {/* <DynamicBM config={CTD_BB_Phoinguoi} /> */}

      {/* <DynamicBM config={CTD_BB_Phoinong} /> */}
      {/* <PdfMakeExample config={CTD_BB_Phoinong} /> */}
    </>
  );
};

export default HomePage;
