import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { MyComposition } from "./composition.jsx";
const App = () => {
  return /* @__PURE__ */ jsxDEV("div", { className: "remotion-player-container", children: /* @__PURE__ */ jsxDEV(
    Player,
    {
      component: MyComposition,
      durationInFrames: 8 * 30,
      fps: 30,
      compositionWidth: 1080,
      compositionHeight: 1920,
      loop: true,
      controls: true,
      autoPlay: true,
      style: {
        width: "auto",
        height: "90vh",
        aspectRatio: "9 / 16"
      }
    },
    void 0,
    false,
    {
      fileName: "<stdin>",
      lineNumber: 9,
      columnNumber: 13
    }
  ) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 8,
    columnNumber: 9
  });
};
createRoot(document.getElementById("app")).render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 28,
  columnNumber: 51
}));
