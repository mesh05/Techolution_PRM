"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Resource } from "./resourceColumns"

const data: Resource[] = [
  {
    id: "m5gr84i9",
    name: "ken99@example.com",
    role: "Software Engineer",
    skills: "React, Node.js, TypeScript",
    proficiency: "Intermediate",
    capacity: "40",
    commitments: "20",
    availability_date: "2022-01-01",
    timezone: "UTC+0",
    type: "Full-time",
    cost_hour: "100",
  },
  {
    id: "3u1reuv4",
    name: "Abe45@example.com",
    role: "Software Engineer",
    skills: "React, Node.js, TypeScript",
    proficiency: "Intermediate",
    capacity: "40",
    commitments: "20",
    availability_date: "2022-01-01",
    timezone: "UTC+0",
    type: "Full-time",
    cost_hour: "100",
  },
  {
    id: "derv1ws0",
    name: "Monserrat44@example.com",
    role: "Software Engineer",
    skills: "React, Node.js, TypeScript",
    proficiency: "Intermediate",
    capacity: "40",
    commitments: "20",
    availability_date: "2022-01-01",
    timezone: "UTC+0",
    type: "Full-time",
    cost_hour: "100",
  },
  {
    id: "5kma53ae",
    name: "Silas22@example.com",
    role: "Software Engineer",
    skills: "React, Node.js, TypeScript",
    proficiency: "Intermediate",
    capacity: "40",
    commitments: "20",
    availability_date: "2022-01-01",
    timezone: "UTC+0",
    type: "Full-time",
    cost_hour: "100",
  },
  {
    id: "bhqecj4p",
    name: "carmella@example.com",
    role: "Software Engineer",
    skills: "React, Node.js, TypeScript",
    proficiency: "Intermediate",
    capacity: "40",
    commitments: "20",
    availability_date: "2022-01-01",
    timezone: "UTC+0",
    type: "Full-time",
    cost_hour: "100",
  },
]

export const columns: ColumnDef<Resource>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Role
          <ArrowUpDown />
        </Button>
      )
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("role")}</div>,
  },
  {
    accessorKey: "skills",
    header: () => <div className="text-center">Skills</div>,
    cell: ({ row }) => {
      const skills = row.getValue("skills") as string

      return <div className="text-center font-medium">{skills}</div>
    },
  },
  {
    accessorKey: "proficiency",
    header: () => <div className="text-center">Proficiency</div>,
    cell: ({ row }) => {
      const proficiency = row.getValue("proficiency") as string

      return <div className="text-center font-medium">{proficiency}</div>
    },
  },
  {
    accessorKey: "capacity",
    header: () => <div className="text-center">Capacity</div>,
    cell: ({ row }) => {
      const capacity = row.getValue("capacity") as string

      return <div className="text-center font-medium">{capacity}</div>
    },
  },
  {
    accessorKey: "commitments",
    header: () => <div className="text-center">Commitments</div>,
    cell: ({ row }) => {
      const commitments = row.getValue("commitments") as string

      return <div className="text-center font-medium">{commitments}</div>
    },
  },
  {
    accessorKey: "availability_date",
    header: () => <div className="text-center">Availability Date</div>,
    cell: ({ row }) => {
      const availability_date = row.getValue("availability_date") as string

      return <div className="text-center font-medium">{availability_date}</div>
    },
  },
  {
    accessorKey: "timezone",
    header: () => <div className="text-center">Timezone</div>,
    cell: ({ row }) => {
      const timezone = row.getValue("timezone") as string

      return <div className="text-center font-medium">{timezone}</div>
    },
  },
  {
    accessorKey: "type",
    header: () => <div className="text-center">Type</div>,
    cell: ({ row }) => {
      const type = row.getValue("type") as string

      return <div className="text-center font-medium">{type}</div>
    },
  },
  {
    accessorKey: "cost_hour",
    header: () => <div className="text-center">Cost/hour</div>,
    cell: ({ row }) => {
      const cost_hour = row.getValue("cost_hour") as string

      return <div className="text-center font-medium">{cost_hour}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const resource = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(resource.id)}
            >
              Copy resource ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View resource details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function ResourceTable({ data } : { data: Resource[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
