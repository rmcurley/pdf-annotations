"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

interface ChartDataPoint {
  date: string
  total: number
  approved: number
}

interface ChartAreaInteractiveProps {
  data?: ChartDataPoint[]
}

const defaultChartData: ChartDataPoint[] = [
  { date: "2024-04-01", approved: 150, total: 222 },
  { date: "2024-04-02", approved: 97, total: 180 },
  { date: "2024-04-03", approved: 120, total: 167 },
  { date: "2024-04-04", approved: 242, total: 260 },
  { date: "2024-04-05", approved: 290, total: 373 },
  { date: "2024-04-06", approved: 301, total: 340 },
  { date: "2024-04-07", approved: 180, total: 245 },
  { date: "2024-04-08", approved: 320, total: 409 },
  { date: "2024-04-09", approved: 59, total: 110 },
  { date: "2024-04-10", approved: 190, total: 261 },
  { date: "2024-04-11", approved: 327, total: 350 },
  { date: "2024-04-12", approved: 210, total: 292 },
  { date: "2024-04-13", approved: 342, total: 380 },
  { date: "2024-04-14", approved: 137, total: 220 },
  { date: "2024-04-15", approved: 120, total: 170 },
  { date: "2024-04-16", approved: 138, total: 190 },
  { date: "2024-04-17", approved: 360, total: 446 },
  { date: "2024-04-18", approved: 364, total: 410 },
  { date: "2024-04-19", approved: 180, total: 243 },
  { date: "2024-04-20", approved: 89, total: 150 },
  { date: "2024-04-21", approved: 137, total: 200 },
  { date: "2024-04-22", approved: 170, total: 224 },
  { date: "2024-04-23", approved: 138, total: 230 },
  { date: "2024-04-24", approved: 290, total: 387 },
  { date: "2024-04-25", approved: 215, total: 250 },
  { date: "2024-04-26", approved: 75, total: 130 },
  { date: "2024-04-27", approved: 383, total: 420 },
  { date: "2024-04-28", approved: 122, total: 180 },
  { date: "2024-04-29", approved: 240, total: 315 },
  { date: "2024-04-30", approved: 380, total: 454 },
  { date: "2024-05-01", approved: 165, total: 220 },
  { date: "2024-05-02", approved: 293, total: 310 },
  { date: "2024-05-03", approved: 190, total: 247 },
  { date: "2024-05-04", approved: 385, total: 420 },
  { date: "2024-05-05", approved: 390, total: 481 },
  { date: "2024-05-06", approved: 498, total: 520 },
  { date: "2024-05-07", approved: 300, total: 388 },
  { date: "2024-05-08", approved: 149, total: 210 },
  { date: "2024-05-09", approved: 180, total: 227 },
  { date: "2024-05-10", approved: 293, total: 330 },
  { date: "2024-05-11", approved: 270, total: 335 },
  { date: "2024-05-12", approved: 197, total: 240 },
  { date: "2024-05-13", approved: 160, total: 197 },
  { date: "2024-05-14", approved: 448, total: 490 },
  { date: "2024-05-15", approved: 380, total: 473 },
  { date: "2024-05-16", approved: 338, total: 400 },
  { date: "2024-05-17", approved: 420, total: 499 },
  { date: "2024-05-18", approved: 315, total: 350 },
  { date: "2024-05-19", approved: 180, total: 235 },
  { date: "2024-05-20", approved: 177, total: 230 },
  { date: "2024-05-21", approved: 82, total: 140 },
  { date: "2024-05-22", approved: 81, total: 120 },
  { date: "2024-05-23", approved: 252, total: 290 },
  { date: "2024-05-24", approved: 220, total: 294 },
  { date: "2024-05-25", approved: 201, total: 250 },
  { date: "2024-05-26", approved: 170, total: 213 },
  { date: "2024-05-27", approved: 420, total: 460 },
  { date: "2024-05-28", approved: 190, total: 233 },
  { date: "2024-05-29", approved: 78, total: 130 },
  { date: "2024-05-30", approved: 280, total: 340 },
  { date: "2024-05-31", approved: 178, total: 230 },
  { date: "2024-06-01", approved: 178, total: 200 },
  { date: "2024-06-02", approved: 410, total: 470 },
  { date: "2024-06-03", approved: 103, total: 160 },
  { date: "2024-06-04", approved: 380, total: 439 },
  { date: "2024-06-05", approved: 88, total: 140 },
  { date: "2024-06-06", approved: 250, total: 294 },
  { date: "2024-06-07", approved: 323, total: 370 },
  { date: "2024-06-08", approved: 320, total: 385 },
  { date: "2024-06-09", approved: 438, total: 480 },
  { date: "2024-06-10", approved: 155, total: 200 },
  { date: "2024-06-11", approved: 92, total: 150 },
  { date: "2024-06-12", approved: 420, total: 492 },
  { date: "2024-06-13", approved: 81, total: 130 },
  { date: "2024-06-14", approved: 380, total: 426 },
  { date: "2024-06-15", approved: 307, total: 350 },
  { date: "2024-06-16", approved: 310, total: 371 },
  { date: "2024-06-17", approved: 475, total: 520 },
  { date: "2024-06-18", approved: 107, total: 170 },
  { date: "2024-06-19", approved: 290, total: 341 },
  { date: "2024-06-20", approved: 408, total: 450 },
  { date: "2024-06-21", approved: 169, total: 210 },
  { date: "2024-06-22", approved: 270, total: 317 },
  { date: "2024-06-23", approved: 480, total: 530 },
  { date: "2024-06-24", approved: 132, total: 180 },
  { date: "2024-06-25", approved: 141, total: 190 },
  { date: "2024-06-26", approved: 380, total: 434 },
  { date: "2024-06-27", approved: 448, total: 490 },
  { date: "2024-06-28", approved: 149, total: 200 },
  { date: "2024-06-29", approved: 103, total: 160 },
  { date: "2024-06-30", approved: 400, total: 446 },
]

const chartConfig = {
  annotations: {
    label: "Annotations",
  },
  approved: {
    label: "Approved",
    color: "rgb(5 150 105)",
  },
  total: {
    label: "Total",
    color: "rgb(0 0 0)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: ChartAreaInteractiveProps = {}) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const chartData = data || defaultChartData

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Total Annotations</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="rgb(5 150 105)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="rgb(5 150 105)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--chart-1))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="total"
              type="natural"
              fill="url(#fillTotal)"
              stroke="rgb(0 0 0)"
              strokeWidth={2}
            />
            <Area
              dataKey="approved"
              type="natural"
              fill="url(#fillApproved)"
              stroke="rgb(5 150 105)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
