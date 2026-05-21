interface Props {
  leagueSlug: string;
  height?: number;
  className?: string;
}

export default function FupaWidget({ leagueSlug, height = 500, className = "" }: Props) {
  const widgetUrl =
    `https://www.fupa.net/fupa/widget.php?p=iframe_widget&typ=liga&value_id=${leagueSlug}&start=tabelle&header=0&navi=0`;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <iframe
        src={widgetUrl}
        width="100%"
        height={height}
        frameBorder="0"
        scrolling="no"
        title="Ligatabelle – FuPa"
        className="block w-full"
      />
    </div>
  );
}
