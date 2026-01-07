import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as projectdemoGETHandler from "../backend/router/project/demo/GET";
import * as projectintegrationsDELETEHandler from "../backend/router/project/integrations/DELETE";
import * as projectintegrationsGETHandler from "../backend/router/project/integrations/GET";
import * as projectintegrationsPOSTHandler from "../backend/router/project/integrations/POST";
import * as projectintegrationsPUTHandler from "../backend/router/project/integrations/PUT";
import * as projectsettingsGETHandler from "../backend/router/project/settings/GET";
import * as projecttestRunsGETHandler from "../backend/router/project/testRuns/GET";
import * as projecttestRunsPOSTHandler from "../backend/router/project/testRuns/POST";
import * as projecttestCasesGETHandler from "../backend/router/project/testCases/GET";
import * as projecttestCasesPOSTHandler from "../backend/router/project/testCases/POST";
import * as projecttestCasesPUTHandler from "../backend/router/project/testCases/PUT";
import * as projecttestSuitesDELETEHandler from "../backend/router/project/testSuites/DELETE";
import * as projecttestSuitesGETHandler from "../backend/router/project/testSuites/GET";
import * as projecttestSuitesPOSTHandler from "../backend/router/project/testSuites/POST";
import * as projecttestSuitesPUTHandler from "../backend/router/project/testSuites/PUT";
import * as globaldemoGETHandler from "../backend/router/global/demo/GET";
import * as globaltestCaseProjectGETHandler from "../backend/router/global/testCaseProject/GET";
import * as globalsettingsGETHandler from "../backend/router/global/settings/GET";
import * as projecttmsqueryPOSTHandler from "../backend/router/project/tms/query/POST";
import * as globalwebhooksgitlabPOSTHandler from "../backend/router/global/webhooks/gitlab/POST";
import * as projecttestRunsresultsPOSTHandler from "../backend/router/project/testRuns/results/POST";

export type ApiRouter = {
    project: {
    demo: {
    GET: ExtractRPCFromHandler<projectdemoGETHandler.Handle>;
    };
    integrations: {
    DELETE: ExtractRPCFromHandler<projectintegrationsDELETEHandler.Handle>;
    GET: ExtractRPCFromHandler<projectintegrationsGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projectintegrationsPOSTHandler.Handle>;
    PUT: ExtractRPCFromHandler<projectintegrationsPUTHandler.Handle>;
    };
    settings: {
    GET: ExtractRPCFromHandler<projectsettingsGETHandler.Handle>;
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
    };
    tms: {
    query: {
    POST: ExtractRPCFromHandler<projecttmsqueryPOSTHandler.Handle>;
    };
    };
    };
    global: {
    demo: {
    GET: ExtractRPCFromHandler<globaldemoGETHandler.Handle>;
    };
    testCaseProject: {
    GET: ExtractRPCFromHandler<globaltestCaseProjectGETHandler.Handle>;
    };
    settings: {
    GET: ExtractRPCFromHandler<globalsettingsGETHandler.Handle>;
    };
    webhooks: {
    gitlab: {
    POST: ExtractRPCFromHandler<globalwebhooksgitlabPOSTHandler.Handle>;
    };
    };
    };
    };
