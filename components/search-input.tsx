"use client"

import * as React from "react"
import { CircleX, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: string
  onValueChange: (value: string) => void
  wrapperClassName?: string
  clearButtonLabel?: string
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      placeholder = "Search...",
      wrapperClassName,
      className,
      clearButtonLabel = "Clear search",
      type = "search",
      ...props
    },
    ref,
  ) {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type={type}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className={cn(
            "pl-9 pr-9 text-sm placeholder:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            className,
          )}
          {...props}
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => onValueChange("")}
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/70"
          >
            <span className="sr-only">{clearButtonLabel}</span>
            <CircleX aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    )
  },
)
