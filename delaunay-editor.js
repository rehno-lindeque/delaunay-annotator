class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  between(v1, v2) {
    // The sign of the determinant formed from two basis vectors gives a clocwise/anti-clockwise orientation
    const det = (w1, w2) => w1.x * w2.y - w1.y * w2.x;
    const d1 = Math.sign(det(this, v1));
    const d2 = Math.sign(det(this, v2));

    // The line formed by the a vector u is between two vectors v1, v2 if those vectors are on opposite sides
    const isOpposite = d1 !== d2;

    // Check if the vector is *strictly* between by checking if either v1 or v2 coincides with it
    const isCoincident = d1 === 0 || d2 === 0;

    return isOpposite && !isCoincident;
  }
}

class Edge {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }

  get points() {
    return [this.p1, this.p2];
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

  get points() {
    return [this.p1, this.p2, this.p3];
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

  intersectsPoint(point) {
    const { p1, p2, p3 } = this.triangle;

    const area = (p1, p2, p3) => Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2.0);

    const A = area(p1, p2, p3);
    const A1 = area(point, p2, p3);
    const A2 = area(p1, point, p3);
    const A3 = area(p1, p2, point);

    return (A === A1 + A2 + A3);
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

  occluded(pov, occluders) {
    const coincident = (p1, p2) => p1.x === p2.x && p1.y === p2.y;
    return this.triangle.points.some(p => {
      const v = new Vector(p.x - pov.x, p.y - pov.y);

      return occluders.some(({p1, p2}) => {
        const w = new Vector(p2.x - p1.x, p2.y - p1.y);

        // Line segment intersection test
        const v1 = new Vector(p1.x - pov.x, p1.y - pov.y);
        const v2 = new Vector(p2.x - pov.x, p2.y - pov.y);

        const w1 = new Vector(pov.x - p1.x, pov.y - p1.y);
        const w2 = new Vector(p.x - p1.x, p.y - p1.y);

        return v.between(v1, v2) && w.between(w1, w2);
      });
    });
  }
}

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
    if (triangle.containsPoint(point))
      badTriangles.push(triangle);
    else
      goodTriangles.push(triangle);
  });

  return { goodTriangles, badTriangles };
}

const partitionTrianglesWithConstraints = (point, triangles) => {
  // Partition triangles into a labeled and unlabeled (technically labeled "unknown") sets,
  // where labeled triangles are considered constrained.
  // Constrained triangles may not be split.
  const unconstrainedTriangles = [];
  const constrainedTriangles = [];
  triangles.forEach(triangle => {
    if (triangle.label === "unknown")
      unconstrainedTriangles.push(triangle);
    else
      constrainedTriangles.push(triangle);
  });

  // Partition all unconstrained triangles by identifying triangles that violate the Delaunay condition
  const { goodTriangles, badTriangles } = partitionTriangles(point, unconstrainedTriangles);

  // Get the exterior edges of the polygonal hole(s) for efficiency
  const occluders = outerEdges(badTriangles.flatMap(triangle => triangle.edges()));

  // Ensure that the polygonal hole will be star shaped by removing occluded triangles from the set of bad triangles
  const occludedTriangles = [];
  const visibleTriangles = [];

  badTriangles.forEach(triangle => {
    if (triangle.occluded(point, occluders))
      occludedTriangles.push(triangle);
    else
      visibleTriangles.push(triangle);
  })

  return { goodTriangles: goodTriangles.concat(constrainedTriangles, occludedTriangles), badTriangles: visibleTriangles }
}

const addDelaunayPoint = (point, triangles) => {
  const { goodTriangles, badTriangles } = partitionTrianglesWithConstraints(point, triangles);
  const hole = outerEdges(badTriangles.flatMap(triangle => triangle.edges()));
  const newTriangles = fillHole(hole, point);

  return goodTriangles.concat(newTriangles);
}

const connectedComponents = (nodes, adjacent) => {
  // Depth first graph traversal
  const dfs = ([prev, next, ...remaining], disconnected = []) => {
    if (next == null)
      return {
        connected: [prev],
        disconnected
      };

    // Test if the next triangle is disconnected from the previous triangle
    if (next.label !== prev.label || !adjacent(prev, next))
      return dfs(
        nodes = [prev, ...remaining],
        disconnected = [...disconnected, next],
      );

    // The next triangle is connected to the previous triangle
    result = dfs(
      nodes = [next, ...remaining],
      disconnected = disconnected
    );
    return {
      connected: [ prev, ...result.connected ],
      disconnected: result.disconnected
    };
  };

  const { connected, disconnected } = dfs(nodes);
  return [connected, ...connectedComponents(disconnected, adjacent)];
};

const connectedTriangles = (triangles) => {
  return connectedComponents(
    nodes = triangles,
    adjacent = (t1, t2) =>
      !new Set(t1.edges().map(e => e.key())).isDisjointFrom(new Set(t2.edges.map(e => e.key)))
  );
}

const connectedEdges = (edges) => {
  return connectedComponents(
    nodes = edges,
    adjacent = (e1, e2) => 
      !new Set(e1.points).isDisjointFrom(new Set(e2.points))
  )
};

const sortPoints = (points, clockwise) => {
  const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });

  center.x /= points.length;
  center.y /= points.length;

  const det = (v1, v2) => v1.x * v2.y - v1.y * v2.x;

  return points.sort((p1, p2) =>
    (clockwise ? -1 : 1) * Math.sign(det(new Vector(p1.x - center.x, p1.y - center.y), new Vector(p2.x - center.x, p2.y - center.y)))
  );
};

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
    this.addEventListener('mousedown', () => this.isDrawing = this.selectedTool == "brush");
    this.addEventListener('mouseup', (e) => {
      if (this.isDrawing)
        this.handleSvgMouseMove(e)
      this.isDrawing = false
    });
    this.addEventListener('mousemove', (e) => this.handleSvgMouseMove(e));
  }

  static get observedAttributes() {
    return ['width', 'height', 'selected-tool', 'brush-label'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selected-tool') {
      this.selectedTool = newValue;
    } else if (name === 'brush-label') {
      this.brushLabel = newValue;
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
          svg polygon {
            stroke: black;
          }
        </style>
        <svg id="svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>
      `;
      this.updateSvg();
    } else {
      this.shadowRoot.innerHTML = '';
    }
  }

  handleSvgMouseMove(event) {
    if (!this.isDrawing) return;

    const svg = this.shadowRoot.querySelector('#svg');
    const rect = svg.getBoundingClientRect();
    const point = new Point(event.clientX - rect.left, event.clientY - rect.top);

    this.triangles.forEach(triangle => {
      if (triangle.intersectsPoint(point)) {
        triangle.label = this.brushLabel;
      }
    });

    this.updateSvg();
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

    // If the point directly intersects a labeled triangle reset its label so that it may be split apart
    this.triangles.forEach(triangle => {
      if (triangle.intersectsPoint(point)) {
        triangle.label = "unknown";
      }
    });

    // Re-triangulate the mesh using a constrained delaunay triangulation method
    this.triangles = addDelaunayPoint(point, this.triangles);
    this.updateSvg();
  }

  updateSvg() {
    const svg = this.shadowRoot.querySelector('#svg');
    svg.innerHTML = this.triangles.map(triangle => 
      `<polygon points="${triangle.triangle.p1.x},${triangle.triangle.p1.y} ${triangle.triangle.p2.x},${triangle.triangle.p2.y} ${triangle.triangle.p3.x},${triangle.triangle.p3.y}" class="${triangle.label}"/>`
    ).join('') + this.points.map(point => 
      `<circle cx="${point.x}" cy="${point.y}" r="5" fill="red"></circle>`
    ).join('');
  }

  renderToImageBlob() {
    return new Promise((resolve, reject) => {
      const svg = this.shadowRoot.querySelector('#svg');
      const style = document.createElement('style');
      style.textContent = `
        .unknown { fill: transparent; }
        .ignore { fill: gray; }
        .background { fill: white; }
        .body { fill: red; }
        .pick-surface { fill: green; }
        .lead { fill: blue; }
        polygon { stroke: none; shape-rendering: crispEdges; }
        circle { fill: none; }
      `;

      const clonedSvg = svg.cloneNode(true);
      clonedSvg.appendChild(style);

      const svgData = new XMLSerializer().serializeToString(clonedSvg);

      const canvas = document.createElement('canvas');
      canvas.width = svg.width.baseVal.value;
      canvas.height = svg.height.baseVal.value;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob conversion failed.'));
          }
        });
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    });
  }

}

customElements.define('delaunay-editor', DelaunayEditor);

export { DelaunayEditor };
