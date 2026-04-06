import React, { useState } from 'react';
import './Login.css';
import RoleSelection from './RoleSelection.js';
import LoginForm from './LoginForm.js';

function LoginContainer() {
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  return (
    <div className="loginPage">
      {!selectedRole ? (
        <RoleSelection onRoleSelect={handleRoleSelect} />
      ) : (
        <LoginForm role={selectedRole} onBack={handleBack} />
      )}
    </div>
  );
}

export default LoginContainer;
