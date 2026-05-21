"use client";
import Script from "next/script";

interface Props {
  widgetId: string;
  type?: "table" | "schedule" | "team";
  title?: string;
}

export default function FussballDeWidget({ widgetId, type = "table", title }: Props) {
  return (
    <div>
      {title && <h3 className="font-bold text-gray-800 mb-3">{title}</h3>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div
          className="soccer_widget"
          data-id={widgetId}
          data-type={type}
        />
        <Script
          src="https://next.fussball.de/widget"
          strategy="afterInteractive"
        />
      </div>
    </div>
  );
}
