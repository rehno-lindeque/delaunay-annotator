class DelaunayEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.points = [
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 600 },
      { x: 0, y: 600 }
    ];
    this.triangles = [];
    this.render();
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#svg').addEventListener('click', (e) => this.handleSvgClick(e));
  }

  render() {
    const width = this.getAttribute('width') || 800;
    const height = this.getAttribute('height') || 600;
    this.shadowRoot.innerHTML = `
      <svg id="svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>
    `;
    this.updateSvg();
  }

  handleSvgClick(event) {
    const svg = this.shadowRoot.querySelector('#svg');
    const rect = svg.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    this.addPoint(point);
  }

  addPoint(point) {
    this.points.push(point);
    this.updateSvg();
  }

  updateSvg() {
    const svg = this.shadowRoot.querySelector('#svg');
    svg.innerHTML = this.points.map(point => `
      <circle cx="${point.x}" cy="${point.y}" r="5" fill="red"></circle>
    `).join('');
  }
}

customElements.define('delaunay-editor', DelaunayEditor);
