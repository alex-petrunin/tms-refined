import {ExtractRPCFromHandler} from "../backend/types/utility";
import * as globaldemoGETHandler from "../backend/router/global/demo/GET";
import * as projectdemoGETHandler from "../backend/router/project/demo/GET";

export type ApiRouter = {
    global: {
        demo: {
            GET: ExtractRPCFromHandler<globaldemoGETHandler.Handle>;
        };
    };
    project: {
        demo: {
            GET: ExtractRPCFromHandler<projectdemoGETHandler.Handle>;
        };
    };
};
