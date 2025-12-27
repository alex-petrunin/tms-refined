import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as globaldemoGETHandler from "../backend/router/global/demo/GET";
import * as globalsettingsGETHandler from "../backend/router/global/settings/GET";
import * as projecttestCasesGETHandler from "../backend/router/project/testCases/GET";
import * as projecttestCasesPOSTHandler from "../backend/router/project/testCases/POST";
import * as projecttestCasesPUTHandler from "../backend/router/project/testCases/PUT";
import * as projecttestSuitesDELETEHandler from "../backend/router/project/testSuites/DELETE";
import * as projecttestSuitesGETHandler from "../backend/router/project/testSuites/GET";
import * as projecttestSuitesPOSTHandler from "../backend/router/project/testSuites/POST";
import * as projecttestSuitesPUTHandler from "../backend/router/project/testSuites/PUT";
import * as projecttestRunsGETHandler from "../backend/router/project/testRuns/GET";
import * as projecttestRunsPOSTHandler from "../backend/router/project/testRuns/POST";
import * as projectdemoGETHandler from "../backend/router/project/demo/GET";
import * as globalwebhooksgitlabPOSTHandler from "../backend/router/global/webhooks/gitlab/POST";
import * as projecttmsqueryPOSTHandler from "../backend/router/project/tms/query/POST";
import * as projecttestRunsresultsPOSTHandler from "../backend/router/project/testRuns/results/POST";

export type ApiRouter = {
    global: {
    demo: {
    GET: ExtractRPCFromHandler<globaldemoGETHandler.Handle>;
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
    project: {
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
    testRuns: {
    GET: ExtractRPCFromHandler<projecttestRunsGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestRunsPOSTHandler.Handle>;
    results: {
    POST: ExtractRPCFromHandler<projecttestRunsresultsPOSTHandler.Handle>;
    };
    };
    demo: {
    GET: ExtractRPCFromHandler<projectdemoGETHandler.Handle>;
    };
    tms: {
    query: {
    POST: ExtractRPCFromHandler<projecttmsqueryPOSTHandler.Handle>;
    };
    };
    };
    };
