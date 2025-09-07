import type { ColumnDef } from "@tanstack/react-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button"
import { MoreHorizontal } from "lucide-react"
import { ArrowUpDown } from "lucide-react"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Project = {
  id: string
  name: string
  problemStatement: string
  requiredSkills: string
  requiredSeniorityMix: string
  startDate: string
  endDate: string
  milestones: string
  targetStaffing: string
  priority: string
  budget: string
  compliance: string
  geoEligibility: string
}

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
  },
  {
    accessorKey: "problemStatement",
    header: "Problem Statement",
  },
  {
    accessorKey: "requiredSkills",
    header: "Required Skills",
  },
  {
    accessorKey: "requiredSeniorityMix",
    header: "Required Seniority Mix",
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
  },
  {
    accessorKey: "endDate",
    header: "End Date",
  },
  {
    accessorKey: "milestones",
    header: "Milestones",
  },
  {
    accessorKey: "targetStaffing",
    header: "Target Staffing",
  },
  {
    accessorKey: "priority",
    header: "Priority",
  },
  {
    accessorKey: "budget",
    header: "Budget",
  },
  {
    accessorKey: "compliance",
    header: "Compliance",
  },
  {
    accessorKey: "geoEligibility",
    header: "Geo Eligibility",
  },
  {
    accessorKey: "capacity",
    header: "Capacity (hours/week)",
  },
  {
    accessorKey: "commitments",
    header: "Commitments",
  },
  {
    accessorKey: "availability_date",
    header: "Availability date",
  },
  {
    accessorKey: "timezone",
    header: "Timezone",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "cost_hour",
    header: "Cost/hour (in $)",
    cell: ({ row }) => {
        const raw = row.getValue("cost_hour") as string | number
        const amount = typeof raw === "number" ? raw : parseFloat(raw)
        if (isNaN(amount)) {
          return <div className="text-right font-medium">—</div>
        }
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
   
        return <div className="text-right">{formatted}</div>
      },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const resource = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
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
            <DropdownMenuItem>View resource</DropdownMenuItem>
            <DropdownMenuItem>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },    
]