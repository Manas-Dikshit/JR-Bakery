"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-xl border bg-background p-4 shadow-sm",
        className
      )}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",

        month_caption:
          "flex items-center justify-center h-9 relative",

        caption_label:
          "text-sm font-medium",

        nav:
          "absolute inset-x-0 top-0 flex items-center justify-between",

        button_previous:
          "h-9 w-9",

        button_next:
          "h-9 w-9",

        weekdays:
          "flex",

        weekday:
          "flex-1 text-center text-muted-foreground text-xs",

        week:
          "flex w-full",

        day:
          "relative p-0 text-center",

        today:
          "bg-accent rounded-md",

        selected:
          "bg-primary text-primary-foreground",

        outside:
          "text-muted-foreground opacity-50",

        disabled:
          "opacity-30",

        hidden:
          "invisible",
      }}
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...props} />
          ) : (
            <ChevronRight className="h-4 w-4" {...props} />
          ),
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }