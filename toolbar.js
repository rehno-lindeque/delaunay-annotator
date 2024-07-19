class Toolbar extends HTMLElement {
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
          gap: 10px;
        }
        .tool {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .tool.selected {
          border: 2px solid blue;
        }
        .tool.unknown { background-color: transparent; }
        .tool.ignore { background-color: gray; }
        .tool.background { background-color: white; }
        .tool.body { background-color: red; }
        .tool.pick-surface { background-color: green; }
        .tool.lead { background-color: blue; }
      </style>
      <div class="toolbar">
        <div class="tool point" title="Point Tool">●</div>
        <div class="tool unknown" title="Unknown Label"></div>
        <div class="tool ignore" title="Ignore Label"></div>
        <div class="tool background" title="Background Label"></div>
        <div class="tool body" title="Body Label"></div>
        <div class="tool pick-surface" title="Pick Surface Label"></div>
        <div class="tool lead" title="Lead Label"></div>
      </div>
    `;

    this.shadowRoot.querySelectorAll('.tool').forEach(tool => {
      tool.addEventListener('click', () => {
        this.shadowRoot.querySelectorAll('.tool').forEach(t => t.classList.remove('selected'));
        tool.classList.add('selected');
        this.dispatchEvent(new CustomEvent('tool-selected', { detail: tool.classList[1] }));
      });
    });
  }
}

customElements.define('toolbar-component', Toolbar);
