import GiaoNhanThepLongList from "../../../components/BBGN_ThepLong/GiaoNhanThepLongList";

const GiaoNhanThepLong = ({ type }: { type?: string }) => {
  return (
    <GiaoNhanThepLongList
      bieuMau="HRC1_BBGN_ThepLong"
      type={type}
      routeDetail="/chitietgiaonhantheplong_hrc1"
      routeCreate="/taophieugiaonhantheplong_hrc1"
    />
  );
};

export default GiaoNhanThepLong;
