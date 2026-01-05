import React, {
  FC,
  type PropsWithChildren,
  useContext,
  useReducer,
} from "react";

export type AppState = {
  selectedProjectKey: string | null;
  currentPageInProject: "testSuits" | "testCases" | "testRuns" | "testDashboard" | "integrations";
  selectedTestCaseId: string | null;
};

export type AppStateAction =
  | {
      type: "selectProject";
      payload: {
        projectKey: string | null;
      };
    }
  | {
      type: "changePageInProject";
      payload: { page: "testSuits" | "testCases" | "testRuns" | "testDashboard" | "integrations" };
    }
  | {
      type: "setSelectedTestCase";
      payload: { testCaseId: string | null };
    };

const AppStateContext = React.createContext<{
  state: AppState;
  dispatch: (action: AppStateAction) => void;
}>({
  state: {
    selectedProjectKey: null,
    currentPageInProject: "testSuits",
    selectedTestCaseId: null,
  },
  dispatch: () => {},
});

const initialState: AppState = {
  selectedProjectKey: null,
  currentPageInProject: "testSuits",
  selectedTestCaseId: null,
};

const appStateReducer = (state: AppState, action: AppStateAction): AppState => {
  switch (action.type) {
    case "selectProject":
      return {
        ...state,
        selectedProjectKey: action.payload.projectKey,
      };

    case "changePageInProject":
      return {
        ...state,
        currentPageInProject: action.payload.page,
      };
    case "setSelectedTestCase":
      return {
        ...state,
        selectedTestCaseId: action.payload.testCaseId,
      };
    default:
      return state;
  }
};

export const AppStateContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  return useContext(AppStateContext);
};

