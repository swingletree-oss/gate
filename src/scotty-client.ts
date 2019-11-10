"use strict";

import { log, Harness, Comms } from "@swingletree-oss/harness";
import { inject, injectable } from "inversify";
import * as request from "request";
import { ConfigurationService, GateConfig } from "./configuration";


/** Provides a GitHub Webhook
 */
@injectable()
class ScottyClient {
  private scottyClient: request.RequestAPI<request.Request, request.CoreOptions, request.RequiredUriUrl>;

  constructor(
    @inject(ConfigurationService) configService: ConfigurationService
  ) {
    this.scottyClient = request.defaults({
      json: true,
      baseUrl: configService.get(GateConfig.Urls.SCOTTY)
    });
  }

  public async addInstallation(installRef: Comms.Scotty.GitHubInstallationReference) {
    return new Promise<any>((resolve, reject) => {
      this.scottyClient.post("/installation", {
          body: installRef
        },
        (error: any, response: request.Response, body: any) => {
          try {
            if (!error && response.statusCode >= 200 && response.statusCode < 300 ) {
              resolve();
            } else {
              reject((body as Comms.Message.ErrorMessage).errors);
            }
          } catch (err) {
            reject([ new Comms.Error("General Error", err) ]);
          }
        }
      );
    });
  }

  public async removeInstallation(installRef: Comms.Scotty.GitHubInstallationReference) {
    return new Promise<any>((resolve, reject) => {
      this.scottyClient.delete("/installation", {
          body: installRef
        },
        (error: any, response: request.Response, body: any) => {
          try {
            if (!error && response.statusCode >= 200 && response.statusCode < 300 ) {
              resolve();
            } else {
              reject((body as Comms.Message.ErrorMessage).errors);
            }
          } catch (err) {
            reject([ new Comms.Error("General Error", err) ]);
          }
        }
      );
    });
  }
}

export default ScottyClient;