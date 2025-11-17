"use client"

import { ChevronRight, Folder, File } from "lucide-react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"

interface Project {
  id: string
  name: string
}

interface Document {
  id: string
  name: string
  project_id: string
}

export function NavDocuments({
  projects = [],
  documents = [],
  currentProjectId,
}: {
  projects?: Project[]
  documents?: Document[]
  currentProjectId?: string
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link href="/projects">
              <Folder className="size-4" />
              <span>Projects</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarMenu>
        {projects.map((project) => {
          const projectDocs = documents.filter(doc => doc.project_id === project.id)
          return (
            <SidebarMenuItem key={project.id}>
              <Collapsible
                className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
                defaultOpen={project.id === currentProjectId}
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <ChevronRight className="transition-transform" />
                    <Folder className="size-4" />
                    <span>{project.name}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projectDocs.map((doc) => (
                      <SidebarMenuItem key={doc.id}>
                        <SidebarMenuButton asChild>
                          <Link href={`/documents/${doc.id}`}>
                            <File className="size-4" />
                            <span>{doc.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {projectDocs.length === 0 && (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                          <span className="text-muted-foreground text-sm">No documents</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          )
        })}
        {projects.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <span className="text-muted-foreground">No projects</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
