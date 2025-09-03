import React, { useState } from 'react';
import {
  CognitoUserPool,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import './RegisterForm.css';
import { useAuth } from 'react-oidc-context';


const poolData = {
  UserPoolId: "us-east-1_TpeA6BAZD",
  ClientId: "56ic185te584076fcsarbqq93m"
};


const userPool = new CognitoUserPool(poolData);


export default function RegisterForm() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  //const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showLoginButton, setShowLoginButton] = useState(false);

  const sanitizeName = (txt) =>
    (txt || '')
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // מסיר תווים בלתי נראים (RTL markers)
      .replace(/[^\p{L}\s'-]/gu, '')              // מסיר תווים זרים
      .trim();

  const handleRegister = (e) => {

    e.preventDefault();
    setMessage('');
    const cleanName = sanitizeName(customerName);


    if (!/^\d{9}$/.test(phoneNumber)) {
      setMessage("Invalid phone number (must be 9 digits)");
      return;
    }

    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'phone_number', Value: `+972${phoneNumber}` }),
      new CognitoUserAttribute({ Name: 'name', Value: cleanName }),
      new CognitoUserAttribute({ Name: 'address', Value: `${city}, ${street}, ${houseNumber}` }),
    ];

    userPool.signUp(email, password, attributes, null, async (err, result) => {
      console.log(`Email: ${email}`, `Password: ${password}`, `Phone Number: ${phoneNumber}`, `Customer Name: ${customerName}`, `Address: ${city}, ${street}, ${houseNumber}`);
      if (err) {
        console.error(err);
        setMessage(err.message);

        if (err.code === 'UsernameExistsException') {
          setShowLoginButton(true);
        }
      } else {
        console.log('✔️ Registered successfully', result);
        setMessage('Registered successfully!');
        setRegistrationSuccess(true);

        try {
          /*await createMarketInDB({
            store_id: result.userSub,
            name: storeName,
            address: `${city}, ${street}, ${houseNumber}`,
            email,
          });*/

          console.log("🏪 user created successfully in DB");

          setTimeout(() => {
            window.location.href = `/confirm?email=${encodeURIComponent(email)}`;
          }, 500);
        } catch (err) {
          //console.error("❌ Error creating market in DB:", err);
          setMessage("Failed to create market. Please try again.");
        }
      }
    });
  };

  /*const createMarketInDB = async ({ store_id, name, address, email, storeHours }) => {
    try {
      const coordinatesFromAddress = await getCoordinatesFromAddress(address);
      //let check = await fetch ("https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location?address=Aza 25, Tel Aviv");
      //console.log(check);
      //check = await check.json();
      const res = await fetch("https://5uos9aldec.execute-api.us-east-1.amazonaws.com/dev/createNewMarket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id,
          name,
          location: address,
          email,
          store_hours: storeHours,
  
          store_coordinates: `${coordinatesFromAddress.lat},${coordinatesFromAddress.lon}`
          //coordinates: `${check.lat},${check.lon}`
        })
      });
  
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create market");
      }
  
      console.log("🏪 Market successfully created in DB");
    } catch (err) {
      console.error("❌ Error creating market in DB:", err);
      throw err;
    }
  };*/

  const getCoordinatesFromAddress = async (address) => {
    const response = await fetch(`https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/location?address=${address}`);
    if (!response.ok) {
      throw new Error("Failed to fetch coordinates");
    }
    const data = await response.json();
    console.log(data);
    return data;
  }

  const handleLoginButton = () => {
    window.location.href = '/?tab=login';
  };

  return (
    <form className="register-form" onSubmit={handleRegister}>
      <h2 className="form-title">Sign Up</h2>

      <label>Email:</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="form-input"
        required
      />

      <label>Password:</label>
      <div className="password-container">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input password-input"
          required
        />
        <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? "🙈" : "👁"}
        </span>
      </div>

      <label>Phone number:</label>
      <div className="phone-container">
        <span className="phone-prefix">+972</span>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
          maxLength={9}
          className="phone-input"
          required
        />
      </div>

      <label>City:</label>
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="form-input"
        required
      />

      <label>Street:</label>
      <input
        type="text"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        className="form-input"
      />

      <label>House Number:</label>
      <input
        type="text"
        value={houseNumber}
        onChange={(e) => setHouseNumber(e.target.value)}
        className="form-input"
      />

      <label>Customer name:</label>
      <input
        type="text"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        className="form-input"
        required
      />

      <button type="submit" className="submit-btn">Sign Up</button>

      <p className="form-message">{message}</p>


      {
        showLoginButton && (
          <div style={{ textAlign: 'center', marginTop: '5px' }}>
            <button
              type="button"
              className="login-btn"
              onClick={handleLoginButton}>
              Log In
            </button>
          </div>
        )
      }

      {
        registrationSuccess && (
          <p className="form-message">Please check your email to confirm</p>
        )
      }
    </form >
  );
}
