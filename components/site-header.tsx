import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PanelRightClose, PanelRightOpen, Table } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface SiteHeaderProps {
  projectName?: string
  projectId?: string
  documentName?: string
  showAnnotationsToggle?: boolean
  annotationsVisible?: boolean
  onToggleAnnotations?: () => void
  showTableView?: boolean
  onTableViewClick?: () => void
}

export function SiteHeader({
  projectName,
  projectId,
  documentName,
  showAnnotationsToggle = false,
  annotationsVisible = true,
  onToggleAnnotations,
  showTableView = false,
  onTableViewClick
}: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {projectName ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/projects" className="text-base">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={projectId ? `/projects/${projectId}` : '/projects'} className="text-base">
                  {projectName}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {documentName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-base font-medium">
                      {documentName}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <h1 className="text-base font-medium">Documents</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          {showTableView && onTableViewClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTableViewClick}
            >
              <Table className="h-4 w-4 mr-2" />
              Table View
            </Button>
          )}
          {showAnnotationsToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleAnnotations}
                  className="-mr-1"
                >
                  {annotationsVisible ? (
                    <PanelRightClose className="h-5 w-5" />
                  ) : (
                    <PanelRightOpen className="h-5 w-5" />
                  )}
                  <span className="sr-only">Toggle annotations panel</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{annotationsVisible ? 'Hide' : 'Show'} annotations panel</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  )
}
