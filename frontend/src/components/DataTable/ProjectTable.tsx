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
import type { Project } from "./projectColumns"

const data: Project[] = [
    {
        id: "1",
        name: "Project 1",
        problemStatement: "Problem Statement 1",
        requiredSkills: "Required Skills 1",
        requiredSeniorityMix: "Required Seniority Mix 1",
        startDate: "Start Date 1",
        endDate: "End Date 1",
        milestones: "Milestones 1",
        targetStaffing: "Target Staffing 1",
        priority: "Priority 1",
        budget: "Budget 1",
        compliance: "Compliance 1",
        geoEligibility: "Geo Eligibility 1",
    },
    {
        id: "2",
        name: "Project 2",
        problemStatement: "Problem Statement 2",
        requiredSkills: "Required Skills 2",
        requiredSeniorityMix: "Required Seniority Mix 2",
        startDate: "Start Date 2",
        endDate: "End Date 2",
        milestones: "Milestones 2",
        targetStaffing: "Target Staffing 2",
        priority: "Priority 2",
        budget: "Budget 2",
        compliance: "Compliance 2",
        geoEligibility: "Geo Eligibility 2",
    },
    {
        id: "3",
        name: "Project 3",
        problemStatement: "Problem Statement 3",
        requiredSkills: "Required Skills 3",
        requiredSeniorityMix: "Required Seniority Mix 3",
        startDate: "Start Date 3",
        endDate: "End Date 3",
        milestones: "Milestones 3",
        targetStaffing: "Target Staffing 3",
        priority: "Priority 3",
        budget: "Budget 3",
        compliance: "Compliance 3",
        geoEligibility: "Geo Eligibility 3",
    },
]

export const columns: ColumnDef<Project>[] = [
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
    accessorKey: "problemStatement",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Problem Statement
          <ArrowUpDown />
        </Button>
      )
    },
    cell: ({ row }) => <div className="lowercase">{row.getValue("problemStatement")}</div>,
  },
  {
    accessorKey: "startDate",
    header: () => <div className="text-right">Start Date</div>,
    cell: ({ row }) => {
      const startDate = row.getValue("startDate") as string

      return <div className="text-right font-medium">{startDate}</div>
    },
  },
  {
    accessorKey: "endDate",
    header: () => <div className="text-right">End Date</div>,
    cell: ({ row }) => {
      const endDate = row.getValue("endDate") as string

      return <div className="text-right font-medium">{endDate}</div>
    },
  },
  {
    accessorKey: "milestones",
    header: () => <div className="text-right">Milestones</div>,
    cell: ({ row }) => {
      const milestones = row.getValue("milestones") as string

      return <div className="text-right font-medium">{milestones}</div>
    },
  },
  ,
  {
    accessorKey: "requiredSkills",
    header: () => <div className="text-right">Required Skills</div>,
    cell: ({ row }) => {
      const requiredSkills = row.getValue("requiredSkills") as string

      return <div className="text-right font-medium">{requiredSkills}</div>
    },
  },
  {
    accessorKey: "requiredSeniorityMix",
    header: () => <div className="text-right">Required Seniority Mix</div>,
    cell: ({ row }) => {
      const requiredSeniorityMix = row.getValue("requiredSeniorityMix") as string

      return <div className="text-right font-medium">{requiredSeniorityMix}</div>
    },
  },
  {
    accessorKey: "targetStaffing",
    header: () => <div className="text-right">Target Staffing</div>,
    cell: ({ row }) => {
      const targetStaffing = row.getValue("targetStaffing") as string

      return <div className="text-right font-medium">{targetStaffing}</div>
    },
  },
  {
    accessorKey: "priority",
    header: () => <div className="text-right">Priority</div>,
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string

      return <div className="text-right font-medium">{priority}</div>
    },
  },
  {
    accessorKey: "budget",
    header: () => <div className="text-right">Budget</div>,
    cell: ({ row }) => {
      const budget = row.getValue("budget") as string

      return <div className="text-right font-medium">{budget}</div>
    },
  },
  {
    accessorKey: "compliance",
    header: () => <div className="text-right">Compliance</div>,
    cell: ({ row }) => {
      const compliance = row.getValue("compliance") as string

      return <div className="text-right font-medium">{compliance}</div>
    },
  },
  {
    accessorKey: "geoEligibility",
    header: () => <div className="text-right">Geo Eligibility</div>,
    cell: ({ row }) => {
      const geoEligibility = row.getValue("geoEligibility") as string

      return <div className="text-right font-medium">{geoEligibility}</div>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const project = row.original

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
              onClick={() => navigator.clipboard.writeText(project.id)}
            >
              Copy project ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View project</DropdownMenuItem>
            <DropdownMenuItem>View project details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export default function ProjectTable({ data }: { data: Project[] }) {
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
          placeholder="Filter names..."
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
