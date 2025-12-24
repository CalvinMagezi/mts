/**
 * Canvas AI Service
 *
 * Provides AI-powered diagram generation using the MTS backend.
 * Falls back to demo mode when no AI provider is configured.
 */

import { generateDiagram as generateDiagramApi } from '../../api';
import type { DiagramType, SerializedElement } from '@chamuka/drawit-sdk';

export interface DiagramGenerationResult {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    shape?: string;
    text?: string;
    style?: Record<string, string>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
}

/**
 * Parse AI response to extract diagram elements
 */
export function parseAIResponse(response: string): DiagramGenerationResult {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.nodes)) {
        return {
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
        };
      }
    } catch (e) {
      console.error('[CanvasAI] JSON parse error:', e);
    }
  }

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.nodes)) {
      return {
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
      };
    }
  } catch (e) {
    console.error('[CanvasAI] Direct parse error:', e);
  }

  throw new Error('Could not parse diagram from AI response');
}

/**
 * Generate diagram using the dedicated diagram generation API
 */
export async function generateWithApi(
  prompt: string,
  diagramType: DiagramType,
  editMode: boolean,
  existingElements: SerializedElement[],
  provider: string,
  model: string,
  onProgress?: (text: string) => void
): Promise<DiagramGenerationResult> {
  try {
    console.log('[CanvasAI] Generating diagram with API:', { prompt, diagramType, provider, model });

    const response = await generateDiagramApi({
      body: {
        prompt,
        diagram_type: diagramType,
        provider,
        model,
        edit_mode: editMode,
        existing_elements: editMode ? JSON.stringify(existingElements) : undefined,
      },
    });

    if (response.error) {
      console.error('[CanvasAI] API error:', response.error);
      throw new Error('Failed to generate diagram');
    }

    if (!response.data?.diagram_json) {
      throw new Error('No diagram data received from API');
    }

    onProgress?.(response.data.diagram_json);

    return parseAIResponse(response.data.diagram_json);
  } catch (error) {
    console.error('[CanvasAI] Generation error:', error);
    throw error;
  }
}

/**
 * Generate demo diagram (fallback when no AI is available)
 */
export function generateDemoResponse(
  prompt: string,
  _diagramType: DiagramType
): DiagramGenerationResult {
  const lowerPrompt = prompt.toLowerCase();
  const primaryColor = '#1DE52F';
  const accentColor = '#00C6FA';
  const bgColor = '#1a1d21';

  // Auth flow
  if (lowerPrompt.includes('auth') || lowerPrompt.includes('login') || lowerPrompt.includes('user')) {
    return {
      nodes: [
        { id: 'user', position: { x: 100, y: 200 }, size: { width: 100, height: 50 }, shape: 'ellipse', text: 'User', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
        { id: 'login', position: { x: 280, y: 200 }, size: { width: 140, height: 60 }, shape: 'rectangle', text: 'Login Form', style: { fillStyle: bgColor, strokeStyle: accentColor } },
        { id: 'validate', position: { x: 480, y: 200 }, size: { width: 100, height: 100 }, shape: 'diamond', text: 'Valid?', style: { fillStyle: bgColor, strokeStyle: primaryColor } },
        { id: 'dashboard', position: { x: 660, y: 120 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Dashboard', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
        { id: 'error', position: { x: 660, y: 280 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Error', style: { fillStyle: '#ef4444', strokeStyle: '#ef4444' } },
      ],
      edges: [
        { id: 'e1', source: 'user', target: 'login', label: 'visit' },
        { id: 'e2', source: 'login', target: 'validate', label: 'submit' },
        { id: 'e3', source: 'validate', target: 'dashboard', label: 'yes' },
        { id: 'e4', source: 'validate', target: 'error', label: 'no' },
      ],
    };
  }

  // API/Service flow
  if (lowerPrompt.includes('api') || lowerPrompt.includes('service') || lowerPrompt.includes('request') || lowerPrompt.includes('server')) {
    return {
      nodes: [
        { id: 'client', position: { x: 100, y: 200 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Client', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
        { id: 'gateway', position: { x: 300, y: 200 }, size: { width: 140, height: 60 }, shape: 'hexagon', text: 'API Gateway', style: { fillStyle: bgColor, strokeStyle: accentColor } },
        { id: 'service', position: { x: 520, y: 200 }, size: { width: 140, height: 60 }, shape: 'rectangle', text: 'Service', style: { fillStyle: bgColor, strokeStyle: primaryColor } },
        { id: 'database', position: { x: 740, y: 200 }, size: { width: 100, height: 50 }, shape: 'ellipse', text: 'Database', style: { fillStyle: accentColor, strokeStyle: accentColor } },
      ],
      edges: [
        { id: 'e1', source: 'client', target: 'gateway', label: 'request' },
        { id: 'e2', source: 'gateway', target: 'service', label: 'route' },
        { id: 'e3', source: 'service', target: 'database', label: 'query' },
      ],
    };
  }

  // Data/Pipeline flow
  if (lowerPrompt.includes('data') || lowerPrompt.includes('pipeline') || lowerPrompt.includes('etl') || lowerPrompt.includes('process')) {
    return {
      nodes: [
        { id: 'source', position: { x: 100, y: 200 }, size: { width: 120, height: 60 }, shape: 'ellipse', text: 'Data Source', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
        { id: 'extract', position: { x: 280, y: 200 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Extract', style: { fillStyle: bgColor, strokeStyle: accentColor } },
        { id: 'transform', position: { x: 460, y: 200 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Transform', style: { fillStyle: bgColor, strokeStyle: accentColor } },
        { id: 'load', position: { x: 640, y: 200 }, size: { width: 120, height: 60 }, shape: 'rectangle', text: 'Load', style: { fillStyle: bgColor, strokeStyle: accentColor } },
        { id: 'warehouse', position: { x: 820, y: 200 }, size: { width: 120, height: 60 }, shape: 'ellipse', text: 'Warehouse', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
      ],
      edges: [
        { id: 'e1', source: 'source', target: 'extract' },
        { id: 'e2', source: 'extract', target: 'transform' },
        { id: 'e3', source: 'transform', target: 'load' },
        { id: 'e4', source: 'load', target: 'warehouse' },
      ],
    };
  }

  // Default: Simple flowchart
  return {
    nodes: [
      { id: 'start', position: { x: 100, y: 200 }, size: { width: 100, height: 50 }, shape: 'ellipse', text: 'Start', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
      { id: 'step1', position: { x: 280, y: 200 }, size: { width: 140, height: 60 }, shape: 'rectangle', text: 'Step 1', style: { fillStyle: bgColor, strokeStyle: accentColor } },
      { id: 'decision', position: { x: 480, y: 200 }, size: { width: 100, height: 100 }, shape: 'diamond', text: 'Check', style: { fillStyle: bgColor, strokeStyle: primaryColor } },
      { id: 'step2', position: { x: 660, y: 120 }, size: { width: 140, height: 60 }, shape: 'rectangle', text: 'Step 2A', style: { fillStyle: bgColor, strokeStyle: accentColor } },
      { id: 'step3', position: { x: 660, y: 280 }, size: { width: 140, height: 60 }, shape: 'rectangle', text: 'Step 2B', style: { fillStyle: bgColor, strokeStyle: accentColor } },
      { id: 'end', position: { x: 860, y: 200 }, size: { width: 100, height: 50 }, shape: 'ellipse', text: 'End', style: { fillStyle: primaryColor, strokeStyle: primaryColor } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'step1' },
      { id: 'e2', source: 'step1', target: 'decision' },
      { id: 'e3', source: 'decision', target: 'step2', label: 'yes' },
      { id: 'e4', source: 'decision', target: 'step3', label: 'no' },
      { id: 'e5', source: 'step2', target: 'end' },
      { id: 'e6', source: 'step3', target: 'end' },
    ],
  };
}
