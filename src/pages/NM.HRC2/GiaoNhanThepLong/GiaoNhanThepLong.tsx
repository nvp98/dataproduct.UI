import GiaoNhanThepLongList from "../../../components/BBGN_ThepLong/GiaoNhanThepLongList";

const GiaoNhanThepLong = ({ type }: { type?: string }) => {
  return <GiaoNhanThepLongList bieuMau="HRC2_BBGN_ThepLong" type={type} />;
};

export default GiaoNhanThepLong;
