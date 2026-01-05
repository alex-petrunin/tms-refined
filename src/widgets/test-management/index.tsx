// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import '@jetbrains/ring-ui-built/components/style.css';
// import {ControlsHeightContext, ControlsHeight} from '@jetbrains/ring-ui-built/components/global/controls-height';
//
// import {App} from './app.tsx';
// import {WidgetRootComponent} from "@/widgets/common/widget-root-component.tsx";
//
// ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
//   <React.StrictMode>
//     <ControlsHeightContext.Provider value={ControlsHeight.S}>
//         <WidgetRootComponent>
//             <App/>
//         </WidgetRootComponent>
//     </ControlsHeightContext.Provider>
//   </React.StrictMode>
// );

import React from "react";
import ReactDOM from "react-dom/client";
import "@jetbrains/ring-ui-built/components/style.css";
import { App } from "./app";
import {WidgetRootComponent} from "@/widgets/common/widget-root-component.tsx";
import {AppStateContextProvider} from "./hooks/use-app-state";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <WidgetRootComponent>
        <AppStateContextProvider>
            <App />
        </AppStateContextProvider>
    </WidgetRootComponent>,
);


