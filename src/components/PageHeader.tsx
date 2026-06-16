import { useNavigate } from 'react-router-dom';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, back, action }: Props) {
  const nav = useNavigate();
  return (
    <header className="page-header rise">
      <div className="page-header__row">
        {back && (
          <button className="page-header__back" onClick={() => nav(-1)} aria-label="Назад">
            ←
          </button>
        )}
        <div style={{ flex: 1 }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {subtitle && <p className="muted" style={{ marginTop: -4 }}>{subtitle}</p>}
      <div className="divider">✦</div>
    </header>
  );
}
