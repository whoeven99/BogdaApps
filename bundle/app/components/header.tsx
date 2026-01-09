import { useNavigate } from "@remix-run/react";

interface HeaderProps {
    backUrl?: string; //回退url
    title: string;
}

const Header: React.FC<HeaderProps> = (
    { backUrl, title }
) => {
    const navigate = useNavigate();
    return (
        <div className="polaris-page__header">
            <div>
                {backUrl && <button className="polaris-button polaris-button--plain" onClick={() => navigate(backUrl)}>
                    ← Back
                </button>}
                <h1 className="polaris-page__title">{title}</h1>
            </div>
        </div>
    );
};

export default Header;