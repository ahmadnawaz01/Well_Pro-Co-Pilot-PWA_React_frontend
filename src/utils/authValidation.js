// Email format regex check
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

// Client-side form validation before sending API calls
export const validateAuthForm = ({ isLogin, email, password, firstName }) => {
  if (!email || !email.trim()) {
    return 'Please enter your email address.';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address (e.g., name@example.com).';
  }

  if (!password || !password.trim()) {
    return 'Please enter your password.';
  }

  if (!isLogin) {
    if (!firstName || !firstName.trim()) {
      return 'Please enter your first name.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
  }

  return null; // No validation errors
};

// Translates HTTP status codes & backend messages into user-friendly prompts
export const getReadableAuthError = (error, isLogin) => {
  // Network / Connection Error
  if (!error.response) {
    return 'Unable to connect to the backend server. Please check your internet or server connection.';
  }

  const status = error.response.status;
  const backendMsg = error.response.data?.message?.message 
    || error.response.data?.message 
    || error.response.data?._server_messages;

  // 401 Unauthorized (Incorrect email or password)
  if (status === 401) {
    return isLogin
      ? 'Incorrect email or password. Please check your credentials and try again.'
      : 'Session expired or unauthorized. Please try signing up again.';
  }

  // 409 Conflict / User already exists
  if (status === 409 || (backendMsg && String(backendMsg).includes('already exists'))) {
    return 'An account with this email address already exists. Please log in instead.';
  }

  // 417 Expectation Failed or Validation Error
  if (status === 417 || status === 422) {
    if (backendMsg && typeof backendMsg === 'string') {
      if (backendMsg.includes('Mandatory')) {
        return 'Please fill in all required fields properly.';
      }
      return backendMsg;
    }
    return 'Please make sure all fields are filled out correctly.';
  }

  // 500 Server Error
  if (status >= 500) {
    return 'A server error occurred. Please try again later or contact support.';
  }

  // Default fallback message
  return typeof backendMsg === 'string' ? backendMsg : 'Authentication failed. Please check your details.';
};