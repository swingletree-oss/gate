"use strict";
import { WebhookPayloadInstallation } from "@octokit/webhooks";
import { log } from "@swingletree-oss/harness";
import { Router } from "express";
import { inject, injectable } from "inversify";
import { ConfigurationService, GateConfig } from "../configuration";
import ScottyClient from "../scotty-client";
import { GithubWebhookEventType } from "./gh-webhook-event";


const GithubWebHookHandler = require("express-github-webhook");

/** Provides a GitHub Webhook
 */
@injectable()
class GithubWebhook {
  public static readonly IGNORE_ID = "github";
  private scottyClient: ScottyClient;
  private webhookSecret: string;

  constructor(
    @inject(ScottyClient) scottyClient: ScottyClient,
    @inject(ConfigurationService) configService: ConfigurationService
  ) {
    this.scottyClient = scottyClient;
    this.webhookSecret = configService.get(GateConfig.Github.WEBHOOK_SECRET);
  }

  public getRouter(): Router {
    if (!this.webhookSecret) {
      log.warn("GitHub webhook is not protected. Consider setting a webhook secret in the Swingletree configuration.");
    }

    const webhookHandler = GithubWebHookHandler({ path: "/", secret: this.webhookSecret });

    webhookHandler.on(GithubWebhookEventType.INSTALLATION, this.installationHandler.bind(this));

    webhookHandler.on("error", function (err: any, req: any, res: any) {
      log.warn("failed to process webhook call. " + err);
    });

    const router = Router();
    router.use(webhookHandler);

    return router;
  }

  public installationHandler(repo: string, data: WebhookPayloadInstallation) {
    log.debug("received GitHub webhook installation event");

    try {
      if (data.action == "created") {
        this.scottyClient.addInstallation({
          account: data.installation.account.login,
          accountId: data.installation.account.id,
          installationId: data.installation.id
        });
      } else if (data.action == "deleted") {
        this.scottyClient.removeInstallation({
          account: data.installation.account.login,
          accountId: data.installation.account.id,
          installationId: data.installation.id
        });
      }
    } catch (err) {
      log.error("failed to emit installation event through event bus", err);
    }
  }

}

export default GithubWebhook;