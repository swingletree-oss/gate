import { Comms, Harness, log } from "@swingletree-oss/harness";
import * as BasicAuth from "basic-auth";
import { NextFunction, Request, Response, Router } from "express";
import { inject, injectable } from "inversify";
import * as request from "request";
import { ConfigurationService, GateConfig } from "../configuration";
import { PluginReportProcessRequest, PluginReportProcessMetadata } from "@swingletree-oss/harness/dist/comms/gate";

@injectable()
export class ReportWebservice {
  private configurationService: ConfigurationService;

  private registeredPlugins: Map<string, SwingletreePlugin>;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService,
  ) {
    this.configurationService = configurationService;

    this.registeredPlugins = new Map<string, SwingletreePlugin>();

    const pluginConfig: any = this.configurationService.getObject<any>(GateConfig.Gate.PLUGINS);
    Object.keys(pluginConfig).forEach((pluginId: string) => {
      const config: SwingletreePlugin = new SwingletreePlugin(pluginConfig[pluginId]);

      if (config.enabled) {
        log.info("add plugin %s to register; targets %s", pluginId, config.base);

        config.client = request.defaults({
          json: true,
          baseUrl: config.base
        });

        if (config.insecure) {
          log.warn("plugin endpoint for %s is configured to be not protected.", pluginId);
        }

        this.registeredPlugins.set(pluginId, config);
      } else {
        log.info("plugin %s is disabled. Skipping registration", pluginId);
      }
    });

  }

  public simpleAuthenticationMiddleware(secret: string, plugins: Map<string, SwingletreePlugin>) {
    return (req: Request, res: Response, next: NextFunction) => {
      const pluginId = req.params["pluginId"];
      const pluginConfig = plugins.get(pluginId);
      const auth = BasicAuth(req);

      if (pluginConfig?.enabled) {
        if (pluginConfig.insecure) {
          log.debug("allowing unprotected access to plugin endpoint %s", pluginId);
          next();
        } else {
          if (auth && secret === auth.pass) {
            next();
          } else {
            log.debug("rejecting access to plugin endpoint %s", pluginId);
            res.status(401).send("Unauthorized");
          }
        }
      } else {
        res.status(404).send("requested plugin not available or enabled");
      }
    };
  }

  private findWebhookProperty(req: Request, property: string): string {
    return req.query[property] || req.headers[`swingletree-${property}`] || req.headers[`X-swingletree-${property}`];
  }

  public extractWebhookInfo(req: Request): PluginReportProcessMetadata {
    const scmSource = new Harness.GithubSource();
    scmSource.remote = this.findWebhookProperty(req, "remote");
    scmSource.owner = this.findWebhookProperty(req, "org");
    scmSource.repo = this.findWebhookProperty(req, "repo");
    scmSource.sha = this.findWebhookProperty(req, "sha");

    const buildUuid = this.findWebhookProperty(req, "uid");

    const branchValue = this.findWebhookProperty(req, "branch");
    if (branchValue) {
      scmSource.branch = branchValue.split(",");
    }

    if (scmSource.isDataComplete()) {
      return {
        source: scmSource,
        buildUuid: buildUuid
      };
    } else {
      log.info("received request with missing meta coordinates %j", scmSource);
    }

    return null;
  }

  public getRouter(): Router {
    const router = Router();

    const apiToken = this.configurationService.get(GateConfig.Gate.TOKEN);

    if (apiToken) {
      router.post("/:pluginId", this.simpleAuthenticationMiddleware(apiToken, this.registeredPlugins), this.handleReportPost.bind(this));
    } else {
      log.warn("report endpoint is not protected by a token. Please consider setting one.");
      router.post("/:pluginId", this.handleReportPost.bind(this));
    }

    return router;
  }

  public async handleReportPost(req: Request, res: Response) {
    const targetPluginId = req.params["pluginId"];

    if (!this.registeredPlugins.has(targetPluginId)) {
      res.status(404).send(
        new Comms.Message.ErrorMessage(
          new PluginNotFoundError(`could not find plugin with id ${targetPluginId} in registry`)
        )
      );
      return;
    }

    log.debug("processing report for plugin %s", targetPluginId);

    const targetPlugin = this.registeredPlugins.get(targetPluginId);
    const meta = this.extractWebhookInfo(req);
    const headers = Object.keys(req.headers)
      .filter((key) => { return key.toLowerCase().startsWith("x-swingletree-") || key.toLowerCase().startsWith("swingletree-"); })
      .reduce((acc: any, curr: string, i: number, source: string[]) => {
        acc[curr] = req.headers[curr];
        return acc;
      }, {});

    headers.contentType = req.headers["content-type"];

    const data = new PluginReportProcessRequest<Object>({
        headers: headers as any,
        report: req.body
      }, meta
    );

    try {
      await this.sendDataToPlugin(targetPlugin, data);
    } catch (err) {
      log.warn("plugin failed processing report: %j", err);
      res.status(422).send(
        (new Comms.Message.ErrorMessage())
          .add(new ReportProcessingError("failed to process report"))
          .addAll(err)
      );
      return;
    }

    res.status(202).send(new Comms.Message.EmptyMessage());
  }

  private async sendDataToPlugin(plugin: SwingletreePlugin, data: any) {

    log.debug("Sending payload to %s:\n%j", plugin.base, data);

    return new Promise<any>((resolve, reject) => {
      plugin.client.post("/report", {
        body: data
      }, (error: any, response: request.Response, body: any) => {
        try {
          if (!error && response.statusCode >= 200 && response.statusCode < 300 ) {
            resolve();
          } else {
            log.error("encountered an error while sending data to plugin. Cause: %j", error);
            if (error) {
              reject([ new ReportProcessingError(error) ]);
            } else {
              reject((body as Comms.Message.ErrorMessage).errors);
            }
          }
        } catch (err) {
          log.error("failure while processing request %j", err);
          reject([ new ReportProcessingError(err) ]);
        }
      });
    });
  }
}

class ReportProcessingError extends Comms.Error {
  constructor(detail: string) {
    super(
      "Failed processing report",
      detail
    );
  }
}

class PluginNotFoundError extends Comms.Error {
  constructor(detail: string) {
    super(
      "Plugin not found",
      detail
    );
  }
}

export class SwingletreePlugin {
  enabled: boolean;
  base: string;
  insecure: boolean;
  client: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;

  constructor(config: any) {
    this.enabled = config.enabled?.toString().toLowerCase() == "true";
    this.base = config.base;
    this.insecure = config.insecure?.toString().toLowerCase() == "true";
  }
}