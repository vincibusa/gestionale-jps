"use client"

import * as React from "react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getTodayInItalianTimezone } from "@/lib/date-utils"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  availableDates?: string[]
  restrictToAvailable?: boolean
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Seleziona data",
  className,
  disabled = false,
  availableDates,
  restrictToAvailable = false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const today = getTodayInItalianTimezone()
  const isToday = date && format(date, "yyyy-MM-dd") === today

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Create a new date in local timezone to avoid timezone issues
      const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
      onSelect?.(localDate)
    } else {
      onSelect?.(undefined)
    }
    setOpen(false)
  }

  const handleTodayClick = () => {
    // Use the Italian timezone date for today
    const todayString = getTodayInItalianTimezone()
    const [year, month, day] = todayString.split('-').map(Number)
    const todayDate = new Date(year, month - 1, day) // month is 0-indexed
    onSelect?.(todayDate)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <span>
              {date ? format(date, "PPP", { locale: it }) : placeholder}
            </span>
            {isToday && (
              <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs">
                Oggi
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={handleTodayClick}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Oggi ({format(new Date(), "d MMMM", { locale: it })})
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={it}
          initialFocus
          disabled={restrictToAvailable && availableDates ? (date) => {
            const dateStr = format(date, "yyyy-MM-dd")
            return !availableDates.includes(dateStr)
          } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}

interface MonthYearPickerProps {
  year: number
  month: number
  onSelect?: (year: number, month: number) => void
  availableMonths?: Array<{ year: number; month: number; label: string }>
  className?: string
  disabled?: boolean
}

export function MonthYearPicker({
  year,
  month,
  onSelect,
  availableMonths,
  className,
  disabled = false
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false)
  const currentLabel = format(new Date(year, month - 1), "MMMM yyyy", { locale: it })
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1

  const handleSelect = (selectedYear: number, selectedMonth: number) => {
    onSelect?.(selectedYear, selectedMonth)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <div className="flex items-center justify-between w-full">
            <span className="capitalize">{currentLabel}</span>
            {isCurrentMonth && (
              <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs">
                Corrente
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="max-h-60 overflow-y-auto p-2">
          {availableMonths ? (
            availableMonths.map(({ year: availableYear, month: availableMonth, label }) => (
              <Button
                key={`${availableYear}-${availableMonth}`}
                variant={year === availableYear && month === availableMonth ? "default" : "ghost"}
                className="w-full justify-start mb-1 capitalize"
                onClick={() => handleSelect(availableYear, availableMonth)}
              >
                {label}
                {availableYear === new Date().getFullYear() && 
                 availableMonth === new Date().getMonth() + 1 && (
                  <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs">
                    Corrente
                  </Badge>
                )}
              </Button>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-4">
              Nessun mese disponibile
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}