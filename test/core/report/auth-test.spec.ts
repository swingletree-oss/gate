"use strict";

import { suite, test, describe } from "mocha";
import { expect, assert } from "chai";
import { mockReq, mockRes } from "sinon-express-mock";
import * as chai from "chai";
import * as sinon from "sinon";
import { ConfigurationServiceMock } from "../../mock-classes";
import { ReportWebservice, SwingletreePlugin } from "../../../src/reports/report";

chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();


describe("Report Authentication", () => {

  let uut: ReportWebservice;
  let requestMock;
  let pluginConfigs: Map<string, SwingletreePlugin>;
  let mockPluginConfig: SwingletreePlugin;

  beforeEach(() => {
    uut = new ReportWebservice(
      new ConfigurationServiceMock()
    );

    pluginConfigs = new Map<string, SwingletreePlugin>();

    requestMock = mockReq();
    requestMock.headers = {};
    requestMock.query = {};

    mockPluginConfig = {
      base: null,
      client: null,
      enabled: true,
      insecure: false
    };
  });

  it("should accept authentication for valid credentials", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:perfectlysecretsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: "testPlugin"
    };

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.calledOnce(nextFn);
  });

  it("should reject authentication for invalid credentials", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:wrongsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: "testPlugin"
    };

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.notCalled(nextFn);
    sinon.assert.calledWith(responseMock.status, 401);
    sinon.assert.calledOnce(responseMock.send);
  });

  it("should accept any authentication for unprotected plugin endpoints", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:wrongsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: "testPlugin"
    };

    mockPluginConfig.insecure = true;

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.calledOnce(nextFn);
    sinon.assert.notCalled(responseMock.send);
  });

  it("should accept no authentication for unprotected plugin endpoints", () => {
    requestMock.headers = {
      authorization: undefined
    };

    requestMock.params = {
      pluginId: "testPlugin"
    };

    mockPluginConfig.insecure = true;

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.calledOnce(nextFn);
    sinon.assert.notCalled(responseMock.send);
  });

  it("should deny access to unknown plugin ids", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:perfectlysecretsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: "unknownPlugin"
    };

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.notCalled(nextFn);
    sinon.assert.calledWith(responseMock.status, 404);
    sinon.assert.calledOnce(responseMock.send);
  });

  it("should deny access to disabled plugin ids", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:perfectlysecretsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: "testPlugin"
    };

    mockPluginConfig.enabled = false;

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.notCalled(nextFn);
    sinon.assert.calledWith(responseMock.status, 404);
    sinon.assert.calledOnce(responseMock.send);
  });

  it("should handle empty path parameters with 404", () => {
    requestMock.headers = {
      authorization: `Basic ${Buffer.from("user:perfectlysecretsecret").toString("base64")}`
    };

    requestMock.params = {
      pluginId: undefined
    };

    pluginConfigs.set("testPlugin", mockPluginConfig);

    const testFn = uut.simpleAuthenticationMiddleware("perfectlysecretsecret", pluginConfigs);
    const responseMock = mockRes();
    const nextFn = sinon.stub();

    testFn(requestMock, responseMock, nextFn);

    sinon.assert.notCalled(nextFn);
    sinon.assert.calledWith(responseMock.status, 404);
    sinon.assert.calledOnce(responseMock.send);
  });

});
