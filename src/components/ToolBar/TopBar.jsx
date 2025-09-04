// src/components/TopBar.jsx
import React from "react";
import { useState } from "react";
import { CognitoUserPool } from "amazon-cognito-identity-js";
import "./TopBar.css";
import ProfileModal from "./ProfileModal";
import prepal_logo from "../utils/prepal_logo.png";


const poolData = {
  UserPoolId: "us-east-1_TpeA6BAZD",
  ClientId: "56ic185te584076fcsarbqq93m"
};

const userPool = new CognitoUserPool(poolData);

const TopBar = () => {

  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    // 1. מחיקת מידע מה־localStorage
    localStorage.removeItem("pp_user");
    sessionStorage.clear();

    // 2. יצירת משתמש נוכחי (אם יש) ו־signOut
    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut(); // מנתק מהסשן המקומי
    }

    // 3. הפניה חזרה לדף התחברות
    window.location.href = "/login";
  };



  const handleOrderLocation = () => {
    alert("Order Location pressed");
  };

  return (
    <div className="topbar">
      <div className="brand">
        <h2 className="logo">PrePal</h2>
        <img src={prepal_logo} alt="PrePal Logo" className="logo-image" />
      </div>      <div className="actions">
        <button onClick={handleLogout}>Logout</button>
        <button onClick={() => setShowProfile(true)}>Profile</button>
        <button onClick={() => alert("Order Location pressed")}>?new chat?</button>

        <ProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          onSaved={() => {
          }}
        />
      </div>
    </div>
  );
};

export default TopBar;
