import { createRoot } from "react-dom/client";
import { App } from "./app";

// Styles are built separately by the Tailwind CLI into assets/app.css.
const container = document.getElementById("root");
if (container) createRoot(container).render(<App />);
