import { supabase } from "@/lib/supabase";
import TabNav from "@/components/TabNav";
import SpielerClient from "./SpielerClient";
export const revalidate = 0;
export default async function SpielerPage() {
  const { data: players } = await supabase.from("players").select("*").order("name");
  return <div><TabNav /><SpielerClient players={players ?? []} /></div>;
}
