(() => {
  const data = window.MAP_DATA;
  const graphCanvas = document.querySelector("#graph-canvas");
  const graphNodes = document.querySelector("#graph-nodes");
  const graphEdges = document.querySelector("#graph-edges");
  const detailEmpty = document.querySelector("#detail-empty");
  const detailContent = document.querySelector("#detail-content");
  const breadcrumbCurrent = document.querySelector("#breadcrumb-current");
  const breadcrumbHome = document.querySelector("#breadcrumb-home");
  const searchInput = document.querySelector("#map-search");
  const searchResults = document.querySelector("#search-results");
  const controlButtons = [...document.querySelectorAll("[data-view]")];
  const sourceAccordions = document.querySelector("#source-accordions");

  const sectionById = new Map(data.sections.map(section => [section.id, section]));
  const nodeById = new Map();
  data.sections.forEach(section => section.nodes.forEach(node => nodeById.set(node.id, { node, section })));

  const state = {
    sectionId: null,
    selectedId: "root",
    positions: new Map()
  };

  const overviewPositions = [
    [50, 12], [78, 23], [85, 50], [77, 77],
    [50, 88], [23, 77], [15, 50], [22, 23]
  ];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setControl(id) {
    controlButtons.forEach(button => {
      const active = button.dataset.view === id || (id === "overview" && button.dataset.view === "overview");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function makeNode({ id, title, eyebrow, summary, x, y, accent, classes = "", onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `graph-node ${classes}`.trim();
    button.dataset.nodeId = id;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.style.setProperty("--node-accent", accent);
    button.innerHTML = `
      <span class="node-index">${escapeHtml(eyebrow)}</span>
      <span class="node-title">${escapeHtml(title)}</span>
      ${summary ? `<span class="node-summary">${escapeHtml(summary)}</span>` : ""}
    `;
    button.addEventListener("click", onClick);
    graphNodes.append(button);
    state.positions.set(id, { x, y });
    return button;
  }

  function edgePath(from, to, bend = 0) {
    const rect = graphCanvas.getBoundingClientRect();
    const x1 = from.x / 100 * rect.width;
    const y1 = from.y / 100 * rect.height;
    const x2 = to.x / 100 * rect.width;
    const y2 = to.y / 100 * rect.height;
    const middleX = (x1 + x2) / 2 + bend;
    return `M ${x1} ${y1} C ${middleX} ${y1}, ${middleX} ${y2}, ${x2} ${y2}`;
  }

  function addEdge(fromId, toId, classes = "edge-line", bend = 0) {
    const from = state.positions.get(fromId);
    const to = state.positions.get(toId);
    if (!from || !to) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", edgePath(from, to, bend));
    path.setAttribute("class", classes);
    graphEdges.append(path);
  }

  function resetGraph() {
    graphNodes.replaceChildren();
    graphEdges.replaceChildren();
    state.positions.clear();
    graphEdges.setAttribute("viewBox", `0 0 ${graphCanvas.clientWidth || 900} ${graphCanvas.clientHeight || 720}`);
  }

  function rootDetail() {
    showDetail({
      title: data.title,
      eyebrow: "System thesis",
      summary: data.centralClaim,
      bullets: [
        "Material workflow: airflow → readings → calculation → curves → redesign.",
        "Social infrastructure: checking, training, transport, mentorship, and collective expertise.",
        "Institutional hierarchy: lower classifications, segregation, uneven credit, and promotion gates.",
        "Archival filter: reports survived more readily than the labor and artifacts behind them."
      ],
      evidence: "Across all eight source documents, the same pattern recurs: research success depended on human computation while institutional categories made that dependence easy to overlook.",
      sources: Object.keys(data.sources),
      accent: "#8ea8d8",
      bridges: data.sections.map(section => ({ label: section.short, sectionId: section.id }))
    }, "root");
  }

  function renderOverview({ preserveDetail = false } = {}) {
    state.sectionId = null;
    graphCanvas.classList.remove("branch-view");
    graphCanvas.style.minHeight = "720px";
    breadcrumbCurrent.textContent = "All domains";
    setControl("overview");
    resetGraph();

    makeNode({
      id: "root",
      title: "The Human Computer as a Hidden Flight System",
      eyebrow: "Root claim",
      summary: "Labor • knowledge • power • memory",
      x: 50,
      y: 50,
      accent: "#8ea8d8",
      classes: "root-node",
      onClick: rootDetail
    });

    data.sections.forEach((section, index) => {
      const [x, y] = overviewPositions[index];
      makeNode({
        id: section.id,
        title: section.short,
        eyebrow: `${section.number} / domain`,
        summary: section.title,
        x, y,
        accent: section.accent,
        onClick: () => openSection(section.id)
      });
    });

    data.sections.forEach(section => addEdge("root", section.id));
    if (!preserveDetail) rootDetail();
    markSelected(state.selectedId);
  }

  function renderSection(section, { selectedId = null } = {}) {
    state.sectionId = section.id;
    graphCanvas.classList.add("branch-view");
    const rows = Math.ceil(section.nodes.length / 2);
    const graphHeight = Math.max(720, rows * 126 + 100);
    graphCanvas.style.minHeight = `${graphHeight}px`;
    breadcrumbCurrent.textContent = section.short;
    setControl(section.id);
    resetGraph();

    makeNode({
      id: section.id,
      title: section.short,
      eyebrow: `${section.number} / domain`,
      summary: section.thesis,
      x: 17,
      y: 50,
      accent: section.accent,
      classes: "hub-node",
      onClick: () => showSectionDetail(section)
    });

    const firstColumnCount = Math.ceil(section.nodes.length / 2);
    section.nodes.forEach((node, index) => {
      const secondColumn = index >= firstColumnCount;
      const row = secondColumn ? index - firstColumnCount : index;
      const columnCount = secondColumn ? section.nodes.length - firstColumnCount : firstColumnCount;
      const y = 11 + (row * (78 / Math.max(1, columnCount - 1)));
      const x = secondColumn ? 80 : 50;
      makeNode({
        id: node.id,
        title: node.title,
        eyebrow: node.step ? `Step ${node.step}` : node.eyebrow,
        summary: node.summary,
        x, y: columnCount === 1 ? 50 : y,
        accent: section.accent,
        classes: `detail-node ${node.step ? "step-node" : ""}`,
        onClick: () => showNodeDetail(node, section)
      });
    });

    section.nodes.forEach((node, index) => addEdge(section.id, node.id, "edge-line is-soft", index % 2 ? 16 : -16));
    if (section.special === "workflow") {
      const stages = section.nodes.filter(node => node.step).sort((a, b) => a.step - b.step);
      stages.slice(0, -1).forEach((node, index) => addEdge(node.id, stages[index + 1].id, "edge-pulse"));
      addEdge(stages.at(-1).id, stages[0].id, "edge-pulse", -80);
    }

    if (selectedId && nodeById.has(selectedId)) {
      const { node } = nodeById.get(selectedId);
      showNodeDetail(node, section, false);
    } else {
      showSectionDetail(section, false);
    }
    markSelected(selectedId || section.id);
  }

  function openSection(sectionId, { scroll = false, selectedId = null } = {}) {
    const section = sectionById.get(sectionId);
    if (!section) return;
    renderSection(section, { selectedId });
    if (scroll) document.querySelector("#map").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markSelected(id) {
    state.selectedId = id;
    document.querySelectorAll(".graph-node").forEach(node => {
      node.classList.toggle("is-selected", node.dataset.nodeId === id);
    });
  }

  function relatedBridges(itemId, section) {
    const exact = data.crossLinks.flatMap(link => {
      if (link.from === itemId) return [{ label: link.label, nodeId: link.to }];
      if (link.to === itemId) return [{ label: link.label, nodeId: link.from }];
      return [];
    });
    const domains = (section?.bridges || []).map(sectionId => ({ label: `Open ${sectionById.get(sectionId).short}`, sectionId }));
    return [...exact, ...domains].slice(0, 6);
  }

  function showSectionDetail(section, focus = true) {
    showDetail({
      title: section.title,
      eyebrow: `${section.number} / ${section.short}`,
      summary: section.thesis,
      bullets: section.nodes.slice(0, 4).map(node => node.title),
      evidence: `This domain contains ${section.nodes.length} explorable concepts drawn from ${section.sources.map(key => data.sources[key].label).join(" and ")}.`,
      sources: section.sources,
      accent: section.accent,
      bridges: section.bridges.map(sectionId => ({ label: `Continue to ${sectionById.get(sectionId).short}`, sectionId }))
    }, section.id, focus);
  }

  function showNodeDetail(node, section, focus = true) {
    showDetail({
      ...node,
      accent: section.accent,
      bridges: relatedBridges(node.id, section)
    }, node.id, focus);
  }

  function showDetail(item, selectedId, focus = true) {
    detailEmpty.hidden = true;
    detailContent.hidden = false;
    detailContent.style.setProperty("--detail-accent", item.accent || "#8ea8d8");
    const sourcePills = (item.sources || []).map(key => {
      const source = data.sources[key];
      return `<span class="source-pill" title="${escapeHtml(source.focus)}">${escapeHtml(source.label)}</span>`;
    }).join("");
    const bridgeButtons = (item.bridges || []).map(bridge => `
      <button class="bridge-button" type="button"
        ${bridge.sectionId ? `data-bridge-section="${escapeHtml(bridge.sectionId)}"` : ""}
        ${bridge.nodeId ? `data-bridge-node="${escapeHtml(bridge.nodeId)}"` : ""}>
        ${escapeHtml(bridge.label)} →
      </button>
    `).join("");

    detailContent.innerHTML = `
      <p class="detail-kicker">${escapeHtml(item.eyebrow || "Study note")}</p>
      <h3 id="detail-title">${escapeHtml(item.title)}</h3>
      <p class="detail-summary">${escapeHtml(item.summary)}</p>
      ${(item.bullets || []).length ? `<ul>${item.bullets.map(bullet => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
      <details open>
        <summary>Why this matters</summary>
        <p>${escapeHtml(item.evidence || "This concept helps explain how the research system joined technical work to institutional structure.")}</p>
      </details>
      <details>
        <summary>Source documents</summary>
        <div class="source-pills">${sourcePills}</div>
      </details>
      ${bridgeButtons ? `<details><summary>Conceptual bridges</summary><div class="bridge-list">${bridgeButtons}</div></details>` : ""}
    `;

    detailContent.querySelectorAll("[data-bridge-section]").forEach(button => {
      button.addEventListener("click", () => openSection(button.dataset.bridgeSection));
    });
    detailContent.querySelectorAll("[data-bridge-node]").forEach(button => {
      button.addEventListener("click", () => openNode(button.dataset.bridgeNode));
    });
    markSelected(selectedId);
    if (focus && window.matchMedia("(max-width: 920px)").matches) {
      detailContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function openNode(nodeId, { scroll = false } = {}) {
    const record = nodeById.get(nodeId);
    if (!record) return;
    openSection(record.section.id, { selectedId: nodeId, scroll });
  }

  function searchIndex() {
    return data.sections.flatMap(section => [
      { type: "section", id: section.id, section, title: section.short, subtitle: section.title, text: `${section.short} ${section.title} ${section.thesis}` },
      ...section.nodes.map(node => ({
        type: "node",
        id: node.id,
        section,
        node,
        title: node.title,
        subtitle: section.short,
        text: `${node.title} ${node.summary} ${(node.bullets || []).join(" ")} ${section.short}`
      }))
    ]);
  }

  const searchable = searchIndex();

  function renderSearchResults(query) {
    const clean = query.trim().toLowerCase();
    if (clean.length < 2) {
      searchResults.hidden = true;
      searchResults.replaceChildren();
      return;
    }
    const terms = clean.split(/\s+/).filter(Boolean);
    const matches = searchable
      .map(item => ({ item, score: terms.reduce((score, term) => score + (item.title.toLowerCase().includes(term) ? 3 : item.text.toLowerCase().includes(term) ? 1 : 0), 0) }))
      .filter(result => result.score >= terms.length)
      .sort((a, b) => b.score - a.score)
      .slice(0, 9);

    searchResults.innerHTML = matches.length
      ? matches.map(({ item }) => `<button class="search-result" type="button" role="option" data-result-type="${item.type}" data-result-id="${item.id}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.subtitle)}</span></button>`).join("")
      : `<p class="search-none">No node matches “${escapeHtml(query)}”. Try a person, instrument, or concept.</p>`;
    searchResults.hidden = false;
    searchResults.querySelectorAll(".search-result").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.resultType === "section") openSection(button.dataset.resultId);
        else openNode(button.dataset.resultId);
        searchResults.hidden = true;
        searchInput.value = "";
      });
    });
  }

  function renderSources() {
    const takeawayBySource = {
      central: "Defines the human computer as an essential component in a broader flight-research architecture and connects manual calculation to later electronic work.",
      need: "Explains the numerical bottleneck, the expansion of wind-tunnel data, wartime pressure, and the economic logic behind specialized computing pools.",
      workflow: "Reconstructs the eight-stage loop and its instruments, verification practices, embodied risks, and workflow inventions.",
      conditions: "Documents recruiting criteria, salaries, shifts, improvised workspaces, physical strain, housing, transportation, and segregation.",
      status: "Analyzes how gender, race, professional classification, publicity, authorship, and promotion produced structural subordination.",
      collective: "Places named technical leaders inside peer verification, training, support networks, and interdisciplinary cooperation.",
      transition: "Shows that electronic computing inherited human expertise through programs, manuals, plugboards, FORTRAN training, and machine verification.",
      memory: "Examines Golemba's method, missing personnel records, discarded artifacts, selective memory, and the many workers who remain unnamed."
    };

    sourceAccordions.innerHTML = Object.entries(data.sources).map(([key, source]) => {
      const related = data.sections.filter(section => section.sources.includes(key)).map(section => section.short).join(", ");
      return `
        <details>
          <summary><strong>${escapeHtml(source.label)}</strong><span>${escapeHtml(source.focus)}</span></summary>
          <div class="source-body">
            <p>${escapeHtml(takeawayBySource[key])}</p>
            <p><strong>Mapped domains:</strong> ${escapeHtml(related || "Cross-document evidence")}</p>
            <a href="content/source-notes.md">Read the normalized working notes</a>
          </div>
        </details>
      `;
    }).join("");
  }

  controlButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "overview") renderOverview();
      else openSection(button.dataset.view);
    });
  });

  breadcrumbHome.addEventListener("click", () => renderOverview());
  searchInput.addEventListener("input", event => renderSearchResults(event.target.value));
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      searchResults.hidden = true;
      searchInput.blur();
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      searchResults.querySelector(".search-result")?.focus();
    }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) searchResults.hidden = true;
  });
  document.querySelectorAll("[data-jump]").forEach(button => {
    button.addEventListener("click", () => openSection(button.dataset.jump, { scroll: true }));
  });

  let resizeTimer;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.sectionId) renderSection(sectionById.get(state.sectionId), { selectedId: state.selectedId });
      else renderOverview({ preserveDetail: true });
    }, 120);
  });
  resizeObserver.observe(graphCanvas);

  renderSources();
  renderOverview();
})();
