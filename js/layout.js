// --- AUTO LAYOUT ENGINE (Hierarchical DAG) ---
    class AutoLayoutEngine {
      static layout(graph, direction = 'TD') {
        const nodes = graph.nodes;
        const edges = graph.edges;
        if (nodes.length === 0) return;

        const inDegree = {};
        const adj = {};

        nodes.forEach(n => {
          inDegree[n.id] = 0;
          adj[n.id] = [];
        });

        edges.forEach(e => {
          if (adj[e.source] && inDegree[e.target] !== undefined) {
            adj[e.source].push(e.target);
            inDegree[e.target]++;
          }
        });

        const rank = {};
        const queue = [];

        nodes.forEach(n => {
          if (inDegree[n.id] === 0) {
            queue.push(n.id);
            rank[n.id] = 0;
          }
        });

        if (queue.length === 0 && nodes.length > 0) {
          queue.push(nodes[0].id);
          rank[nodes[0].id] = 0;
        }

        const visited = new Set();
        while (queue.length > 0) {
          const u = queue.shift();
          visited.add(u);
          const currentRank = rank[u] || 0;
          for (const v of adj[u] || []) {
            rank[v] = Math.max(rank[v] || 0, currentRank + 1);
            if (!visited.has(v) && !queue.includes(v)) {
              queue.push(v);
            }
          }
        }

        nodes.forEach((n, idx) => {
          if (rank[n.id] === undefined) {
            rank[n.id] = idx % 3;
          }
        });

        const layers = {};
        nodes.forEach(n => {
          const r = rank[n.id] || 0;
          if (!layers[r]) layers[r] = [];
          layers[r].push(n);
        });

        const maxRank = Math.max(...Object.keys(layers).map(Number), 0);
        const nodeWidth = 160;
        const nodeHeight = 50;
        const hGap = 60;
        const vGap = 80;

        if (direction === 'TD') {
          let curY = 80;
          for (let r = 0; r <= maxRank; r++) {
            const layerNodes = layers[r] || [];
            const totalWidth = layerNodes.length * nodeWidth + (layerNodes.length - 1) * hGap;
            let startX = Math.max(80, 500 - totalWidth / 2);
            layerNodes.forEach((n, idx) => {
              n.x = Math.round(startX + idx * (nodeWidth + hGap));
              n.y = Math.round(curY);
            });
            curY += nodeHeight + vGap;
          }
        } else {
          let curX = 80;
          for (let r = 0; r <= maxRank; r++) {
            const layerNodes = layers[r] || [];
            const totalHeight = layerNodes.length * nodeHeight + (layerNodes.length - 1) * vGap;
            let startY = Math.max(80, 350 - totalHeight / 2);
            layerNodes.forEach((n, idx) => {
              n.x = Math.round(curX);
              n.y = Math.round(startY + idx * (nodeHeight + vGap));
            });
            curX += nodeWidth + hGap + 40;
          }
        }
      }
    }