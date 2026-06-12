import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export function DateHeader() {
  const [now, setNow] = useState<Date | null>(null);

  // Set on client only to avoid SSR hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="h-9 w-44 rounded-lg bg-muted/40 animate-pulse" />;
  }

  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 px-3 card-hover">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline font-medium">{day},</span>
          <span className="font-semibold tabular-nums">{date}</span>
          <span className="hidden md:flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{time}</span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="p-3 border-b bg-gradient-to-br from-primary/10 to-transparent">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Today</div>
          <div className="text-lg font-semibold mt-0.5">{day}</div>
          <div className="text-sm text-muted-foreground">{date} · {time}</div>
        </div>
        <Calendar mode="single" selected={now} onSelect={() => {}} className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
