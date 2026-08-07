import { getPublicVehicles } from "@/lib/getPublicVehicles";
import { AutoBridgeApp } from "@/components/AutoBridgeApp";

export default async function Page() {
  const vehicles = await getPublicVehicles();
  return <AutoBridgeApp vehicles={vehicles} />;
}
