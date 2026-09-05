// Delegated click handler for the theme switcher. Uses the same localStorage
// keys (ratcap-color / ratcap-shape) and background map as
// packages/design-tokens/theme.js, which applies the stored theme pre-paint.
export const initThemeSelector = () => {
  const d = document.documentElement;
  const bg = { "catppuccin-mocha": "#1e1e2e", "tokyo-night": "#1a1b26" };

  document.addEventListener("click", (e) => {
    const colorBtn = e.target.closest("[data-color-option]");
    if (colorBtn) {
      const color = colorBtn.getAttribute("data-color-option");
      d.setAttribute("data-color", color);
      localStorage.setItem("ratcap-color", color);
      d.style.backgroundColor = bg[color] || bg["catppuccin-mocha"];
    }

    const shapeBtn = e.target.closest("[data-shape-option]");
    if (shapeBtn) {
      const shape = shapeBtn.getAttribute("data-shape-option");
      d.setAttribute("data-shape", shape);
      localStorage.setItem("ratcap-shape", shape);
    }
  });
};
