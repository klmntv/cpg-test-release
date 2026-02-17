import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { GraphData, GraphLink, ViewMode } from '../app/types';

type UseGraphViewportParams = {
  viewMode: ViewMode;
  graphData: GraphData;
  isEmpty: boolean;
};

export type GraphViewportState = {
  fgRef: MutableRefObject<any>;
  graphAreaRef: MutableRefObject<HTMLDivElement | null>;
  graphSize: { width: number; height: number };
  fitGraphToViewport: (transitionMs?: number, padding?: number) => void;
  onEngineStop: () => void;
};

export function useGraphViewport(params: UseGraphViewportParams): GraphViewportState {
  const { graphData, isEmpty, viewMode } = params;

  const fgRef = useRef<any>(null);
  const graphAreaRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoFitRef = useRef(false);
  const [graphSize, setGraphSize] = useState({ width: 0, height: 0 });

  const fitGraphToViewport = useCallback((transitionMs = 650, padding = 88) => {
    if (!fgRef.current) return;
    fgRef.current.zoomToFit(transitionMs, padding);
  }, []);

  useEffect(() => {
    const element = graphAreaRef.current;
    if (!element) return;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      setGraphSize({
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isEmpty || graphSize.width <= 1 || graphSize.height <= 1) return;

    const timeout = setTimeout(() => {
      if (!fgRef.current) return;

      const chargeStrength =
        viewMode === 'packages'
          ? -230
          : viewMode === 'types'
            ? -210
            : viewMode === 'dataflow'
              ? -170
              : -145;

      fgRef.current.d3Force('charge')?.strength(chargeStrength);
      fgRef.current.d3Force('link')?.distance((link: GraphLink) => {
        if (viewMode === 'packages') {
          const weight = link.weight ?? 1;
          return Math.max(72, 230 - weight * 8);
        }
        if (viewMode === 'dataflow') return link.kind === 'dfg' ? 95 : 122;
        if (viewMode === 'types') return link.kind === 'implements' ? 138 : 105;
        return 118;
      });

      pendingAutoFitRef.current = true;
      fgRef.current.d3ReheatSimulation();
    }, 180);

    return () => clearTimeout(timeout);
  }, [graphData, graphSize.height, graphSize.width, isEmpty, viewMode]);

  const onEngineStop = useCallback(() => {
    if (!pendingAutoFitRef.current) return;
    pendingAutoFitRef.current = false;

    // Two-pass fit keeps first view readable on dense graphs.
    fitGraphToViewport(460, 92);
    setTimeout(() => fitGraphToViewport(260, 102), 130);
  }, [fitGraphToViewport]);

  return {
    fgRef,
    graphAreaRef,
    graphSize,
    fitGraphToViewport,
    onEngineStop,
  };
}
