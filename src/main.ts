import container from "./ioc-config";

import { WebServer } from "./webserver";
import { log } from "@swingletree-oss/harness";
import { ReportWebservice } from "./reports/report";
import GithubWebhook from "./github/webhooks";

require("source-map-support").install();

process.on("unhandledRejection", error => {
  log.error("Unhandled Promise rejection: %j", error);
});

class Gate {
  private webserver: WebServer;

  constructor() {
    log.info("Starting up Gate...");
    this.webserver = container.get<WebServer>(WebServer);

    // strap installation service
    this.webserver.addRouter("/installation", container.get<GithubWebhook>(GithubWebhook).getRouter());

    // strap report service
    this.webserver.addRouter("/report", container.get<ReportWebservice>(ReportWebservice).getRouter());

    // register webhooks directory for backwards compatibility
    this.webserver.addRouter("/webhook", container.get<ReportWebservice>(ReportWebservice).getRouter());
  }

}

new Gate();
