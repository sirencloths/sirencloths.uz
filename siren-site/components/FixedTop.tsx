import Header from "./Header";
import TopBar from "./TopBar";

type Props = {
  minimal?: boolean;
};

export default function FixedTop({ minimal = false }: Props) {
  return (
    <div className={`fixed-top${minimal ? " fixed-top--minimal" : ""}`}>
      {!minimal && <TopBar />}
      <Header />
    </div>
  );
}
