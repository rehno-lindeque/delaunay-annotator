class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Triangle {
  constructor(p1, p2, p3) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
  }

  containsPoint(point) {
    return [this.p1, this.p2, this.p3].some(vertex => vertex.x === point.x && vertex.y === point.y);
  }
}

class Circle {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }
}

class DelaunayTriangle {
  constructor(triangle, circumcircle) {
    this.triangle = triangle;
    this.circumcircle = circumcircle;
  }
}

const filterTrianglesOutsidePoint = (point, triangles) =>
  triangles.filter(triangle => !triangle.triangle.containsPoint(point));

const filterTrianglesContainingPoint = (point, triangles) =>
  triangles.filter(triangle => triangle.triangle.containsPoint(point));

class DelaunayEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.points = [
      new Point(0, 0),
      new Point(800, 0),
      new Point(800, 600),
      new Point(0, 600)
    ];
    this.triangles = [];
    this.render();
  }

  static get observedAttributes() {
    return ['width', 'height'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.points = [
        new Point(0, 0),
        new Point(800, 0),
        new Point(800, 600),
        new Point(0, 600)
      ];
      this.triangles = [];
      this.render();
    }
  }

  connectedCallback() {
    this.shadowRoot.querySelector('#svg').addEventListener('click', (e) => this.handleSvgClick(e));
  }

  render() {
    const width = this.getAttribute('width') || 800;
    const height = this.getAttribute('height') || 600;
    if (width && height) {
      this.shadowRoot.innerHTML = `
        <svg id="svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>
      `;
      this.updateSvg();
    } else {
      this.shadowRoot.innerHTML = '';
    }
  }

  handleSvgClick(event) {
    const svg = this.shadowRoot.querySelector('#svg');
    const rect = svg.getBoundingClientRect();
    const point = new Point(event.clientX - rect.left, event.clientY - rect.top);
    this.addPoint(point);
  }

  addPoint(point) {
    this.points.push(point);
    this.updateSvg();
  }

  updateSvg() {
    const svg = this.shadowRoot.querySelector('#svg');
    svg.innerHTML = this.points.map(point => 
      `<circle cx="${point.x}" cy="${point.y}" r="5" fill="red"></circle>`
    ).join('');
  }
};
customElements.define('delaunay-editor', DelaunayEditor);
