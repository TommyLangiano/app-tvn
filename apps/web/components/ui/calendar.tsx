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
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
