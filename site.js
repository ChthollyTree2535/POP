const catalogue = { frbs: [], pulsars: [], fields: { frb: [], pulsar: [] }, showMedia: { frb: false, pulsar: false } };

const byId = (id) => document.getElementById(id);
const staticMirror = document.documentElement.dataset.staticMirror === "true";
const contentEndpoint = staticMirror ? "./content.json" : "/api/content";
const catalogEndpoint = staticMirror ? "./catalog.json" : "/api/catalog";

const cell = (value, className = "") => {
  const element = document.createElement("td");
  if (className) element.className = className;
  element.textContent = value ?? "—";
  return element;
};

const number = (value, digits = 2) => value == null ? "—" : Number(value).toFixed(digits);
const significant = (value) => {
  const numeric = Number(value);
  return value == null || !Number.isFinite(numeric) ? "—" : numeric.toPrecision(6);
};

function addCustomCells(row, item, fields) {
  fields.forEach((field) => row.append(cell(item.custom_values?.[field.key] ?? "—")));
  return row;
}

function addMediaCell(row, item, visible) {
  if (!visible) return row;
  const container = document.createElement("td");
  const images = Array.isArray(item.media) ? item.media : [];
  images.forEach((image, index) => {
    if (index) container.append(document.createTextNode(" · "));
    const link = document.createElement("a");
    link.href = image.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = image.caption || `Figure ${index + 1}`;
    container.append(link);
  });
  if (!images.length) container.textContent = "—";
  row.append(container);
  return row;
}

function addFrbRow(item) {
  const row = document.createElement("tr");
  const name = cell("");
  const strong = document.createElement("strong");
  strong.textContent = item.frb_name;
  const id = document.createElement("small");
  id.textContent = item.frb_id;
  name.append(strong, id);
  row.append(
    name,
    cell(`${item.ra}\n${item.dec}`, "coord"),
    cell(item.burst_count),
    cell(number(item.max_dm, 1)),
    cell(item.note || "—"),
  );
  return addMediaCell(addCustomCells(row, item, catalogue.fields.frb), item, catalogue.showMedia.frb);
}

function addPulsarRow(item) {
  const row = document.createElement("tr");
  row.append(
    cell(item.display_name),
    cell(item.catalog_id),
    cell(item.ra, "coord"),
    cell(item.dec, "coord"),
    cell(number(item.dm)),
    cell(significant(item.period_s)),
  );
  return addMediaCell(addCustomCells(row, item, catalogue.fields.pulsar), item, catalogue.showMedia.pulsar);
}

function addCustomHeaders(tableId, fields, showMedia) {
  const headerRow = byId(tableId).tHead.rows[0];
  headerRow.querySelectorAll(".custom-field, .media-field").forEach((header) => header.remove());
  fields.forEach((field) => {
    const header = document.createElement("th");
    header.className = "custom-field";
    header.textContent = field.label;
    headerRow.append(header);
  });
  if (showMedia) {
    const header = document.createElement("th");
    header.className = "media-field";
    header.textContent = "Figures";
    headerRow.append(header);
  }
}

function draw() {
  const query = byId("catalogue-search").value.toLowerCase();
  const visible = (items) => items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  byId("frb-table").tBodies[0].replaceChildren(...visible(catalogue.frbs).map(addFrbRow));
  byId("pulsar-table").tBodies[0].replaceChildren(...visible(catalogue.pulsars).map(addPulsarRow));
}

function applyContent(content) {
  const text = (id, value) => {
    if (typeof value === "string") byId(id).textContent = value;
  };
  const image = (id, value) => {
    if (typeof value === "string" && (value.startsWith("/") || value.startsWith("./"))) byId(id).src = value;
  };
  text("hero-lede", content.hero_lede);
  text("survey-intro", content.survey_intro);
  text("survey-methods", content.survey_methods);
  text("survey-footer", content.survey_footer);
  image("hero-image", content.hero_image_url);
  image("survey-pop-figure", content.survey_pop_figure_url);
  image("survey-fast19-figure", content.survey_fast19_figure_url);
}

async function loadContent() {
  try {
    const response = await fetch(contentEndpoint, { headers: { Accept: "application/json" } });
    if (response.ok) applyContent(await response.json());
  } catch {
    // The HTML defaults remain visible if public content is temporarily unavailable.
  }
}

async function loadCatalogue() {
  try {
    const response = await fetch(catalogEndpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("catalogue request failed");
    const payload = await response.json();
    catalogue.frbs = payload.frbs;
    catalogue.pulsars = payload.pulsars;
    catalogue.fields = payload.fields || catalogue.fields;
    catalogue.showMedia.frb = payload.frbs.some((item) => item.media?.length);
    catalogue.showMedia.pulsar = payload.pulsars.some((item) => item.media?.length);
    addCustomHeaders("frb-table", catalogue.fields.frb, catalogue.showMedia.frb);
    addCustomHeaders("pulsar-table", catalogue.fields.pulsar, catalogue.showMedia.pulsar);
    byId("pulsar-count").textContent = payload.summary.pulsars;
    byId("frb-source-count").textContent = payload.summary.frb_sources;
    byId("frb-burst-count").textContent = payload.summary.frb_bursts;
    byId("catalogue-status").textContent = "";
    draw();
  } catch {
    byId("catalogue-status").textContent = "Catalogue data is temporarily unavailable.";
  }
}

byId("catalogue-search").addEventListener("input", draw);
loadContent();
loadCatalogue();
