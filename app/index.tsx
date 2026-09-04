// Keep the interactive preview out of TypeScript's type graph.
// Metro still bundles the JavaScript screen for Expo and web.
import type React from "react";

declare const require: (path: string) => { default: React.ComponentType };

const WeeklyShopApp = require("../snack/WorkingWeeklyShop").default;

export default WeeklyShopApp;
