import { useNavigate } from "@remix-run/react";
import { Button, Flex, Typography } from "antd";

const { Title } = Typography;

interface HeaderProps {
    backUrl?: string; //回退url
    title: string;
}

const Header: React.FC<HeaderProps> = (
    { backUrl, title }
) => {
    const navigate = useNavigate();
    return (
        <Flex
            justify="space-between"
            align="center"
            style={{
                backgroundColor: "rgb(241, 241, 241)",
                margin: "0 -300px",
                padding: "0 300px",
            }}
        >
            <div>
                {backUrl &&
                    <Button
                        className="polaris-button polaris-button--plain"
                        type="text"
                        onClick={() => navigate(backUrl)}
                    >
                        ← Back
                    </Button>}
                <Title level={3} className="polaris-page__title">{title}</Title>
            </div>
        </Flex>
    );
};

export default Header;