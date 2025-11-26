'use client';

import { Card } from '@/components/ui/card';
import { Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface ProjectTimelineProps {
  data: Array<{
    id: string;
    titolo: string;
    data_inizio?: string;
    data_fine_prevista?: string;
    stato: string;
    percentualeCompletamento: number;
    cliente?: string;
  }>;
  loading?: boolean;
}

export function ProjectTimeline({ data, loading }: ProjectTimelineProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Timeline Commesse
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  // Filtra solo commesse con date valide
  const projectsWithDates = data.filter(p => p.data_inizio);

  // Ordina per data inizio
  const sortedProjects = [...projectsWithDates].sort((a, b) => {
    if (!a.data_inizio || !b.data_inizio) return 0;
    return new Date(a.data_inizio).getTime() - new Date(b.data_inizio).getTime();
  });

  // Calcola la timeline complessiva
  const allDates = sortedProjects.flatMap(p => [
    p.data_inizio ? new Date(p.data_inizio) : null,
    p.data_fine_prevista ? new Date(p.data_fine_prevista) : null,
  ].filter(Boolean) as Date[]);

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();
  const totalDays = differenceInDays(maxDate, minDate) || 1;

  const getStatusColor = (stato: string) => {
    if (!stato) return 'bg-gray-500';
    switch (stato.toLowerCase()) {
      case 'completata':
        return 'bg-green-500';
      case 'in corso':
      case 'in_corso':
        return 'bg-blue-500';
      case 'in attesa':
      case 'in_attesa':
        return 'bg-yellow-500';
      case 'annullata':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (stato: string) => {
    if (!stato) return 'N/D';
    switch (stato.toLowerCase()) {
      case 'completata':
        return 'Completata';
      case 'in corso':
      case 'in_corso':
        return 'In Corso';
      case 'in attesa':
      case 'in_attesa':
        return 'In Attesa';
      case 'annullata':
        return 'Annullata';
      default:
        return stato;
    }
  };

  const calculatePosition = (date: string | undefined, isEnd: boolean = false) => {
    if (!date) return isEnd ? 100 : 0;
    const d = new Date(date);
    const days = differenceInDays(d, minDate);
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  };

  if (sortedProjects.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Timeline Commesse
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          Nessuna commessa con date definite
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Timeline Commesse
          </h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {format(minDate, 'dd MMM yyyy', { locale: it })} - {format(maxDate, 'dd MMM yyyy', { locale: it })}
        </div>
      </div>

      {/* Timeline Header */}
      <div className="mb-4 px-2">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>{format(minDate, 'MMM yyyy', { locale: it })}</span>
          <span>Oggi</span>
          <span>{format(maxDate, 'MMM yyyy', { locale: it })}</span>
        </div>
        <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded">
          {/* Today marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{
              left: `${calculatePosition(new Date().toISOString())}%`,
            }}
          />
        </div>
      </div>

      {/* Projects Timeline */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {sortedProjects.map((project) => {
          const start = calculatePosition(project.data_inizio);
          const end = calculatePosition(project.data_fine_prevista, true);
          const width = Math.max(2, end - start);

          const isOverdue = project.data_fine_prevista &&
            new Date(project.data_fine_prevista) < new Date() &&
            project.stato !== 'completata';

          const daysRemaining = project.data_fine_prevista
            ? differenceInDays(new Date(project.data_fine_prevista), new Date())
            : null;

          return (
            <div key={project.id} className="group">
              <div className="flex items-start gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {project.titolo}
                    </h4>
                    {isOverdue && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  {project.cliente && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {project.cliente}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(project.stato)} text-white`}>
                    {getStatusLabel(project.stato)}
                  </span>
                  {daysRemaining !== null && (
                    <span className={`text-xs ${
                      daysRemaining < 0
                        ? 'text-red-600 dark:text-red-400'
                        : daysRemaining < 7
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {daysRemaining < 0
                        ? `${Math.abs(daysRemaining)}gg in ritardo`
                        : `${daysRemaining}gg rimanenti`}
                    </span>
                  )}
                </div>
              </div>

              {/* Timeline bar */}
              <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded px-2">
                <div
                  className={`absolute top-1 bottom-1 rounded transition-all group-hover:shadow-lg ${
                    isOverdue ? 'bg-red-500' : getStatusColor(project.stato)
                  }`}
                  style={{
                    left: `${start}%`,
                    width: `${width}%`,
                  }}
                >
                  {/* Progress bar dentro */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white/30 rounded"
                    style={{
                      width: `${project.percentualeCompletamento}%`,
                    }}
                  />
                </div>

                {/* Date labels */}
                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
                  {project.data_inizio && (
                    <span className="text-gray-600 dark:text-gray-400">
                      {format(parseISO(project.data_inizio), 'dd/MM/yy')}
                    </span>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {project.percentualeCompletamento}%
                  </span>
                  {project.data_fine_prevista && (
                    <span className="text-gray-600 dark:text-gray-400">
                      {format(parseISO(project.data_fine_prevista), 'dd/MM/yy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {sortedProjects.filter(p => p.stato === 'in_corso' || p.stato === 'in corso').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">In Corso</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {sortedProjects.filter(p =>
                p.data_fine_prevista &&
                new Date(p.data_fine_prevista) < new Date() &&
                p.stato !== 'completata'
              ).length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">In Ritardo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {sortedProjects.filter(p => p.stato === 'completata').length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completate</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
