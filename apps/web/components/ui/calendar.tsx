'use client';

import * as React from 'react';
import { DayPicker, DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4 rounded-lg border', className)}
      weekStartsOn={1}
      modifiersClassNames={{
        selected: 'bg-primary text-primary-foreground hover:bg-primary/90',
        range_start: 'bg-primary text-primary-foreground',
        range_end: 'bg-primary text-primary-foreground',
        range_middle: '!bg-primary/10 !text-foreground',
        today: '!text-primary !font-bold',
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
