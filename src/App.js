import './App.css';
import CustomerScreen from './components/chatScreen/CustomerScreen.jsx';
import AuthTabs from './components/users/AuthTabs';
import ConfirmRegistration from './components/users/ConfirmRegistration.jsx';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import CallbackPage from './CallbackPage';


function App() {
  const auth = useAuth();
  const location = useLocation();

    return (
    <Routes>
      <Route path="/" element={<AuthTabs />} />
      <Route path="/confirm" element={<ConfirmRegistration />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
          path="/customerScreen"
          element={
            auth.user?.profile ? (
                <CustomerScreen
                    customer_id={auth.user.profile.sub}
                    customerName={auth.user.profile.name}
                    customerMail={auth.user.profile.email}
                    customer_address={auth.user.profile.address} 
                />
            ) : (
                <div>Loading...</div>
            )
          }
      />


    </Routes>
  );
}

export default App;
