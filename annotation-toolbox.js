class AnnotationToolbox extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.tools = this.parseTools();
    this.tools = this.parseTools();
    this.render();
    this.registerKeyboardShortcuts();
    this.shadowRoot.querySelector(`.tool`).click();
  }

  parseTools() {
    const defaultShortcuts = {
      'p': 'point-tool',
      'e': 'unknown',
      'i': 'ignore',
      'b': 'background'
    };

    // Assign default shortcuts to custom brushes
    let customBrushIndex = 1;
    const predefinedTools = {
      'point-tool': { toolType: 'point', id: 'point-tool', title: 'Point Tool', shortcut: 'p' },
      'eraser': { toolType: 'brush', id: 'unknown', title: 'Eraser', color: 'transparent', shortcut: 'e' },
    };

    const predefinedBrushes = {
      'background': { toolType: 'brush', id: 'background', title: 'Background Brush', color: 'white', shortcut: 'b' },
      'ignore': { toolType: 'brush', id: 'ignore', title: 'Ignore Brush', color: 'gray', shortcut: 'i' }
    };

    const allTools = Array.from(this.querySelectorAll('brush, eraser, point-tool')).map(el => {
      const toolType = el.tagName.toLowerCase();
      const predefinedBrushNames = new Set(Object.keys(predefinedBrushes));
      const brushType = new Set(el.getAttributeNames()).intersection(predefinedBrushNames).values().next().value;
      const predefinedTool = toolType === 'brush' ? predefinedBrushes[brushType] : predefinedTools[toolType];

      let keyIndex = 1;
      return predefinedTool ? predefinedTool : {
        toolType,
        id: el.getAttribute('id'),
        title: el.getAttribute('title'),
        color: el.getAttribute('color'),
        shortcut: el.getAttribute('shortcut') ?? String(keyIndex++)
      };
    });

    return allTools;
  }

  registerKeyboardShortcuts() {
    const shortcutToId = new Map(this.tools.map(tool => [tool.shortcut, tool.id]));
    document.addEventListener('keydown', (event) => {
      const toolId = shortcutToId.get(event.key);
      if (toolId) {
        this.shadowRoot.querySelector(`#${toolId}`)?.click();
      }
    });
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
        .tool.point:before {
          content: "●";
        }
        .tool.brush.selected:before {
          content: "🖌️";
        }
      </style>
      <div class="toolbar">
        ${this.tools.map(({toolType, id, title, color, shortcut}) => `
          <div class="tool ${toolType}" id="${id}" title="${title} (${shortcut})" style="background-color: ${color ?? 'transparent'};"></div>`
        ).join('')}
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
