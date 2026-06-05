import React from "react";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Redirect } from "@shopify/app-bridge/actions";
import Flows from "./pages/Flows";

function App() {
  const url = new URL(window.location.href);
  const host = url.searchParams.get("host");

  if (!host) {
    return (
      <div>
        <h1>Missing host parameter</h1>
        <p>This app needs to be loaded inside of the Shopify Admin.</p>
      </div>
    );
  }

  return (
    <AppProvider i18n={{}}>
      <HashRouter>
        <DebuggingFrame />
      </HashRouter>
    </AppProvider>
  );
}

function DebuggingFrame() {
  const shopify = useAppBridge();

  const handleClick = () => {
    alert("SUCCESS! The click event fired!");

    console.log("Attempting to redirect using App Bridge...");
    if (shopify) {
      const redirect = Redirect.create(shopify);
      redirect.dispatch(Redirect.Action.APP, "/flows");
    } else {
      console.error("App Bridge context is not available.");
    }
  };

  return (
    <div style={{ padding: "20px", position: "relative", zIndex: 1 }}>
      <h1>Click Test</h1>
      <p>Please click the big button below. An alert box should appear.</p>
      <button
        onClick={handleClick}
        style={{
          fontSize: "24px",
          padding: "20px",
          margin: "20px",
          border: "2px solid red",
          cursor: "pointer",
          position: "relative",
          zIndex: 10,
        }}
      >
        CLICK ME
      </button>

      <hr />
      <p>The content below is for the router test after the click.</p>
      <Routes>
        <Route path="/" element={<div>Dashboard Page Content</div>} />
        <Route path="/flows" element={<Flows />} />
      </Routes>
    </div>
  );
}

export default App;
