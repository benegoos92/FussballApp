interface Props {
  leagueSlug: string;
  height?: number;
  className?: string;
}

export default function FupaWidget({ leagueSlug, height = 520, className = "" }: Props) {
  // Direct fupa.net league standing page — works if fupa allows iframe embedding
  const directUrl = `https://www.fupa.net/league/${leagueSlug}/standing`;

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <iframe
        src={directUrl}
        width="100%"
        height={height}
        frameBorder="0"
        title="Ligatabelle – FuPa"
        className="block w-full"
      />
    </div>
  );
}
