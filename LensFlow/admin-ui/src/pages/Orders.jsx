import React, { useState, useCallback } from "react";
import { Table, Tag, Button, Alert, Typography, Space, Popover, Tooltip } from "antd";
import { ReloadOutlined, EyeOutlined } from "@ant-design/icons";
import { useApi } from "../hooks/useApi";
import { useI18n } from "../hooks/useI18n";

const { Text } = Typography;

function mockOrders() {
  return [
    {
      id: "ORD-1001",
      orderNumber: "#1256",
      customer: "Alice Johnson",
      flow: "Prescription Eyeglasses",
      total: "$249.00",
      prescription: "OD: -2.00 / OS: -1.75",
      status: "fulfilled",
      createdAt: "2026-05-20",
    },
    {
      id: "ORD-1002",
      orderNumber: "#1257",
      customer: "Bob Chen",
      flow: "Contact Lens Quick",
      total: "$89.00",
      prescription: "OD: -3.50 / OS: -3.25",
      status: "pending",
      createdAt: "2026-05-21",
    },
    {
      id: "ORD-1003",
      orderNumber: "#1258",
      customer: "Maria Garcia",
      flow: "Prescription Eyeglasses",
      total: "$312.00",
      prescription: "OD: +1.50 / OS: +2.00",
      status: "fulfilled",
      createdAt: "2026-05-22",
    },
    {
      id: "ORD-1004",
      orderNumber: "#1259",
      customer: "David Kim",
      flow: "Reading Glasses",
      total: "$65.00",
      prescription: "+2.50",
      status: "cancelled",
      createdAt: "2026-05-23",
    },
    {
      id: "ORD-1005",
      orderNumber: "#1260",
      customer: "Sarah Wilson",
      flow: "Prescription Eyeglasses",
      total: "$198.00",
      prescription: "OD: -1.25 / OS: -1.00",
      status: "pending",
      createdAt: "2026-05-24",
    },
    {
      id: "ORD-1006",
      orderNumber: "#1261",
      customer: "Tom Brown",
      flow: "Contact Lens Quick",
      total: "$95.00",
      prescription: "OD: -4.00 / OS: -4.50",
      status: "fulfilled",
      createdAt: "2026-05-25",
    },
    {
      id: "ORD-1007",
      orderNumber: "#1262",
      customer: "Lisa Wang",
      flow: "Progressive Lenses",
      total: "$425.00",
      prescription: "OD: -2.75 ADD +2.00 / OS: -3.00 ADD +2.00",
      status: "pending",
      createdAt: "2026-05-26",
    },
    {
      id: "ORD-1008",
      orderNumber: "#1263",
      customer: "James Lee",
      flow: "Prescription Eyeglasses",
      total: "$275.00",
      prescription: "OD: -5.50 / OS: -5.00",
      status: "fulfilled",
      createdAt: "2026-05-27",
    },
  ];
}

const STATUS_COLORS = {
  fulfilled: "green",
  pending: "gold",
  cancelled: "red",
};

export default function Orders() {
  const { t } = useI18n();
  const { data: apiOrders, loading, error, retry } = useApi("/api/admin/orders");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const orders = apiOrders && apiOrders.length > 0 ? apiOrders : mockOrders();

  const handleTableChange = useCallback((pagination) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  }, []);

  const columns = [
    {
      title: t("orders.orderNumber") || "Order #",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t("orders.customer") || "Customer",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: t("orders.flow") || "Flow",
      dataIndex: "flow",
      key: "flow",
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: t("orders.total") || "Total",
      dataIndex: "total",
      key: "total",
      width: 100,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t("orders.prescription") || "Prescription",
      dataIndex: "prescription",
      key: "prescription",
      ellipsis: true,
      render: (text) => (
        <Popover content={text} trigger="hover">
          <Text style={{ cursor: "pointer" }}>{text}</Text>
        </Popover>
      ),
    },
    {
      title: t("orders.status") || "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (s) => {
        const statusLabels = {
          fulfilled: t("orders.fulfilled") || "fulfilled",
          pending: t("orders.pending") || "pending",
          cancelled: t("orders.cancelled") || "cancelled",
        };
        return <Tag color={STATUS_COLORS[s] || "default"}>{statusLabels[s] || s}</Tag>;
      },
    },
    {
      title: t("orders.date") || "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: () => (
        <Button type="link" size="small" icon={<EyeOutlined />} />
      ),
    },
  ];

  if (error) {
    return (
      <Alert
        type="error"
        message={t("orders.failed") || "Failed to load orders"}
        description={error.message}
        action={<Button size="small" onClick={retry} icon={<ReloadOutlined />}>{t("common.retry") || "Retry"}</Button>}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ margin: 0, fontSize: 24 }}>{t("orders.title") || "Orders"}</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={retry} size="small">
            {t("orders.refresh") || "Refresh"}
          </Button>
        </Space>
      </div>

      <Alert type="info" message={t("orders.intro") || "Orders placed through LensFlow prescription flows."} showIcon style={{ marginBottom: 16 }} />

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: orders.length,
          showSizeChanger: true,
          showTotal: (total) => t("orders.totalOrders") ? t("orders.totalOrders").replace("{total}", total) : "Total " + total + " orders",
        }}
        onChange={handleTableChange}
        locale={{ emptyText: t("orders.noOrders") || "No orders found" }}
      />
    </div>
  );
}