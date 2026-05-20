import TabNav from "@/components/TabNav";
import EventForm from "@/components/EventForm";

export default function TerminErstellenPage() {
  return (
    <div>
      <TabNav />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-5">Neuen Termin erstellen</h2>
        <EventForm />
      </div>
    </div>
  );
}
