import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Select } from '@exzaestate/ui';
import { useProfitability } from '../hooks/useProfitability.js';
import { ProjectProfitabilityView } from '../components/transfers/ProjectProfitabilityView.js';
import type { ProjectProfitabilityItem } from '../schemas/operations.schema.js';

export interface ProjectProfitabilityPageProps {
  projects?: Array<{ id: string; name: string }>;
}

function getProjectProfitabilityItem(
  projectsList: Array<ProjectProfitabilityItem> | undefined,
  selectedId: string,
): ProjectProfitabilityItem | null {
  if (!projectsList || projectsList.length === 0) return null;
  const match = projectsList.find((p) => p.projectId === selectedId);
  return match ?? projectsList[0] ?? null;
}

export function ProjectProfitabilityPage({ projects = [] }: ProjectProfitabilityPageProps) {
  const initialProjectId = projects[0]?.id ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);

  const {
    report: profitability,
    isLoading,
    exportReport,
  } = useProfitability(selectedProjectId ? { projectId: selectedProjectId } : undefined);

  const currentProjectProfitability = getProjectProfitabilityItem(
    profitability?.projects,
    selectedProjectId,
  );

  const handleExport = () => {
    void exportReport('PDF');
  };

  const projectOptions = projects.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">
              Project Profitability & Cost Analysis
            </h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            Realized revenues, land & construction cost allocation, and operating margin analytics
          </p>
        </div>

        {projects.length > 0 && (
          <div className="w-56">
            <Select
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={projectOptions}
            />
          </div>
        )}
      </div>

      <ProjectProfitabilityView
        profitability={currentProjectProfitability}
        isLoading={isLoading}
        onExport={handleExport}
      />
    </div>
  );
}
