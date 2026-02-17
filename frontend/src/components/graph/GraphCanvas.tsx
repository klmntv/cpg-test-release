import type { MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { moduleColors } from '../../app/constants';
import type { GraphData, GraphLink, GraphNode, ViewMode } from '../../app/types';
import { detectModule } from '../../app/utils';
import styles from './GraphCanvas.module.css';

type SeedFunction = {
  id: string;
  name: string;
  package?: string;
};

type GraphCanvasProps = {
  loading: boolean;
  viewMode: ViewMode;
  isEmpty: boolean;
  busy: string | null;
  graphData: GraphData;
  graphSize: { width: number; height: number };
  graphAreaRef: MutableRefObject<HTMLDivElement | null>;
  fgRef: MutableRefObject<any>;
  hoverNodeID: string | null;
  setHoverNodeID: (id: string | null) => void;
  focusIDs: Set<string>;
  hoverLabelsOnly: boolean;
  onNodeClick: (node: GraphNode) => void;
  onEngineStop: () => void;
  onLoadDefaultCallGraph: () => void;
  callSeedFunctions: SeedFunction[];
  onLoadSeedFunction: (id: string) => void;
};

function renderEmptyState(
  viewMode: ViewMode,
  onLoadDefaultCallGraph: () => void,
  callSeedFunctions: SeedFunction[],
  onLoadSeedFunction: (id: string) => void
) {
  if (viewMode === 'packages') {
    return <div className={styles.overlayCard}>No package data. Generate CPG first.</div>;
  }

  if (viewMode === 'calls') {
    return (
      <div className={styles.overlayCard}>
        <strong>Calls view needs a seed function.</strong>
        <div>Pick any function from search/sidebar, or run one of the quick seeds.</div>
        <button type="button" onClick={onLoadDefaultCallGraph}>
          Load default call graph
        </button>

        {callSeedFunctions.length > 0 && (
          <div className={styles.seedList}>
            {callSeedFunctions.slice(0, 8).map((seed) => (
              <button key={seed.id} type="button" className={styles.seedButton} onClick={() => onLoadSeedFunction(seed.id)}>
                {seed.name}
                {seed.package ? <small>{seed.package}</small> : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div className={styles.overlayCard}>No data for this view yet.</div>;
}

export function GraphCanvas(props: GraphCanvasProps) {
  const {
    loading,
    viewMode,
    isEmpty,
    busy,
    graphData,
    graphSize,
    graphAreaRef,
    fgRef,
    hoverNodeID,
    setHoverNodeID,
    focusIDs,
    hoverLabelsOnly,
    onNodeClick,
    onEngineStop,
    onLoadDefaultCallGraph,
    callSeedFunctions,
    onLoadSeedFunction,
  } = props;

  return (
    <div className={styles.graphArea} ref={graphAreaRef}>
      {!loading && !isEmpty && (
        <ForceGraph2D
          ref={fgRef}
          width={graphSize.width}
          height={graphSize.height}
          graphData={graphData}
          backgroundColor="#07080c"
          d3VelocityDecay={0.33}
          cooldownTicks={190}
          minZoom={0.05}
          nodeVal={(node) => (node as GraphNode).val ?? 4}
          nodeLabel={(node) => (node as GraphNode).name ?? (node as GraphNode).id}
          nodeColor={(node) => {
            const typedNode = node as GraphNode;
            if (typedNode.isCenter) return '#f59e0b';
            if (hoverNodeID && !focusIDs.has(typedNode.id)) return '#2a3f5c';
            if (viewMode === 'types' && typedNode.kind === 'interface') return '#ffcc71';
            return moduleColors[typedNode.module ?? detectModule(typedNode.package ?? '')] || moduleColors.other;
          }}
          linkColor={(link) => {
            const typedLink = link as GraphLink;
            const source = typeof typedLink.source === 'string' ? typedLink.source : typedLink.source.id;
            const target = typeof typedLink.target === 'string' ? typedLink.target : typedLink.target.id;

            if (hoverNodeID) {
              if (source === hoverNodeID || target === hoverNodeID) return 'rgba(198, 205, 255, 0.88)';
              return 'rgba(42, 48, 66, 0.28)';
            }

            if (viewMode === 'dataflow') {
              if (typedLink.kind === 'dfg') return 'rgba(188, 200, 255, 0.62)';
              if (typedLink.kind === 'param_in') return 'rgba(203, 155, 255, 0.56)';
              if (typedLink.kind === 'param_out') return 'rgba(132, 226, 191, 0.54)';
            }

            if (viewMode === 'types') {
              if (typedLink.kind === 'implements') return 'rgba(255, 204, 113, 0.68)';
              if (typedLink.kind === 'embeds') return 'rgba(147, 218, 255, 0.64)';
            }

            return 'rgba(72, 84, 122, 0.34)';
          }}
          linkWidth={(link) => {
            const typedLink = link as GraphLink;
            const source = typeof typedLink.source === 'string' ? typedLink.source : typedLink.source.id;
            const target = typeof typedLink.target === 'string' ? typedLink.target : typedLink.target.id;

            if (hoverNodeID) return source === hoverNodeID || target === hoverNodeID ? 2.1 : 1.0;
            if (viewMode === 'dataflow' && typedLink.kind === 'dfg') return 1.6;
            if (viewMode === 'types' && typedLink.kind === 'implements') return 1.7;
            return 1.22;
          }}
          linkDirectionalArrowLength={viewMode === 'packages' ? 0 : 4}
          linkDirectionalArrowRelPos={1}
          onRenderFramePost={(ctx, globalScale) => {
            const zoomedOut = globalScale < 1.24;

            const labels = graphData.nodes
              .filter((node) => {
                const autoLabel = viewMode === 'dataflow' ? (node.depth ?? 99) <= 1 : (node.val ?? 0) >= 13;
                return hoverLabelsOnly
                  ? node.isCenter || node.id === hoverNodeID
                  : node.isCenter || node.id === hoverNodeID || (!zoomedOut && autoLabel);
              })
              .sort((a, b) => Number(a.id === hoverNodeID || a.isCenter) - Number(b.id === hoverNodeID || b.isCenter));

            for (const node of labels) {
              const pos = node as unknown as { x?: number; y?: number };
              if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;

              const x = pos.x as number;
              const y = pos.y as number;
              const label = node.name ?? node.id;
              const fontSize = Math.max(9, 12 / globalScale);
              ctx.font = `600 ${fontSize}px Space Mono, monospace`;

              const textWidth = ctx.measureText(label).width;
              const boxWidth = textWidth + 10;
              const boxHeight = fontSize + 8;

              let labelX = x + 12;
              let labelY = y + 4;

              if (labelX + boxWidth > graphSize.width - 6) labelX = graphSize.width - boxWidth - 6;
              if (labelX < 6) labelX = 6;
              if (labelY - fontSize < 6) labelY = fontSize + 6;
              if (labelY + 6 > graphSize.height - 6) labelY = graphSize.height - 12;

              ctx.fillStyle = node.id === hoverNodeID ? 'rgba(19, 30, 48, 0.95)' : 'rgba(8, 12, 20, 0.88)';
              ctx.fillRect(labelX - 5, labelY - fontSize + 1, boxWidth, boxHeight);

              ctx.strokeStyle = node.id === hoverNodeID ? 'rgba(163, 192, 255, 0.95)' : 'rgba(99, 111, 146, 0.65)';
              ctx.lineWidth = 0.7;
              ctx.strokeRect(labelX - 5, labelY - fontSize + 1, boxWidth, boxHeight);

              ctx.fillStyle = 'rgba(240, 244, 255, 0.98)';
              ctx.fillText(label, labelX, labelY);
            }
          }}
          onNodeHover={(node) => setHoverNodeID((node as GraphNode | null)?.id ?? null)}
          onNodeClick={(node) => onNodeClick(node as GraphNode)}
          onEngineStop={onEngineStop}
        />
      )}

      {(loading || isEmpty) && (
        <div className={styles.overlay}>
          {loading ? <div className={styles.overlayCard}>Loading graph...</div> : renderEmptyState(viewMode, onLoadDefaultCallGraph, callSeedFunctions, onLoadSeedFunction)}
        </div>
      )}

      {busy && <div className={styles.busyOverlay}>{busy}</div>}
    </div>
  );
}
