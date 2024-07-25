class AnnotationToolbox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .toolbar {
          display: flex;
          flex-direction: column;
          gap: 1Em;
          padding: .5Em;
        }
        .tool {
          width: 2Em;
          height: 2Em;
          border-radius: 50%;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .tool.selected {
          border-width: 2px;
        }
        .tool.brush.selected:before {
          content: "🖌️"
        }
        .tool#unknown { background-color: transparent; }
        .tool#ignore { background-color: gray; }
        .tool#background { background-color: white; }
        .tool#body { background-color: red; }
        .tool#pick-surface { background-color: green; }
        .tool#lead { background-color: blue; }
      </style>
      <div class="toolbar">
        <div class="tool point" title="Point Tool">●</div>
        <div class="tool brush" id="unknown" title="Unknown Brush"></div>
        <div class="tool brush" id="ignore" title="Ignore Brush"></div>
        <div class="tool brush" id="background" title="Background Brush"></div>
        <div class="tool brush" id="body" title="Body Brush"></div>
        <div class="tool brush" id="pick-surface" title="Pick Surface Brush"></div>
        <div class="tool brush" id="lead" title="Lead Brush"></div>
      </div>
    `;

    this.shadowRoot.querySelectorAll('.tool').forEach(tool => {
      tool.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.tool').forEach(t => t.classList.remove('selected'));
        tool.classList.add('selected');
        const toolType = tool.classList.contains('brush') ? 'brush' : 'point';
        const brushLabel = toolType === 'brush' ? tool.id : null;
        this.dispatchEvent(new CustomEvent('tool-selected', { detail: { tool: toolType, brushLabel: brushLabel } }));
      });
    });
  }
}

customElements.define('annotation-toolbox', AnnotationToolbox);

export { AnnotationToolbox };
