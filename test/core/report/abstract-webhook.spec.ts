"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import { mockReq, mockRes } from "sinon-express-mock";
import * as chai from "chai";
import * as sinon from "sinon";
import { ConfigurationServiceMock } from "../../mock-classes";
import { ReportWebservice } from "../../../src/reports/report";
import { PluginReportProcessMetadata } from "@swingletree-oss/harness/dist/comms/gate";
import { Harness } from "@swingletree-oss/harness";

chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();


describe("Report Webhooks", () => {

  let uut;
  let requestMock;

  beforeEach(() => {
    uut = new ReportWebservice(
      new ConfigurationServiceMock()
    );

    requestMock = mockReq();
    requestMock.headers = {};
    requestMock.query = {};
  });

  it("should extract webhook info when given as query", () => {
    requestMock.headers = {};
    requestMock.query = {
      org: "org",
      repo: "repo",
      sha: "sha",
      branch: "branch"
    };

    const testResult = (uut as any).extractWebhookInfo(requestMock) as PluginReportProcessMetadata;

    const ghSource = testResult.source as Harness.GithubSource;

    expect(ghSource.branch).to.contain("branch");
    expect(ghSource.owner).to.eq("org");
    expect(ghSource.repo).to.eq("repo");
    expect(ghSource.sha).to.eq("sha");
  });

  it("should extract webhook info when given as headers with deprecated 'X-' prefix", () => {
    requestMock.headers = {
      "X-swingletree-org": "org",
      "X-swingletree-repo": "repo",
      "X-swingletree-sha": "sha",
      "X-swingletree-branch": "branch"
    };
    requestMock.query = {};

    const testResult = (uut as any).extractWebhookInfo(requestMock) as PluginReportProcessMetadata;

    const ghSource = testResult.source as Harness.GithubSource;

    expect(ghSource.branch).to.contain("branch");
    expect(ghSource.owner).to.eq("org");
    expect(ghSource.repo).to.eq("repo");
    expect(ghSource.sha).to.eq("sha");
  });

  it("should extract webhook info when given as headers", () => {
    requestMock.headers = {
      "swingletree-org": "org",
      "swingletree-repo": "repo",
      "swingletree-sha": "sha",
      "swingletree-branch": "branch"
    };
    requestMock.query = {};

    const testResult = (uut as any).extractWebhookInfo(requestMock) as PluginReportProcessMetadata;

    const ghSource = testResult.source as Harness.GithubSource;

    expect(ghSource.branch).to.contain("branch");
    expect(ghSource.owner).to.eq("org");
    expect(ghSource.repo).to.eq("repo");
    expect(ghSource.sha).to.eq("sha");
  });

});
