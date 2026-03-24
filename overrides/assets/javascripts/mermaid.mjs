import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs';

mermaid.registerLayoutLoaders(elkLayouts);
mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  layout: "elk",
  flowchart: { useMaxWidth: true, htmlLabels: true },
  sequence: { useMaxWidth: true, showSequenceNumbers: false, actorMargin: 50, messageMargin: 35 },
  classDiagram: { useMaxWidth: true },
  stateDiagram: { useMaxWidth: true },
  er: { useMaxWidth: true },
});

// 必须暴露给 Material for MkDocs 识别
window.mermaid = mermaid;