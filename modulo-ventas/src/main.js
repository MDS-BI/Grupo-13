import "./styles.css";
import { boot, refreshActiveView } from "./app.js";
import { loadDemoData } from "./ventas/mock-data.js";

boot().then(() => {
  loadDemoData();
  refreshActiveView();
});
