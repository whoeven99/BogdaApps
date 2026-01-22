import { Button, Checkbox, Col, DatePicker, Divider, Flex, Input, InputNumber, Radio, Row, Select, Space, Typography } from "antd";
import { TargetingSettingsType } from "../route";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, } from "react";
import dayjs from 'dayjs';

const { Text } = Typography

interface ScheduleAndBudgetSettingProps {
    targetingSettingsData: TargetingSettingsType;
    setTargetingSettingsData: (targetingSettingsData: TargetingSettingsType) => void;
    dailyBudgetError: boolean;
    marketVisibilitySettingData: { label: string; value: string; }[]
}

const ScheduleAndBudgetSetting: React.FC<ScheduleAndBudgetSettingProps> = ({
    targetingSettingsData,
    setTargetingSettingsData,
    dailyBudgetError,
    marketVisibilitySettingData,
}) => {
    const { t } = useTranslation()

    const indeterminate = useMemo(() => {
        if (marketVisibilitySettingData.length)
            return targetingSettingsData.marketVisibilitySettingData.length > 0 && targetingSettingsData.marketVisibilitySettingData.length < marketVisibilitySettingData.length;
    }, [targetingSettingsData.marketVisibilitySettingData]);

    const checkAll = useMemo(() => {
        if (marketVisibilitySettingData.length)
            return targetingSettingsData.marketVisibilitySettingData.length == marketVisibilitySettingData.length;
    }, [targetingSettingsData.marketVisibilitySettingData]);

    // const eligibilityBrowse = () => {
    //     if (targetingSettingsData?.eligibilityType == "segments")
    //         setMainModalType("CustomerSegments")
    //     if (targetingSettingsData?.eligibilityType == "customers")
    //         setMainModalType("Customer")
    // }

    const onAllCheckClick = () => {
        if (checkAll) {
            setTargetingSettingsData({
                ...targetingSettingsData,
                marketVisibilitySettingData: [],
            });
        } else {
            setTargetingSettingsData({
                ...targetingSettingsData,
                marketVisibilitySettingData: marketVisibilitySettingData.map((market) =>
                    market?.value,
                ),
            });
        }
    };

    return (
        <div>
            <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Targeting & Settings</h2>

            {/* Target Audience */}
            <div style={{ marginBottom: '32px' }}>
                <div className="polaris-stack polaris-stack--vertical">
                    <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '16px' }}>
                        Market Visibility
                        <div style={{
                            marginTop: '8px',
                            border: '1px solid #dfe3e8',
                            borderRadius: '6px',
                            padding: '12px',
                        }}>
                            <Checkbox
                                indeterminate={indeterminate}
                                onClick={onAllCheckClick}
                                checked={checkAll}
                            >
                                Check all
                            </Checkbox>
                            <Divider style={{ margin: '10px 0' }} />
                            <Row>
                                {
                                    marketVisibilitySettingData.map((item, index) => (
                                        <Col span={12} key={index}>
                                            <Checkbox
                                                value={item.value}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (checked) {
                                                        setTargetingSettingsData({
                                                            ...targetingSettingsData,
                                                            marketVisibilitySettingData: [...targetingSettingsData.marketVisibilitySettingData, e.target.value]
                                                        })
                                                    } else {
                                                        setTargetingSettingsData({
                                                            ...targetingSettingsData,
                                                            marketVisibilitySettingData: targetingSettingsData.marketVisibilitySettingData.filter((item) => item !== e.target.value)
                                                        })
                                                    }
                                                }}
                                                checked={targetingSettingsData?.marketVisibilitySettingData?.includes(item.value)}
                                            >
                                                {item.label}
                                            </Checkbox>
                                        </Col>
                                    ))
                                }
                            </Row>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6d7175', marginTop: '4px' }}>
                            Select which markets can see this offer
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Schedule</h3>
                <div className="polaris-grid">
                    <Flex
                        align="left"
                        vertical
                        flex={1}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                        gap={8}
                    >
                        <Text>{t("Start Time")}</Text>
                        <DatePicker
                            showTime
                            needConfirm={false}
                            value={targetingSettingsData.schedule.startsAt}
                            minDate={dayjs().startOf("day")}
                            onChange={(value) => {
                                if (!value) return;

                                const nextStartsAt = value;
                                const currentEndsAt = targetingSettingsData.schedule.endsAt;

                                setTargetingSettingsData({
                                    ...targetingSettingsData,
                                    schedule: {
                                        ...targetingSettingsData.schedule,
                                        startsAt: nextStartsAt,
                                        endsAt:
                                            currentEndsAt && dayjs(currentEndsAt).isBefore(nextStartsAt)
                                                ? nextStartsAt
                                                : currentEndsAt
                                    }
                                });
                            }}
                        />
                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                            When the offer becomes active
                        </Text>
                    </Flex>
                    <Flex
                        align="left"
                        vertical
                        flex={1}
                        gap={8}
                        style={{ fontSize: '14px', fontWeight: 500 }}
                    >
                        <Text>{t("End Time")}</Text>
                        <DatePicker
                            showTime
                            needConfirm={false}
                            value={targetingSettingsData.schedule.endsAt}
                            minDate={dayjs(targetingSettingsData.schedule.startsAt) || dayjs().startOf("day")}
                            onChange={(value) => {
                                if (value)
                                    setTargetingSettingsData({
                                        ...targetingSettingsData,
                                        schedule: {
                                            ...targetingSettingsData.schedule,
                                            endsAt: value
                                        }
                                    })
                            }}
                        />
                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                            When the offer expires
                        </Text>
                    </Flex>
                </div>
            </div>

            {/* Budget */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Budget</h3>
                <div className="polaris-grid">
                    <Flex
                        align="left"
                        vertical
                        flex={1}
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        <Text>{t("Total Budget (Optional)")}</Text>
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            prefix="$"
                            suffix="USD"
                            placeholder="0.00"
                            value={targetingSettingsData.budget.totalBudget}
                            onChange={(value) => {
                                if (value === null) {
                                    setTargetingSettingsData({
                                        ...targetingSettingsData,
                                        budget: {
                                            ...targetingSettingsData.budget,
                                            totalBudget: null
                                        }
                                    });
                                    return;
                                }

                                if (typeof value === 'number' && value >= 0) {
                                    setTargetingSettingsData({
                                        ...targetingSettingsData,
                                        budget: {
                                            ...targetingSettingsData.budget,
                                            totalBudget: value
                                        }
                                    });
                                }
                            }}
                        />
                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                            {t("Maximum total spend for this offer")}
                        </Text>
                    </Flex>
                    <Flex
                        align="left"
                        vertical
                        flex={1}
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        <Text>{t("Daily Budget (Optional)")}</Text>
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            prefix="$"
                            suffix="USD"
                            placeholder="$0.00"
                            status={dailyBudgetError ? "error" : undefined}
                            value={targetingSettingsData.budget.dailyBudget}
                            onChange={(value) => {
                                if (value === null) {
                                    setTargetingSettingsData({
                                        ...targetingSettingsData,
                                        budget: {
                                            ...targetingSettingsData.budget,
                                            dailyBudget: null
                                        }
                                    });
                                    return;
                                }

                                if (typeof value === 'number' && value >= 0) {
                                    setTargetingSettingsData({
                                        ...targetingSettingsData,
                                        budget: {
                                            ...targetingSettingsData.budget,
                                            dailyBudget: value
                                        }
                                    });
                                }
                            }}
                        />
                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                            {t("Maximum spend per day")}
                        </Text>
                    </Flex>
                </div>
            </div>

            {/* Risk Control */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Risk Control</h3>
                <div className="polaris-stack polaris-stack--vertical">
                    <Flex
                        align="left"
                        vertical
                        flex={1}
                        gap={8}
                    >
                        <Text>{t("Usage Limit Per Customer")}</Text>
                        <Select
                            style={{
                                width: '100%',
                            }}
                            options={[
                                { value: null, label: t('Unlimited') },
                                { value: 1, label: t('1 time only') },
                                { value: 2, label: t('2 times') },
                                { value: 3, label: t('3 times') },
                                { value: 5, label: t('5 times') },
                                { value: 10, label: t('10 times') },
                            ]}
                            value={targetingSettingsData.usage_limit.per_customer}
                            onChange={(value) => {
                                setTargetingSettingsData({
                                    ...targetingSettingsData,
                                    usage_limit: {
                                        ...targetingSettingsData.usage_limit,
                                        per_customer: value,
                                    },
                                });
                            }}
                        />
                        <Text style={{ fontSize: '12px', color: '#6d7175' }}>
                            {t("How many times each customer can use this offer")}
                        </Text>
                    </Flex>

                    <Flex
                        style={{
                            marginTop: '16px',
                            border: '1px solid #dfe3e8',
                            borderRadius: '8px',
                            padding: '16px',
                            flexDirection: 'column',
                        }}
                    >
                        <Checkbox
                            defaultChecked={true}
                            checked={targetingSettingsData.schedule.hideAfterExpiration}
                            onChange={() => {
                                setTargetingSettingsData({
                                    ...targetingSettingsData,
                                    schedule: {
                                        ...targetingSettingsData.schedule,
                                        hideAfterExpiration: !targetingSettingsData.schedule.hideAfterExpiration,
                                    },
                                });
                            }}
                        >
                            <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                                {t("Hide offer after expiration")}
                            </Text>
                        </Checkbox>
                        <Text style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                            {t("Don't display the offer widget after the end date")}
                        </Text>
                    </Flex>

                    <Flex
                        style={{
                            marginTop: '16px',
                            border: '1px solid #dfe3e8',
                            borderRadius: '8px',
                            padding: '16px',
                            flexDirection: 'column',
                        }}
                    >
                        <Checkbox
                            defaultChecked={true}
                            checked={targetingSettingsData.showOfferToBots}
                            onChange={() => {
                                setTargetingSettingsData({
                                    ...targetingSettingsData,
                                    showOfferToBots: !targetingSettingsData.showOfferToBots,
                                });
                            }}
                        >
                            <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                                {t("Show offer to bots/crawlers")}
                            </Text>
                        </Checkbox>
                        <Text style={{ fontSize: '12px', color: '#6d7175', marginTop: '8px', marginLeft: '24px' }}>
                            {t("Display offer information to search engine crawlers and bots")}
                        </Text>
                    </Flex>
                </div>
            </div>
        </div>
    )
}

export default ScheduleAndBudgetSetting