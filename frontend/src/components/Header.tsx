import React from "react";

const Header: React.FC = () => {
  return (
    <>
      {/* Minimal floating elements background */}
      <div className="floating-nature">
        <div className="nature-element"></div>
        <div className="nature-element">🌿</div>
      </div>

      <header className="header">
        <div className="header-content">
          <h1>
            <span className="title-text">Pie Tracker</span>
          </h1>
        </div>
      </header>
    </>
  );
};

export default Header;
