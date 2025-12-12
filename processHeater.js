// heater.js
import { BasePage } from "/masks/Common/js/core/basepage.js";
import { initReflowGraph } from "/masks/SmartHeatingCartridgeControlUnit/js/processSolderingCurve/src/index.js"; // Pfad ggf. anpassen: ../index.js

class HeaterPage extends BasePage {
  async setup() {
    // Stelle sicher, dass DOM bereit ist, falls du direkt DOM nutzt.
    initReflowGraph();

    // hier ggf. weitere page-spezifische Polls/Handler registrieren
    // this.pollAndHandleVariables(...);
  }
}

export const { setup, teardown } = BasePage.createPageModule(HeaterPage);