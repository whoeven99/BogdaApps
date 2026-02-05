import { Flex, Input, Select, Statistic, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { BasicInformationType, DiscountRulesType, StyleConfigType } from "../route";
import { ProductVariantsDataType } from "app/types";
import { useEffect, useMemo } from "react";
import PreviewFrontOffer from "./previewFrontOffer";

const { Text } = Typography
const { Timer } = Statistic

interface BasicInformationSettingProps {
    offerTypes: {
        id: string;
        name: string;
        enable: boolean;
    }[];
    previewProduct: ProductVariantsDataType;
    basicInformation: BasicInformationType;
    discountRules: DiscountRulesType[];
    styleConfigData: StyleConfigType;
    selectedRuleIndex: number | null;
    setSelectedRuleIndex: (index: number | null) => void;
    setBasicInformation: (basicInformation: BasicInformationType) => void;
}

const BasicInformationSetting: React.FC<BasicInformationSettingProps> = ({
    offerTypes,
    previewProduct,
    basicInformation,
    discountRules,
    styleConfigData,
    selectedRuleIndex,
    setSelectedRuleIndex,
    setBasicInformation,
}) => {
    const { t } = useTranslation();

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
            {/* Left Column - Form */}
            <div>
                <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Basic Information</h2>
                <div className="polaris-stack polaris-stack--vertical">
                    <Flex
                        align="left"
                        vertical
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        <Text>{t("Offer Name")}</Text>
                        <Input
                            style={{
                                width: '100%',
                            }}
                            placeholder="e.g., Summer Bundle Deal"
                            onChange={(e) => {
                                setBasicInformation({
                                    ...basicInformation,
                                    displayName: e.target.value
                                })
                            }}
                            value={basicInformation.displayName}
                        />
                    </Flex>

                    <Flex
                        align="left"
                        vertical
                        gap={8}
                        style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            marginTop: '16px'
                        }}
                    >
                        <Text>{t("Offer Type")}</Text>
                        <Select
                            style={{
                                width: '100%',
                                zIndex: 0
                            }}
                            options={offerTypes.filter(type => type?.enable).map(type => (
                                {
                                    value: type.id,
                                    label: type.name
                                }
                            ))}
                            value={basicInformation.offerType.subtype}
                            onChange={(value) => {
                                setBasicInformation({
                                    ...basicInformation,
                                    offerType: {
                                        ...basicInformation.offerType,
                                        subtype: value
                                    }
                                })
                            }}
                        />
                    </Flex>
                </div>
            </div>

            {/* Right Column - Preview */}
            <PreviewFrontOffer
                basicInformation={basicInformation}
                discountRules={discountRules}
                styleConfigData={styleConfigData}
                selectedRuleIndex={selectedRuleIndex}
                setSelectedRuleIndex={setSelectedRuleIndex}
                previewProduct={previewProduct}
            />
        </div >
    );
};

export default BasicInformationSetting;