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

    const pluginConfig = this.configurationService.getObject(GateConfig.Gate.PLUGINS);
    pluginConfig.forEach((plugin: SwingletreePlugin) => {
      log.info("add plugin %s to register; targets %s", plugin.id, plugin.base);

      plugin.client = request.defaults({
        json: true,
        baseUrl: plugin.base
      });

      this.registeredPlugins.set(plugin.id, plugin);
    });
  }

  public static simpleAuthenticationMiddleware(secret: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const auth = BasicAuth(req);
      if (auth && secret === auth.pass) {
        next();
      } else {
        res.sendStatus(401);
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
    }

    return null;
  }

  public getRouter(): Router {
    const router = Router();

    const apiToken = this.configurationService.get(GateConfig.Gate.TOKEN);
    router.use(ReportWebservice.simpleAuthenticationMiddleware(apiToken));

    router.post("/:pluginId", this.handleReportPost.bind(this));

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
    return new Promise<any>((resolve, reject) => {
      plugin.client.post("/report", {
        body: data
      }, (error: any, response: request.Response, body: any) => {
        try {
          if (!error && response.statusCode >= 200 && response.statusCode < 300 ) {
            resolve();
          } else {
            log.error("encountered an error while sending data to plugin %j", error);
            reject((body as Comms.Message.ErrorMessage).errors);
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

interface SwingletreePlugin {
  id: string;
  base: string;
  client: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;
}