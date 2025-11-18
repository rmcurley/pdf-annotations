'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import type {
  Column,
  DataTableFilterActions,
  FilterStrategy,
  FiltersState,
} from '../core/types'
import type { Locale } from '../lib/i18n'
import { ActiveFilters, ActiveFiltersMobileContainer } from './active-filters'
import { FilterActions } from './filter-actions'
import { FilterSelector } from './filter-selector'

interface DataTableFilterProps<TData> {
  columns: Column<TData>[]
  filters: FiltersState
  actions: DataTableFilterActions
  strategy: FilterStrategy
  locale?: Locale
  layout?: "horizontal" | "stacked"
}

export function DataTableFilter<TData>({
  columns,
  filters,
  actions,
  strategy,
  locale = 'en',
  layout = "horizontal",
}: DataTableFilterProps<TData>) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex gap-1">
          <FilterSelector
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
          <FilterActions
            hasFilters={filters.length > 0}
            actions={actions}
            locale={locale}
          />
        </div>
        <ActiveFiltersMobileContainer>
          <ActiveFilters
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
        </ActiveFiltersMobileContainer>
      </div>
    )
  }

  if (layout === "stacked") {
    return (
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center gap-3">
          <FilterSelector
            columns={columns}
            filters={filters}
            actions={actions}
            strategy={strategy}
            locale={locale}
          />
          <FilterActions
            hasFilters={filters.length > 0}
            actions={actions}
            locale={locale}
          />
        </div>
        <ActiveFilters
          columns={columns}
          filters={filters}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      </div>
    )
  }

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex flex-1 items-center gap-3">
        <FilterSelector
          columns={columns}
          filters={filters}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
        <ActiveFilters
          columns={columns}
          filters={filters}
          actions={actions}
          strategy={strategy}
          locale={locale}
        />
      </div>
      <FilterActions
        hasFilters={filters.length > 0}
        actions={actions}
        locale={locale}
      />
    </div>
  )
}
