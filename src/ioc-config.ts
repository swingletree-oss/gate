import "reflect-metadata";

import { Container } from "inversify";

import { ConfigurationService } from "./configuration";
import { WebServer } from "./webserver";
import GithubWebhook from "./github/webhooks";
import ScottyClient from "./scotty-client";
import { ReportWebservice } from "./reports/report";

const container = new Container();

container.bind<ConfigurationService>(ConfigurationService).toSelf().inSingletonScope();
container.bind<WebServer>(WebServer).toSelf().inSingletonScope();
container.bind<GithubWebhook>(GithubWebhook).toSelf().inSingletonScope();
container.bind<ScottyClient>(ScottyClient).toSelf().inSingletonScope();
container.bind<ReportWebservice>(ReportWebservice).toSelf().inSingletonScope();


export default container;