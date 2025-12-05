'use client'

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface MultiSelectComboboxProps {
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  options: { value: string; label: string }[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  disabled?: boolean
}

export function MultiSelectCombobox({
  label,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  emptyText = 'No items found.',
  options,
  selectedValues,
  onSelectionChange,
  disabled = false
}: MultiSelectComboboxProps) {
  const id = React.useId()
  const [open, setOpen] = React.useState(false)

  const toggleSelection = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onSelectionChange(newValues)
  }

  return (
    <div className='w-full space-y-2'>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant='outline'
            role='combobox'
            aria-expanded={open}
            disabled={disabled}
            className='h-10 w-full justify-between hover:bg-transparent'
          >
            <span className='truncate'>
              {selectedValues.length > 0 ? (
                <>
                  <Badge variant='outline' className='rounded-sm'>
                    {selectedValues.length}
                  </Badge>{' '}
                  selected
                </>
              ) : (
                <span className='text-muted-foreground'>{placeholder}</span>
              )}
            </span>
            <ChevronsUpDownIcon className='text-muted-foreground/80 shrink-0 ml-2' aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start' side='bottom' sideOffset={4}>
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleSelection(option.value)}
                  >
                    <span className='truncate'>{option.label}</span>
                    {selectedValues.includes(option.value) && <CheckIcon size={16} className='ml-auto' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
