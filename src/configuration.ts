import { injectable } from "inversify";
import { log, Configuration } from "@swingletree-oss/harness";

@injectable()
export class ConfigurationService extends Configuration {
  constructor() {
    super("./swingletree.conf.yaml", /((GATE|LOG)_.*)$/i);
  }
}

export namespace GateConfig {
  export enum Github {
    WEBHOOK_SECRET = "gate:github:secret"
  }

  export enum Gate {
    PORT = "gate:port",
    TOKEN = "gate:api:token",
    PLUGINS = "gate:plugins"
  }

  export enum Urls {
    SCOTTY = "urls:scotty"
  }
}
