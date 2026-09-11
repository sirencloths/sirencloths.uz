import MusicRoom from "@/components/MusicRoom";
import { getStorefrontRecords } from "@/lib/api";

export default async function RecordsPage() {
  const records = await getStorefrontRecords().catch(() => []);
  return <MusicRoom records={records} />;
}
