// Email format regex check
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim().toLowerCase());
};

// Client-side form validation before sending API calls
export const validateAuthForm = ({ isLogin, email, password, firstName }) => {
  if (!email || !email.trim()) {
    return 'Please enter your email address.';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address (e.g. name@example.com).';
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
  const actualError = error?.cause || error;
  const response = actualError?.response;
  const status = response?.status;

  // Extract backend message from response data if available
  const data = response?.data;
  let backendMsg = '';
  if (typeof data?.message === 'string') {
    backendMsg = data.message;
  } else if (data?.message?.message && typeof data.message.message === 'string') {
    backendMsg = data.message.message;
  } else if (data?.message?.error && typeof data.message.error === 'string') {
    backendMsg = data.message.error;
  } else if (data?.detail) {
    backendMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
  } else if (data?._server_messages) {
    try {
      const parsed = JSON.parse(data._server_messages);
      backendMsg = parsed
        .map((m) => {
          try {
            return JSON.parse(m).message;
          } catch {
            return m;
          }
        })
        .join(' ');
    } catch {
      // ignore
    }
  }

  const combined = `${backendMsg} ${actualError?.message || ''} ${error?.message || ''}`.toLowerCase();

  // 1. Wrong password or invalid credentials
  if (
    status === 401 ||
    combined.includes('invalid login credentials') ||
    combined.includes('incorrect password') ||
    combined.includes('authentication error') ||
    combined.includes('wrong password')
  ) {
    return isLogin
      ? 'Incorrect email or password. Please verify your credentials and try again.'
      : 'Authentication failed. Please verify your details.';
  }

  // 2. User does not exist
  if (
    combined.includes('does not exist') ||
    combined.includes('user not found') ||
    combined.includes('no user') ||
    combined.includes('not a valid user')
  ) {
    return 'No account found with this email address. Please check your spelling or sign up.';
  }

  // 3. User already registered (Conflict)
  if (
    status === 409 ||
    combined.includes('already exists') ||
    combined.includes('duplicate') ||
    combined.includes('user already exists')
  ) {
    return 'An account with this email address already exists. Please log in instead.';
  }

  // 4. Password validation rules
  if (combined.includes('password') && (combined.includes('short') || combined.includes('length') || combined.includes('weak'))) {
    return 'Password is too short. Please choose a password with at least 6 characters.';
  }

  // 5. Explicit descriptive message from backend
  if (backendMsg && backendMsg.length > 3 && !backendMsg.includes('{') && !backendMsg.includes('Traceback')) {
    return backendMsg;
  }

  // 6. Network connectivity issue
  if (!response) {
    return 'Unable to reach backend server. If you are on a phone, make sure your phone is connected to the same Wi-Fi as your computer.';
  }

  // 7. Internal Server Error
  if (status >= 500) {
    return 'Server error during authentication. Please verify the backend service is running and try again.';
  }

  return error?.message || 'Authentication failed. Please check your details and try again.';
};
