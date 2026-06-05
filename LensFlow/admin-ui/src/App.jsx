import React from "react";
import { ConfigProvider, Layout, Menu, Button, Spin, theme } from "antd";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { I18nProvider, useI18n } from "./hooks/useI18n";
import { ShopifyProvider, useShopify } from "./hooks/useShopify";
import Dashboard from "./pages/Dashboard";
import Flows from "./pages/Flows";
import FlowEditor from "./pages/FlowEditor";
import Rules from "./pages/Rules";
import Health from "./pages/Health";
import Analytics from "./pages/Analytics";
import Orders from "./pages/Orders";

const { Header, Content } = Layout;

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <h3>Something went wrong</h3>
          <p style={{ color: "#888", marginBottom: 8 }}>{this.state.error?.message || ''}</p>
          <Button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>Reload</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const NAV = [
  { key: "/", labelKey: "nav.dashboard" },
  { key: "/flows", labelKey: "nav.flows" },
  { key: "/rules", labelKey: "nav.rules" },
  { key: "/health", labelKey: "nav.health" },
  { key: "/analytics", labelKey: "nav.analytics" },
  { key: "/orders", labelKey: "nav.orders" },
];

function NavBar() {
  const loc = useLocation();
  const { t, lang, toggleLang } = useI18n();
  const { isEmbedded } = useShopify();
  const { token: themeToken } = theme.useToken();

  return (
    <Header style={{ background: themeToken.colorBgContainer, borderBottom: "1px solid " + themeToken.colorBorderSecondary, padding: isEmbedded ? "0 12px" : "0 20px", display: "flex", alignItems: "center", height: 44, lineHeight: "44px" }}>
      <span style={{ fontWeight: 700, fontSize: 15, marginRight: 18, color: themeToken.colorPrimary, flexShrink: 0 }}>LensFlow</span>
      <Menu mode="horizontal" selectedKeys={[loc.pathname]} style={{ flex: 1, border: "none", lineHeight: "42px", background: "transparent", minWidth: 0 }} items={NAV.map(n => ({ key: n.key, label: <Link to={n.key}>{t(n.labelKey)}</Link> }))} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Button size="small" onClick={toggleLang}>{lang === "en" ? "\u4e2d\u6587" : "EN"}</Button>
      </div>
    </Header>
  );
}

function AppShell() {
  const { isEmbedded } = useShopify();
  return (
    <Layout style={{ minHeight: "100vh", background: "#f6f6f7" }}>
      <NavBar />
      <Content style={{ padding: isEmbedded ? "0" : "24px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isEmbedded ? "16px 16px" : 0 }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/flows" element={<Flows />} />
              <Route path="/flows/:id" element={<FlowEditor />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/health" element={<Health />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="*" element={<div style={{ padding: 40, textAlign: "center" }}><h2>404</h2><p style={{ color: "#888" }}>Page not found</p><Link to="/">Back to Dashboard</Link></div>} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#005bd3", borderRadius: 6 } }}>
      <I18nProvider>
        <ShopifyProvider>
          <HashRouter>
            <AppShell />
          </HashRouter>
        </ShopifyProvider>
      </I18nProvider>
    </ConfigProvider>
  );
}
