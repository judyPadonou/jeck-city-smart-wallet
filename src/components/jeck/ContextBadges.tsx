import { CityContext } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";
import { CloudRain, MapPin, Clock, Sparkles } from "lucide-react";

interface Props {
  context: CityContext;
}

export function ContextBadges({ context }: Props) {
  const theme = moodThemes[context.mood];
  return (
    <div className="flex flex-wrap gap-2">
      <Badge icon={<CloudRain className="h-3.5 w-3.5" />} className={theme.badge}>
        {context.weatherLabel}
      </Badge>
      <Badge icon={<Clock className="h-3.5 w-3.5" />} className="bg-secondary text-secondary-foreground">
        {context.timeLabel}
      </Badge>
      <Badge icon={<MapPin className="h-3.5 w-3.5" />} className="bg-secondary text-secondary-foreground">
        {context.locationLabel}
      </Badge>
      <Badge icon={<Sparkles className="h-3.5 w-3.5" />} className="bg-accent-soft text-accent">
        IA active
      </Badge>
    </div>
  );
}

function Badge({ icon, children, className = "" }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      {icon}
      {children}
    </span>
  );
}
