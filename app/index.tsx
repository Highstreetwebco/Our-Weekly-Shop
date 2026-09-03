// Keep the large interactive Snack preview out of TypeScript's type graph.
// Metro still bundles it for Expo and web exactly as before.
import type React from "react";

declare const require: (path: string) => { default: React.ComponentType };

const WeeklyShopApp = require("../snack/AutomatedWeeklyFlowPreview").default;

export default WeeklyShopApp;
