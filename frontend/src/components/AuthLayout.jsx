import "../styles/auth.css";

function AuthLayout({ title, subtitle, bgClass, children }) {
  return (
    <div className={`auth-wrapper ${bgClass}`}>
      <div className="auth-card">
        <h2>{title}</h2>
        <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
