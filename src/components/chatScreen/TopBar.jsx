// src/components/TopBar.jsx
import React from "react";
import "./TopBar.css";

const TopBar = ({ onLogin, onLogout, onAddLocation }) => {
  return (
    <div className="topbar">
      <h2 className="logo">PrepPal</h2>
      <div className="actions">
        <button onClick={onLogin}>Logout</button>
        <button onClick={onLogout}>Profile</button>
        <button onClick={onAddLocation}>Order Location</button>
      </div>
    </div>
  );
};

export default TopBar;
