import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as globaldemoGETHandler from "../backend/router/global/demo/GET";
import * as globalsettingsGETHandler from "../backend/router/global/settings/GET";
import * as globaltestCaseProjectGETHandler from "../backend/router/global/testCaseProject/GET";
import * as projectdemoGETHandler from "../backend/router/project/demo/GET";
import * as projectsettingsGETHandler from "../backend/router/project/settings/GET";
import * as projectintegrationsDELETEHandler from "../backend/router/project/integrations/DELETE";
import * as projectintegrationsGETHandler from "../backend/router/project/integrations/GET";
import * as projectintegrationsPOSTHandler from "../backend/router/project/integrations/POST";
import * as projectintegrationsPUTHandler from "../backend/router/project/integrations/PUT";
import * as projecttestRunsGETHandler from "../backend/router/project/testRuns/GET";
import * as projecttestRunsPOSTHandler from "../backend/router/project/testRuns/POST";
import * as projecttestCasesGETHandler from "../backend/router/project/testCases/GET";
import * as projecttestCasesPOSTHandler from "../backend/router/project/testCases/POST";
import * as projecttestCasesPUTHandler from "../backend/router/project/testCases/PUT";
import * as projecttestSuitesDELETEHandler from "../backend/router/project/testSuites/DELETE";
import * as projecttestSuitesGETHandler from "../backend/router/project/testSuites/GET";
import * as projecttestSuitesPOSTHandler from "../backend/router/project/testSuites/POST";
import * as projecttestSuitesPUTHandler from "../backend/router/project/testSuites/PUT";
import * as globalwebhooksgitlabPOSTHandler from "../backend/router/global/webhooks/gitlab/POST";
import * as projecttmsqueryPOSTHandler from "../backend/router/project/tms/query/POST";
import * as projecttestRunsresultsPOSTHandler from "../backend/router/project/testRuns/results/POST";
import * as projecttestSuites_suiteIdrunPOSTHandler from "../backend/router/project/testSuites/_suiteId/run/POST";
import * as projectintegrations_integrationIdgithubworkflowsGETHandler from "../backend/router/project/integrations/_integrationId/github/workflows/GET";
import * as projectintegrations_integrationIdgitlabrefsGETHandler from "../backend/router/project/integrations/_integrationId/gitlab/refs/GET";

export type ApiRouter = {
    global: {
    demo: {
    GET: ExtractRPCFromHandler<globaldemoGETHandler.Handle>;
    };
    settings: {
    GET: ExtractRPCFromHandler<globalsettingsGETHandler.Handle>;
    };
    testCaseProject: {
    GET: ExtractRPCFromHandler<globaltestCaseProjectGETHandler.Handle>;
    };
    webhooks: {
    gitlab: {
    POST: ExtractRPCFromHandler<globalwebhooksgitlabPOSTHandler.Handle>;
    };
    };
    };
    project: {
    demo: {
    GET: ExtractRPCFromHandler<projectdemoGETHandler.Handle>;
    };
    settings: {
    GET: ExtractRPCFromHandler<projectsettingsGETHandler.Handle>;
    };
    integrations: {
    DELETE: ExtractRPCFromHandler<projectintegrationsDELETEHandler.Handle>;
    GET: ExtractRPCFromHandler<projectintegrationsGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projectintegrationsPOSTHandler.Handle>;
    PUT: ExtractRPCFromHandler<projectintegrationsPUTHandler.Handle>;
    _integrationId: {
    github: {
    workflows: {
    GET: ExtractRPCFromHandler<projectintegrations_integrationIdgithubworkflowsGETHandler.Handle>;
    };
    };
    gitlab: {
    refs: {
    GET: ExtractRPCFromHandler<projectintegrations_integrationIdgitlabrefsGETHandler.Handle>;
    };
    };
    };
    };
    testRuns: {
    GET: ExtractRPCFromHandler<projecttestRunsGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestRunsPOSTHandler.Handle>;
    results: {
    POST: ExtractRPCFromHandler<projecttestRunsresultsPOSTHandler.Handle>;
    };
    };
    testCases: {
    GET: ExtractRPCFromHandler<projecttestCasesGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestCasesPOSTHandler.Handle>;
    PUT: ExtractRPCFromHandler<projecttestCasesPUTHandler.Handle>;
    };
    testSuites: {
    DELETE: ExtractRPCFromHandler<projecttestSuitesDELETEHandler.Handle>;
    GET: ExtractRPCFromHandler<projecttestSuitesGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestSuitesPOSTHandler.Handle>;
    PUT: ExtractRPCFromHandler<projecttestSuitesPUTHandler.Handle>;
    _suiteId: {
    run: {
    POST: ExtractRPCFromHandler<projecttestSuites_suiteIdrunPOSTHandler.Handle>;
    };
    };
    };
    tms: {
    query: {
    POST: ExtractRPCFromHandler<projecttmsqueryPOSTHandler.Handle>;
    };
    };
    };
    };
