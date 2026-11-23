import Chart from "chart.js/auto";
import { buildSalesEvolution, buildTopProducts } from "../../ventas/analytics.js";

const SERIES_COLORS = ["#2563eb", "#f59e0b", "#8b5cf6"];
const PRODUCT_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#64748b",
];

let selectedPeriod = "mes";
let selectedMetric = "cantidad";
let selectedType = "bar";
let evolutionChart = null;
let productsChart = null;
let wired = false;

function qs(id) {
  return document.getElementById(id);
}

function cssVar(name, fallback) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000)
    return `${(value / 1000000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1000)
    return `${(value / 1000).toLocaleString("es-CL", { maximumFractionDigits: 0 })}k`;
  return String(value);
}

function rgba(color, alpha) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : match[1];
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${channels.join(", ")}, ${alpha})`;
}

function createChart(canvas, config) {
  if (!canvas) return null;
  let context = null;
  try {
    context = canvas.getContext("2d");
  } catch {
    return null;
  }
  if (!context) return null;
  return new Chart(context, config);
}

function destroyCharts() {
  evolutionChart?.destroy();
  productsChart?.destroy();
  evolutionChart = null;
  productsChart = null;
}

function palette(theme) {
  return [cssVar("--accent", theme.accent), ...SERIES_COLORS.slice(1)];
}

function baseOptions(theme, tooltipLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          color: cssVar("--muted", theme.muted),
          font: { family: "Inter, system-ui, sans-serif", size: 11 },
        },
      },
      tooltip: {
        callbacks: { label: tooltipLabel },
      },
    },
  };
}

function evolutionConfig(evolution, theme) {
  const colors = palette(theme);
  const options = baseOptions(
    theme,
    (context) => ` ${context.dataset.label}: ${formatMoney(context.parsed.y)}`,
  );
  options.scales = {
    x: { grid: { display: false }, ticks: { color: cssVar("--muted", theme.muted) } },
    y: {
      beginAtZero: true,
      grid: { color: cssVar("--border", theme.grid) },
      ticks: {
        color: cssVar("--muted", theme.muted),
        callback: (value) => compactMoney(value),
      },
    },
  };
  return {
    type: "line",
    data: {
      labels: evolution.labels,
      datasets: evolution.series.map((series, index) => ({
        label: series.label,
        data: series.data,
        borderColor: colors[index],
        backgroundColor: rgba(colors[index], 0.12),
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
      })),
    },
    options,
  };
}

function productsConfig(products, theme) {
  const colors = PRODUCT_COLORS;
  const tooltipLabel = (context) => {
    const value = selectedType === "doughnut" ? Number(context.parsed) : Number(context.parsed.x);
    return selectedMetric === "monto" ? ` ${formatMoney(value)}` : ` ${value} unidades`;
  };
  const options = baseOptions(theme, tooltipLabel);
  options.plugins.legend.display = selectedType === "doughnut";

  if (selectedType === "doughnut") {
    options.interaction = { mode: "nearest", intersect: true };
    options.cutout = "58%";
    return {
      type: "doughnut",
      data: {
        labels: products.map((product) => product.nombre),
        datasets: [
          {
            data: products.map((product) => product[selectedMetric]),
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options,
    };
  }

  options.scales = {
    x: {
      beginAtZero: true,
      grid: { color: cssVar("--border", theme.grid) },
      ticks: {
        color: cssVar("--muted", theme.muted),
        callback: (value) => (selectedMetric === "monto" ? compactMoney(value) : value),
      },
    },
    y: { grid: { display: false }, ticks: { color: cssVar("--muted", theme.muted) } },
  };
  return {
    type: "bar",
    data: {
      labels: products.map((product) => product.nombre),
      datasets: [
        {
          label: selectedMetric === "monto" ? "Monto vendido" : "Unidades vendidas",
          data: products.map((product) => product[selectedMetric]),
          backgroundColor: rgba(cssVar("--accent", theme.accent), 0.82),
          hoverBackgroundColor: cssVar("--accent-dark", theme.accentDark),
          borderRadius: 6,
          barThickness: 18,
        },
      ],
    },
    options,
  };
}

function showFallback(frame, visible) {
  if (!frame) return;
  let notice = frame.querySelector(".chart-fallback");
  if (visible && !notice) {
    notice = document.createElement("span");
    notice.className = "chart-fallback";
    notice.textContent = "Vista disponible en navegadores con soporte de canvas.";
    frame.appendChild(notice);
  }
  if (notice) notice.hidden = !visible;
}

export function renderSalesAnalytics() {
  const evolutionCanvas = qs("analytics-evolution-chart");
  const productsCanvas = qs("analytics-products-chart");
  if (!evolutionCanvas || !productsCanvas) return;

  const evolution = buildSalesEvolution({ period: selectedPeriod });
  const products = buildTopProducts({ metric: selectedMetric, limit: 7 });
  const empty = qs("analytics-empty");
  const evolutionCard = qs("analytics-evolution-card");
  const productsCard = qs("analytics-products-card");

  if (empty) empty.hidden = !(evolution.vacio && products.length === 0);
  if (evolutionCard) evolutionCard.hidden = evolution.vacio;
  if (productsCard) productsCard.hidden = products.length === 0;

  const evolutionTotal = qs("analytics-evolution-total");
  if (evolutionTotal) {
    evolutionTotal.textContent = evolution.series
      .map((series) => `${series.label}: ${formatMoney(series.total)}`)
      .join(" · ");
  }
  const productsTotal = qs("analytics-products-total");
  if (productsTotal) {
    const unidades = products.reduce((sum, product) => sum + product.cantidad, 0);
    const monto = products.reduce((sum, product) => sum + product.monto, 0);
    productsTotal.textContent = `${unidades} unidades · ${formatMoney(monto)}`;
  }

  evolutionChart?.destroy();
  productsChart?.destroy();
  evolutionChart = null;
  productsChart = null;

  const theme = {
    accent: "#2563eb",
    accentDark: "#1d4ed8",
    muted: "#64748b",
    grid: "#e5e9f2",
  };
  const evolutionFrame = qs("analytics-evolution-frame");
  const productsFrame = qs("analytics-products-frame");

  if (!evolution.vacio) {
    evolutionChart = createChart(evolutionCanvas, evolutionConfig(evolution, theme));
    showFallback(evolutionFrame, !evolutionChart);
  }
  if (products.length > 0) {
    productsChart = createChart(productsCanvas, productsConfig(products, theme));
    showFallback(productsFrame, !productsChart);
  }
}

export function initSalesAnalytics() {
  if (wired) return;
  wired = true;

  const bind = (id, handler) => {
    const element = qs(id);
    if (element) element.addEventListener("change", handler);
  };
  bind("analytics-period", (event) => {
    selectedPeriod = event.target.value;
    renderSalesAnalytics();
  });
  bind("analytics-metric", (event) => {
    selectedMetric = event.target.value;
    renderSalesAnalytics();
  });
  bind("analytics-type", (event) => {
    selectedType = event.target.value;
    renderSalesAnalytics();
  });
}

export function clearSalesAnalytics() {
  destroyCharts();
}
