class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  handleMouseMove(event) {
    if (!this.isDrawing) return;

    const svg = this.shadowRoot.querySelector('#svg');
    const rect = svg.getBoundingClientRect();
    const point = new Point(event.clientX - rect.left, event.clientY - rect.top);

    this.triangles.forEach(triangle => {
      if (triangle.containsPoint(point)) {
        triangle.label = 'background';
      }
    });

    this.updateSvg();
  }
}

class Edge {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }
  key() {
    const [p1, p2] = [this.p1, this.p2].sort((a, b) => {
      if (a.x < b.x || (a.x === b.x && a.y < b.y)) return -1;
      if (a.x > b.x || (a.x === b.x && a.y > b.y)) return 1;
      return 0;
    });
    return `${p1.x},${p1.y},${p2.x},${p2.y}`;
  }
}

class Triangle {
  constructor(p1, p2, p3) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
  }

}

class Circle {
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }
}

class DelaunayTriangle {
  constructor(triangle) {
    this.triangle = triangle;
    this.circumcircle = this.computeCircumcircle();
    this.label = 'unknown'; // Default label
  }

  containsPoint(point) {
    const dx = point.x - this.circumcircle.center.x;
    const dy = point.y - this.circumcircle.center.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= this.circumcircle.radius * this.circumcircle.radius;
  }

  edges() {
    const { p1, p2, p3 } = this.triangle;
    return [
      new Edge(p1, p2),
      new Edge(p2, p3),
      new Edge(p3, p1)
    ];
  }

  computeCircumcircle() {
    const { p1, p2, p3 } = this.triangle;
    const dA = p1.x * p1.x + p1.y * p1.y;
    const dB = p2.x * p2.x + p2.y * p2.y;
    const dC = p3.x * p3.x + p3.y * p3.y;

    const aux1 = (dA * (p3.y - p2.y) + dB * (p1.y - p3.y) + dC * (p2.y - p1.y));
    const aux2 = -(dA * (p3.x - p2.x) + dB * (p1.x - p3.x) + dC * (p2.x - p1.x));
    const div = (2 * (p1.x * (p3.y - p2.y) + p2.x * (p1.y - p3.y) + p3.x * (p2.y - p1.y)));

    const center = new Point(aux1 / div, aux2 / div);
    const radius = Math.sqrt((center.x - p1.x) ** 2 + (center.y - p1.y) ** 2);

    return new Circle(center, radius);
  }
}

const coincident = (edge1, edge2) => (
    (edge1.p1.x === edge2.p1.x && edge1.p1.y === edge2.p1.y && edge1.p2.x === edge2.p2.x && edge1.p2.y === edge2.p2.y) ||
    (edge1.p1.x === edge2.p2.x && edge1.p1.y === edge2.p2.y && edge1.p2.x === edge2.p1.x && edge1.p2.y === edge2.p1.y)
  );

const outerEdges = (edges) => {
  const edgeCount = new Map();

  edges.forEach(edge => {
    const key = edge.key();
    if (edgeCount.has(key)) {
      edgeCount.set(key, edgeCount.get(key) + 1);
    } else {
      edgeCount.set(key, 1);
    }
  });

  return edges.filter(edge => {
    const key = edge.key();
    return edgeCount.get(key) === 1;
  });
}

const connect = (edge, point) => {
  const triangle = new Triangle(edge.p1, edge.p2, point);
  return new DelaunayTriangle(triangle);
}

const fillHole = (edges, point) =>
  edges.map(edge => connect(edge, point));

const partitionTriangles = (point, triangles) => {
  const goodTriangles = [];
  const badTriangles = [];

  triangles.forEach(triangle => {
    if (triangle.containsPoint(point)) {
      badTriangles.push(triangle);
    } else {
      goodTriangles.push(triangle);
    }
  });

  return { goodTriangles, badTriangles };
}

const addDelaunayPoint = (point, triangles) => {
  const { goodTriangles, badTriangles } = partitionTriangles(point, triangles);

  let hole = outerEdges(badTriangles.flatMap(triangle => triangle.edges()));

  const newTriangles = fillHole(hole, point);

  return goodTriangles.concat(newTriangles);
}

class DelaunayEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const width = this.getAttribute('width') || 800;
    const height = this.getAttribute('height') || 600;
    this.points = [
      new Point(0, 0),
      new Point(width, 0),
      new Point(width, height),
      new Point(0, height)
    ];
    this.triangles = [
      new DelaunayTriangle(new Triangle(this.points[0], this.points[1], this.points[2])),
      new DelaunayTriangle(new Triangle(this.points[0], this.points[2], this.points[3]))
    ];
    this.selectedTool = 'point'; // Default tool
    this.isDrawing = false;
    this.render();
    this.addEventListener('mousedown', () => this.isDrawing = true);
    this.addEventListener('mouseup', () => this.isDrawing = false);
    this.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }

  static get observedAttributes() {
    return ['width', 'height', 'selected-tool'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selected-tool') {
      this.selectedTool = newValue;
    } else if (new Set(['width', 'height']).has(name)) {
      // Clear and regenrate the triangle mesh
      if (oldValue !== newValue) {
        const width = this.getAttribute('width') || 800;
        const height = this.getAttribute('height') || 600;
        this.points = [
          new Point(0, 0),
          new Point(parseInt(width), 0),
          new Point(parseInt(width), parseInt(height)),
          new Point(0, parseInt(height))
        ];
        this.triangles = [
          new DelaunayTriangle(new Triangle(this.points[0], this.points[1], this.points[2])),
          new DelaunayTriangle(new Triangle(this.points[0], this.points[2], this.points[3]))
        ];
      }

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
        <style>
          svg {
            border: 1px solid black;
          }
          svg .unknown { fill: transparent; }
          svg .ignore { fill: gray; }
          svg .background { fill: white; }
          svg .body { fill: red; }
          svg .pick-surface { fill: green; }
          svg .lead { fill: blue; }
        </style>
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
    if (this.selectedTool === 'point') {
      const point = new Point(event.clientX - rect.left, event.clientY - rect.top);
      this.addPoint(point);
    }
  }

  addPoint(point) {
    this.points.push(point);
    this.triangles = addDelaunayPoint(point, this.triangles);
    this.updateSvg();
  }

  updateSvg() {
    const svg = this.shadowRoot.querySelector('#svg');
    svg.innerHTML = this.triangles.map(triangle => 
      `<polygon points="${triangle.triangle.p1.x},${triangle.triangle.p1.y} ${triangle.triangle.p2.x},${triangle.triangle.p2.y} ${triangle.triangle.p3.x},${triangle.triangle.p3.y}" class="${triangle.label}" stroke="black"/>`
    ).join('') + this.points.map(point => 
      `<circle cx="${point.x}" cy="${point.y}" r="5" fill="red"></circle>`
    ).join('');
  }
}

customElements.define('delaunay-editor', DelaunayEditor);
