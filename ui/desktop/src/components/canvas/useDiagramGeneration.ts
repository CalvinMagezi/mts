/* global AbortSignal */
import { useState, useCallback, useRef } from 'react';
import { Diagram } from '@chamuka/drawit';
import { DiagramClient, type DiagramType } from '@chamuka/drawit-sdk';
import {
  generateWithApi,
  generateDemoResponse,
  type DiagramGenerationResult,
} from './canvasAIService';

interface GenerationProgress {
  nodes: number;
  edges: number;
  total: number;
}

type GenerationMode = 'ai' | 'demo';

interface UseDiagramGenerationOptions {
  client: DiagramClient | null;
  diagram: Diagram | null;
  onElementsUpdated?: () => void;
  getProviderAndModel?: () => Promise<{ provider: string; model: string }>;
}

interface UseDiagramGenerationReturn {
  isGenerating: boolean;
  progress: GenerationProgress;
  error: string | null;
  mode: GenerationMode;
  generate: (prompt: string, diagramType: DiagramType, editMode: boolean) => Promise<void>;
  cancel: () => void;
}

/**
 * Hook for AI-powered diagram generation
 *
 * Uses the dedicated diagram generation API endpoint.
 * Falls back to demo mode if no provider is configured.
 */
export function useDiagramGeneration({
  client,
  diagram,
  onElementsUpdated,
  getProviderAndModel,
}: UseDiagramGenerationOptions): UseDiagramGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ nodes: 0, edges: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerationMode>(getProviderAndModel ? 'ai' : 'demo');

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Render diagram elements with animation
   */
  const renderElements = useCallback(
    async (result: DiagramGenerationResult, signal: AbortSignal) => {
      if (!client) return;

      const totalElements = result.nodes.length + result.edges.length;
      setProgress({ nodes: 0, edges: 0, total: totalElements });

      // Add nodes with animation
      for (let i = 0; i < result.nodes.length; i++) {
        if (signal.aborted) break;

        const node = result.nodes[i];
        await new Promise((resolve) => setTimeout(resolve, 80));

        client.addNode({
          id: node.id,
          position: node.position,
          size: node.size,
          shape: node.shape as
            | 'rectangle'
            | 'ellipse'
            | 'diamond'
            | 'triangle'
            | 'hexagon'
            | undefined,
          text: node.text,
          style: node.style,
        });

        setProgress((prev) => ({ ...prev, nodes: i + 1 }));
        onElementsUpdated?.();
      }

      // Add edges with animation
      for (let i = 0; i < result.edges.length; i++) {
        if (signal.aborted) break;

        const edge = result.edges[i];
        await new Promise((resolve) => setTimeout(resolve, 50));

        client.addEdge({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
        });

        setProgress((prev) => ({ ...prev, edges: i + 1 }));
        onElementsUpdated?.();
      }

      // Fit diagram to view
      if (diagram && !signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        diagram.zoomToFit();
      }
    },
    [client, diagram, onElementsUpdated]
  );

  /**
   * Generate diagram using AI or demo mode
   */
  const generate = useCallback(
    async (prompt: string, diagramType: DiagramType, editMode: boolean) => {
      if (!client) {
        setError('Diagram client not initialized');
        return;
      }

      setIsGenerating(true);
      setError(null);
      setProgress({ nodes: 0, edges: 0, total: 0 });

      // Create abort controller for this generation
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        // Clear canvas if not in edit mode
        if (!editMode) {
          client.clear();
        }

        let result: DiagramGenerationResult;

        // Try AI generation if provider is available
        if (getProviderAndModel) {
          try {
            console.log('[DiagramGeneration] Using AI mode');
            const { provider, model } = await getProviderAndModel();
            const existingElements = editMode ? client.getElements() : [];

            result = await generateWithApi(
              prompt,
              diagramType,
              editMode,
              existingElements,
              provider,
              model,
              (progressText) => {
                console.log('[DiagramGeneration] AI progress:', progressText.slice(0, 100) + '...');
              }
            );
            setMode('ai');
          } catch (aiError) {
            console.warn('[DiagramGeneration] AI generation failed, falling back to demo:', aiError);
            setMode('demo');
            // Fall back to demo mode
            result = generateDemoResponse(prompt, diagramType);
          }
        } else {
          // Use demo mode
          console.log('[DiagramGeneration] Using demo mode (no provider configured)');
          setMode('demo');
          result = generateDemoResponse(prompt, diagramType);
        }

        // Render the elements
        await renderElements(result, signal);

        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message === 'Generation cancelled') {
          console.log('[DiagramGeneration] Generation cancelled by user');
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Failed to generate diagram';
          setError(errorMessage);
          console.error('[DiagramGeneration] Error:', err);
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [client, getProviderAndModel, renderElements]
  );

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  }, []);

  return {
    isGenerating,
    progress,
    error,
    mode,
    generate,
    cancel,
  };
}

export default useDiagramGeneration;

// Re-export utilities for external use
export { parseAIResponse, generateDemoResponse } from './canvasAIService';
