'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleGuard } from '@/components/common/RoleGuard';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Project } from '@/lib/supabaseClient';

interface ProjectsListProps {
  initialProjects: Project[];
  tenantId: string;
}

export function ProjectsList({ initialProjects, tenantId }: ProjectsListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('projects')
        .insert({
          tenant_id: tenantId,
          name: newProjectName,
        })
        .select()
        .single();

      if (error) {

        toast.error('Failed to create project');
        return;
      }

      setProjects([data, ...projects]);
      setNewProjectName('');
      setIsCreating(false);
      toast.success('Project created successfully!');
    } catch (error) {

      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {

        toast.error('Failed to delete project');
        return;
      }

      setProjects(projects.filter((p) => p.id !== projectId));
      toast.success('Project deleted successfully!');
    } catch (error) {

      toast.error('An unexpected error occurred');
    }
  };

  return (
    <div className="space-y-4">
      {/* Create project form */}
      {isCreating ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Add a new project to your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewProjectName('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      )}

      {/* Projects list */}
      {projects.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground">Create your first project to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{project.name}</span>
                  <RoleGuard minRole="owner">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(project.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </RoleGuard>
                </CardTitle>
                <CardDescription>
                  Created {new Date(project.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
