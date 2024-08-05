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

const boundaryEdges = (edges) => {
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
  const occluders = boundaryEdges(badTriangles.flatMap(triangle => triangle.edges()));

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
  const hole = boundaryEdges(badTriangles.flatMap(triangle => triangle.edges()));
  const newTriangles = fillHole(hole, point);

  return goodTriangles.concat(newTriangles);
}

const connectedComponents = (nodes, neighbors) => {
  const visited = new Set();

  const dfs = (node) => {
    visited.add(node);
    const connected = [node];
    neighbors(node).forEach(neighbor => {
      if(!visited.has(neighbor))
        connected.push(dfs(neighbor))
    });
    return connected;
  }

  const components = [];
  nodes.forEach(node => {
    if (!visited.has(node))
      components.push(dfs(node).flat(Infinity));
  });

  return components;
};

const connectedTriangles = (triangles) => {
  // Build an adjacency lookup for linear time complexity
  const edgeToTriangles = new Map(
    triangles
      .flatMap(triangle => triangle.edges())
      .map(edge => [edge.key(), []])
  )
  triangles.forEach(triangle =>
    triangle.edges().forEach(edge =>
      edgeToTriangles
        .get(edge.key())
        .push(triangle)
    )
  )

  const neighbors = (triangle) =>
    triangle.edges()
      .flatMap(edge => edgeToTriangles.get(edge.key()))
      .filter(neighbor => neighbor !== triangle && neighbor.label === triangle.label)

  return connectedComponents(triangles, neighbors);
};

const eulerianCircuit = (node, nodeEdges, edgeNodes) => {
  // Find a eulerian circuit using Hierholzer's algorithm
  // This implementation assumes that the graph has a valid eulerian circuit
  const visited = new Set();

  const dfs = (node) => {
    const connected = [];
    nodeEdges(node).forEach(edge => {
      if (!visited.has(edge)) {
        visited.add(edge);
        const neighborNode = edgeNodes(edge).find(n => n !== node);
        connected.push(dfs(neighborNode));
        connected.push(node);
      }
    });
    return connected;
  }

  // Marking the first node as visited temporarily removes the starting node
  // to form a semi-eulerian graph
  return [dfs(node), node].flat(Infinity);
}

const connectedLoops = (triangles) => {
  const edges = boundaryEdges(
    triangles.flatMap(triangle => triangle.edges())
  );

  // Build an adjacency lookup for linear time complexity
  // This assumes there are no duplicate edges that join the same two points
  const pointToEdges = new Map(
    edges
      .flatMap(edge => edge.points)
      .map(point => [point, []])
  )
  edges.forEach(edge => {
    pointToEdges.get(edge.p1).push(edge)
    pointToEdges.get(edge.p2).push(edge)
  })

  const boundaries = connectedComponents(
    edges,
   (edge) =>
      edge.points
        .flatMap(point => pointToEdges.get(point))
        .filter(neighbor => neighbor.key() != edge.key())
  );

  // Search for a eulerian circuit to arrange points in the correct
  // sequence to form a loop (a.k.a. a circuit or cycle).
  const circuits = boundaries.map(edges =>
    eulerianCircuit(
      edges[0].p1,
      point => pointToEdges.get(point),
      edge => edge.points
    )
  );
  return circuits;
};

const signedArea = (points) => {
  // Shoelace formula
  const zip = (as, bs) => as.map((a, i) => [a, bs[i]]);
  const det = (v1, v2) => v1.x * v2.y - v1.y * v2.x;

  return zip(points, [...points.slice(1), points[0]])
    .map(([p1, p2]) => det(p1, p2))
    .reduce((sum, area) => sum + area);
};

const orientEdgeLoop = (points, clockwise = true) => {
  return ((signedArea(points) > 0) === clockwise) ? points : points.reverse();
};

const connectedRegions = (triangles) => {
  let regionId = 0;
  return connectedTriangles(triangles)
    .map(triangles => {
      const id = regionId++;
      const loops = connectedLoops(triangles);

      // Find the outer most loop (hull) of the polygonal region
      const hull = loops.reduce(
        (hull, loop) =>
          Math.abs(signedArea(loop)) > Math.abs(signedArea(hull)) ? loop : hull, 
        loops[0]
      );

      // The remaining loops are holes in the polygon
      const holes = loops.filter(loop => loop !== hull);

      return {
        id,
        label: triangles[0].label,
        hull: orientEdgeLoop(hull, true),
        holes: holes.map(loop => orientEdgeLoop(loop, false))
      };
    });
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
    this.addEventListener('mousedown', () => this.isDrawing = this.selectedTool === "brush");
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
            stroke: rgba(0,0,0,0.2);
          }
          svg path {
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

  renderRegion({ hull, holes, label, id }) {
    const pathData = [
      `M ${hull.map(p => `${p.x},${p.y}`).join(' L ')} Z`,
      ...holes.map(hole => `M ${hole.map(p => `${p.x},${p.y}`).join(' L ')} Z`)
    ].join(' ');

    return `<path d="${pathData}" class="${label}" data-id="${id}" />`;
  }

  updateSvg() {
    const svg = this.shadowRoot.querySelector('#svg');

    const polygons = connectedRegions(this.triangles)
      .map(region => this.renderRegion(region))
      .join('');

    const triangleOutlines = this.triangles.map(triangle => 
      `<polygon points="${triangle.triangle.p1.x},${triangle.triangle.p1.y} ${triangle.triangle.p2.x},${triangle.triangle.p2.y} ${triangle.triangle.p3.x},${triangle.triangle.p3.y}" fill="none"/>`
    ).join('');

    const points = this.points.map(point => 
      `<circle cx="${point.x}" cy="${point.y}" r="5" fill="red"></circle>`
    ).join('');

    svg.innerHTML = triangleOutlines +
      polygons + 
      points;
  }

  renderToImageBlob() {
    return new Promise((resolve, reject) => {
      const svg = this.shadowRoot.querySelector('#svg');
      const style = document.createElement('style');
      style.textContent = `
        path { fill: none; }
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

      // Draw each region with its ID packed into the R channel
      const regions = connectedRegions(this.triangles);
      regions.forEach(region => {
        const pathData = [
          `M ${region.hull.map(p => `${p.x},${p.y}`).join(' L ')} Z`,
          ...region.holes.map(hole => `M ${hole.map(p => `${p.x},${p.y}`).join(' L ')} Z`)
        ].join(' ');

        ctx.fillStyle = `rgb(${region.id}, 0, 0)`;
        const path = new Path2D(pathData);
        ctx.fill(path);
      });

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob conversion failed.'));
        }
      });
    });
  }

}

customElements.define('delaunay-editor', DelaunayEditor);

export { DelaunayEditor };
