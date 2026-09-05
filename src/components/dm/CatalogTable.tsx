import { Gift, Trash2 } from "lucide-react";
import { ResourceHoverTip } from "@/components/hud/ResourceHoverTip";
import { ResourceKindMark } from "@/components/hud/ResourceKindMark";
import { GIVE_TO_CRAWLER } from "@/lib/copy";
import { isGrantableResource } from "@/lib/grant";
import { resourceDescriptionLabel } from "@/lib/resources";
import type { Resource } from "@/lib/types";

export type CatalogColumn = {
  id: string;
  label: string;
  className?: string;
  cell: (resource: Resource) => React.ReactNode;
};

export function CatalogTable({
  resources,
  columns,
  empty,
  tipsDisabled,
  onEdit,
  onDelete,
  onGrant,
}: {
  resources: Resource[];
  columns: CatalogColumn[];
  empty: string;
  tipsDisabled?: boolean;
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onGrant?: (resource: Resource) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl well">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
            <th className="p-3">Nombre</th>
            {columns.map((column) => (
              <th key={column.id} className={`p-3 ${column.className ?? ""}`}>
                {column.label}
              </th>
            ))}
            <th className="w-24 p-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => {
            const description = resourceDescriptionLabel(resource);
            const emptyCopy = !resource.description?.trim();
            return (
              <ResourceHoverTip key={resource.id} resource={resource} disabled={tipsDisabled}>
                <tr className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onEdit(resource)}
                      className="inline-flex items-center gap-2 text-left font-medium text-[var(--text-1)] hover:text-[var(--cyan-400)] hover:underline"
                    >
                      <ResourceKindMark resource={resource} />
                      {resource.name}
                    </button>
                  </td>
                  {columns.map((column) => (
                    <td key={column.id} className={`p-3 ${column.className ?? ""}`}>
                      {column.id === "description" ? (
                        <span className={`block max-w-xs truncate ${emptyCopy ? "text-[var(--text-4)]" : "text-[var(--text-3)]"}`}>
                          {description}
                        </span>
                      ) : (
                        column.cell(resource)
                      )}
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {onGrant && isGrantableResource(resource) ? (
                        <button
                          type="button"
                          title={GIVE_TO_CRAWLER}
                          aria-label={`${GIVE_TO_CRAWLER}: ${resource.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onGrant(resource);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-[var(--orange-400)] transition-colors hover:bg-[rgba(249,115,22,0.14)] hover:text-[var(--orange-300)]"
                        >
                          <Gift size={15} strokeWidth={1.75} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Eliminar ${resource.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(resource);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-[var(--text-4)] transition-colors hover:bg-[var(--glass-danger)] hover:text-[var(--danger)]"
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              </ResourceHoverTip>
            );
          })}
          {resources.length === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="p-6 text-center text-[var(--text-3)]">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
