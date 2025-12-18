"use client"

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "size"
  > {
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
  thumbColor?: string;
  trackColor?: string;
  animation?: "smooth" | "bounce" | "slide";
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      onCheckedChange,
      checked,
      defaultChecked,
      size = "md",
      thumbColor,
      trackColor,
      animation = "smooth",
      ...props
    },
    ref
  ) => {
    // Manages the internal checked state of the switch
    const [isChecked, setIsChecked] = React.useState(
      checked !== undefined ? checked : defaultChecked || false
    );

    // Synchronizes internal state with external 'checked' prop for controlled components
    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    // Defines Tailwind CSS classes for different switch sizes
    const sizeClasses = {
      sm: {
        track: "h-4 w-8",
        thumb: "h-3 w-3",
        translate: "translate-x-4",
      },
      md: {
        track: "h-6 w-11",
        thumb: "h-5 w-5",
        translate: "translate-x-5",
      },
      lg: {
        track: "h-8 w-14",
        thumb: "h-7 w-7",
        translate: "translate-x-6",
      },
    };

    // Defines Tailwind CSS classes for different animation types
    const animationClasses = {
      smooth: { transition: "transition-transform duration-200 ease-in-out" },
      bounce: { transition: "transition-transform duration-300 ease-in-out" },
      slide: { transition: "transition-all duration-300 ease-out" },
    };

    // Handles changes from the hidden native checkbox input
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = event.target.checked;
      // Only update internal state if the component is uncontrolled
      if (checked === undefined) {
        setIsChecked(newChecked);
      }
      // Call the external onCheckedChange handler
      onCheckedChange?.(newChecked);
    };

    // Handles clicks on the main div, simulating checkbox behavior
    const handleClick = () => {
      if (!props.disabled) {
        const newChecked = !isChecked;
        // Only update internal state if the component is uncontrolled
        if (checked === undefined) {
          setIsChecked(newChecked);
        }
        // Call the external onCheckedChange handler
        onCheckedChange?.(newChecked);
      }
    };

    // Apply custom track color dynamically based on isChecked state
    const customTrackStyle = trackColor
      ? { backgroundColor: isChecked ? trackColor : undefined }
      : {};

    // Apply custom thumb color if provided
    const customThumbStyle = thumbColor ? { backgroundColor: thumbColor } : {};

    return (
      <div
        className={cn(
          "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 shadow-sm",
          // Default background colors for the track based on checked state
          isChecked ? "bg-primary" : "bg-gray-300",
          // Apply size-specific track dimensions
          sizeClasses[size].track,
          className
        )}
        style={customTrackStyle}
        onClick={handleClick}
        role="switch"
        aria-checked={isChecked}
      >
        {/* Hidden native checkbox to handle form submissions and accessibility */}
        <input
          type="checkbox"
          className="absolute h-0 w-0 opacity-0"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          aria-hidden="true"
          {...props}
        />
        {/* The thumb element that visually moves */}
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-background shadow-lg ring-0",
            // Apply translation based on checked state using Tailwind classes
            isChecked ? sizeClasses[size].translate : "translate-x-0",
            // Apply size-specific thumb dimensions
            sizeClasses[size].thumb,
            // Apply animation class based on chosen animation type
            animationClasses[animation].transition
          )}
          style={customThumbStyle}
        />
      </div>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
