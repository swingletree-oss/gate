import * as yaml from "js-yaml";
import { injectable } from "inversify";
import { log } from "@swingletree-oss/harness";
import * as nconf from "nconf";

@injectable()
export class ConfigurationService {
  private config: nconf.Provider;

  constructor(file = "./swingletree.conf.yaml") {
    log.info("loading configuration from file %s", file);

    this.config = new nconf.Provider()
      .env({
        lowerCase: true,
        separator: "_",
        match: /((GATE|LOG)_.*)$/i
      })
      .file({
        file: file,
        format: {
          parse: yaml.safeLoad,
          stringify: yaml.safeDump
        }
      });
  }

  public checkRequired(keys: string[]) {
    this.config.required(keys);
  }

  public get(key: string): string {
    const value: string = this.config.get(key);

    if (!value || value.toString().trim() == "") {
      return null;
    }

    return value;
  }

  public getObject(key: string): any {
    return this.config.get(key);
  }

  public getConfig() {
    return this.config.get();
  }

  public getNumber(key: string): number {
    return Number(this.get(key));
  }

  public getBoolean(key: string): boolean {
    return String(this.get(key)) == "true";
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
