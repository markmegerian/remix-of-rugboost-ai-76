import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { RugEdge, RugDimensions } from '@/lib/rugDimensions';
import { formatDimension, type DimensionFormat } from '@/lib/rugDimensions';

interface RugEdgeDiagramProps {
  dimensions: RugDimensions;
  selectedEdges: RugEdge[];
  onToggleEdge: (edge: RugEdge) => void;
  dimensionFormat?: DimensionFormat;
  disabled?: boolean;
}

/**
 * Interactive SVG diagram of a rug with clickable edges.
 *
 * Layout convention (matches real-world rug orientation):
 *   ┌─── End 1 (top, width) ───┐
 *   │                           │
 *   Side 1 (left, length)   Side 2 (right, length)
 *   │                           │
 *   └─── End 2 (bottom, width) ─┘
 */
const RugEdgeDiagramComponent = ({
  dimensions,
  selectedEdges,
  onToggleEdge,
  dimensionFormat = 'ft_in',
  disabled = false,
}: RugEdgeDiagramProps) => {
  const isSelected = useCallback(
    (edge: RugEdge) => selectedEdges.includes(edge),
    [selectedEdges],
  );

  const edgeClass = (edge: RugEdge) =>
    cn(
      'cursor-pointer transition-colors duration-150',
      isSelected(edge)
        ? 'stroke-primary fill-primary/20'
        : 'stroke-muted-foreground/40 fill-transparent hover:stroke-primary/60',
      disabled && 'cursor-not-allowed opacity-50',
    );

  const labelClass = (edge: RugEdge) =>
    cn(
      'text-xs select-none pointer-events-none',
      isSelected(edge) ? 'fill-primary font-semibold' : 'fill-muted-foreground',
    );

  const handleClick = (edge: RugEdge) => {
    if (!disabled) onToggleEdge(edge);
  };

  // SVG viewbox with padding for labels
  const pad = 36;
  const rugW = 160;
  const rugH = 200;
  const svgW = rugW + pad * 2;
  const svgH = rugH + pad * 2;

  const x = pad;
  const y = pad;
  const strokeW = 6;

  const widthLabel = formatDimension(dimensions.widthFt, dimensionFormat);
  const lengthLabel = formatDimension(dimensions.lengthFt, dimensionFormat);

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-muted-foreground font-medium">Tap edges to select</p>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-[220px]"
        aria-label="Rug edge selector"
      >
        {/* Rug body */}
        <rect
          x={x}
          y={y}
          width={rugW}
          height={rugH}
          rx={4}
          className="fill-muted/30 stroke-border"
          strokeWidth={1}
        />

        {/* Center label */}
        <text
          x={x + rugW / 2}
          y={y + rugH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-muted-foreground/60 select-none pointer-events-none"
        >
          RUG
        </text>

        {/* ─── End 1 (top) ─── */}
        <line
          x1={x}
          y1={y}
          x2={x + rugW}
          y2={y}
          strokeWidth={strokeW}
          strokeLinecap="round"
          className={edgeClass('end1')}
          onClick={() => handleClick('end1')}
        />
        <text x={x + rugW / 2} y={y - 8} textAnchor="middle" className={labelClass('end1')}>
          End 1 ({widthLabel} ft)
        </text>

        {/* ─── End 2 (bottom) ─── */}
        <line
          x1={x}
          y1={y + rugH}
          x2={x + rugW}
          y2={y + rugH}
          strokeWidth={strokeW}
          strokeLinecap="round"
          className={edgeClass('end2')}
          onClick={() => handleClick('end2')}
        />
        <text x={x + rugW / 2} y={y + rugH + 16} textAnchor="middle" className={labelClass('end2')}>
          End 2 ({widthLabel} ft)
        </text>

        {/* ─── Side 1 (left) ─── */}
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={y + rugH}
          strokeWidth={strokeW}
          strokeLinecap="round"
          className={edgeClass('side1')}
          onClick={() => handleClick('side1')}
        />
        <text
          x={x - 8}
          y={y + rugH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90, ${x - 8}, ${y + rugH / 2})`}
          className={labelClass('side1')}
        >
          Side 1 ({lengthLabel} ft)
        </text>

        {/* ─── Side 2 (right) ─── */}
        <line
          x1={x + rugW}
          y1={y}
          x2={x + rugW}
          y2={y + rugH}
          strokeWidth={strokeW}
          strokeLinecap="round"
          className={edgeClass('side2')}
          onClick={() => handleClick('side2')}
        />
        <text
          x={x + rugW + 8}
          y={y + rugH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(90, ${x + rugW + 8}, ${y + rugH / 2})`}
          className={labelClass('side2')}
        >
          Side 2 ({lengthLabel} ft)
        </text>
      </svg>

      {/* Quick-select helpers */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-1">
        {[
          { label: 'Both Ends', edges: ['end1', 'end2'] as RugEdge[] },
          { label: 'Both Sides', edges: ['side1', 'side2'] as RugEdge[] },
          { label: 'All Edges', edges: ['end1', 'end2', 'side1', 'side2'] as RugEdge[] },
        ].map((preset) => {
          const allActive = preset.edges.every((e) => selectedEdges.includes(e));
          return (
            <button
              key={preset.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (allActive) {
                  // Deselect all in preset
                  preset.edges.forEach((e) => {
                    if (selectedEdges.includes(e)) onToggleEdge(e);
                  });
                } else {
                  // Select all in preset
                  preset.edges.forEach((e) => {
                    if (!selectedEdges.includes(e)) onToggleEdge(e);
                  });
                }
              }}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border transition-colors',
                allActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const RugEdgeDiagram = memo(RugEdgeDiagramComponent);
RugEdgeDiagram.displayName = 'RugEdgeDiagram';

export default RugEdgeDiagram;
