import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as globaldemoGETHandler from "../backend/router/global/demo/GET";
import * as globalprojectsGETHandler from "../backend/router/global/projects/GET";
import * as projectdemoGETHandler from "../backend/router/project/demo/GET";
import * as projecttestCasesGETHandler from "../backend/router/project/testCases/GET";
import * as projecttestCasesPOSTHandler from "../backend/router/project/testCases/POST";
import * as projecttestRunsGETHandler from "../backend/router/project/testRuns/GET";
import * as projecttestRunsPOSTHandler from "../backend/router/project/testRuns/POST";
import * as projecttestSuitesGETHandler from "../backend/router/project/testSuites/GET";
import * as projecttestSuitesPOSTHandler from "../backend/router/project/testSuites/POST";
import * as projecttestSuitesPUTHandler from "../backend/router/project/testSuites/PUT";
import * as globalwebhooksgitlabPOSTHandler from "../backend/router/global/webhooks/gitlab/POST";
import * as projecttmsqueryPOSTHandler from "../backend/router/project/tms/query/POST";
import * as projecttestRunsresultsPOSTHandler from "../backend/router/project/testRuns/results/POST";

export type ApiRouter = {
    global: {
    demo: {
    GET: ExtractRPCFromHandler<globaldemoGETHandler.Handle>;
    };
    projects: {
    GET: ExtractRPCFromHandler<globalprojectsGETHandler.Handle>;
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
    testCases: {
    GET: ExtractRPCFromHandler<projecttestCasesGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestCasesPOSTHandler.Handle>;
    };
    testRuns: {
    GET: ExtractRPCFromHandler<projecttestRunsGETHandler.Handle>;
    POST: ExtractRPCFromHandler<projecttestRunsPOSTHandler.Handle>;
    results: {
    POST: ExtractRPCFromHandler<projecttestRunsresultsPOSTHandler.Handle>;
    };
    };
    testSuites: {
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
    };
