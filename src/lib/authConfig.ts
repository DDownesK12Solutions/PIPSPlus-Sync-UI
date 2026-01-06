import type { Configuration, PopupRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "ENTER_CLIENT_ID_HERE",
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
};

// Helper to get scopes for a specific environment
export const getDataverseRequest = (url: string): PopupRequest => {
    // Ensure we have a clean base URL without trailing slash
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return {
        scopes: [`${cleanUrl}/.default`],
    };
};

export const loginRequest: PopupRequest = {
    scopes: ["User.Read"],
    prompt: "select_account"
};
