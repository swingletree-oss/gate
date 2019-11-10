import container from "./ioc-config";

import { WebServer } from "./webserver";
import { log } from "@swingletree-oss/harness";
import { ReportWebservice } from "./reports/report";
import GithubWebhook from "./github/webhooks";

process.on("unhandledRejection", error => {
  log.error("Unhandled Promise rejection: %s", JSON.stringify(error));
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
  }

}

new Gate();
