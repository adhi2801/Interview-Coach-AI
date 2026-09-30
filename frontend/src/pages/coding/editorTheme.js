// The coding room's editor theme: dark, with comments bright enough for
// WCAG contrast. Registered in Monaco's beforeMount.
export function defineEditorTheme(monaco) {
  monaco.editor.defineTheme("oled-dark", {
    base: "vs-dark", inherit: true,
    rules: [
      { token: "comment", foreground: "94a3b8", fontStyle: "italic" }, // 7.6:1 on the editor background
      { token: "keyword", foreground: "c084fc" },
      { token: "string", foreground: "86efac" },
      { token: "number", foreground: "fb923c" }
    ],
    colors: {
      "editor.background": "#0a0a0c",
      "editor.lineHighlightBackground": "#08080d",
      "editorGutter.background": "#0a0a0c",
      "editor.selectionBackground": "#3b82f640",
      "editorLineNumber.foreground": "#334155",
      "editorLineNumber.activeForeground": "#94a3b8",
    },
  });
  monaco.editor.setTheme("oled-dark");
}
